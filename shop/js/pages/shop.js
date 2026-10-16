/* Shop — filter + sort the catalog. State lives in the URL
   (shop.html?collection=deals&category=cookware,bakeware&brand=ferrano
    &min=10&max=40&stock=1&sale=1&sort=price-asc)
   so filtered views can be shared and survive a reload. */

import { $, $$, esc, icon, debounce, setTitle } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid, skeletonGrid } from '../ui/product-card.js';
import { emptyState } from '../ui/empty.js';
import * as catalog from '../services/catalog.js';

const resultsEl = $('[data-results]');
resultsEl.innerHTML = skeletonGrid(6);

const { categories } = await initLayout();
const [products, brands] = await Promise.all([catalog.getProducts(), catalog.getBrands()]);
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
const brandById = Object.fromEntries(brands.map((b) => [b.id, b]));

const form = $('[data-filter-form]');
const sortEl = $('[data-sort]');
const panel = $('[data-filters]');
const openBtn = $('[data-filters-open]');

/* ── State ⇄ URL ─────────────────────────────────────────────── */
const num = (v) => (v === null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
const list = (v, valid) => (v || '').split(',').filter((x) => valid[x]);

function readState() {
  const p = new URLSearchParams(location.search);
  const collection = catalog.COLLECTIONS[p.get('collection')] ? p.get('collection') : '';
  const defSort = collection ? catalog.COLLECTIONS[collection].sort : 'featured';
  return {
    collection,
    categories: list(p.get('category'), catById),
    brands: list(p.get('brand'), brandById),
    minPrice: num(p.get('min')),
    maxPrice: num(p.get('max')),
    inStock: p.get('stock') === '1',
    onSale: p.get('sale') === '1',
    sort: catalog.SORTS.some((s) => s.id === p.get('sort')) ? p.get('sort') : defSort,
  };
}

function writeState(s) {
  const p = new URLSearchParams();
  if (s.collection) p.set('collection', s.collection);
  if (s.categories.length) p.set('category', s.categories.join(','));
  if (s.brands.length) p.set('brand', s.brands.join(','));
  if (s.minPrice != null) p.set('min', s.minPrice);
  if (s.maxPrice != null) p.set('max', s.maxPrice);
  if (s.inStock) p.set('stock', '1');
  if (s.onSale) p.set('sale', '1');
  const defSort = s.collection ? catalog.COLLECTIONS[s.collection].sort : 'featured';
  if (s.sort !== defSort) p.set('sort', s.sort);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

let state = readState();

/** Products in the current collection (before user filters). */
function basePool() {
  if (!state.collection) return products;
  const c = catalog.COLLECTIONS[state.collection];
  let pool = products.filter(c.test);
  if (c.limit) pool = catalog.sortProducts(pool, c.sort).slice(0, c.limit);
  return pool;
}

/* ── Controls ────────────────────────────────────────────────── */
sortEl.innerHTML = catalog.SORTS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('');

function renderFacetCounts() {
  const pool = basePool();
  $('[data-filter-cats]').innerHTML = categories.map((c) =>
    `<label class="check"><input type="checkbox" name="category" value="${c.id}"> ${esc(c.name)} <span class="check__count">${pool.filter((p) => p.category === c.id).length}</span></label>`).join('');
  $('[data-filter-brands]').innerHTML = brands.map((b) =>
    `<label class="check"><input type="checkbox" name="brand" value="${b.id}"> ${esc(b.name)} <span class="check__count">${pool.filter((p) => p.brand === b.id).length}</span></label>`).join('');
}

function syncControls() {
  for (const cb of $$('input[name="category"]', form)) cb.checked = state.categories.includes(cb.value);
  for (const cb of $$('input[name="brand"]', form)) cb.checked = state.brands.includes(cb.value);
  form.min.value = state.minPrice ?? '';
  form.max.value = state.maxPrice ?? '';
  form.stock.checked = state.inStock;
  form.sale.checked = state.onSale;
  sortEl.value = state.sort;
}

function readControls() {
  return {
    ...state,
    categories: $$('input[name="category"]:checked', form).map((cb) => cb.value),
    brands: $$('input[name="brand"]:checked', form).map((cb) => cb.value),
    minPrice: num(form.min.value),
    maxPrice: num(form.max.value),
    inStock: form.stock.checked,
    onSale: form.sale.checked,
    sort: sortEl.value,
  };
}

/* ── Render ──────────────────────────────────────────────────── */
const activeCount = (s) => s.categories.length + s.brands.length + (s.minPrice != null || s.maxPrice != null ? 1 : 0) + (s.inStock ? 1 : 0) + (s.onSale ? 1 : 0);

function heading() {
  const coll = state.collection ? catalog.COLLECTIONS[state.collection] : null;
  const cat = state.categories.length === 1 ? catById[state.categories[0]] : null;
  const brand = state.brands.length === 1 && !cat ? brandById[state.brands[0]] : null;
  if (coll && !cat) return { title: coll.name, blurb: coll.blurb };
  if (cat) return { title: coll ? `${coll.name}: ${cat.name}` : cat.name, blurb: cat.blurb };
  if (brand) return { title: brand.name, blurb: brand.about };
  return { title: 'All Products', blurb: 'Kitchen essentials, honest prices, delivered across Lebanon.' };
}

function render() {
  const badRange = state.minPrice != null && state.maxPrice != null && state.minPrice > state.maxPrice;
  $('[data-price-error]').textContent = badRange ? 'Minimum price is higher than maximum.' : '';

  const items = catalog.sortProducts(catalog.filterProducts(basePool(), state), state.sort);
  const h = heading();
  $('[data-shop-title]').textContent = h.title;
  $('[data-shop-blurb]').textContent = h.blurb;
  $('[data-crumb-current]').textContent = h.title;
  setTitle(h.title);

  $('[data-result-count]').textContent = `Showing ${items.length} product${items.length === 1 ? '' : 's'}`;
  const n = activeCount(state);
  openBtn.innerHTML = `${icon('filter', { size: 16 })}Filters${n ? ` (${n})` : ''}`;

  const chips = [
    ...(state.collection ? [{ key: 'collection', label: catalog.COLLECTIONS[state.collection].name }] : []),
    ...state.categories.map((c) => ({ key: `cat:${c}`, label: catById[c].name })),
    ...state.brands.map((b) => ({ key: `brand:${b}`, label: brandById[b].name })),
    ...(state.minPrice != null || state.maxPrice != null
      ? [{ key: 'price', label: `$${state.minPrice ?? 0} – ${state.maxPrice != null ? `$${state.maxPrice}` : 'any'}` }] : []),
    ...(state.inStock ? [{ key: 'stock', label: 'In stock' }] : []),
    ...(state.onSale ? [{ key: 'sale', label: 'On sale' }] : []),
  ];
  $('[data-chips]').innerHTML = chips.map((c) =>
    `<button type="button" class="chip" data-chip="${esc(c.key)}" aria-label="Remove filter: ${esc(c.label)}">${esc(c.label)}${icon('close', { size: 14 })}</button>`).join('')
    + (chips.length > 1 ? '<button type="button" class="chip" data-clear-filters>Clear all</button>' : '');

  resultsEl.removeAttribute('aria-busy');
  if (!items.length) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = emptyState({
      iconName: 'search',
      title: 'No products match these filters',
      text: 'Try removing a filter or widening the price range.',
      actionHtml: '<button type="button" class="btn btn--gold btn--lg" data-clear-filters>Clear all filters</button>',
    });
  } else {
    resultsEl.style.display = '';
    resultsEl.innerHTML = productGrid(items, categories);
  }
}

function update(next, { facets = false } = {}) {
  state = next;
  writeState(state);
  if (facets) { renderFacetCounts(); syncControls(); }
  render();
}

/* ── Events ──────────────────────────────────────────────────── */
form.addEventListener('change', (e) => {
  if (e.target.name === 'min' || e.target.name === 'max') return;
  update(readControls());
});
const onPrice = debounce(() => update(readControls()), 350);
form.min.addEventListener('input', onPrice);
form.max.addEventListener('input', onPrice);
form.addEventListener('submit', (e) => { e.preventDefault(); update(readControls()); });
sortEl.addEventListener('change', () => update(readControls()));

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-clear-filters]')) {
    update({ ...state, categories: [], brands: [], minPrice: null, maxPrice: null, inStock: false, onSale: false }, { facets: true });
    return;
  }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const key = chip.dataset.chip;
    const next = { ...state };
    if (key === 'collection') { next.collection = ''; next.sort = 'featured'; }
    if (key.startsWith('cat:')) next.categories = state.categories.filter((c) => c !== key.slice(4));
    if (key.startsWith('brand:')) next.brands = state.brands.filter((b) => b !== key.slice(6));
    if (key === 'price') { next.minPrice = null; next.maxPrice = null; }
    if (key === 'stock') next.inStock = false;
    if (key === 'sale') next.onSale = false;
    update(next, { facets: true });
  }
});

// Mobile filter sheet
function openPanel() {
  panel.classList.add('is-open');
  openBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  panel.querySelector('input')?.focus();
}
function closePanel() {
  if (!panel.classList.contains('is-open')) return;
  panel.classList.remove('is-open');
  openBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
  openBtn.focus();
}
openBtn.addEventListener('click', openPanel);
$$('[data-filters-close]', panel).forEach((b) => b.addEventListener('click', closePanel));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches) closePanel(); });
window.addEventListener('popstate', () => { state = readState(); renderFacetCounts(); syncControls(); render(); });

renderFacetCounts();
syncControls();
render();
