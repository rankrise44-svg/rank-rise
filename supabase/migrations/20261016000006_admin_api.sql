-- ═══════════════════════════════════════════════════════════════
-- Cedarline · 0006 · Admin dashboard helpers
-- ───────────────────────────────────────────────────────────────
-- The dashboard reads and writes the tables directly (row-level
-- security from 0002 limits that to admins). These functions cover
-- what a plain table call can't do safely:
--   admin_me()              who is signed in, and their role
--   admin_list_admins()     admins with their emails (auth.users is private)
--   admin_add_admin()       owners: make an existing account an admin
--   admin_adjust_stock()    change stock and log it, in one step
--   admin_set_stock()       set stock to a count (logs the difference)
--   admin_report()          sales, cost, expenses and profit for a period
-- All of them refuse anyone who isn't an admin. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

create index if not exists orders_created_idx on public.orders (created_at desc);

-- ── Who am I ───────────────────────────────────────────────────
create or replace function public.admin_me()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('userId', u.id, 'email', u.email, 'role', a.role)
    from auth.users u
    left join public.admin_users a on a.user_id = u.id
   where u.id = auth.uid();
$$;

-- ── Admin accounts ─────────────────────────────────────────────
create or replace function public.admin_list_admins()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can see this.' using errcode = 'P0001', hint = 'not_admin';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('userId', a.user_id, 'email', u.email, 'role', a.role, 'since', a.created_at)
                     order by a.role desc, u.email)
      from public.admin_users a join auth.users u on u.id = a.user_id), '[]'::jsonb);
end $$;

create or replace function public.admin_add_admin(p_email text, p_role text default 'admin')
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_owner() then
    raise exception 'Only the store owner can add admins.' using errcode = 'P0001', hint = 'not_owner';
  end if;
  if p_role not in ('owner', 'admin') then
    raise exception 'Choose a role: owner or admin.' using errcode = 'P0001', hint = 'invalid_role';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'There''s no account with that email yet. Create it first in Supabase → Authentication → Users, then add it here.'
      using errcode = 'P0001', hint = 'no_account';
  end if;
  insert into public.admin_users (user_id, role) values (v_user, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return jsonb_build_object('userId', v_user, 'role', p_role);
end $$;

-- ── Stock ──────────────────────────────────────────────────────
create or replace function public.admin_adjust_stock(p_product_id text, p_change integer, p_reason text default 'adjustment', p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change stock.' using errcode = 'P0001', hint = 'not_admin';
  end if;
  if p_reason not in ('restock', 'adjustment', 'return') then
    raise exception 'Choose a reason: restock, adjustment or return.' using errcode = 'P0001', hint = 'invalid_reason';
  end if;
  if coalesce(p_change, 0) = 0 then
    select stock into v_stock from public.products where id = p_product_id;
    return v_stock;
  end if;
  select stock into v_stock from public.products where id = p_product_id for update;
  if not found then
    raise exception 'That product doesn''t exist.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if v_stock + p_change < 0 then
    raise exception 'Stock can''t go below zero (there are % in stock).', v_stock using errcode = 'P0001', hint = 'negative_stock';
  end if;
  update public.products set stock = stock + p_change where id = p_product_id returning stock into v_stock;
  insert into public.inventory_movements (product_id, change, reason, note, created_by)
  values (p_product_id, p_change, p_reason, nullif(trim(coalesce(p_note, '')), ''), auth.uid());
  return v_stock;
end $$;

create or replace function public.admin_set_stock(p_product_id text, p_stock integer, p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_current integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change stock.' using errcode = 'P0001', hint = 'not_admin';
  end if;
  if p_stock is null or p_stock < 0 then
    raise exception 'Stock must be 0 or more.' using errcode = 'P0001', hint = 'negative_stock';
  end if;
  select stock into v_current from public.products where id = p_product_id for update;
  if not found then
    raise exception 'That product doesn''t exist.' using errcode = 'P0001', hint = 'not_found';
  end if;
  return public.admin_adjust_stock(p_product_id, p_stock - v_current,
                                   case when p_stock > v_current then 'restock' else 'adjustment' end, p_note);
end $$;

-- ── Reports ────────────────────────────────────────────────────
-- Counts orders that are confirmed or further along (not cancelled,
-- not still waiting for WhatsApp confirmation). Days are Beirut days.
create or replace function public.admin_report(p_from date, p_to date)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only admins can see reports.' using errcode = 'P0001', hint = 'not_admin';
  end if;
  with o as (
    select o.*, (o.created_at at time zone 'Asia/Beirut')::date as day
      from public.orders o
     where (o.created_at at time zone 'Asia/Beirut')::date between p_from and p_to
  ), counted as (
    select * from o where status not in ('cancelled', 'awaiting_whatsapp')
  ), items as (
    select i.* from public.order_items i join counted c on c.id = i.order_id
  ), ex as (
    select * from public.expenses where spent_on between p_from and p_to
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'orders',        (select count(*) from counted),
    'awaiting',      (select count(*) from o where status = 'awaiting_whatsapp'),
    'cancelled',     (select count(*) from o where status = 'cancelled'),
    'sales',         (select coalesce(sum(subtotal_cents - discount_cents), 0) from counted),
    'discounts',     (select coalesce(sum(discount_cents), 0) from counted),
    'delivery',      (select coalesce(sum(delivery_cents), 0) from counted),
    'revenue',       (select coalesce(sum(total_cents), 0) from counted),
    'units',         (select coalesce(sum(qty), 0) from items),
    'cogs',          (select coalesce(sum(coalesce(unit_cost_cents, 0) * qty), 0) from items),
    'unitsMissingCost', (select coalesce(sum(qty), 0) from items where unit_cost_cents is null),
    'expenses',      (select coalesce(sum(amount_cents), 0) from ex),
    'expensesByCategory', (select coalesce(jsonb_object_agg(category, total), '{}'::jsonb)
                             from (select category, sum(amount_cents) as total from ex group by category) t),
    'byDay', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'orders', d.n, 'revenue', d.revenue) order by d.day), '[]'::jsonb)
                from (select day, count(*) as n, sum(total_cents) as revenue from counted group by day) d),
    'topProducts', (select coalesce(jsonb_agg(jsonb_build_object('productId', t.product_id, 'name', t.name, 'units', t.units, 'sales', t.sales)
                                              order by t.units desc, t.sales desc), '[]'::jsonb)
                      from (select product_id, max(product_name) as name, sum(qty) as units, sum(line_total_cents) as sales
                              from items group by product_id order by sum(qty) desc, sum(line_total_cents) desc limit 10) t)
  ) into v;
  return v;
end $$;

revoke execute on function public.admin_me(), public.admin_list_admins(), public.admin_add_admin(text, text),
  public.admin_adjust_stock(text, integer, text, text), public.admin_set_stock(text, integer, text),
  public.admin_report(date, date)
  from public, anon;
grant execute on function public.admin_me(), public.admin_list_admins(), public.admin_add_admin(text, text),
  public.admin_adjust_stock(text, integer, text, text), public.admin_set_stock(text, integer, text),
  public.admin_report(date, date)
  to authenticated;
