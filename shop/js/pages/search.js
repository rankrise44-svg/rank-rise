import { $, esc, params, setTitle } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid } from '../ui/product-card.js';
import { emptyState } from '../ui/empty.js';
import * as catalog from '../services/catalog.js';

const { categories } = await initLayout();
const q = (params().get('q') || '').trim().slice(0, 80);
const catId = categories.some((c) => c.id === params().get('cat')) ? params().get('cat') : '';
const catName = categories.find((c) => c.id === catId)?.name || '';
const root = $('[data-search-root]');
const toolbar = $('[data-search-toolbar]');
const sortEl = $('[data-search-sort]');
$('[data-search-page-input]').value = q;

sortEl.innerHTML = [{ id: 'relevance', label: 'Most relevant' }, ...catalog.SORTS.filter((s) => s.id !== 'featured')]
  .map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
const initialSort = params().get('sort');
if ([...sortEl.options].some((o) => o.value === initialSort)) sortEl.value = initialSort;

const results = q ? await catalog.search(q, catId) : [];

async function render() {
  if (!q) {
    setTitle('Search');
    $('[data-search-title]').textContent = 'Search products';
    toolbar.hidden = true;
    root.innerHTML = `<p class="muted" style="margin-top:24px">Type a product, material or room above — or browse a category:</p>
      <div class="empty__links" style="justify-content:flex-start">${categories.map((c) => `<a class="btn btn--light btn--sm" href="shop.html?category=${c.id}">${esc(c.name)}</a>`).join('')}</div>`;
    return;
  }

  setTitle(`Search: ${q}`);
  $('[data-search-title]').textContent = `Results for “${q}”${catName ? ` in ${catName}` : ''}`;

  if (!results.length) {
    toolbar.hidden = true;
    const popular = await catalog.getFeatured(4);
    const broaden = catId ? [{ label: `Search all categories for “${q}”`, href: `search.html?q=${encodeURIComponent(q)}` }] : [];
    root.innerHTML = emptyState({
      iconName: 'search',
      title: `No results for “${q}”`,
      text: 'Check the spelling, or try a broader word like “pan”, “glass” or “storage”.',
      links: [...broaden, ...categories.map((c) => ({ label: c.name, href: `shop.html?category=${c.id}` }))],
    }) + `<h2 style="font-size:1.3rem;margin-bottom:20px">Popular right now</h2><div class="grid grid--4">${productGrid(popular, categories)}</div>`;
    return;
  }

  toolbar.hidden = false;
  $('[data-search-count]').textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;
  const list = sortEl.value === 'relevance' ? results : catalog.sortProducts(results, sortEl.value);
  root.innerHTML = `<div class="grid grid--4">${productGrid(list, categories)}</div>`;
}

sortEl.addEventListener('change', () => {
  const p = params();
  if (sortEl.value === 'relevance') p.delete('sort'); else p.set('sort', sortEl.value);
  history.replaceState(null, '', `?${p.toString()}`);
  render();
});

render();
