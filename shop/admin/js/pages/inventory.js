/* Inventory: stock levels, quick restock / count, and the movement log. */
import { sb, q, rpc } from '../sb.js';
import { $, $$, esc, pageHead, field, showErrors, val, toast, modal, emptyRow, fmtDateTime, imgSrc, debounce, money } from '../ui.js';

const REASON = { sale: 'Sold', cancel: 'Order cancelled', restock: 'Restock', adjustment: 'Correction', return: 'Returned' };

export async function render(root) {
  const [products, moves, admins] = await Promise.all([
    q(sb.from('products').select('id, name, stock, is_active, cost_cents, price_cents, product_images(url, position)').order('stock').order('name')),
    q(sb.from('inventory_movements').select('id, product_id, change, reason, order_id, note, created_by, created_at').order('created_at', { ascending: false }).limit(150)),
    rpc('admin_list_admins').catch(() => []),
  ]);
  const name = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const who = Object.fromEntries(admins.map((a) => [a.userId, a.email]));
  const units = products.reduce((n, p) => n + p.stock, 0);
  const value = products.reduce((n, p) => n + p.stock * (p.cost_cents ?? 0), 0);
  const state = { search: '', show: 'all' };

  root.innerHTML = `
    ${pageHead({ title: 'Inventory', sub: 'Stock goes down automatically with every order and back up when an order is cancelled.' })}
    <div class="stats">
      <div class="stat"><span class="stat__label">Items in stock</span><span class="stat__value">${units}</span><span class="stat__note">across ${products.length} products</span></div>
      <div class="stat"><span class="stat__label">Stock value</span><span class="stat__value">${money(value)}</span><span class="stat__note">at your cost prices</span></div>
      <div class="stat stat--warn"><span class="stat__label">Sold out</span><span class="stat__value">${products.filter((p) => p.stock === 0).length}</span><span class="stat__note">${products.filter((p) => p.stock > 0 && p.stock <= 3).length} more are low</span></div>
    </div>
    <div class="grid grid--2" style="align-items:start">
      <section class="card card--flush" aria-labelledby="lv-title">
        <div class="card__head"><h2 id="lv-title">Stock levels</h2>
          <span class="form-actions"><input type="search" placeholder="Search" aria-label="Search products" data-search style="width:160px;min-height:34px">
          <select data-show aria-label="Show" style="width:auto;min-height:34px"><option value="all">All</option><option value="low">Low &amp; sold out</option></select></span></div>
        <div class="table-wrap"><table><thead><tr><th>Product</th><th class="num">Stock</th><th></th></tr></thead><tbody data-levels></tbody></table></div>
      </section>
      <section class="card card--flush" aria-labelledby="mv-title">
        <div class="card__head"><h2 id="mv-title">Recent changes</h2></div>
        <div class="table-wrap"><table><thead><tr><th>When</th><th>Product</th><th class="num">Change</th><th>Why</th></tr></thead><tbody>
          ${moves.length ? moves.map((m) => `<tr>
            <td class="nowrap small">${fmtDateTime(m.created_at)}</td>
            <td><a class="link" href="#/products/${encodeURIComponent(m.product_id)}">${esc(name[m.product_id] || m.product_id)}</a></td>
            <td class="num" style="color:${m.change > 0 ? 'var(--ok)' : 'var(--err)'};font-weight:700">${m.change > 0 ? '+' : ''}${m.change}</td>
            <td class="small">${esc(REASON[m.reason] || m.reason)}${m.order_id ? ` · <a class="link" href="#/orders/${encodeURIComponent(m.order_id)}">${esc(m.order_id)}</a>` : ''}${m.note ? `<div class="muted">${esc(m.note)}</div>` : ''}${m.created_by && who[m.created_by] ? `<div class="muted">by ${esc(who[m.created_by])}</div>` : ''}</td></tr>`).join('')
            : emptyRow(4, 'No stock changes yet')}
        </tbody></table></div>
      </section>
    </div>`;

  const draw = () => {
    const s = state.search.toLowerCase();
    const list = products.filter((p) => (state.show !== 'low' || p.stock <= 3) && (!s || p.name.toLowerCase().includes(s)));
    const tb = $('[data-levels]', root);
    tb.innerHTML = list.length ? list.map((p) => {
      const img = (p.product_images || []).slice().sort((a, b) => a.position - b.position)[0];
      return `<tr><td><div style="display:flex;gap:10px;align-items:center">${img ? `<img class="thumb" src="${esc(imgSrc(img.url))}" alt="" loading="lazy">` : ''}<span><span class="cell-main">${esc(p.name)}</span>${p.is_active ? '' : ' <span class="badge badge--off">Hidden</span>'}</span></div></td>
        <td class="num">${p.stock === 0 ? '<span class="badge badge--err">0</span>' : p.stock <= 3 ? `<span class="badge badge--warn">${p.stock}</span>` : p.stock}</td>
        <td class="actions"><button class="btn btn--outline btn--sm" data-restock="${esc(p.id)}">Update</button></td></tr>`;
    }).join('') : emptyRow(3, 'Nothing to show');
    $$('[data-restock]', tb).forEach((b) => b.addEventListener('click', () => stockDialog(products.find((p) => p.id === b.dataset.restock), () => render(root))));
  };
  $('[data-search]', root).addEventListener('input', debounce((e) => { state.search = e.target.value; draw(); }, 150));
  $('[data-show]', root).addEventListener('change', (e) => { state.show = e.target.value; draw(); });
  draw();
}

