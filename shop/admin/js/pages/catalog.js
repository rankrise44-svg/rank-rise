/* Categories & brands: add, rename, describe, reorder, hide, picture. */
import { sb, q } from '../sb.js';
import { ACCEPT, uploadImage, removeImageByUrl } from '../upload.js';
import { $, $$, esc, pageHead, field, checkbox, showErrors, val, checked, busy, toast, modal, confirmDialog, emptyRow, imgSrc, slugify } from '../ui.js';

const KINDS = {
  category: { table: 'categories', title: 'Category', text: 'blurb', textLabel: 'Short description', img: 'icon_url', imgLabel: 'Picture (round icon on the home page)', folder: 'categories', fk: 'category_id' },
  brand: { table: 'brands', title: 'Brand', text: 'about', textLabel: 'About the brand', img: 'logo_url', imgLabel: 'Logo', folder: 'brands', fk: 'brand_id' },
};

export async function render(root) {
  const [cats, brands, prods] = await Promise.all([
    q(sb.from('categories').select('*').order('sort_order').order('name')),
    q(sb.from('brands').select('*').order('sort_order').order('name')),
    q(sb.from('products').select('category_id, brand_id')),
  ]);
  const count = (fk, id) => prods.filter((p) => p[fk] === id).length;

  const table = (kind, rows) => {
    const k = KINDS[kind];
    return `<section class="card card--flush" aria-labelledby="${kind}-title">
      <div class="card__head"><h2 id="${kind}-title">${k.title === 'Category' ? 'Categories' : 'Brands'}</h2><button class="btn btn--gold btn--sm" data-add="${kind}">+ Add ${k.title.toLowerCase()}</button></div>
      <div class="table-wrap"><table class="responsive"><thead><tr><th style="width:60px"><span class="sr-only">Picture</span></th><th>Name</th><th class="num">Products</th><th class="num">Order</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.length ? rows.map((r) => `<tr>
        <td>${r[k.img] ? `<img class="thumb" src="${esc(imgSrc(r[k.img]))}" alt="">` : '<span class="thumb" style="display:block"></span>'}</td>
        <td><div class="cell-main">${esc(r.name)}</div><div class="cell-sub">${esc(r[k.text] || '')}</div></td>
        <td class="num" data-label="Products"><a class="link" href="#/products${kind === 'category' ? `?category=${encodeURIComponent(r.id)}` : ''}">${count(k.fk, r.id)}</a></td>
        <td class="num" data-label="Order">${r.sort_order}</td>
        <td>${r.is_active ? '<span class="badge badge--ok">Visible</span>' : '<span class="badge badge--off">Hidden</span>'}</td>
        <td class="actions"><button class="btn btn--outline btn--sm" data-edit="${kind}" data-id="${esc(r.id)}">Edit</button></td></tr>`).join('')
        : emptyRow(6, `No ${kind === 'category' ? 'categories' : 'brands'} yet`)}
      </tbody></table></div></section>`;
  };

  root.innerHTML = `${pageHead({ title: 'Categories & brands', sub: 'How products are grouped on the store. Hiding a category also hides its products.' })}
    <div class="stack">${table('category', cats)}${table('brand', brands)}</div>`;

  const rerender = () => render(root);
  $$('[data-add]', root).forEach((b) => b.addEventListener('click', () => editDialog(b.dataset.add, null, rerender, 0)));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => {
    const rows = b.dataset.edit === 'category' ? cats : brands;
    const row = rows.find((r) => r.id === b.dataset.id);
    editDialog(b.dataset.edit, row, rerender, count(KINDS[b.dataset.edit].fk, row.id));
  }));
}

