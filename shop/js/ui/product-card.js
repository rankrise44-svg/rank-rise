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
    <span class="price__now${isOnSale(p) ? ' is-sale' : ''}">${formatPrice(p.price)}</span>
    ${isOnSale(p) ? `<s class="price__was"><span class="sr-only">Was </span>${formatPrice(p.compareAtPrice)}</s>` : ''}
  </span>`;
}

export function ratingHtml(p, { showCount = true } = {}) {
  const pct = Math.round((p.rating / 5) * 100);
  return `<span class="rating" title="${p.rating} out of 5">
    <span class="rating__stars" style="--pct:${pct}%" aria-hidden="true">
      <span class="rating__base">${icon('star', { size: 14 }).repeat(5)}</span>
      <span class="rating__fill">${icon('star', { size: 14 }).repeat(5)}</span>
    </span>
    <span class="rating__text"><span class="sr-only">Rated </span>${p.rating.toFixed(1)}${showCount ? ` <span class="muted">(${p.reviewCount})</span>` : ''}</span>
  </span>`;
}

export function badgesHtml(p) {
  const out = [];
  if (!isInStock(p)) out.push('<span class="badge badge--muted">Sold out</span>');
  else if (isOnSale(p)) out.push(`<span class="badge badge--sale">−${discountPercent(p)}%</span>`);
  if (p.badges.includes('new')) out.push('<span class="badge">New</span>');
  if (p.badges.includes('bestseller')) out.push('<span class="badge">Bestseller</span>');
  return out.length ? `<div class="badges">${out.join('')}</div>` : '';
}

export function wishlistButton(p, { label = false } = {}) {
  const saved = wishlist.has(p.id);
  return `<button type="button" class="${label ? 'btn btn--ghost btn--wish' : 'wish-btn'}" data-wishlist-toggle="${esc(p.id)}"
      aria-pressed="${saved}" aria-label="${saved ? 'Remove from' : 'Save to'} wishlist: ${esc(p.name)}">
    ${icon('heart', { size: label ? 18 : 18 })}${label ? `<span data-wish-label>${saved ? 'Saved' : 'Save to wishlist'}</span>` : ''}
  </button>`;
}

export function productCard(p, categoryName = '') {
  const url = productUrl(p);
  const soldOut = !isInStock(p);
  return `<article class="card" data-product-id="${esc(p.id)}">
    <div class="card__media">
      <a href="${url}" class="card__img-link" tabindex="-1" aria-hidden="true">
        <img src="${esc(p.images[0])}" alt="" loading="lazy" width="800" height="800">
        ${p.images[1] ? `<img class="card__img-alt" src="${esc(p.images[1])}" alt="" loading="lazy" width="800" height="800">` : ''}
      </a>
      ${badgesHtml(p)}
      ${wishlistButton(p)}
    </div>
    <div class="card__body">
      ${categoryName ? `<p class="card__cat">${esc(categoryName)}</p>` : ''}
      <h3 class="card__title"><a href="${url}">${esc(p.name)}</a></h3>
      ${ratingHtml(p)}
      <div class="card__foot">
        ${priceHtml(p)}
        <button type="button" class="btn btn--sm ${soldOut ? 'btn--disabled' : 'btn--dark'}" data-add-to-cart="${esc(p.id)}"
          ${soldOut ? 'disabled aria-disabled="true"' : ''} aria-label="${soldOut ? 'Sold out' : 'Add to cart'}: ${esc(p.name)}">
          ${soldOut ? 'Sold out' : `${icon('plus', { size: 16 })}<span>Add</span>`}
        </button>
      </div>
    </div>
  </article>`;
}

export function productGrid(list, categories = []) {
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  return list.map((p) => productCard(p, names[p.category])).join('');
}

export function skeletonGrid(n = 4) {
  return Array.from({ length: n }, () => `<div class="card card--skeleton" aria-hidden="true"><div class="card__media"></div><div class="card__body"><span></span><span></span><span></span></div></div>`).join('');
}
