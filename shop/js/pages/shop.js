/* Shop — filter + sort the catalog. State lives in the URL
   (shop.html?category=kitchen,bathroom&min=10&max=40&stock=1&sale=1&sort=price-asc)
   so filtered views can be shared and survive a reload. */

import { $, $$, esc, icon, debounce, setTitle } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid, skeletonGrid } from '../ui/product-card.js';
import { emptyState } from '../ui/empty.js';
import * as catalog from '../services/catalog.js';

const resultsEl = $('[data-results]');
resultsEl.innerHTML = skeletonGrid(6);

const { categories } = await initLayout();
const products = await catalog.getProducts();
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

const form = $('[data-filter-form]');
const sortEl = $('[data-sort]');
const panel = $('[data-filters]');
const openBtn = $('[data-filters-open]');

/* ── State ⇄ URL ─────────────────────────────────────────────── */
function readState() {
  const p = new URLSearchParams(location.search);
  const num = (v) => (v === null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
  return {
    categories: (p.get('category') || '').split(',').filter((c) => catById[c]),
    minPrice: num(p.get('min')),
    maxPrice: num(p.get('max')),
    inStock: p.get('stock') === '1',
    onSale: p.get('sale') === '1',
    sort: catalog.SORTS.some((s) => s.id === p.get('sort')) ? p.get('sort') : 'featured',
  };
}

function writeState(s) {
  const p = new URLSearchParams();
  if (s.categories.length) p.set('category', s.categories.join(','));
  if (s.minPrice != null) p.set('min', s.minPrice);
  if (s.maxPrice != null) p.set('max', s.maxPrice);
  if (s.inStock) p.set('stock', '1');
  if (s.onSale) p.set('sale', '1');
  if (s.sort !== 'featured') p.set('sort', s.sort);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

let state = readState();

/* ── Controls ────────────────────────────────────────────────── */
sortEl.innerHTML = catalog.SORTS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('');

$('[data-filter-cats]').innerHTML = categories.map((c) => {
  const n = products.filter((p) => p.category === c.id).length;
  return `<label class="check"><input type="checkbox" name="category" value="${c.id}"> ${esc(c.name)} <span class="check__count">${n}</span></label>`;
}).join('');

function syncControls() {
  for (const cb of $$('input[name="category"]', form)) cb.checked = state.categories.includes(cb.value);
  form.min.value = state.minPrice ?? '';
  form.max.value = state.maxPrice ?? '';
  form.stock.checked = state.inStock;
  form.sale.checked = state.onSale;
  sortEl.value = state.sort;
}

function readControls() {
  const num = (v) => (v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
  return {
    ...state,
    categories: $$('input[name="category"]:checked', form).map((cb) => cb.value),
    minPrice: num(form.min.value),
    maxPrice: num(form.max.value),
    inStock: form.stock.checked,
    onSale: form.sale.checked,
    sort: sortEl.value,
  };
}

/* ── Render ──────────────────────────────────────────────────── */
function activeCount(s) {
  return s.categories.length + (s.minPrice != null || s.maxPrice != null ? 1 : 0) + (s.inStock ? 1 : 0) + (s.onSale ? 1 : 0);
}

function render() {
  const priceErr = $('[data-price-error]');
  const badRange = state.minPrice != null && state.maxPrice != null && state.minPrice > state.maxPrice;
  priceErr.textContent = badRange ? 'Minimum price is higher than maximum.' : '';

  const list = catalog.sortProducts(catalog.filterProducts(products, state), state.sort);

  // Heading reflects a single selected category.
  const single = state.categories.length === 1 ? catById[state.categories[0]] : null;
  $('[data-shop-title]').textContent = single ? single.name : 'All products';
  $('[data-shop-blurb]').textContent = single ? single.blurb : 'Natural materials, honest prices, delivered across Lebanon.';
  $('[data-crumb-current]').textContent = single ? single.name : 'Shop';
  setTitle(single ? single.name : 'Shop All Products');

  $('[data-result-count]').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;

  const n = activeCount(state);
  openBtn.innerHTML = `${icon('filter', { size: 16 })}Filters${n ? ` (${n})` : ''}`;

  // Active filter chips
  const chips = [
    ...state.categories.map((c) => ({ key: `cat:${c}`, label: catById[c].name })),
    ...(state.minPrice != null || state.maxPrice != null
      ? [{ key: 'price', label: `$${state.minPrice ?? 0} – ${state.maxPrice != null ? `$${state.maxPrice}` : 'any'}` }] : []),
    ...(state.inStock ? [{ key: 'stock', label: 'In stock' }] : []),
    ...(state.onSale ? [{ key: 'sale', label: 'On sale' }] : []),
  ];
  $('[data-chips]').innerHTML = chips.map((c) =>
    `<button type="button" class="chip" data-chip="${esc(c.key)}" aria-label="Remove filter: ${esc(c.label)}">${esc(c.label)}${icon('close', { size: 14 })}</button>`).join('')
    + (chips.length > 1 ? '<button type="button" class="chip" data-clear-filters>Clear all</button>' : '');

  resultsEl.removeAttribute('aria-busy');
  if (!list.length) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = emptyState({
      iconName: 'search',
      title: 'No products match these filters',
      text: 'Try removing a filter or widening the price range.',
      actionHtml: '<button type="button" class="btn btn--dark btn--lg" data-clear-filters>Clear all filters</button>',
    });
  } else {
    resultsEl.style.display = '';
    resultsEl.innerHTML = productGrid(list, categories);
  }
}

function update(next) {
  state = next;
  writeState(state);
  render();
}

/* ── Events ──────────────────────────────────────────────────── */
form.addEventListener('change', (e) => {
  if (e.target.name === 'min' || e.target.name === 'max') return; // handled by input
  update(readControls());
});
const onPrice = debounce(() => update(readControls()), 350);
form.min.addEventListener('input', onPrice);
form.max.addEventListener('input', onPrice);
form.addEventListener('submit', (e) => { e.preventDefault(); update(readControls()); });
sortEl.addEventListener('change', () => update(readControls()));

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-clear-filters]')) {
    update({ categories: [], minPrice: null, maxPrice: null, inStock: false, onSale: false, sort: state.sort });
    syncControls();
    return;
  }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const key = chip.dataset.chip;
    const next = { ...state };
    if (key.startsWith('cat:')) next.categories = state.categories.filter((c) => c !== key.slice(4));
    if (key === 'price') { next.minPrice = null; next.maxPrice = null; }
    if (key === 'stock') next.inStock = false;
    if (key === 'sale') next.onSale = false;
    update(next);
    syncControls();
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

// Back/forward between filtered views
window.addEventListener('popstate', () => { state = readState(); syncControls(); render(); });

syncControls();
render();
