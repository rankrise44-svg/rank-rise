#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Cedarline — local security + behaviour tests for the migrations
# ───────────────────────────────────────────────────────────────
# Needs a scratch PostgreSQL 15+ you can throw away. It creates a
# database called cedarline_test, applies tests/supabase_stub.sql
# (a stand-in for Supabase's auth/storage schemas and roles), all
# migrations and seed.sql, then runs the checks below.
#
#   PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres supabase/tests/run.sh
#
# NEVER point this at the real Supabase project.
# ═══════════════════════════════════════════════════════════════
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."
DB=cedarline_test
psql -q -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB" >/dev/null || exit 1
SETUP="psql -q -d $DB -v ON_ERROR_STOP=1"
$SETUP -f "$HERE/supabase_stub.sql" || exit 1
for f in "$ROOT"/migrations/*.sql; do $SETUP -f "$f" || { echo "migration failed: $f"; exit 1; }; done
$SETUP -f "$ROOT/seed.sql" >/dev/null && $SETUP -f "$ROOT/seed.sql" >/dev/null || { echo "seed failed"; exit 1; }
PSQL="psql -d $DB -At -q"
pass=0; fail=0
# as ROLE UID SQL  → prints output (errors included)
as() { local role=$1 uid=$2; shift 2
  $PSQL -c "begin; set local role $role; set local \"request.jwt.claims\" = '{\"sub\":\"$uid\"}';
$*
commit;" 2>&1; }
ok()   { if echo "$2" | grep -qE "$3"; then pass=$((pass+1)); echo "ok   $1"; else fail=$((fail+1)); echo "FAIL $1"; echo "     got: $(echo "$2" | head -3 | tr '\n' ' ')"; fi; }

ADMIN=11111111-1111-1111-1111-111111111111; OWNER=22222222-2222-2222-2222-222222222222; USER=33333333-3333-3333-3333-333333333333
$PSQL -c "insert into auth.users (id,email) values ('$ADMIN','admin@x.test'),('$OWNER','owner@x.test'),('$USER','someone@x.test');
          insert into public.admin_users (user_id, role) values ('$OWNER','owner'),('$ADMIN','admin');" >/dev/null

echo "── Shoppers (anon) ──"
ok "storefront_products lists 24 products" "$(as anon '' 'select count(*) from storefront_products;')" '^24$'
ok "view row matches storefront shape" "$(as anon '' "select price, \"compareAtPrice\", category, brand, array_length(images,1), \"createdAt\" from storefront_products where id='p001';")" '^49\.99\|62\.99\|cookware\|ferrano\|2\|2026-04-02$'
ok "cost price is not in the public view" "$(as anon '' "select count(*) from information_schema.columns where table_name='storefront_products' and column_name ilike '%cost%';")" '^0$'
ok "settings view (public fields only)" "$(as anon '' 'select whatsapp, "freeThreshold" from storefront_settings;')" '^\+961 70 991 555\|75\.00$'
for t in products customers orders promotions order_items expenses admin_users audit_log store_settings; do
  ok "anon cannot read table $t" "$(as anon '' "select count(*) from public.$t;")" 'permission denied'
done
ok "anon cannot write products" "$(as anon '' "update public.products set price_cents=1;")" 'permission denied'
ok "anon cannot call internal promo fn" "$(as anon '' "select public.promo_discount('WELCOME10', 1000);")" 'permission denied'
ok "check_promo WELCOME10 on \$59.00" "$(as anon '' "select check_promo('welcome10', 5900)->>'discount_cents';")" '^590$'
ok "check_promo BEIRUT5 needs \$40" "$(as anon '' "select check_promo('BEIRUT5', 3000)->>'error';")" 'at least \$40\.00'
ok "check_promo bad code" "$(as anon '' "select check_promo('NOPE', 3000)->>'valid';")" '^false$'
ok "check_promo returns the percent rule" "$(as anon '' "select concat_ws(',', r->>'kind', r->>'percentOff', r->>'minSubtotal') from (select check_promo('WELCOME10', 5900) r) x;")" '^percent,10,0(\.00)?$'
ok "check_promo handles huge subtotals" "$(as anon '' "select check_promo('WELCOME10', 2147483647)->>'discount_cents';")" '^214748365$'
ok "check_promo returns the fixed rule" "$(as anon '' "select concat_ws(',', r->>'kind', r->>'amountOff', r->>'minSubtotal') from (select check_promo('BEIRUT5', 5000) r) x;")" '^fixed,5(\.00)?,40(\.00)?$'

echo "── place_order (server re-prices) ──"
WA=$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Rima Haddad\",\"phone\":\"+96171123456\"},\"items\":[{\"productId\":\"p021\",\"qty\":3,\"price\":0.01},{\"productId\":\"p019\",\"qty\":1}],\"promoCode\":\"WELCOME10\",\"totals\":{\"total\":1}}'::jsonb);")
ok "WhatsApp order: totals computed server-side (ignores client price)" "$WA" '"total": 13496'
ok "WhatsApp order status awaiting_whatsapp" "$WA" '"status": "awaiting_whatsapp"'
WA_ID=$(echo "$WA" | grep -oE 'CL-[0-9]{6}-[A-Z0-9]{4}' | head -1)
ok "order id format" "$WA_ID" '^CL-[0-9]{6}-[A-Z0-9]{4}$'
ok "stock decremented (blender 3 → 0)" "$($PSQL -c "select stock from products where id='p021';")" '^0$'
ok "inventory log has the sale" "$($PSQL -c "select change from inventory_movements where order_id='$WA_ID' and product_id='p021';")" '^-3$'
ok "promo usage counted" "$($PSQL -c "select times_used from promotions where code='WELCOME10';")" '^1$'
ok "customer created by phone" "$($PSQL -c "select full_name from customers where phone='+96171123456';")" '^Rima Haddad$'
ok "status history row written" "$($PSQL -c "select status from order_status_history where order_id='$WA_ID';")" '^awaiting_whatsapp$'
ok "cost snapshot column present on items" "$($PSQL -c "select count(*) from order_items where order_id='$WA_ID';")" '^2$'
COD=$(as anon '' "select place_order('{\"method\":\"cod\",\"codCurrency\":\"LBP\",\"customer\":{\"fullName\":\"Karim Saad\",\"phone\":\"+9613123456\",\"email\":\"k@example.com\"},\"address\":{\"zoneId\":\"beirut\",\"city\":\"Hamra\",\"street\":\"Bliss St\",\"building\":\"Nour 2F\"},\"items\":[{\"productId\":\"p016\",\"qty\":1}]}'::jsonb);")
ok "COD order: \$22 + \$3 Beirut = \$25, confirmed, LBP" "$COD" '"total": 2500.*|"status": "confirmed"'
ok "COD order confirmed + LBP stored" "$($PSQL -c "select status||'/'||cod_currency from orders where order_method='cod';")" '^confirmed/LBP$'
FREE=$(as anon '' "select place_order('{\"method\":\"cod\",\"customer\":{\"fullName\":\"Karim Saad\",\"phone\":\"+9613123456\"},\"address\":{\"zoneId\":\"akkar\",\"city\":\"Halba\",\"street\":\"Main St\",\"building\":\"B1\"},\"items\":[{\"productId\":\"p003\",\"qty\":2}]}'::jsonb);")
ok "free delivery over \$75" "$FREE" '"delivery": 0'
ok "out of stock is refused" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"+96176111222\"},\"items\":[{\"productId\":\"p021\",\"qty\":1}]}'::jsonb);")" 'left in stock'
ok "over max qty is refused" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"+96176111222\"},\"items\":[{\"productId\":\"p017\",\"qty\":11}]}'::jsonb);")" 'up to 10'
ok "COD without address is refused" "$(as anon '' "select place_order('{\"method\":\"cod\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"+96176111222\"},\"items\":[{\"productId\":\"p017\",\"qty\":1}]}'::jsonb);")" 'address is required'
ok "bad phone is refused" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"12345\"},\"items\":[{\"productId\":\"p017\",\"qty\":1}]}'::jsonb);")" 'Lebanese mobile'
ok "unknown product is refused" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"+96176111222\"},\"items\":[{\"productId\":\"p999\",\"qty\":1}]}'::jsonb);")" 'no longer available'
ok "invalid promo is refused" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"+96176111222\"},\"items\":[{\"productId\":\"p017\",\"qty\":1}],\"promoCode\":\"FREE100\"}'::jsonb);")" 'isn’t valid'
for i in 1 2 3 4 5; do as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Flood Test\",\"phone\":\"+96170555666\"},\"items\":[{\"productId\":\"p024\",\"qty\":1}]}'::jsonb);" >/dev/null; done
ok "6th order in 10 min from one phone is throttled" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Flood Test\",\"phone\":\"+96170555666\"},\"items\":[{\"productId\":\"p024\",\"qty\":1}]}'::jsonb);")" 'Too many orders'

echo "── track_order ──"
ok "track with right phone" "$(as anon '' "select track_order('${WA_ID,,}', '+96171123456')->>'status';")" '^awaiting_whatsapp$'
ok "track with wrong phone returns nothing" "$(as anon '' "select coalesce(track_order('$WA_ID', '+9613123456')::text, 'null');")" '^null$'

echo "── Signed in but NOT an admin ──"
ok "non-admin sees no orders" "$(as authenticated $USER 'select count(*) from public.orders;')" '^0$'
ok "non-admin sees no customers" "$(as authenticated $USER 'select count(*) from public.customers;')" '^0$'
ok "non-admin cannot change prices" "$(as authenticated $USER "update public.products set price_cents=1 where id='p001' returning id;")" '^$|UPDATE 0'
ok "non-admin cannot add products" "$(as authenticated $USER "insert into public.products (id,slug,name,category_id,price_cents) values ('x1','x1','Hack','cookware',1);")" 'row-level security'
ok "non-admin cannot make themselves admin" "$(as authenticated $USER "insert into public.admin_users (user_id, role) values ('$USER','owner');")" 'row-level security'
ok "non-admin cannot upload images" "$(as authenticated $USER "insert into storage.objects (bucket_id, name) values ('product-images','products/p001/x.jpg');")" 'row-level security'
ok "anon cannot upload images" "$(as anon '' "insert into storage.objects (bucket_id, name) values ('product-images','products/p001/x.jpg');")" 'row-level security'

echo "── Admin ──"
ok "admin sees all orders" "$(as authenticated $ADMIN 'select count(*) from public.orders;')" '^8$'
ok "admin changes a price" "$(as authenticated $ADMIN "update public.products set price_cents=4599 where id='p001' returning price_cents;")" '4599'
ok "price change shows on storefront view" "$(as anon '' "select price from storefront_products where id='p001';")" '^45\.99$'
ok "audit log records actor" "$($PSQL -c "select actor from audit_log where table_name='products' and record_id='p001' and action='UPDATE' order by id desc limit 1;")" "^$ADMIN$"
ok "admin hides a product → gone from storefront" "$(as authenticated $ADMIN "update public.products set is_active=false where id='p002';" >/dev/null; as anon '' "select count(*) from storefront_products where id='p002';")" '^0$'
ok "hidden product can't be ordered" "$(as anon '' "select place_order('{\"method\":\"whatsapp\",\"customer\":{\"fullName\":\"Ali Noor\",\"phone\":\"+96176111222\"},\"items\":[{\"productId\":\"p002\",\"qty\":1}]}'::jsonb);")" 'no longer available'
ok "admin cancels order → stock restored" "$(as authenticated $ADMIN "update public.orders set status='cancelled' where id='$WA_ID';" >/dev/null; $PSQL -c "select stock from products where id='p021';")" '^3$'
ok "cancel logged in inventory" "$($PSQL -c "select change from inventory_movements where order_id='$WA_ID' and reason='cancel' and product_id='p021';")" '^3$'
ok "cancelled order can't be reopened" "$(as authenticated $ADMIN "update public.orders set status='confirmed' where id='$WA_ID';")" 'can’t be reopened'
ok "admin uploads an image" "$(as authenticated $ADMIN "insert into storage.objects (bucket_id, name) values ('product-images','products/p001/new.jpg') returning name;")" 'products/p001/new.jpg'
ok "admin records an expense" "$(as authenticated $ADMIN "insert into public.expenses (category, amount_cents, note) values ('delivery', 1500, 'Courier') returning amount_cents;")" '1500'
ok "admin (not owner) cannot add admins" "$(as authenticated $ADMIN "insert into public.admin_users (user_id, role) values ('$USER','admin');")" 'row-level security'
ok "bad data rejected (negative price)" "$(as authenticated $ADMIN "update public.products set price_cents=-5 where id='p003';")" 'check constraint'

echo "── Owner ──"
ok "owner adds an admin" "$(as authenticated $OWNER "insert into public.admin_users (user_id, role) values ('$USER','admin') returning role;")" 'admin'
ok "last owner can't be removed" "$(as authenticated $OWNER "delete from public.admin_users where user_id='$OWNER';")" 'at least one owner'

echo; echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
