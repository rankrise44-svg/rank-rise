import { CONFIG } from '../config.js';
import { $, $$, esc, icon, params, setTitle, setDescription } from '../lib/dom.js';
import { formatPrice } from '../lib/money.js';
import { initLayout } from '../ui/layout.js';
import { priceHtml, ratingHtml, badgesHtml, wishlistButton, productGrid } from '../ui/product-card.js';
import { paymentBadgesHtml } from '../ui/payment-badges.js';
import { emptyState } from '../ui/empty.js';
import * as catalog from '../services/catalog.js';
import * as cart from '../services/cart.js';

const { categories } = await initLayout();
const root = $('[data-pdp-root]');
const product = await catalog.getProduct(params().get('id'));

if (!product) {
  setTitle('Product not found');
  root.innerHTML = emptyState({
    heading: 'h1',
    iconName: 'search',
    title: 'We couldn’t find that product',
    text: 'It may have been renamed or is no longer available.',
    cta: { label: 'Browse the shop', href: 'shop.html' },
    links: categories.map((c) => ({ label: c.name, href: `shop.html?category=${c.id}` })),
  });
} else {
  renderProduct(product, await catalog.getBrand(product.brand));
}

function stockHtml(p) {
  if (p.stock <= 0) return '<span class="stock stock--out">Out of stock</span>';
  if (p.stock <= 5) return `<span class="stock stock--low">Only ${p.stock} left</span>`;
  return '<span class="stock">In stock, ready to ship</span>';
}

