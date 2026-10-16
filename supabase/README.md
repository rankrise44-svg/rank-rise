# Cedarline — Supabase backend

The database, security rules and image storage shared by the storefront
(`/shop/`) and the future admin dashboard.

**Nothing here changes the storefront yet.** The shop still runs on
`shop/js/data/*.js` until it's switched over in a later, separately
approved step.

```
supabase/
  migrations/
    20261016000001_schema.sql          tables
    20261016000002_security.sql        admin role, row-level security, audit log
    20261016000003_storefront_api.sql  public views + check_promo / place_order / track_order
    20261016000004_storage.sql         "product-images" bucket + admin-only upload rules
  seed.sql                             today's catalog, generated from shop/js/data
  tests/                               local security + behaviour tests
scripts/supabase/
  export-seed.mjs                      regenerates seed.sql from the storefront data
  check-connection.mjs                 read-only check of the live project (public key only)
shop/js/supabase.config.js             public URL + anon key (empty for now; not loaded)
shop/js/lib/supabase-rest.js           tiny storefront client (not loaded yet)
```

## Set it up (about 10 minutes)

### 1 · Run the SQL
In the Supabase dashboard open **SQL Editor → New query**. Paste and run
each file **in this order**, one at a time:

1. `migrations/20261016000001_schema.sql`
2. `migrations/20261016000002_security.sql`
3. `migrations/20261016000003_storefront_api.sql`
4. `migrations/20261016000004_storage.sql`
5. `seed.sql`

Each should finish with "Success. No rows returned". Re-running `seed.sql`
is safe: it never overwrites existing rows.

Check: **Table Editor → products** shows 24 rows, and **Storage** shows a
`product-images` bucket.

### 2 · Lock down sign-ups
In **Authentication → Sign In / Providers** (the label may differ
slightly):
- **Turn off "Allow new users to sign up".** Admins are invited, never
  self-registered.
- Keep the email provider on. Enable **multi-factor authentication
  (TOTP)** if offered, and use it on every admin account.

### 3 · Create the first owner
1. **Authentication → Users → Add user** (or **Invite**). Use your own
   email.
2. In the SQL Editor, run (with your email):

   ```sql
   insert into public.admin_users (user_id, role)
   select id, 'owner' from auth.users where email = 'you@example.com';
   ```

Only owners can add or remove other admins (from the dashboard, later).
The database refuses to remove the last owner.

### 4 · Share the public connection details
From **Project Settings → API**, copy:
- **Project URL**: `https://xxxx.supabase.co`
- the **anon / public** key

Either send them to your developer or paste them into
`shop/js/supabase.config.js`. They are designed to be public.

> **Never** share or commit the `service_role` key or the database
> password. They bypass every rule in this folder.

### 5 · Verify (optional)
```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=eyJ... \
  node scripts/supabase/check-connection.mjs
```
This uses only the public key. It confirms the catalog is readable and
that orders, customers, promo codes and cost prices are **not**.

## How the security works

| Who | Can do |
|---|---|
| **Shoppers** (anon key, no login) | Read the `storefront_*` views (public catalog, categories, brands, delivery zones, settings). Call `check_promo`, `place_order`, `track_order`. **No access to any table.** |
| **Signed-in user who is not an admin** | Nothing. Every table policy requires a row in `admin_users`. |
| **Admin** | Read and change all store data, upload, replace and delete product images, read the audit log. |
| **Owner** | Everything an admin can, plus add, remove or change admins. |

- **Prices are never trusted from the browser.** `place_order` re-reads
  prices, stock, the promo code and the delivery fee from the database,
  locks the product rows, and decrements stock in the same transaction.
- **Cost prices stay private.** `products.cost_cents` exists for profit
  reports but is not in any public view.
- **Flood protection:** at most 5 orders per phone number per 10 minutes.
- **Audit log:** every insert, update or delete on store data records who
  made it and the before/after values.
- **Cancelling an order** puts its stock back automatically. A cancelled
  order can't be reopened.

### Expected warning
Supabase's **Security Advisor** may flag the `storefront_*` views as
"security definer views". This is intentional: they let shoppers see
selected public columns while the tables themselves stay locked. Each view
selects only safe columns and active rows.

### When adding tables later
Supabase grants new tables to the public roles by default. **Every new
table must `enable row level security`** and get an admins-only policy,
following `migrations/20261016000002_security.sql`.

## Data model (summary)

| Area | Tables |
|---|---|
| Catalog | `products` (ids `p001…` kept), `product_images`, `categories`, `brands` |
| Selling | `promotions`, `delivery_zones`, `store_settings` (one row) |
| Orders | `orders` (`CL-YYMMDD-XXXX`), `order_items` (price + cost snapshot), `order_status_history`, `customers` (one per phone) |
| Stock & money | `inventory_movements` (every sale, cancel, restock), `expenses` |
| Admin | `admin_users` (owner/admin), `audit_log` |

Order statuses: `awaiting_whatsapp` → `confirmed` → `packed` →
`out_for_delivery` → `delivered`, or `cancelled`. Cash-on-delivery orders
start as `confirmed`.

Note: WhatsApp orders reserve stock as soon as they're placed. Cancel
abandoned ones from the dashboard to release it (automatic expiry can be
added later).

## Local tests
`tests/run.sh` applies everything to a scratch PostgreSQL database (using
a small stand-in for Supabase's `auth` and `storage` schemas) and runs 61
security and behaviour checks. See the comments at the top of that file.
