import { CONFIG } from '../config.js';
import { $, esc, icon } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid, skeletonGrid } from '../ui/product-card.js';
import { valuesHtml } from '../ui/values.js';
import * as catalog from '../services/catalog.js';

const featuredEl = $('[data-home-featured]');
const newEl = $('[data-home-new]');
featuredEl.innerHTML = skeletonGrid(4);
newEl.innerHTML = skeletonGrid(4);

const { categories } = await initLayout();

$('[data-hero-points]').innerHTML = [
  ['truck', `Free delivery over $${CONFIG.delivery.freeThreshold}`],
  ['cash', 'Cash on delivery'],
  ['return', '14-day returns'],
].map(([i, t]) => `<span>${icon(i, { size: 16 })}${esc(t)}</span>`).join('');

$('[data-home-cats]').innerHTML = categories.map((c) => `
  <a class="cat-tile" href="shop.html?category=${c.id}">
    <img src="${esc(c.image)}" alt="" loading="lazy" width="800" height="800">
    <div class="cat-tile__body">
      <h3>${esc(c.name)} ${icon('arrow', { size: 16 })}</h3>
      <p>${esc(c.blurb)}</p>
    </div>
  </a>`).join('');

$('[data-values]').innerHTML = valuesHtml();

const [featured, fresh] = await Promise.all([catalog.getFeatured(8), catalog.getNewArrivals(4)]);
featuredEl.innerHTML = productGrid(featured, categories);
newEl.innerHTML = productGrid(fresh, categories);
featuredEl.removeAttribute('aria-busy');
newEl.removeAttribute('aria-busy');
