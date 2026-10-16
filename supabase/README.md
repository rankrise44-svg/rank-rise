# Cedarline — Supabase backend

The database, security rules and image storage shared by the storefront
(`/shop/`) and the future admin dashboard.

```
supabase/
  migrations/
    20261016000001_schema.sql          tables
    20261016000002_security.sql        admin role, row-level security, audit log
    20261016000003_storefront_api.sql  public views + check_promo / place_order / track_order
    20261016000004_storage.sql         "product-images" bucket + admin-only upload rules
    20261016000005_promo_rules.sql     check_promo also returns the code's rule (for the cart)
    20261016000006_admin_api.sql       admin panel helpers: admins list, stock changes, reports
  seed.sql                             starting catalog, generated from shop/js/data
  tests/                               local security + behaviour tests
scripts/supabase/
  setup.mjs                            one-command setup of the live project (see below)
  check-connection.mjs                 read-only check of the live project (public key only)
  export-seed.mjs                      regenerates seed.sql from the storefront data
shop/js/supabase.config.js             public URL + key; empty = demo mode
shop/js/lib/supabase-rest.js           tiny storefront client
shop/admin/                            the admin panel (yourstore.com/shop/admin/)
```

## How the storefront uses it

When `shop/js/supabase.config.js` has a URL and key, the shop reads its
products, categories, brands, store details, delivery fees and LBP rate
from the database, checks promo codes with `check_promo`, places orders
with `place_order` (the database re-prices them and takes the stock) and
tracks them with `track_order`. When it's empty the shop runs on the
built-in demo data, exactly as before. If the database can't be reached
the shop stays browsable on the built-in catalog, and ordering shows an
error instead of saving anything.

## Set it up — one command

```bash
node scripts/supabase/setup.mjs            # shows what it would do; changes nothing
node scripts/supabase/setup.mjs --apply    # does it
```

It needs one thing: a Supabase **personal access token** in the
`SUPABASE_ACCESS_TOKEN` environment variable (create one at
supabase.com → Account → Access Tokens). If the account has more than
one project, also set `SUPABASE_PROJECT_REF`. It works over HTTPS only
(the Supabase Management API): no database password, no Docker and no
SQL Editor.

What `--apply` does, in order:

1. **Migrations.** It reads Supabase's migration history (the same
   table the Supabase CLI uses) and applies only the files that are
   missing. Each file runs in one transaction together with its history
   entry. If the SQL was already run by hand in the SQL Editor, it checks
   that every table, view, function, policy, trigger and bucket the file
   creates is there, and then only records it as applied. If a file is
   only *partly* there, or the database has migrations this repo doesn't
   know, it stops before changing anything.
2. **Seed.** It loads `seed.sql` only when the products table is empty,
   so it never brings back products the owner deleted or overwrites
   edits.
3. **Sign-ups.** It turns off public sign-ups (admins are invited).
4. **Storefront.** It writes the project URL and the **public**
   (publishable/anon) key into `shop/js/supabase.config.js`. It never
   reads or writes a secret key.
5. **Check.** It runs `check-connection.mjs` with the public key, the same
   access a shopper has. That confirms the catalog is readable and that
   orders, customers, promotions and cost prices are **not**.

Running it again is safe. When everything is up to date it reports
"already applied" and changes nothing.

> **Never** commit or share the access token, a `service_role`/secret
> key or the database password. The token is read from the environment
> only and is never printed or saved.

The Supabase CLI works with the same files and history if you prefer it:
`supabase link --project-ref <ref>` then `supabase db push`.

## The admin panel (`shop/admin/`)

Open **/shop/admin/** on the published site and sign in with an admin
account. It uses the same project and public key as the store, plus
the admin's own login. Everything it does is limited by the database's
row-level security, so an account that isn't in `admin_users` sees
nothing. No secret key is ever used in the browser.

| Page | What you do there |
|---|---|
| Dashboard | Orders to handle, today / this month, profit, low stock, best sellers |
| Orders | Filter and search; move an order Confirmed → Packed → Out for delivery → Delivered, cancel (stock goes back), private notes, WhatsApp/call the customer, CSV |
| Customers | Order history and total spent per customer, private notes, CSV |
| Products | Add, edit, hide or delete; prices, sale price, **cost price**, stock, photos (resized automatically), details |
| Categories & brands | Add, rename, reorder, hide, picture |
| Inventory | Restock, set a count, remove broken items; full movement log |
| Promo codes | Percent or fixed, minimum order, dates, usage limit |
| Delivery | Fee and time per area, free-delivery threshold |
| Profit & reports | Sales, product cost, expenses and profit for any period; best sellers; CSV |
| Expenses | What the shop spends, by month |
| Store settings | Name, WhatsApp number, contact details, LBP rate; change my password |
| Admins | Owners add or remove admins (the last owner can't be removed) |
| Activity log | Who changed what, and when |

**Adding an admin:** create the account in Supabase → Authentication →
Users → *Add user* (with a temporary password, "Auto confirm" ticked),
then add the same email under **Admins**.

**Password-reset emails** open the panel once the store's address is
registered. Run the setup once with `STORE_URL=https://your-site/shop/`
(it sets Supabase's Site URL and allowed redirect for `/shop/admin/`).

The panel is excluded from search engines (`robots.txt`, `X-Robots-Tag`)
and can't be embedded in other sites (`X-Frame-Options: DENY`).

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
a small stand-in for Supabase's `auth` and `storage` schemas) and runs the
security and behaviour checks (84 at the moment). See the comments at the top of that file.
