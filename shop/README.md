# Cedarline — demo home-essentials store

A complete, working e-commerce front end that lives in `/shop/`, separate
from the RankRise agency site. It uses the same stack as the rest of the
repo: static HTML, CSS and vanilla JavaScript (ES modules). There is no
build step, and it deploys on Netlify as-is.

All products, prices and contact details are **fictional**. Every page
carries `noindex`, so search engines stay out until it goes live.

## Run it

Serve the **repo root** (ES modules and the 404 page's `<base href="/shop/">`
need a real server, not `file://`):

```bash
python3 -m http.server 8000      # then open http://localhost:8000/shop/
```

## Pages

| Route | What it does |
|---|---|
| `index.html` | Home — hero, categories, bestsellers, new arrivals, promo |
| `shop.html` | Catalog with category / price / stock / sale filters and 6 sorts. State lives in the URL (`?category=kitchen,storage&min=10&max=40&stock=1&sale=1&sort=price-asc`) |
| `product.html?id=<slug>` | Gallery, stock state, quantity, add to cart, wishlist, specs, related products, Product JSON-LD |
| `cart.html` | Quantity steppers, remove, promo codes, free-delivery progress, totals |
| `checkout.html` | Validated form (Lebanese phone, governorate, address), live delivery fee, order confirmation |
| `wishlist.html` | Saved products, add-all-to-cart, clear |
| `search.html?q=` | Ranked keyword search with sorting; the header search also shows live suggestions |
| `about.html`, `contact.html` | Story, delivery fee table (from config), validated contact form |
| `404.html` | Not-found page; Netlify serves it for any unknown `/shop/*` URL |

Demo promo codes: `WELCOME10` (10% off), `BEIRUT5` ($5 off over $40).

## Architecture

```
shop/
  assets/products/     placeholder product images (SVG) — swap for photos
  css/styles.css       the design system (tokens at the top)
  js/config.js         ★ store settings: currency, delivery zones + fees,
                         free-delivery threshold, promos, payment methods, API URL
  js/data/             ★ catalog data: products.js, categories.js
  js/services/         business logic — the integration seam
    catalog.js           products: load, filter, sort, search
    cart.js              cart store (localStorage), stock clamping, promos
    wishlist.js          wishlist store (localStorage)
    pricing.js           pure totals calculation, in integer cents
    orders.js            create order (localStorage now, POST /orders later)
    payments.js          payment provider registry (cash on delivery live)
  js/lib/              storage, money, DOM and validation helpers
  js/ui/               shared UI: layout (header/footer/search), cards, toasts
  js/pages/            one small module per page
```

Rules the code follows:

- **UI never touches data directly.** Pages call `services/*`, and only
  `catalog.js` knows where products come from.
- **The cart stores `{ id, qty }` only.** Prices and stock are re-read from
  the catalog every time, so a stale browser can't check out at an old price.
- **Money is integer cents** (`lib/money.js`), so totals never drift.
- **One pricing function** (`computeTotals`) feeds the cart, checkout and
  order, and it can run unchanged on a server to re-verify orders.
- **localStorage access is guarded**, so private mode or corrupted values
  fall back to empty and never break a page. The cart and wishlist sync
  across tabs.

## Going live — database and payments (Lebanon)

1. **Backend + database.** Build an API with `GET /products`,
   `GET /categories` and `POST /orders`, returning the same fields as
   `js/data/products.js`. Then set `CONFIG.api.baseUrl` in `js/config.js`;
   `catalog.js` and `orders.js` already switch to `fetch` when it is set.
   The server must re-price lines with `pricing.js` logic, check stock and
   validate promo codes. Never trust the browser's totals.
2. **Cash on delivery** works today. The server should store the order as
   `pending` and notify staff by email or WhatsApp. Most Lebanese orders
   will start here.
3. **Online payment.** Implement the `card` (and/or `wallet`) provider in
   `js/services/payments.js` against a gateway offered by a Lebanese
   acquiring bank or a local payment provider. The server creates the
   payment session (gateway secrets stay on the server), the browser
   redirects to the hosted payment page, and a webhook marks the order
   paid. Then flip `enabled: true` for that method in `config.js`.
4. **Content.** Replace the SVGs in `assets/products/` with real photos
   (same paths, or update `images` in the data). Update `CONFIG.store`
   contact details, remove the `noindex` meta tags, and add the shop to
   `sitemap.xml`.