async function editDialog(kind, row, done, used) {
  const k = KINDS[kind];
  const isNew = !row;
  const r = row || { name: '', [k.text]: '', sort_order: 0, is_active: true, [k.img]: null };
  let newImage = null; // { url, path } uploaded in this dialog
  const body = `<form class="form" data-edit-form novalidate>
    ${field({ name: 'name', label: 'Name', value: r.name, attrs: 'maxlength="60" required' })}
    ${field({ name: 'text', label: k.textLabel, type: 'textarea', value: r[k.text], optional: true, attrs: 'rows="2" maxlength="300"' })}
    ${field({ name: 'sort_order', label: 'Order', type: 'number', value: r.sort_order, attrs: 'step="1"', hint: 'Lower numbers show first.' })}
    ${checkbox('is_active', 'Visible on the store', r.is_active)}
    <div class="field"><span class="field__label">${esc(k.imgLabel)}</span>
      <div style="display:flex;gap:12px;align-items:center">
        <img class="thumb thumb--lg" data-preview src="${esc(imgSrc(r[k.img]) || '')}" alt="" ${r[k.img] ? '' : 'hidden'}>
        <label class="btn btn--outline btn--sm">Choose picture<input type="file" accept="${ACCEPT.join(',')}" data-file hidden></label>
      </div></div>
    ${isNew ? '' : `<hr class="sep"><button type="button" class="btn btn--danger btn--sm" data-del style="justify-self:start">Delete ${k.title.toLowerCase()}</button>
      ${used ? `<p class="field__hint">${used} product(s) use it, so it can only be hidden, not deleted.</p>` : ''}`}
  </form>`;

  const save = async (wrap) => {
    const form = $('[data-edit-form]', wrap);
    const name = val(form, 'name');
    const sort = Number(form.sort_order.value || 0);
    if (!showErrors(form, { name: name.length >= 2 ? '' : 'Enter a name.', sort_order: Number.isInteger(sort) ? '' : 'A whole number.' })) return false;
    const data = { name, [k.text]: form.text.value.trim(), sort_order: sort, is_active: checked(form, 'is_active') };
    if (newImage) data[k.img] = newImage.url;
    if (isNew) {
      const id = slugify(name).slice(0, 40);
      if (id.length < 2) { showErrors(form, { name: 'Use letters or numbers in the name.' }); return false; }
      await q(sb.from(k.table).insert({ id, ...data }));
    } else {
      await q(sb.from(k.table).update(data).eq('id', r.id));
      if (newImage && r[k.img]) removeImageByUrl(r[k.img]).catch(() => {});
    }
    toast(`${k.title} saved.`, { tone: 'ok' });
    return true;
  };

  const p = modal({ title: isNew ? `Add ${k.title.toLowerCase()}` : `Edit ${r.name}`, body, actions: [{ label: 'Cancel', value: false }, { label: 'Save', cls: 'btn--gold', onClick: save }] });
  const wrap = document.querySelector('.modal:last-of-type');
  $('[data-file]', wrap).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const btn = e.target.closest('label');
    await busy(btn, async () => {
      newImage = await uploadImage(k.folder, file);
      const img = $('[data-preview]', wrap); img.src = newImage.url; img.hidden = false;
    });
  });
  $('[data-del]', wrap)?.addEventListener('click', async () => {
    if (used) { toast(`Move or delete its ${used} product(s) first, or just hide it.`, { tone: 'err' }); return; }
    wrap.querySelector('[data-close]').click();
    if (!(await confirmDialog(`Delete ${r.name}?`, 'This can’t be undone.', { ok: 'Delete', danger: true }))) return;
    try {
      await q(sb.from(k.table).delete().eq('id', r.id));
      if (r[k.img]) removeImageByUrl(r[k.img]).catch(() => {});
      toast(`${k.title} deleted.`, { tone: 'ok' });
      done();
    } catch (err) { toast(err.message, { tone: 'err' }); }
  });
  const result = await p;
  if (result === true || result === undefined) done();
  else if (newImage && result !== true) removeImageByUrl(newImage.url).catch(() => {}); // cancelled: tidy the unused upload
}
