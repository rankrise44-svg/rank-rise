/* Products: list, add, edit (prices, stock, details, photos), hide, delete. */
import { sb, q, rpc, publicUrl, BUCKET } from '../sb.js';
import { ACCEPT, prepareImage } from '../upload.js';
import {
  $, $$, esc, money, parseMoney, centsToInput, pageHead, field, checkbox, showErrors, val, checked, busy, toast,
  confirmDialog, emptyRow, icon, imgSrc, slugify, debounce, beirutToday,
} from '../ui.js';

export async function render(root, params, ctx) {
  if (params.id) return renderEditor(root, params.id === 'new' ? null : params.id, ctx);
  return renderList(root, params);
}

const mainImage = (p) => (p.product_images || []).slice().sort((a, b) => a.position - b.position)[0];

/* ── List ──────────────────────────────────────────────────────── */
async function renderList(root, params) {
  const [products, cats] = await Promise.all([
    q(sb.from('products').select('id, slug, name, category_id, brand_id, price_cents, compare_at_cents, cost_cents, stock, is_active, featured, product_images(url, position)').order('name')),
    q(sb.from('categories').select('id, name').order('sort_order')),
  ]);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const state = { search: '', cat: params.query.get('category') || '', show: params.query.get('show') || 'all' };

  root.innerHTML = `
    ${pageHead({ title: 'Products', sub: `${products.length} products · ${products.filter((p) => p.is_active).length} on the store`, actions: '<a class="btn btn--gold" href="#/products/new">+ Add product</a>' })}
    <div class="toolbar">
      <input type="search" placeholder="Search products" aria-label="Search products" data-search>
      <select data-cat aria-label="Category"><option value="">All categories</option>${cats.map((c) => `<option value="${esc(c.id)}" ${state.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <select data-show aria-label="Show">
        ${[['all', 'All products'], ['active', 'On the store'], ['hidden', 'Hidden'], ['low', 'Low stock (3 or less)'], ['out', 'Sold out'], ['nocost', 'Missing cost price']].map(([v, l]) => `<option value="${v}" ${state.show === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <section class="card card--flush"><div class="table-wrap"><table class="responsive">
      <thead><tr><th style="width:60px"><span class="sr-only">Photo</span></th><th>Product</th><th class="num">Price</th><th class="num">Cost</th><th class="num">Stock</th><th>Status</th></tr></thead>
      <tbody data-rows></tbody></table></div></section>`;

  const draw = () => {
    const s = state.search.toLowerCase().trim();
    const list = products.filter((p) => {
      if (state.cat && p.category_id !== state.cat) return false;
      if (state.show === 'active' && !p.is_active) return false;
      if (state.show === 'hidden' && p.is_active) return false;
      if (state.show === 'low' && !(p.stock <= 3)) return false;
      if (state.show === 'out' && p.stock !== 0) return false;
      if (state.show === 'nocost' && p.cost_cents != null) return false;
      return !s || p.name.toLowerCase().includes(s) || p.id.includes(s);
    });
    const tbody = $('[data-rows]', root);
    tbody.innerHTML = list.length ? list.map((p) => {
      const img = mainImage(p);
      return `<tr class="is-link" data-href="#/products/${encodeURIComponent(p.id)}">
        <td>${img ? `<img class="thumb" src="${esc(imgSrc(img.url))}" alt="" loading="lazy">` : '<span class="thumb" style="display:block"></span>'}</td>
        <td><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(catName[p.category_id] || p.category_id)}${p.featured ? ' · Featured' : ''}</div></td>
        <td class="num" data-label="Price">${money(p.price_cents)}${p.compare_at_cents ? `<div class="cell-sub" style="text-decoration:line-through">${money(p.compare_at_cents)}</div>` : ''}</td>
        <td class="num" data-label="Cost">${p.cost_cents == null ? '<span class="badge badge--warn">Not set</span>' : money(p.cost_cents)}</td>
        <td class="num" data-label="Stock">${p.stock === 0 ? '<span class="badge badge--err">Sold out</span>' : p.stock <= 3 ? `<span class="badge badge--warn">${p.stock}</span>` : p.stock}</td>
        <td>${p.is_active ? '<span class="badge badge--ok">On the store</span>' : '<span class="badge badge--off">Hidden</span>'}</td></tr>`;
    }).join('') : emptyRow(6, 'No products found', products.length ? 'Try another search or filter.' : 'Add your first product.');
    $$('tr[data-href]', tbody).forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
  };
  $('[data-search]', root).addEventListener('input', debounce((e) => { state.search = e.target.value; draw(); }, 150));
  $('[data-cat]', root).addEventListener('change', (e) => { state.cat = e.target.value; draw(); });
  $('[data-show]', root).addEventListener('change', (e) => { state.show = e.target.value; draw(); });
  draw();
}

/* ── Editor ────────────────────────────────────────────────────── */
async function nextProductId() {
  const rows = await q(sb.from('products').select('id'));
  const max = rows.reduce((m, r) => { const n = /^p(\d+)$/.exec(r.id); return n ? Math.max(m, Number(n[1])) : m; }, 0);
  return `p${String(max + 1).padStart(3, '0')}`;
}

const specsToText = (specs) => Object.entries(specs || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
function textToSpecs(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) { const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim(); if (k && v) out[k] = v; }
  }
  return out;
}
const lines = (t) => String(t).split('\n').map((s) => s.trim()).filter(Boolean);

async function renderEditor(root, id, ctx) {
  const [cats, brands, p, sold] = await Promise.all([
    q(sb.from('categories').select('id, name, is_active').order('sort_order')),
    q(sb.from('brands').select('id, name, is_active').order('sort_order')),
    id ? q(sb.from('products').select('*, product_images(*)').eq('id', id).maybeSingle()) : Promise.resolve(null),
    id ? sb.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id).then((r) => r.count || 0) : Promise.resolve(0),
  ]);
  if (id && !p) {
    root.innerHTML = `${pageHead({ title: 'Product not found', crumb: { href: '#/products', label: 'Products' } })}`;
    return;
  }
  const isNew = !p;
  const d = p || { name: '', slug: '', category_id: cats[0]?.id || '', brand_id: null, price_cents: null, compare_at_cents: null, cost_cents: null, stock: 0, short_description: '', description: '', features: [], specs: {}, tags: [], badges: [], featured: false, popularity: 50, is_active: true, listed_on: beirutToday(), rating: 0, review_count: 0 };
  const loadedStock = d.stock;

  root.innerHTML = `
    ${pageHead({ title: isNew ? 'Add product' : d.name, crumb: { href: '#/products', label: 'Products' },
      sub: isNew ? 'Fill in the details, save, then add photos.' : `${esc(d.id)} · ${sold} sold · ${d.is_active ? 'on the store' : 'hidden from the store'}`,
      actions: isNew ? '' : `<a class="btn btn--outline" target="_blank" rel="noopener" href="../product.html?id=${encodeURIComponent(d.slug)}">${icon('ext', 16)} View on store</a>` })}
    <form data-product class="grid grid--side" novalidate>
      <div class="stack">
        <section class="card"><div class="card__head"><h2>Basics</h2></div><div class="form-grid">
          ${field({ name: 'name', label: 'Product name', value: d.name, cls: 'span-2', attrs: 'maxlength="160" required' })}
          ${field({ name: 'category_id', label: 'Category', value: d.category_id, options: cats.map((c) => ({ value: c.id, label: c.name + (c.is_active ? '' : ' (hidden)') })) })}
          ${field({ name: 'brand_id', label: 'Brand', value: d.brand_id || '', optional: true, options: [{ value: '', label: '— No brand —' }, ...brands.map((b) => ({ value: b.id, label: b.name }))] })}
          ${field({ name: 'short_description', label: 'Short description', value: d.short_description, cls: 'span-2', hint: 'One line shown on product cards.', attrs: 'maxlength="200"' })}
          ${field({ name: 'description', label: 'Full description', type: 'textarea', value: d.description, cls: 'span-2', attrs: 'rows="5"' })}
        </div></section>

        <section class="card"><div class="card__head"><h2>Price</h2><span class="muted small" data-margin></span></div><div class="form-grid">
          ${field({ name: 'price', label: 'Selling price', value: centsToInput(d.price_cents), money: true, attrs: 'required' })}
          ${field({ name: 'compare', label: 'Was price (before discount)', value: centsToInput(d.compare_at_cents), money: true, optional: true, hint: 'Shows a sale price on the store. Must be higher than the selling price.' })}
          ${field({ name: 'cost', label: 'Your cost', value: centsToInput(d.cost_cents), money: true, optional: true, hint: 'What you pay for one. Private — used for profit reports.' })}
        </div></section>

        <section class="card"><div class="card__head"><h2>Stock</h2></div><div class="form-grid">
          ${field({ name: 'stock', label: 'In stock', type: 'number', value: d.stock, attrs: 'min="0" step="1" inputmode="numeric"', hint: isNew ? 'How many you have now.' : 'Changing this is logged in Inventory. Orders take stock automatically.' })}
          ${field({ name: 'stock_note', label: 'Reason for the change', optional: true, hint: 'e.g. “New delivery from supplier” or “2 broken”.' })}
        </div></section>

        ${isNew ? '' : `<section class="card"><div class="card__head"><h2>Photos</h2><span class="muted small">The first photo is the main one. JPG, PNG or WebP, up to 5 MB.</span></div>
          <div class="images" data-images></div></section>`}

        <section class="card"><div class="card__head"><h2>More details</h2></div><div class="form-grid">
          ${field({ name: 'features', label: 'Key features', type: 'textarea', value: (d.features || []).join('\n'), cls: 'span-2', hint: 'One per line.' })}
          ${field({ name: 'specs', label: 'Specifications', type: 'textarea', value: specsToText(d.specs), cls: 'span-2', hint: 'One per line, like “Material: Stainless steel”.' })}
          ${field({ name: 'tags', label: 'Search words', value: (d.tags || []).join(', '), cls: 'span-2', optional: true, hint: 'Separated by commas. Helps shoppers find it.' })}
          ${field({ name: 'slug', label: 'Web address', value: d.slug, hint: 'Lowercase letters, numbers and dashes. Changing it breaks links you’ve already shared.', attrs: 'maxlength="120"' })}
          ${field({ name: 'listed_on', label: 'Listed on', type: 'date', value: d.listed_on, hint: 'Used for “Newest” sorting.' })}
          ${field({ name: 'rating', label: 'Rating (0–5)', type: 'number', value: d.rating, attrs: 'min="0" max="5" step="0.1"' })}
          ${field({ name: 'review_count', label: 'Number of reviews', type: 'number', value: d.review_count, attrs: 'min="0" step="1"' })}
          ${field({ name: 'popularity', label: 'Featured order (0–100)', type: 'number', value: d.popularity, attrs: 'min="0" max="100" step="1"', hint: 'Higher shows first in “Featured”.' })}
        </div></section>
      </div>

      <div class="stack" style="position:sticky;top:16px">
        <section class="card"><div class="card__head"><h2>Visibility</h2></div><div class="form">
          ${checkbox('is_active', 'Show on the store', d.is_active)}
          ${checkbox('featured', 'Feature on the home page', d.featured)}
          ${checkbox('badge_bestseller', 'Badge: Best seller', (d.badges || []).includes('bestseller'))}
          ${checkbox('badge_new', 'Badge: New', (d.badges || []).includes('new'))}
          <div class="alert alert--err" data-form-alert hidden></div>
          <button class="btn btn--gold btn--block" type="submit">${isNew ? 'Create product' : 'Save changes'}</button>
          ${isNew ? '' : `<button class="btn btn--danger btn--block" type="button" data-delete>${icon('trash', 16)} Delete product</button>`}
        </div></section>
      </div>
    </form>`;

  const form = $('[data-product]', root);
  // Margin preview
  const margin = () => {
    const price = parseMoney(form.price.value); const cost = parseMoney(form.cost.value);
    $('[data-margin]', root).textContent = price > 0 && cost >= 0 && cost !== null && !Number.isNaN(cost)
      ? `Profit per item: ${money(price - cost)} (${Math.round(((price - cost) / price) * 100)}%)` : '';
  };
  form.price.addEventListener('input', margin); form.cost.addEventListener('input', margin); margin();
  // Auto web address from the name for new products
  let slugTouched = !isNew;
  form.slug.addEventListener('input', () => { slugTouched = true; });
  form.name.addEventListener('input', () => { if (!slugTouched) form.slug.value = slugify(form.name.value); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const price = parseMoney(form.price.value);
    const compare = parseMoney(form.compare.value);
    const cost = parseMoney(form.cost.value);
    const stock = Number(form.stock.value);
    const slug = val(form, 'slug') || slugify(val(form, 'name'));
    const rating = Number(form.rating.value || 0);
    const reviews = Number(form.review_count.value || 0);
    const pop = Number(form.popularity.value || 0);
    const errors = {
      name: val(form, 'name').length >= 2 ? '' : 'Enter a product name.',
      category_id: val(form, 'category_id') ? '' : 'Choose a category (add one in Categories first).',
      price: price === null ? 'Enter a price.' : Number.isNaN(price) ? 'Use a number like 24.99.' : '',
      compare: Number.isNaN(compare) ? 'Use a number like 29.99.' : compare !== null && price !== null && compare <= price ? 'Must be higher than the selling price (or leave it empty).' : '',
      cost: Number.isNaN(cost) ? 'Use a number like 12.50.' : '',
      stock: Number.isInteger(stock) && stock >= 0 ? '' : 'Enter a whole number, 0 or more.',
      slug: /^[a-z0-9-]{2,120}$/.test(slug) ? '' : 'Use lowercase letters, numbers and dashes.',
      rating: rating >= 0 && rating <= 5 ? '' : 'Between 0 and 5.',
      review_count: Number.isInteger(reviews) && reviews >= 0 ? '' : 'A whole number.',
      popularity: Number.isInteger(pop) && pop >= 0 && pop <= 100 ? '' : 'Between 0 and 100.',
    };
    if (!showErrors(form, errors)) return;
    const row = {
      name: val(form, 'name'), slug, category_id: val(form, 'category_id'), brand_id: val(form, 'brand_id') || null,
      price_cents: price, compare_at_cents: compare, cost_cents: cost,
      short_description: val(form, 'short_description'), description: form.description.value.trim(),
      features: lines(form.features.value), specs: textToSpecs(form.specs.value),
      tags: val(form, 'tags').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      badges: [checked(form, 'badge_bestseller') && 'bestseller', checked(form, 'badge_new') && 'new'].filter(Boolean),
      featured: checked(form, 'featured'), is_active: checked(form, 'is_active'),
      popularity: pop, rating: Math.round(rating * 10) / 10, review_count: reviews, listed_on: form.listed_on.value || beirutToday(),
    };
    const alertEl = $('[data-form-alert]', root);
    alertEl.hidden = true;
    busy(e.submitter, async () => {
      try {
        if (isNew) {
          const newId = await nextProductId();
          await q(sb.from('products').insert({ id: newId, ...row, stock: 0 }));
          if (stock > 0) await rpc('admin_adjust_stock', { p_product_id: newId, p_change: stock, p_reason: 'restock', p_note: val(form, 'stock_note') || 'Opening stock' });
          toast('Product created. Now add its photos.', { tone: 'ok' });
          ctx.navigate(`#/products/${newId}`);
          return;
        }
        await q(sb.from('products').update(row).eq('id', d.id));
        const delta = stock - loadedStock; // relative, so orders placed meanwhile aren't overwritten
        if (delta) await rpc('admin_adjust_stock', { p_product_id: d.id, p_change: delta, p_reason: delta > 0 ? 'restock' : 'adjustment', p_note: val(form, 'stock_note') || null });
        toast('Saved. The store shows the changes now.', { tone: 'ok' });
        await renderEditor(root, d.id, ctx);
      } catch (err) {
        alertEl.textContent = err.code === '23505' ? 'Another product already uses that web address. Change it under More details.' : err.message;
        alertEl.hidden = false;
      }
    });
  });

  $('[data-delete]', root)?.addEventListener('click', async (e) => {
    if (sold > 0) {
      await confirmDialog('This product has orders', `It appears in ${sold} order line(s), so it can’t be deleted — that would break your sales history. Untick <strong>Show on the store</strong> and save to hide it instead.`, { ok: 'OK' });
      return;
    }
    if (!(await confirmDialog('Delete this product?', `<strong>${esc(d.name)}</strong>, its photos and its stock history will be deleted for good. To keep it but stop selling it, hide it instead.`, { ok: 'Delete', danger: true }))) return;
    busy(e.currentTarget, async () => {
      const paths = (d.product_images || []).map((i) => i.storage_path).filter(Boolean);
      await q(sb.from('products').delete().eq('id', d.id));
      if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      toast('Product deleted.', { tone: 'ok' });
      ctx.navigate('#/products');
    });
  });

  if (!isNew) mountImages($('[data-images]', root), d);
}

/* ── Photos ────────────────────────────────────────────────────── */
function mountImages(box, product) {
  let images = (product.product_images || []).slice().sort((a, b) => a.position - b.position);

  const draw = () => {
    box.innerHTML = `${images.map((img, i) => `<figure class="image" style="margin:0">
        <img src="${esc(imgSrc(img.url))}" alt="${esc(img.alt || product.name)}">
        <div class="image__bar">
          <span class="image__tag">${i === 0 ? 'Main' : `#${i + 1}`}</span>
          <span style="display:flex;gap:4px">
            <button type="button" class="icon-btn" data-move="${i}" data-dir="-1" aria-label="Move left" ${i === 0 ? 'disabled' : ''}>${icon('left', 14)}</button>
            <button type="button" class="icon-btn" data-move="${i}" data-dir="1" aria-label="Move right" ${i === images.length - 1 ? 'disabled' : ''}>${icon('right', 14)}</button>
            <button type="button" class="icon-btn" data-remove="${i}" aria-label="Delete photo">${icon('trash', 14)}</button>
          </span>
        </div></figure>`).join('')}
      <label class="drop" data-drop>${icon('upload', 22)}<span>Add photos<br><span class="muted">click or drop files here</span></span>
        <input type="file" accept="${ACCEPT.join(',')}" multiple data-file></label>`;
    $$('[data-move]', box).forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.move), Number(b.dataset.dir), b)));
    $$('[data-remove]', box).forEach((b) => b.addEventListener('click', () => removeAt(Number(b.dataset.remove), b)));
    const drop = $('[data-drop]', box);
    $('[data-file]', box).addEventListener('change', (e) => upload([...e.target.files]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); upload([...e.dataTransfer.files]); });
  };

  // Positions are unique per product, so renumber in two passes.
  async function savePositions(list) {
    for (let i = 0; i < list.length; i++) await q(sb.from('product_images').update({ position: -1 - i }).eq('id', list[i].id));
    for (let i = 0; i < list.length; i++) { await q(sb.from('product_images').update({ position: i }).eq('id', list[i].id)); list[i].position = i; }
  }

  const move = (i, dir, btn) => busy(btn, async () => {
    const list = images.slice();
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    await savePositions(list);
    images = list; draw();
  });

  const removeAt = async (i, btn) => {
    if (!(await confirmDialog('Delete this photo?', 'It will be removed from the store.', { ok: 'Delete', danger: true }))) return;
    busy(btn, async () => {
      const img = images[i];
      await q(sb.from('product_images').delete().eq('id', img.id));
      if (img.storage_path) await sb.storage.from(BUCKET).remove([img.storage_path]);
      images = images.filter((x) => x.id !== img.id);
      await savePositions(images);
      draw();
      toast('Photo deleted.', { tone: 'ok' });
    });
  };

  async function upload(files) {
    if (!files.length) return;
    const drop = $('[data-drop]', box);
    drop.classList.add('is-over');
    drop.querySelector('span').textContent = `Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`;
    let done = 0;
    for (const file of files) {
      try {
        const { blob, ext, type } = await prepareImage(file);
        const path = `products/${product.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
        if (upErr) throw new Error(upErr.message?.includes('row-level') ? 'Your account isn’t allowed to upload photos.' : `Upload failed: ${upErr.message}`);
        const position = images.length ? Math.max(...images.map((x) => x.position)) + 1 : 0;
        try {
          const [row] = await q(sb.from('product_images').insert({ product_id: product.id, url: publicUrl(path), storage_path: path, position, alt: product.name }).select());
          images.push(row);
        } catch (err) { await sb.storage.from(BUCKET).remove([path]); throw err; }
        done++;
      } catch (err) { toast(err.message, { tone: 'err', ms: 7000 }); }
    }
    draw();
    if (done) toast(`${done} photo${done > 1 ? 's' : ''} added.`, { tone: 'ok' });
  }

  draw();
}
