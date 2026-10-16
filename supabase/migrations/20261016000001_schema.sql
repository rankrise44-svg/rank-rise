-- ═══════════════════════════════════════════════════════════════
-- Cedarline — 1/4 · Core schema
-- ───────────────────────────────────────────────────────────────
-- Tables shared by the storefront and the admin dashboard.
-- Conventions:
--   • Money is stored in integer cents (*_cents), like the storefront.
--   • Product, category, brand and zone ids are the storefront's
--     existing text ids (p001…, cookware…, beirut…) so URLs, carts
--     and wishlists keep working after the switch.
--   • Every table gets created_at / updated_at.
-- Run order: 0001 schema → 0002 security → 0003 storefront API →
--            0004 storage → seed.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Helpers ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Administrators ─────────────────────────────────────────────
-- A row here is what makes a signed-in user an administrator.
-- Only rows inserted by an owner (or via the SQL editor) grant access.
create table public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'admin' check (role in ('owner', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Store settings (exactly one row) ───────────────────────────
create table public.store_settings (
  id                            boolean primary key default true check (id),
  name                          text not null,
  tagline                       text not null default '',
  about                         text not null default '',
  email                         text not null default '',
  phone                         text not null default '',
  whatsapp                      text not null default '',
  address                       text not null default '',
  hours                         text not null default '',
  currency_code                 text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  lbp_rate                      integer not null default 89500 check (lbp_rate > 0),
  free_delivery_threshold_cents integer not null default 7500 check (free_delivery_threshold_cents >= 0),
  delivery_eta_text             text not null default '1–3 working days',
  max_qty_per_line              integer not null default 10 check (max_qty_per_line between 1 and 100),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- ── Catalog ────────────────────────────────────────────────────
create table public.categories (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  blurb       text not null default '',
  icon_url    text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.brands (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  about       text not null default '',
  logo_url    text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.products (
  id                 text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  slug               text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  name               text not null check (length(name) between 2 and 160),
  category_id        text not null references public.categories (id) on update cascade,
  brand_id           text references public.brands (id) on update cascade on delete set null,
  price_cents        integer not null check (price_cents >= 0),
  compare_at_cents   integer check (compare_at_cents is null or compare_at_cents > price_cents),
  cost_cents         integer check (cost_cents is null or cost_cents >= 0),   -- private: never shown on the storefront
  stock              integer not null default 0 check (stock >= 0),
  rating             numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count       integer not null default 0 check (review_count >= 0),
  badges             text[] not null default '{}' check (badges <@ array['bestseller', 'new']::text[]),
  tags               text[] not null default '{}',
  short_description  text not null default '',
  description        text not null default '',
  features           text[] not null default '{}',
  specs              jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  cutout_url         text,
  featured           boolean not null default false,
  popularity         integer not null default 50 check (popularity between 0 and 100),
  is_active          boolean not null default true,   -- false = hidden from the storefront
  listed_on          date not null default current_date,  -- drives "Newest" sorting
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references public.products (id) on update cascade on delete cascade,
  url           text not null,          -- public URL, or a storefront-relative path for the original art
  storage_path  text,                   -- object path in the product-images bucket (null for repo images)
  position      integer not null default 0,
  alt           text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, position)
);

-- ── Delivery & promotions ──────────────────────────────────────
create table public.delivery_zones (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  fee_cents   integer not null check (fee_cents >= 0),
  eta         text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.promotions (
  code                text primary key check (code ~ '^[A-Z0-9_-]{3,24}$'),
  label               text not null default '',
  kind                text not null check (kind in ('percent', 'fixed')),
  percent_off         integer check (percent_off between 1 and 100),
  amount_off_cents    integer check (amount_off_cents > 0),
  min_subtotal_cents  integer not null default 0 check (min_subtotal_cents >= 0),
  starts_at           timestamptz,
  ends_at             timestamptz,
  usage_limit         integer check (usage_limit > 0),
  times_used          integer not null default 0 check (times_used >= 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check ((kind = 'percent' and percent_off is not null and amount_off_cents is null)
      or (kind = 'fixed' and amount_off_cents is not null and percent_off is null)),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ── Customers & orders ─────────────────────────────────────────
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique check (phone ~ '^\+961[0-9]{7,8}$'),   -- E.164, as the storefront normalises it
  full_name   text not null,
  email       text,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.orders (
  id                text primary key check (id ~ '^CL-[0-9]{6}-[A-Z0-9]{4}$'),
  customer_id       uuid references public.customers (id) on delete set null,
  status            text not null check (status in
                      ('awaiting_whatsapp', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  order_method      text not null check (order_method in ('cod', 'whatsapp')),
  cod_currency      text check (cod_currency in ('USD', 'LBP')),
  -- Contact & address as entered at checkout (kept even if the customer record changes)
  full_name         text not null,
  phone             text not null check (phone ~ '^\+961[0-9]{7,8}$'),
  email             text,
  zone_id           text references public.delivery_zones (id) on update cascade on delete set null,
  zone_name         text,
  city              text not null default '',
  street            text not null default '',
  building          text not null default '',
  delivery_notes    text,
  -- Money, computed by the server at checkout
  subtotal_cents    integer not null check (subtotal_cents >= 0),
  discount_cents    integer not null default 0 check (discount_cents >= 0),
  delivery_cents    integer not null default 0 check (delivery_cents >= 0),
  total_cents       integer not null check (total_cents >= 0),
  promo_code        text,
  internal_notes    text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (total_cents = subtotal_cents - discount_cents + delivery_cents)
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_customer_idx on public.orders (customer_id);
create index orders_phone_idx on public.orders (phone, created_at desc);

create table public.order_items (
  id                bigint generated always as identity primary key,
  order_id          text not null references public.orders (id) on delete cascade,
  product_id        text references public.products (id) on update cascade on delete set null,
  product_name      text not null,           -- snapshot at time of sale
  product_slug      text,
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  unit_cost_cents   integer check (unit_cost_cents >= 0),   -- snapshot for profit reports
  qty               integer not null check (qty > 0),
  line_total_cents  integer generated always as (unit_price_cents * qty) stored
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id          bigint generated always as identity primary key,
  order_id    text not null references public.orders (id) on delete cascade,
  status      text not null,
  note        text,
  changed_by  uuid,
  created_at  timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ── Inventory & finance ────────────────────────────────────────
create table public.inventory_movements (
  id          bigint generated always as identity primary key,
  product_id  text not null references public.products (id) on update cascade on delete cascade,
  change      integer not null check (change <> 0),
  reason      text not null check (reason in ('sale', 'cancel', 'restock', 'adjustment', 'return')),
  order_id    text references public.orders (id) on delete set null,
  note        text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  spent_on      date not null default current_date,
  category      text not null check (category in
                  ('stock', 'delivery', 'marketing', 'packaging', 'rent', 'salaries', 'utilities', 'fees', 'other')),
  amount_cents  integer not null check (amount_cents > 0),
  note          text not null default '',
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index expenses_spent_on_idx on public.expenses (spent_on desc);

-- ── Audit log (written by triggers, read by admins) ────────────
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  actor       uuid,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ── updated_at triggers ────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['admin_users', 'store_settings', 'categories', 'brands', 'products', 'product_images',
                           'delivery_zones', 'promotions', 'customers', 'orders', 'expenses']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
                   t || '_touch_updated_at', t);
  end loop;
end $$;
