/* Customers: one per phone number, with their orders, totals and private notes. */
import { sb, q } from '../sb.js';
import { $, $$, esc, money, pageHead, field, showErrors, val, busy, toast, emptyRow, fmtDate, fmtDateTime, prettyPhone, waLink, statusBadge, icon, debounce, downloadCsv } from '../ui.js';

const spent = (orders) => orders.filter((o) => o.status !== 'cancelled' && o.status !== 'awaiting_whatsapp').reduce((s, o) => s + o.total_cents, 0);

export async function render(root, params) {
  if (params.id) return renderCustomer(root, params.id);
  const rows = await q(sb.from('customers').select('id, full_name, phone, email, notes, created_at, orders(id, total_cents, status, created_at)').order('created_at', { ascending: false }).limit(2000));
  const list = rows.map((c) => ({ ...c, n: c.orders.length, spent: spent(c.orders), last: c.orders.map((o) => o.created_at).sort().pop() }));
  const state = { search: '', sort: 'recent' };

  root.innerHTML = `
    ${pageHead({ title: 'Customers', sub: `${list.length} customers. Each one is recognised by their mobile number.`, actions: `<button class="btn btn--outline" data-csv>${icon('download', 16)} Download CSV</button>` })}
    <div class="toolbar">
      <input type="search" placeholder="Search name, phone or email" aria-label="Search customers" data-search>
      <select data-sort aria-label="Sort"><option value="recent">Latest order first</option><option value="spent">Spent the most</option><option value="orders">Most orders</option><option value="name">Name A–Z</option></select>
    </div>
    <section class="card card--flush"><div class="table-wrap"><table class="responsive">
      <thead><tr><th>Customer</th><th>Phone</th><th class="num">Orders</th><th class="num">Spent</th><th>Last order</th></tr></thead>
      <tbody data-rows></tbody></table></div></section>`;

  const draw = () => {
    const s = state.search.toLowerCase().trim();
    const digits = s.replace(/\D/g, '').replace(/^0/, '');
    const shown = list.filter((c) => !s || c.full_name.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s) || (digits.length >= 3 && c.phone.includes(digits)));
    const by = { recent: (a, b) => String(b.last || '').localeCompare(String(a.last || '')), spent: (a, b) => b.spent - a.spent, orders: (a, b) => b.n - a.n, name: (a, b) => a.full_name.localeCompare(b.full_name) }[state.sort];
    shown.sort(by);
    const tb = $('[data-rows]', root);
    tb.innerHTML = shown.length ? shown.map((c) => `<tr class="is-link" data-href="#/customers/${c.id}">
      <td><div class="cell-main">${esc(c.full_name)}</div>${c.email ? `<div class="cell-sub">${esc(c.email)}</div>` : ''}</td>
      <td class="tabular" data-label="Phone">${esc(prettyPhone(c.phone))}</td>
      <td class="num" data-label="Orders">${c.n}</td>
      <td class="num" data-label="Spent">${money(c.spent)}</td>
      <td data-label="Last order">${c.last ? fmtDate(c.last) : '—'}</td></tr>`).join('') : emptyRow(5, list.length ? 'No customers match' : 'No customers yet', list.length ? '' : 'They appear here after their first order.');
    $$('tr[data-href]', tb).forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
  };
  $('[data-search]', root).addEventListener('input', debounce((e) => { state.search = e.target.value; draw(); }, 150));
  $('[data-sort]', root).addEventListener('change', (e) => { state.sort = e.target.value; draw(); });
  $('[data-csv]', root).addEventListener('click', () => downloadCsv(`cedarline-customers-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Name', 'Phone', 'Email', 'Orders', 'Spent (USD)', 'Last order', 'Notes'],
    ...list.map((c) => [c.full_name, c.phone, c.email || '', c.n, (c.spent / 100).toFixed(2), c.last ? fmtDate(c.last) : '', c.notes]),
  ]));
  draw();
}

async function renderCustomer(root, id) {
  const c = await q(sb.from('customers').select('*, orders(id, total_cents, status, created_at, order_method, city, zone_name)').eq('id', id).maybeSingle());
  if (!c) { root.innerHTML = pageHead({ title: 'Customer not found', crumb: { href: '#/customers', label: 'Customers' } }); return; }
  const orders = c.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
  root.innerHTML = `
    ${pageHead({ title: c.full_name, crumb: { href: '#/customers', label: 'Customers' }, sub: `Customer since ${fmtDate(c.created_at)} · ${orders.length} order${orders.length === 1 ? '' : 's'} · ${money(spent(orders))} spent` })}
    <div class="grid grid--side">
      <section class="card card--flush"><div class="card__head"><h2>Orders</h2></div><div class="table-wrap"><table class="responsive">
        <thead><tr><th>Order</th><th>Status</th><th>Delivery</th><th class="num">Total</th></tr></thead><tbody>
        ${orders.length ? orders.map((o) => `<tr class="is-link" data-href="#/orders/${encodeURIComponent(o.id)}">
          <td><div class="cell-main tabular">${esc(o.id)}</div><div class="cell-sub">${fmtDateTime(o.created_at)}</div></td>
          <td>${statusBadge(o.status)}</td><td data-label="Delivery">${esc([o.city, o.zone_name].filter(Boolean).join(', ') || 'On WhatsApp')}</td>
          <td class="num" data-label="Total">${money(o.total_cents)}</td></tr>`).join('') : emptyRow(4, 'No orders')}
        </tbody></table></div></section>
      <section class="card"><div class="card__head"><h2>Details</h2></div>
        <div class="form-actions" style="margin-bottom:14px">
          <a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="${esc(waLink(c.phone, `Hello ${c.full_name.split(/\s+/)[0]}, this is Cedarline.`))}">${icon('wa', 16)} WhatsApp</a>
          <a class="btn btn--outline btn--sm" href="tel:${esc(c.phone)}">${icon('phone', 16)} Call</a>
        </div>
        <form class="form" data-cust novalidate>
          ${field({ name: 'full_name', label: 'Name', value: c.full_name, attrs: 'maxlength="80"' })}
          <div class="field"><span class="field__label">Mobile</span><span class="tabular">${esc(prettyPhone(c.phone))}</span></div>
          ${field({ name: 'email', label: 'Email', type: 'email', value: c.email || '', optional: true })}
          ${field({ name: 'notes', label: 'Private notes', type: 'textarea', value: c.notes, optional: true, hint: 'Only the store team sees these.' })}
          <button class="btn btn--gold" type="submit">Save</button>
        </form></section>
    </div>`;
  $$('tr[data-href]', root).forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
  const form = $('[data-cust]', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = val(form, 'email');
    if (!showErrors(form, { full_name: val(form, 'full_name').length >= 2 ? '' : 'Enter a name.', email: !email || /^\S+@\S+\.\S+$/.test(email) ? '' : 'Check the email.' })) return;
    busy(e.submitter, async () => {
      await q(sb.from('customers').update({ full_name: val(form, 'full_name'), email: email || null, notes: form.notes.value.trim() }).eq('id', c.id));
      toast('Customer saved.', { tone: 'ok' });
    });
  });
}
