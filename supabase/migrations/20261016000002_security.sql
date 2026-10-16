-- ═══════════════════════════════════════════════════════════════
-- Cedarline — 2/4 · Security: roles, row-level security, audit log
-- ───────────────────────────────────────────────────────────────
-- The rule set, in one sentence: shoppers (the `anon` role) can't
-- touch any table directly, and signed-in users can only read or
-- change data if they are listed in admin_users.
--   • Shoppers get read-only access to safe views and a few
--     functions (see 0003). Never to tables.
--   • Being signed in is NOT enough: an account must also be listed
--     in admin_users. Only an owner can add or remove admins.
--   • Every change to store data is written to audit_log.
-- ═══════════════════════════════════════════════════════════════

-- ── Who is an admin? ───────────────────────────────────────────
-- security definer so the check works even though admin_users has RLS.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'owner');
$$;

-- ── Lock down defaults ─────────────────────────────────────────
-- Supabase grants table access to anon/authenticated by default; RLS
-- below is the real gate, and anon loses table access entirely.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- ── Row-level security on every table ──────────────────────────
do $$
declare t text;
begin
  foreach t in array array['admin_users', 'store_settings', 'categories', 'brands', 'products', 'product_images',
                           'delivery_zones', 'promotions', 'customers', 'orders', 'order_items',
                           'order_status_history', 'inventory_movements', 'expenses', 'audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Store data: admins can read and change everything.
do $$
declare t text;
begin
  foreach t in array array['store_settings', 'categories', 'brands', 'products', 'product_images',
                           'delivery_zones', 'promotions', 'customers', 'orders', 'order_items',
                           'order_status_history', 'inventory_movements', 'expenses']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      'admins manage ' || t, t);
  end loop;
end $$;

-- admin_users: you can see your own row; owners see and manage everyone.
create policy "read own admin row or all as owner" on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner()));
create policy "owners add admins" on public.admin_users
  for insert to authenticated with check ((select public.is_owner()));
create policy "owners change admins" on public.admin_users
  for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "owners remove admins" on public.admin_users
  for delete to authenticated using ((select public.is_owner()));

-- An owner can't remove or demote the last owner (avoids locking everyone out).
create or replace function public.keep_one_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and (select count(*) from public.admin_users where role = 'owner') <= 1 then
    raise exception 'The store must keep at least one owner.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger admin_users_keep_one_owner
  before update or delete on public.admin_users
  for each row execute function public.keep_one_owner();

-- audit_log: admins read it; nobody writes it except the trigger below.
create policy "admins read audit log" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

-- ── Audit trigger ──────────────────────────────────────────────
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor)
  values (tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'code', v_row ->> 'user_id'),
          tg_op, v_old, v_new, auth.uid());
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['admin_users', 'store_settings', 'categories', 'brands', 'products', 'product_images',
                           'delivery_zones', 'promotions', 'customers', 'orders', 'expenses']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
                   t || '_audit', t);
  end loop;
end $$;