function stockDialog(p, done) {
  const body = `<form class="form" data-stock-form novalidate>
    <p>Now in stock: <strong>${p.stock}</strong></p>
    <div class="seg" role="group" aria-label="Type of change">
      <button type="button" data-mode="add" aria-pressed="true">Add new stock</button>
      <button type="button" data-mode="set" aria-pressed="false">Set the count</button>
      <button type="button" data-mode="remove" aria-pressed="false">Remove (broken, lost…)</button>
    </div>
    ${field({ name: 'qty', label: 'How many arrived?', type: 'number', attrs: 'min="0" step="1" inputmode="numeric"' })}
    ${field({ name: 'note', label: 'Note', optional: true, hint: 'e.g. supplier, invoice number, reason.' })}
  </form>`;
  let mode = 'add';
  const labels = { add: 'How many arrived?', set: 'How many are on the shelf now?', remove: 'How many to remove?' };
  modal({
    title: `Stock · ${p.name}`, body,
    actions: [{ label: 'Cancel', value: false }, {
      label: 'Save', cls: 'btn--gold', onClick: async (wrap) => {
        const form = $('[data-stock-form]', wrap);
        const n = Number(form.qty.value);
        if (!showErrors(form, { qty: form.qty.value !== '' && Number.isInteger(n) && n >= 0 && (mode === 'set' || n > 0) ? '' : 'Enter a whole number.' })) return false;
        const note = val(form, 'note') || null;
        let stock;
        if (mode === 'set') stock = await rpc('admin_set_stock', { p_product_id: p.id, p_stock: n, p_note: note || 'Stock count' });
        else stock = await rpc('admin_adjust_stock', { p_product_id: p.id, p_change: mode === 'add' ? n : -n, p_reason: mode === 'add' ? 'restock' : 'adjustment', p_note: note });
        toast(`${p.name}: ${stock} in stock.`, { tone: 'ok' });
        done();
        return true;
      },
    }],
  });
  const wrap = document.querySelector('.modal:last-of-type');
  $$('[data-mode]', wrap).forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    $$('[data-mode]', wrap).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    wrap.querySelector('label[for="f-qty"]').textContent = labels[mode];
    wrap.querySelector('[name="qty"]').focus();
  }));
}