function renderProduct(p, brand) {
  const cat = categories.find((c) => c.id === p.category);
  const soldOut = !catalog.isInStock(p);
  const maxQty = Math.min(p.stock, CONFIG.limits.maxQtyPerLine);
  const saving = catalog.isOnSale(p) ? p.compareAtPrice - p.price : 0;

  setTitle(p.name);
  setDescription(p.shortDescription);

  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><ol>
      <li><a href="index.html">Home</a></li>
      <li><a href="shop.html">Shop</a></li>
      ${cat ? `<li><a href="shop.html?category=${cat.id}">${esc(cat.name)}</a></li>` : ''}
      <li aria-current="page">${esc(p.name)}</li>
    </ol></nav>
    <div class="pdp fade-in">
      <div class="gallery">
        <div class="gallery__main">
          <img src="${esc(p.images[0])}" alt="${esc(p.name)}" width="800" height="800" data-gallery-main>
          ${badgesHtml(p)}
        </div>
        ${p.images.length > 1 ? `<div class="gallery__thumbs" role="group" aria-label="Product images">
          ${p.images.map((src, i) => `<button type="button" data-thumb="${i}" aria-current="${i === 0}" aria-label="Show image ${i + 1} of ${p.images.length}">
            <img src="${esc(src)}" alt="" width="160" height="160"></button>`).join('')}
        </div>` : ''}
      </div>

      <div class="pdp__info">
        <div class="pdp__meta">
          ${brand ? `<a class="pdp__brand" href="shop.html?brand=${brand.id}">${esc(brand.name)}</a>` : ''}
          ${cat ? `<a class="muted" href="shop.html?category=${cat.id}">${esc(cat.name)}</a>` : ''}
        </div>
        <h1>${esc(p.name)}</h1>
        <div class="pdp__meta">${ratingHtml(p)} ${stockHtml(p)}</div>
        <div>${priceHtml(p, { large: true })}${saving ? `<span class="pdp__save">Save ${formatPrice(saving)}</span>` : ''}</div>
        <p class="pdp__short">${esc(p.shortDescription)}</p>

        <div class="pdp__buy">
          ${soldOut ? '' : `
          <div class="qty" data-qty>
            <button type="button" data-step="-1" aria-label="Decrease quantity">${icon('minus', { size: 16 })}</button>
            <label class="sr-only" for="pdp-qty">Quantity</label>
            <input id="pdp-qty" type="number" inputmode="numeric" min="1" max="${maxQty}" value="1">
            <button type="button" data-step="1" aria-label="Increase quantity">${icon('plus', { size: 16 })}</button>
          </div>`}
          <button type="button" class="btn btn--lg btn--gold" data-add-to-cart="${esc(p.id)}" data-qty-from="#pdp-qty"
            ${soldOut ? 'disabled aria-disabled="true"' : ''}>${soldOut ? 'Sold out' : `${icon('cart', { size: 18 })}Add to Cart`}</button>
          ${soldOut ? '' : `<button type="button" class="btn btn--lg btn--dark" data-buy-now>Buy Now</button>`}
          ${wishlistButton(p, { label: true })}
        </div>
        <p class="summary__note" data-in-cart></p>

        <ul class="pdp__perks">
          <li>${icon('truck', { size: 18 })}<span><strong>Delivery in ${esc(CONFIG.delivery.etaText)}</strong> to all governorates. Free over ${formatPrice(CONFIG.delivery.freeThreshold)}.</span></li>
          <li>${icon('cash', { size: 18 })}<span><strong>Cash on delivery</strong> in USD or LBP, or pay online by card, Whish or OMT.</span></li>
          <li>${icon('return', { size: 18 })}<span><strong>14-day returns</strong> on unused items in original packaging.</span></li>
        </ul>
        <div class="pdp__pay"><span>We accept</span>${paymentBadgesHtml()}</div>

        <div class="accordion">
          <details open><summary>Description</summary><div class="accordion__body"><p>${esc(p.description)}</p></div></details>
          <details><summary>Features</summary><div class="accordion__body"><ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div></details>
          <details><summary>Specifications</summary><div class="accordion__body">
            <table class="specs"><tbody>
              ${brand ? `<tr><th scope="row">Brand</th><td>${esc(brand.name)}</td></tr>` : ''}
              ${Object.entries(p.specs).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
            </tbody></table>
          </div></details>
          <details><summary>Delivery &amp; returns</summary><div class="accordion__body">
            <p>Delivered by courier in ${esc(CONFIG.delivery.etaText)}. Fees from ${formatPrice(Math.min(...CONFIG.delivery.zones.map((z) => z.fee)))} depending on governorate. <a href="about.html#delivery">See delivery fees</a>.</p>
          </div></details>
        </div>
      </div>
    </div>`;

  bindGallery(p);
  if (!soldOut) {
    bindQty(maxQty);
    // Buy now: add the chosen quantity, then go straight to checkout.
    $('[data-buy-now]').addEventListener('click', () => {
      const qty = Math.max(1, parseInt($('#pdp-qty').value, 10) || 1);
      if (cart.qtyOf(p.id) < qty) cart.add(p, qty - cart.qtyOf(p.id));
      location.href = 'checkout.html';
    });
  }
  showInCart(p);
  cart.subscribe(() => showInCart(p));
  injectStructuredData(p, cat, brand);
  renderRelated(p);
}

function bindGallery(p) {
  const main = $('[data-gallery-main]');
  for (const btn of $$('[data-thumb]')) {
    btn.addEventListener('click', () => {
      main.src = p.images[Number(btn.dataset.thumb)];
      $$('[data-thumb]').forEach((b) => b.setAttribute('aria-current', String(b === btn)));
    });
  }
}

function bindQty(max) {
  const input = $('#pdp-qty');
  const [dec, inc] = $$('[data-step]');
  const clamp = (v) => Math.max(1, Math.min(max, Math.floor(Number(v)) || 1));
  const sync = () => { dec.disabled = Number(input.value) <= 1; inc.disabled = Number(input.value) >= max; };
  $$('[data-step]').forEach((b) => b.addEventListener('click', () => {
    input.value = clamp(Number(input.value) + Number(b.dataset.step));
    sync();
  }));
  input.addEventListener('change', () => { input.value = clamp(input.value); sync(); });
  sync();
}

function showInCart(p) {
  const n = cart.qtyOf(p.id);
  const el = $('[data-in-cart]');
  if (el) el.innerHTML = n ? `${n} already in your cart · <a class="link" href="cart.html">View cart</a>` : '';
}

function injectStructuredData(p, cat, brand) {
  const abs = (path) => new URL(path, location.href).href;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.id,
    description: p.description,
    image: p.images.map(abs),
    category: cat?.name,
    brand: { '@type': 'Brand', name: brand?.name || CONFIG.store.name },
    // Add aggregateRating here only once ratings come from real customer reviews.
    offers: {
      '@type': 'Offer',
      priceCurrency: CONFIG.currency.code,
      price: p.price.toFixed(2),
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: location.href,
    },
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

async function renderRelated(p) {
  const related = await catalog.getRelated(p, 6);
  if (!related.length) return;
  $('[data-related]').innerHTML = productGrid(related, categories);
  $('[data-related-wrap]').hidden = false;
}
