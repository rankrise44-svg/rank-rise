# Cedarline — demo kitchen store

A complete, working e-commerce front end that lives in `/shop/`, separate
from the RankRise agency site. It uses the same stack as the rest of the
repo: static HTML, CSS and vanilla JavaScript (ES modules). There is no
build step, and it deploys on Netlify as-is.

All products, brands, prices and contact details are **fictional**. Every
page carries `noindex`, so search engines stay out until it goes live.

## Run it

Serve the **repo root** (ES modules and the 404 page's `<base href="/shop/">`
need a real server, not `file://`):

```bash
python3 -m http.server 8000      # then open http://localhost:8000/shop/
```

## Pages

| Route | What it does |
|---|---|
| `index.html` | Home — hero slider, category circles, "Today's Best Deals" carousel, promo banners, value strip, best sellers, top brands |
| `shop.html` | Catalog with category / brand / price / stock / sale filters and 7 sorts. Collections: `?collection=bestsellers`, `new`, `deals`. Filter state lives in the URL |
| `product.html?id=<slug>` | Gallery, stock, quantity, Add to Cart, Buy Now, wishlist, specs, related products, Product JSON-LD |
| `cart.html` | Quantity steppers, remove, promo codes, free-delivery progress, totals |
| `checkout.html` | Contact, cash on delivery or WhatsApp, address (8 governorates), confirmation |
| `track-order.html` | Order lookup by order number + phone, with a status timeline |
| `account.html` | Sign in / register (demo), profile, order history |
| `wishlist.html`, `search.html?q=&cat=` | Saved items; ranked search, optionally inside one category |
| `brands.html`, `blog.html` (`?post=<slug>`) | Brand directory; articles linked to products |
| `about.html`, `contact.html`, `404.html` | Story, delivery fees, payment methods; validated contact form; not-found page |

Demo promo codes: `WELCOME10` (10% off), `BEIRUT5` ($5 off over $40).

## How customers order

There are two options, set in `js/config.js` → `payments`. Neither takes
money online.

| Option | What happens |
|---|---|
| **Cash on delivery** | The order is confirmed on the site (address required). The courier collects payment in USD, or in LBP at the rate in `CONFIG.lbpRate` |
| **Order via WhatsApp** | Only name and phone are required. The order is saved as *Awaiting WhatsApp confirmation*, then WhatsApp opens with the full order written out: number, items, totals, contact and address. The customer presses send and the team confirms in the chat |

Every page also has WhatsApp entry points: the top bar, a floating
"Chat with us" button, "Order this on WhatsApp" on each product, the cart,
the footer and the Contact page.

**★ Set your number:** `CONFIG.store.whatsapp` in `js/config.js` (any
format, e.g. `+961 70 991 555`). Every WhatsApp link uses it.

## Architecture

```
shop/
  assets/products/     product art: -1 (white), -2 (close-up), -t (cut-out)
  assets/hero|promo|brands/   hero scenes, banner art, brand wordmarks
  css/styles.css       the design system (tokens at the top)
  js/config.js         ★ store settings: identity, currency, LBP rate, delivery
                         zones, promos, payment methods, API URL
  js/data/             ★ products, categories, brands, blog posts, home banners
  js/services/         business logic — the integration seam
    catalog.js           products: load, filter, sort, search, collections
    cart.js / wishlist.js   stores (localStorage), stock clamping, promos
    pricing.js           pure totals calculation, in integer cents
    orders.js            create / update / track orders
    payments.js          ordering methods: cash on delivery, WhatsApp
    account.js           demo customer accounts
  js/lib/              storage, money, DOM, form validation, WhatsApp links
  js/ui/               layout (header/nav/footer), product card, toasts
  js/pages/            one small module per page
```

Rules the code follows:

- **UI never touches data directly.** Pages call `services/*`.
- **The cart stores `{ id, qty }` only.** Prices and stock are re-read from
  the catalog every time, so a stale browser can't check out at an old price.
- **Money is integer cents**, and one function (`computeTotals`) prices the
  cart, the checkout and the order.

## Going live

1. **Backend + database.** Serve `GET /products`, `/categories`, `/brands`
   and `POST /orders` with the same fields as `js/data/`. Then set
   `CONFIG.api.baseUrl`; `catalog.js` and `orders.js` switch to `fetch`.
   The server must re-price lines, check stock and validate promo codes.
2. **Orders by WhatsApp.** Use a WhatsApp Business number in
   `CONFIG.store.whatsapp`. With a backend, also notify staff of new
   cash-on-delivery orders (email or WhatsApp Business API).
3. **Online payment later (optional).** Add a method to
   `CONFIG.payments.methods` and a matching function in `payments.js`.
4. **Content.** Replace the SVG art with photos, update `CONFIG.store`,
   remove the `noindex` tags and add the shop to `sitemap.xml`.

### Or run it on Shopify

The same UI can sit on a Shopify store: map `catalog.js` to the Storefront
API (products, collections, vendors as brands) and hand checkout to
Shopify's checkout, where cash on delivery is a built-in manual payment
method; WhatsApp buttons work the same way there. Alternatively, port the
templates to a Shopify theme (Liquid).
