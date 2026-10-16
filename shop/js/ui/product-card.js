/* Product card + shared product fragments (price, rating, badges).
   Cards are plain HTML strings; their buttons are handled by the
   delegated listeners in layout.js, so any page can render them. */

import { esc, icon } from '../lib/dom.js';
import { formatPrice } from '../lib/money.js';
import { isOnSale, isInStock, discountPercent } from '../services/catalog.js';
import * as wishlist from '../services/wishlist.js';

export const productUrl = (p) => `product.html?id=${encodeURIComponent(p.slug)}`;

export function priceHtml(p, { large = false } = {}) {
  return `<span class="price${large ? ' price--lg' : ''}">
    <span class="price__now">${formatPrice(p.price)}</span>
    ${isOnSale(p) ? `<s class="price__was"><span class="sr-only">Was </span>${formatPrice(p.compareAtPrice)}</s>` : ''}
  </span>`;
}

export function starsHtml(rating, size = 14) {
  const pct = Math.round((rating / 5) * 100);
  return `<span class="stars" style="--pct:${pct}%" aria-hidden="true">
      <span class="stars__base">${icon('star', { size }).repeat(5)}</span>
      <span class="stars__fill">${icon('star', { size }).repeat(5)}</span>
    </span>`;
}

export function ratingHtml(p, { showCount = true } = {}) {
  return `<span class="rating" title="${p.rating} out of 5">
    ${starsHtml(p.rating)}
    <span class="rating__text"><span class="sr-only">Rated ${p.rating} out of 5</span>${showCount ? `<span aria-hidden="true">(${p.reviewCount.toLocaleString('en-US')})</span><span class="sr-only">, ${p.reviewCount} reviews</span>` : ''}</span>
  </span>`;
}

export function badgesHtml(p) {
  const out = [];
  if (!isInStock(p)) out.push('<span class="badge badge--dark">Sold out</span>');
  else if (isOnSale(p)) out.push(`<span class="badge badge--deal">${discountPercent(p)}% OFF</span>`);
  if (p.badges.includes('new')) out.push('<span class="badge badge--light">New</span>');
  else if (p.badges.includes('bestseller') && out.length < 2) out.push('<span class="badge badge--light">Bestseller</span>');
  return out.length ? `<div class="badges">${out.join('')}</div>` : '';
}

export function wishlistButton(p, { label = false } = {}) {
  const saved = wishlist.has(p.id);
  return `<button type="button" class="${label ? 'btn btn--outline btn--wish' : 'wish-btn'}" data-wishlist-toggle="${esc(p.id)}"
      aria-pressed="${saved}" aria-label="${saved ? 'Remove from' : 'Save to'} wishlist: ${esc(p.name)}">
    ${icon('heart', { size: 18 })}${label ? `<span data-wish-label>${saved ? 'Saved' : 'Save to wishlist'}</span>` : ''}
  </button>`;
}

export function productCard(p, categoryName = '') {
  const url = productUrl(p);
  const soldOut = !isInStock(p);
  return `<article class="pcard" data-product-id="${esc(p.id)}">
    <div class="pcard__media">
      <a href="${url}" class="pcard__img" tabindex="-1" aria-hidden="true">
        <img src="${esc(p.images[0])}" alt="" loading="lazy" width="800" height="800">
      </a>
      ${badgesHtml(p)}
      ${wishlistButton(p)}
    </div>
    <div class="pcard__body">
      ${categoryName ? `<p class="pcard__cat">${esc(categoryName)}</p>` : ''}
      <h3 class="pcard__title"><a href="${url}">${esc(p.name)}</a></h3>
      ${ratingHtml(p)}
      ${priceHtml(p)}
      <button type="button" class="btn btn--cart btn--block" data-add-to-cart="${esc(p.id)}"
        ${soldOut ? 'disabled aria-disabled="true"' : ''} aria-label="${soldOut ? 'Sold out' : 'Add to cart'}: ${esc(p.name)}">
        ${soldOut ? 'Sold Out' : `Add to Cart ${icon('cart', { size: 16 })}`}
      </button>
    </div>
  </article>`;
}

export function productGrid(list, categories = []) {
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  return list.map((p) => productCard(p, names[p.category])).join('');
}

export function skeletonGrid(n = 4) {
  return Array.from({ length: n }, () => `<div class="pcard pcard--skeleton" aria-hidden="true"><div class="pcard__media"></div><div class="pcard__body"><span></span><span></span><span></span></div></div>`).join('');
}
