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
| `checkout.html` | Contact, address (8 governorates), payment method, order confirmation |
| `track-order.html` | Order lookup by order number + phone, with a status timeline |
| `account.html` | Sign in / register (demo), profile, order history |
| `wishlist.html`, `search.html?q=&cat=` | Saved items; ranked search, optionally inside one category |
| `brands.html`, `blog.html` (`?post=<slug>`) | Brand directory; articles linked to products |
| `about.html`, `contact.html`, `404.html` | Story, delivery fees, payment methods; validated contact form; not-found page |

Demo promo codes: `WELCOME10` (10% off), `BEIRUT5` ($5 off over $40).

## Payment methods (Lebanon)

Configured in `js/config.js` → `payments`. With `mode: 'demo'`, every
method runs its full flow and no money moves:

| Method | Demo flow |
|---|---|
| Cash on delivery | Pay in USD or LBP; shows an LBP estimate from `CONFIG.lbpRate` |
| Credit / debit card | Live formatting, Visa/Mastercard detection, Luhn and expiry checks, then a 3-D Secure code step (`123456`). Test cards: `4242 4242 4242 4242` approves, `4000 0000 0000 0002` is declined, `4000 0000 0000 9995` has insufficient funds |
| Whish Money / OMT Pay | Sends an "approve in your app" request with a 2-minute countdown; approve, cancel or let it expire |

Orders are created as `pending_payment`, then marked `confirmed` or
`payment_failed`. The full card number and CVC are never stored; an order
keeps only the card brand and last 4 digits.

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
    payments.js          provider registry: cod, card, wallet
    account.js           demo customer accounts
  js/lib/              storage, money, DOM, form validation, card helpers
  js/ui/               layout (header/nav/footer), product card, modal, toasts
  js/pages/            one small module per page
```

Rules the code follows:

- **UI never touches data directly.** Pages call `services/*`.
- **The cart stores `{ id, qty }` only.** Prices and stock are re-read from
  the catalog every time, so a stale browser can't check out at an old price.
- **Money is integer cents**, and one function (`computeTotals`) prices the
  cart, the checkout and the order.
- **Payment providers never touch the DOM.** 3-D Secure and wallet approval
  are UI callbacks, so a real gateway's hosted page can replace them.

## Going live

1. **Backend + database.** Serve `GET /products`, `/categories`, `/brands`
   and `POST /orders` with the same fields as `js/data/`. Then set
   `CONFIG.api.baseUrl`; `catalog.js` and `orders.js` switch to `fetch`.
   The server must re-price lines, check stock and validate promo codes.
2. **Card payments.** Sign up with a gateway offered by a Lebanese
   acquiring bank. Your server creates the payment session (secrets stay on
   the server), the shopper pays on the gateway's hosted page, and a webhook
   marks the order paid. Replace the `card` provider in `payments.js`.
3. **Whish Money / OMT Pay.** Apply for each provider's merchant API.
   Your server creates the payment request, and its callback confirms
   approval. Replace the `wallet` provider, then set `payments.mode = 'live'`.
   Swap the text badges in `js/ui/payment-badges.js` for each provider's
   official artwork.
4. **Content.** Replace the SVG art with photos, update `CONFIG.store`,
   remove the `noindex` tags and add the shop to `sitemap.xml`.

### Or run it on Shopify

The same UI can sit on a Shopify store: map `catalog.js` to the Storefront
API (products, collections, vendors as brands) and hand checkout to
Shopify's checkout. Cash on delivery is a built-in manual payment method
there; card payments depend on which gateways Shopify supports for
Lebanese merchants, so confirm that before choosing this route.
Alternatively, port the templates to a Shopify theme (Liquid). Whish and
OMT need their own payment integration either way.
