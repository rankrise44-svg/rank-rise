import { $, esc } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import * as catalog from '../services/catalog.js';

const { categories } = await initLayout();
const [brands, products] = await Promise.all([catalog.getBrands(), catalog.getProducts()]);
const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

$('[data-brands-root]').innerHTML = `<div class="posts">${brands.map((b) => {
  const items = products.filter((p) => p.brand === b.id);
  const cats = [...new Set(items.map((p) => catName[p.category]))].join(', ');
  return `<article class="brand-card">
    <div class="brand-card__logo"><img src="${esc(b.logo)}" alt="${esc(b.name)}" width="240" height="80"></div>
    <h2 style="font-size:1.1rem">${esc(b.name)}</h2>
    <p>${esc(b.about)}</p>
    <div class="brand-card__foot"><span>${items.length} product${items.length === 1 ? '' : 's'} · ${esc(cats)}</span>
      <a class="btn btn--gold btn--sm" href="shop.html?brand=${b.id}">Shop ${esc(b.name)}</a></div>
  </article>`;
}).join('')}</div>`;
