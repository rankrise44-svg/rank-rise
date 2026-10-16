-- ═══════════════════════════════════════════════════════════════
-- Cedarline — 3/4 · Storefront API (what shoppers can reach)
-- ───────────────────────────────────────────────────────────────
-- Shoppers never read tables. They get:
--   • Read-only views whose rows match the storefront's existing
--     data shape field for field (js/data/*.js), so the storefront
--     can switch data sources without any UI change.
--     These views run with their owner's rights on purpose
--     (security_invoker = false): that is what lets them show
--     public columns while the tables stay locked. Private columns
--     (cost_cents, internal fields) are simply not selected.
--   • Three functions:
--       check_promo(code, subtotal_cents)   validate a promo code
--       place_order(order jsonb)            create an order; the server
--                                           re-prices everything
--       track_order(order_id, phone)        order status lookup
-- ═══════════════════════════════════════════════════════════════

-- ── Read-only views ────────────────────────────────────────────
create view public.storefront_settings with (security_invoker = false) as
select name, tagline, about, email, phone, whatsapp, address, hours,
       currency_code                                    as "currencyCode",
       lbp_rate                                         as "lbpRate",
       round(free_delivery_threshold_cents / 100.0, 2) as "freeThreshold",
       delivery_eta_text                                as "etaText",
       max_qty_per_line                                 as "maxQtyPerLine"
from public.store_settings;

create view public.storefront_categories with (security_invoker = false) as
select id, name, blurb, icon_url as icon, sort_order as "sortOrder"
from public.categories
where is_active
order by sort_order, name;

create view public.storefront_brands with (security_invoker = false) as
select id, name, about, logo_url as logo, sort_order as "sortOrder"
from public.brands
where is_active
order by sort_order, name;

create view public.storefront_delivery_zones with (security_invoker = false) as
select id, name, round(fee_cents / 100.0, 2) as fee, eta, sort_order as "sortOrder"
from public.delivery_zones
where is_active
order by sort_order, name;

create view public.storefront_products with (security_invoker = false) as
select p.id,
       p.slug,
       p.name,
       p.category_id                                      as category,
       p.brand_id                                         as brand,
       round(p.price_cents / 100.0, 2)                    as price,
       round(p.compare_at_cents / 100.0, 2)               as "compareAtPrice",
       p.stock,
       p.rating::float8                                   as rating,
       p.review_count                                     as "reviewCount",
       p.badges,
       p.tags,
       p.short_description                                as "shortDescription",
       p.description,
       p.features,
       p.specs,
       coalesce((select array_agg(i.url order by i.position)
                 from public.product_images i where i.product_id = p.id), '{}')  as images,
       p.cutout_url                                       as cutout,
       to_char(p.listed_on, 'YYYY-MM-DD')                 as "createdAt",
       p.featured,
       p.popularity
from public.products p
join public.categories c on c.id = p.category_id and c.is_active
where p.is_active;

grant select on public.storefront_settings, public.storefront_categories, public.storefront_brands,
                public.storefront_delivery_zones, public.storefront_products
  to anon, authenticated;

-- ── Promo codes ────────────────────────────────────────────────
-- Same rules as js/services/pricing.js: percent → rounded share of the
-- subtotal; fixed → capped at the subtotal; optional minimum subtotal.
create or replace function public.promo_discount(p_code text, p_subtotal_cents integer)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  p public.promotions;
begin
  if v_code = '' then
    return jsonb_build_object('valid', false, 'error', 'Enter a promo code.');
  end if;
  select * into p from public.promotions
   where code = v_code and is_active
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now())
     and (usage_limit is null or times_used < usage_limit);
  if not found then
    return jsonb_build_object('valid', false, 'error', 'That code isn’t valid.');
  end if;
  if p_subtotal_cents < p.min_subtotal_cents then
    return jsonb_build_object('valid', false,
      'error', format('This code needs a subtotal of at least $%s.', trim(to_char(p.min_subtotal_cents / 100.0, 'FM999999990.00'))));
  end if;
  return jsonb_build_object(
    'valid', true, 'code', p.code, 'label', p.label,
    'discount_cents', case p.kind
                        when 'percent' then round(p_subtotal_cents * p.percent_off / 100.0)::integer
                        else least(p_subtotal_cents, p.amount_off_cents) end);
end $$;

-- Public wrapper used by the cart page.
create or replace function public.check_promo(p_code text, p_subtotal_cents integer)
returns jsonb
language sql stable security definer set search_path = ''
as $$ select public.promo_discount(p_code, greatest(coalesce(p_subtotal_cents, 0), 0)); $$;

-- ── Order numbers ──────────────────────────────────────────────
-- CL-YYMMDD-XXXX, same format as the storefront (Beirut date).
create or replace function public.new_order_id()
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I, easier to read out on the phone
  v_id text;
begin
  loop
    v_id := 'CL-' || to_char(now() at time zone 'Asia/Beirut', 'YYMMDD') || '-'
         || (select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
               from generate_series(1, 4));
    exit when not exists (select 1 from public.orders where id = v_id);
  end loop;
  return v_id;
end $$;

-- ── Place an order ─────────────────────────────────────────────
-- Input (prices from the browser are ignored on purpose):
-- {
--   "method": "cod" | "whatsapp",
--   "codCurrency": "USD" | "LBP",
--   "customer": { "fullName": "...", "phone": "+9617xxxxxxx", "email": "..." },
--   "address":  { "zoneId": "beirut", "city": "...", "street": "...", "building": "...", "notes": "..." },
--   "items":    [ { "productId": "p001", "qty": 2 }, ... ],
--   "promoCode": "WELCOME10"
-- }
create or replace function public.place_order(p_order jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s            public.store_settings;
  v_method     text := p_order ->> 'method';
  v_name       text := trim(coalesce(p_order #>> '{customer,fullName}', ''));
  v_phone      text := trim(coalesce(p_order #>> '{customer,phone}', ''));
  v_email      text := nullif(trim(coalesce(p_order #>> '{customer,email}', '')), '');
  v_zone_id    text := nullif(trim(coalesce(p_order #>> '{address,zoneId}', '')), '');
  v_city       text := trim(coalesce(p_order #>> '{address,city}', ''));
  v_street     text := trim(coalesce(p_order #>> '{address,street}', ''));
  v_building   text := trim(coalesce(p_order #>> '{address,building}', ''));
  v_notes      text := nullif(trim(coalesce(p_order #>> '{address,notes}', '')), '');
  v_cod_cur    text;
  v_zone       public.delivery_zones;
  v_line       record;
  v_product    public.products;
  v_subtotal   integer := 0;
  v_discount   integer := 0;
  v_delivery   integer := 0;
  v_promo      jsonb;
  v_promo_code text;
  v_customer   uuid;
  v_order_id   text;
  v_status     text;
  v_lines      int;
begin
  select * into s from public.store_settings limit 1;

  -- Who and how
  if v_method is null or v_method not in ('cod', 'whatsapp') then
    raise exception 'Choose how you’d like to order.' using errcode = 'P0001', hint = 'invalid_method';
  end if;
  if length(v_name) < 3 or length(v_name) > 80 then
    raise exception 'Enter your full name.' using errcode = 'P0001', hint = 'invalid_name';
  end if;
  if v_phone !~ '^\+961[0-9]{7,8}$' then
    raise exception 'Enter a Lebanese mobile number.' using errcode = 'P0001', hint = 'invalid_phone';
  end if;
  if v_email is not null and (length(v_email) > 120 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$') then
    raise exception 'Enter a valid email address.' using errcode = 'P0001', hint = 'invalid_email';
  end if;
  if length(coalesce(v_notes, '')) > 300 or length(v_city) > 60 or length(v_street) > 120 or length(v_building) > 80 then
    raise exception 'Some address details are too long.' using errcode = 'P0001', hint = 'invalid_address';
  end if;

  -- Basic flood protection: at most 5 orders per phone in 10 minutes.
  if (select count(*) from public.orders
       where phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many orders in a short time. Please wait a few minutes or message us on WhatsApp.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  -- Delivery zone (required for cash on delivery, optional for WhatsApp)
  if v_zone_id is not null then
    select * into v_zone from public.delivery_zones where id = v_zone_id and is_active;
    if not found then
      raise exception 'Choose a valid governorate.' using errcode = 'P0001', hint = 'invalid_zone';
    end if;
  end if;
  if v_method = 'cod' and (v_zone_id is null or length(v_city) < 2 or length(v_street) < 3 or v_building = '') then
    raise exception 'Delivery address is required for cash on delivery.' using errcode = 'P0001', hint = 'invalid_address';
  end if;
  v_cod_cur := case when v_method = 'cod' then coalesce(nullif(p_order ->> 'codCurrency', ''), 'USD') end;
  if v_cod_cur is not null and v_cod_cur not in ('USD', 'LBP') then
    raise exception 'Choose USD or LBP.' using errcode = 'P0001', hint = 'invalid_currency';
  end if;

  -- Items: merge duplicates, then lock each product row and re-price from the database
  if jsonb_typeof(p_order -> 'items') <> 'array' then
    raise exception 'Your cart is empty.' using errcode = 'P0001', hint = 'empty_cart';
  end if;
  drop table if exists pg_temp._lines;
  create temp table _lines on commit drop as
    select (x ->> 'productId') as product_id, sum((x ->> 'qty')::int) as qty
      from jsonb_array_elements(p_order -> 'items') x
     where (x ->> 'productId') is not null and (x ->> 'qty') ~ '^[0-9]{1,4}$'
     group by 1;
  select count(*) into v_lines from pg_temp._lines;
  if v_lines = 0 then
    raise exception 'Your cart is empty.' using errcode = 'P0001', hint = 'empty_cart';
  end if;
  if v_lines > 50 then
    raise exception 'Too many different items in one order.' using errcode = 'P0001', hint = 'too_many_lines';
  end if;

  for v_line in select * from pg_temp._lines order by product_id loop   -- fixed order avoids deadlocks
    select * into v_product from public.products where id = v_line.product_id and is_active for update;
    if not found then
      raise exception 'A product in your cart is no longer available.' using errcode = 'P0001', hint = 'product_unavailable';
    end if;
    if v_line.qty < 1 or v_line.qty > s.max_qty_per_line then
      raise exception 'You can order up to % of “%”.', s.max_qty_per_line, v_product.name using errcode = 'P0001', hint = 'invalid_qty';
    end if;
    if v_product.stock < v_line.qty then
      raise exception 'Only % of “%” left in stock.', v_product.stock, v_product.name using errcode = 'P0001', hint = 'out_of_stock';
    end if;
    v_subtotal := v_subtotal + v_product.price_cents * v_line.qty;
  end loop;

  -- Promo
  if nullif(trim(coalesce(p_order ->> 'promoCode', '')), '') is not null then
    v_promo := public.promo_discount(p_order ->> 'promoCode', v_subtotal);
    if not (v_promo ->> 'valid')::boolean then
      raise exception '%', v_promo ->> 'error' using errcode = 'P0001', hint = 'invalid_promo';
    end if;
    v_discount := (v_promo ->> 'discount_cents')::int;
    v_promo_code := v_promo ->> 'code';
    update public.promotions set times_used = times_used + 1 where code = v_promo_code;
  end if;

  -- Delivery: free over the threshold (after discount); unknown zone → confirmed later on WhatsApp
  if v_zone_id is not null and v_subtotal - v_discount < s.free_delivery_threshold_cents then
    v_delivery := v_zone.fee_cents;
  end if;

  -- Customer record (keyed by phone)
  insert into public.customers (phone, full_name, email)
  values (v_phone, v_name, v_email)
  on conflict (phone) do update
     set full_name = excluded.full_name,
         email = coalesce(excluded.email, public.customers.email)
  returning id into v_customer;

  -- Order
  v_order_id := public.new_order_id();
  v_status := case v_method when 'cod' then 'confirmed' else 'awaiting_whatsapp' end;
  insert into public.orders (id, customer_id, status, order_method, cod_currency, full_name, phone, email,
                             zone_id, zone_name, city, street, building, delivery_notes,
                             subtotal_cents, discount_cents, delivery_cents, total_cents, promo_code)
  values (v_order_id, v_customer, v_status, v_method, v_cod_cur, v_name, v_phone, v_email,
          v_zone_id, v_zone.name, v_city, v_street, v_building, v_notes,
          v_subtotal, v_discount, v_delivery, v_subtotal - v_discount + v_delivery, v_promo_code);

  -- Lines, stock and inventory log
  for v_line in select * from pg_temp._lines order by product_id loop
    update public.products set stock = stock - v_line.qty where id = v_line.product_id
      returning * into v_product;
    insert into public.order_items (order_id, product_id, product_name, product_slug, unit_price_cents, unit_cost_cents, qty)
    values (v_order_id, v_product.id, v_product.name, v_product.slug, v_product.price_cents, v_product.cost_cents, v_line.qty);
    insert into public.inventory_movements (product_id, change, reason, order_id)
    values (v_product.id, -v_line.qty, 'sale', v_order_id);
  end loop;

  return (
    select jsonb_build_object(
      'id', o.id, 'status', o.status, 'method', o.order_method, 'codCurrency', o.cod_currency,
      'createdAt', o.created_at, 'zoneName', o.zone_name,
      'totals', jsonb_build_object('subtotal', o.subtotal_cents, 'discount', o.discount_cents,
                                   'delivery', o.delivery_cents, 'total', o.total_cents, 'promoCode', o.promo_code),
      'items', (select jsonb_agg(jsonb_build_object('productId', i.product_id, 'name', i.product_name, 'slug', i.product_slug,
                                                    'unitPrice', i.unit_price_cents, 'qty', i.qty) order by i.id)
                  from public.order_items i where i.order_id = o.id))
    from public.orders o where o.id = v_order_id);
end $$;

-- ── Track an order ─────────────────────────────────────────────
-- Needs both the order number and the phone used at checkout.
-- Returns null when they don't match (no hint about which one is wrong).
create or replace function public.track_order(p_order_id text, p_phone text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
           'id', o.id, 'status', o.status, 'method', o.order_method, 'createdAt', o.created_at,
           'zoneName', o.zone_name, 'city', o.city, 'total', o.total_cents,
           'itemCount', (select coalesce(sum(qty), 0) from public.order_items where order_id = o.id),
           'history', (select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at) order by h.created_at)
                         from public.order_status_history h where h.order_id = o.id))
    from public.orders o
   where o.id = upper(trim(p_order_id)) and o.phone = trim(p_phone);
$$;

revoke execute on function public.promo_discount(text, integer), public.new_order_id() from public, anon, authenticated;
grant execute on function public.check_promo(text, integer), public.place_order(jsonb), public.track_order(text, text)
  to anon, authenticated;

-- ── Order lifecycle triggers ───────────────────────────────────
-- Status history for every new order and every status change, and
-- stock goes back on the shelf when an order is cancelled.
create or replace function public.on_order_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status, changed_by) values (new.id, new.status, auth.uid());
    return new;
  end if;
  if new.status is distinct from old.status then
    if old.status = 'cancelled' then
      raise exception 'A cancelled order can’t be reopened. Place a new order instead.' using errcode = 'P0001';
    end if;
    insert into public.order_status_history (order_id, status, changed_by) values (new.id, new.status, auth.uid());
    if new.status = 'cancelled' then
      update public.products p set stock = p.stock + i.qty
        from public.order_items i where i.order_id = new.id and i.product_id = p.id;
      insert into public.inventory_movements (product_id, change, reason, order_id, created_by)
        select i.product_id, i.qty, 'cancel', new.id, auth.uid()
          from public.order_items i where i.order_id = new.id and i.product_id is not null;
    end if;
  end if;
  return new;
end $$;

create trigger orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.on_order_status();
