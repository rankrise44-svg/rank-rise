/* Orders: list with filters, and the order page (status, notes, contact). */
import { sb, q, qc } from '../sb.js';
import {
  $, $$, esc, money, pageHead, statusBadge, STATUS, FLOW, METHOD, fmtDateTime, timeAgo, prettyPhone, waLink,
  emptyRow, icon, busy, toast, confirmDialog, debounce, downloadCsv,
} from '../ui.js';

const PAGE = 50;
const OPEN = ['awaiting_whatsapp', 'confirmed', 'packed', 'out_for_delivery'];

export async function render(root, params, ctx) {
  if (params.id) return renderOrder(root, params.id, ctx);
  return renderList(root, params, ctx);
}

/* ── List ──────────────────────────────────────────────────────── */
async function renderList(root, params) {
  const state = { status: params.query.get('status') || 'open', search: params.query.get('q') || '', page: 0 };
  root.innerHTML = `
    ${pageHead({ title: 'Orders', sub: 'Every order from the store. Click one to update it.', actions: `<button class="btn btn--outline" data-csv>${icon('download', 16)} Download CSV</button>` })}
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Filter by status">
        ${[['open', 'To handle'], ['awaiting_whatsapp', 'WhatsApp'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['out_for_delivery', 'On the way'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']]
          .map(([v, l]) => `<button type="button" data-status="${v}" aria-pressed="${state.status === v}">${l}</button>`).join('')}
      </div>
      <input type="search" placeholder="Search order no., name or phone" aria-label="Search orders" data-search value="${esc(state.search)}">
    </div>
    <section class="card card--flush"><div class="table-wrap"><table class="responsive">
      <thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Status</th><th class="num">Total</th></tr></thead>
      <tbody data-rows><tr><td colspan="5" class="loading">Loading…</td></tr></tbody></table></div>
      <div class="card__head" style="padding:12px 20px" data-pager></div>
    </section>`;

  const build = () => {
    let b = sb.from('orders').select('id, status, order_method, full_name, phone, zone_name, city, total_cents, created_at, cod_currency', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (state.status === 'open') b = b.in('status', OPEN);
    else if (state.status !== 'all') b = b.eq('status', state.status);
    const s = state.search.replace(/[%,()]/g, ' ').trim();
    if (s) {
      const digits = s.replace(/\D/g, '');
      const ors = [`id.ilike.%${s}%`, `full_name.ilike.%${s}%`];
      if (digits.length >= 3) ors.push(`phone.ilike.%${digits.replace(/^0/, '')}%`);
      b = b.or(ors.join(','));
    }
    return b;
  };

  async function load() {
    const tbody = $('[data-rows]', root);
    const { data, count } = await qc(build().range(state.page * PAGE, state.page * PAGE + PAGE - 1));
    tbody.innerHTML = data.length ? data.map((o) => `<tr class="is-link" data-href="#/orders/${encodeURIComponent(o.id)}">
      <td><div class="cell-main tabular">${esc(o.id)}</div><div class="cell-sub">${fmtDateTime(o.created_at)} · ${timeAgo(o.created_at)}</div></td>
      <td data-label="Customer"><div class="cell-main">${esc(o.full_name)}</div><div class="cell-sub tabular">${esc(prettyPhone(o.phone))}</div></td>
      <td data-label="Delivery">${o.city ? `${esc(o.city)}${o.zone_name ? `, ${esc(o.zone_name)}` : ''}` : '<span class="muted">On WhatsApp</span>'}<div class="cell-sub">${esc(METHOD[o.order_method])}${o.cod_currency ? ` (${o.cod_currency})` : ''}</div></td>
      <td>${statusBadge(o.status)}</td>
      <td class="num" data-label="Total">${money(o.total_cents)}</td></tr>`).join('')
      : emptyRow(5, state.search ? 'No orders match your search' : 'No orders here', state.status === 'open' ? 'Nothing to handle right now.' : '');
    $$('tr[data-href]', tbody).forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
    const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
    $('[data-pager]', root).innerHTML = `<span class="muted small">${count || 0} order${count === 1 ? '' : 's'}</span>
      ${pages > 1 ? `<span class="form-actions"><button class="btn btn--outline btn--sm" data-prev ${state.page === 0 ? 'disabled' : ''}>Previous</button><span class="small">Page ${state.page + 1} of ${pages}</span><button class="btn btn--outline btn--sm" data-next ${state.page + 1 >= pages ? 'disabled' : ''}>Next</button></span>` : ''}`;
    $('[data-prev]', root)?.addEventListener('click', () => { state.page--; load(); });
    $('[data-next]', root)?.addEventListener('click', () => { state.page++; load(); });
  }

  $$('[data-status]', root).forEach((b) => b.addEventListener('click', () => {
    state.status = b.dataset.status; state.page = 0;
    $$('[data-status]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    load();
  }));
  $('[data-search]', root).addEventListener('input', debounce((e) => { state.search = e.target.value; state.page = 0; load(); }, 300));
  $('[data-csv]', root).addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const rows = await q(build().limit(5000));
    downloadCsv(`cedarline-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Order', 'Date', 'Status', 'Method', 'Customer', 'Phone', 'City', 'Governorate', 'Total (USD)'],
      ...rows.map((o) => [o.id, fmtDateTime(o.created_at), STATUS[o.status], METHOD[o.order_method], o.full_name, o.phone, o.city, o.zone_name, (o.total_cents / 100).toFixed(2)]),
    ]);
  }));
  await load();
}

/* ── One order ─────────────────────────────────────────────────── */
async function renderOrder(root, id, ctx) {
  const o = await q(sb.from('orders').select('*, order_items(*), order_status_history(status, created_at, note)').eq('id', id).maybeSingle());
  if (!o) {
    root.innerHTML = `${pageHead({ title: 'Order not found', crumb: { href: '#/orders', label: 'Orders' } })}<p class="muted">It may have been removed.</p>`;
    return;
  }
  const items = (o.order_items || []).sort((a, b) => a.id - b.id);
  const history = (o.order_status_history || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const flow = o.order_method === 'cod' ? FLOW.slice(1) : FLOW; // cash-on-delivery orders start confirmed
  const idx = flow.indexOf(o.status);
  const next = o.status === 'cancelled' || idx < 0 || idx === flow.length - 1 ? null : flow[idx + 1];
  const nextLabel = { confirmed: 'Mark as confirmed', packed: 'Mark as packed', out_for_delivery: 'Mark as out for delivery', delivered: 'Mark as delivered' }[next];
  const first = o.full_name.split(/\s+/)[0];
  const cogs = items.reduce((s, i) => s + (i.unit_cost_cents ?? 0) * i.qty, 0);
  const missingCost = items.some((i) => i.unit_cost_cents == null);
  const msgs = {
    confirm: `Hello ${first}, this is Cedarline. Your order ${o.id} (${money(o.total_cents)}) is confirmed. We’ll call you before delivery. Thank you!`,
    onway: `Hello ${first}, your Cedarline order ${o.id} is on its way. Please keep ${money(o.total_cents)}${o.cod_currency === 'LBP' ? ' (in LBP at today’s rate)' : ''} ready for the courier.`,
    hello: `Hello ${first}, this is Cedarline about your order ${o.id}.`,
  };

  root.innerHTML = `
    ${pageHead({ title: `Order ${o.id}`, crumb: { href: '#/orders', label: 'Orders' }, sub: `Placed ${fmtDateTime(o.created_at)} · ${esc(METHOD[o.order_method])}${o.cod_currency ? ` · pays in ${o.cod_currency}` : ''}`, actions: statusBadge(o.status) })}
    <div class="grid grid--side">
      <div class="stack">
        <section class="card" aria-labelledby="st-title">
          <div class="card__head"><h2 id="st-title">Status</h2></div>
          ${o.status === 'cancelled' ? '<div class="alert alert--err">This order was cancelled. Its items were put back in stock.</div>' : `
            <div class="steps">${flow.map((s, i) => `<span class="${i < idx ? 'is-done' : i === idx ? 'is-current' : ''}">${esc(STATUS[s])}</span>`).join('')}</div>
            <div class="form-actions">
              ${next ? `<button class="btn btn--gold" data-next="${next}">${esc(nextLabel)}</button>` : '<span class="badge badge--ok">Completed</span>'}
              <label class="sr-only" for="status-pick">Set status</label>
              <select id="status-pick" data-pick style="width:auto;min-height:40px">${Object.entries(STATUS).filter(([k]) => k !== 'cancelled').map(([k, l]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
              <span class="spacer" style="flex:1"></span>
              ${o.status !== 'delivered' ? '<button class="btn btn--danger" data-cancel>Cancel order</button>' : ''}
            </div>
            ${o.status === 'awaiting_whatsapp' ? '<p class="field__hint" style="margin-top:10px">The customer sent this order on WhatsApp. Once you’ve agreed the details in the chat, mark it as confirmed. Its stock is already reserved.</p>' : ''}`}
        </section>
        <section class="card card--flush" aria-labelledby="it-title">
          <div class="card__head"><h2 id="it-title">Items</h2></div>
          <div class="table-wrap"><table><thead><tr><th>Product</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Total</th></tr></thead><tbody>
            ${items.map((i) => `<tr><td>${i.product_id ? `<a class="link" href="#/products/${encodeURIComponent(i.product_id)}">${esc(i.product_name)}</a>` : esc(i.product_name)}</td>
              <td class="num">${money(i.unit_price_cents)}</td><td class="num">${i.qty}</td><td class="num">${money(i.line_total_cents)}</td></tr>`).join('')}
          </tbody></table></div>
          <div style="padding:6px 20px 18px"><div class="totals">
            <div><span>Subtotal</span><span class="tabular">${money(o.subtotal_cents)}</span></div>
            ${o.discount_cents ? `<div><span>Discount${o.promo_code ? ` (${esc(o.promo_code)})` : ''}</span><span class="tabular">−${money(o.discount_cents)}</span></div>` : ''}
            <div><span>Delivery</span><span class="tabular">${o.zone_id ? (o.delivery_cents ? money(o.delivery_cents) : 'Free') : 'To agree on WhatsApp'}</span></div>
            <div class="grand"><span>Total</span><span class="tabular">${money(o.total_cents)}</span></div>
            <div class="muted small"><span>Product cost${missingCost ? ' (some items have no cost price)' : ''}</span><span class="tabular">${money(cogs)}</span></div>
            <div class="muted small"><span>Profit on this order</span><span class="tabular">${money(o.subtotal_cents - o.discount_cents - cogs)}</span></div>
          </div></div>
        </section>
        <section class="card" aria-labelledby="notes-title">
          <div class="card__head"><h2 id="notes-title">Private notes</h2><span class="muted small">Only the store team sees these.</span></div>
          <form data-notes class="form"><textarea name="notes" aria-labelledby="notes-title" placeholder="e.g. Customer asked for delivery after 5pm">${esc(o.internal_notes)}</textarea>
            <div class="form-actions"><button class="btn btn--outline btn--sm" type="submit">Save notes</button></div></form>
        </section>
      </div>
      <div class="stack">
        <section class="card" aria-labelledby="cu-title">
          <div class="card__head"><h2 id="cu-title">Customer</h2>${o.customer_id ? `<a class="btn btn--ghost btn--sm" href="#/customers/${o.customer_id}">History</a>` : ''}</div>
          <dl class="kv"><dt>Name</dt><dd>${esc(o.full_name)}</dd><dt>Phone</dt><dd class="tabular">${esc(prettyPhone(o.phone))}</dd>${o.email ? `<dt>Email</dt><dd>${esc(o.email)}</dd>` : ''}</dl>
          <div class="form-actions" style="margin-top:14px">
            <a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="${esc(waLink(o.phone, msgs.hello))}">${icon('wa', 16)} WhatsApp</a>
            <a class="btn btn--outline btn--sm" href="tel:${esc(o.phone)}">${icon('phone', 16)} Call</a>
          </div>
          <div class="chip-list" style="margin-top:10px">
            <a class="btn btn--outline btn--sm" target="_blank" rel="noopener" href="${esc(waLink(o.phone, msgs.confirm))}">${icon('wa', 14)} “Order confirmed”</a>
            <a class="btn btn--outline btn--sm" target="_blank" rel="noopener" href="${esc(waLink(o.phone, msgs.onway))}">${icon('wa', 14)} “On its way”</a>
          </div>
        </section>
        <section class="card" aria-labelledby="ad-title">
          <div class="card__head"><h2 id="ad-title">Delivery</h2></div>
          ${o.city || o.street ? `<dl class="kv"><dt>Governorate</dt><dd>${esc(o.zone_name || '—')}</dd><dt>City</dt><dd>${esc(o.city)}</dd><dt>Street</dt><dd>${esc(o.street)}</dd><dt>Building</dt><dd>${esc(o.building)}</dd>${o.delivery_notes ? `<dt>Notes</dt><dd>${esc(o.delivery_notes)}</dd>` : ''}</dl>`
            : `<p class="muted">No address yet — agree it with the customer on WhatsApp.</p>${o.delivery_notes ? `<p style="margin-top:8px"><strong>Notes:</strong> ${esc(o.delivery_notes)}</p>` : ''}`}
        </section>
        <section class="card" aria-labelledby="hi-title">
          <div class="card__head"><h2 id="hi-title">History</h2></div>
          <ol class="timeline">${history.map((h) => `<li><span>${esc(STATUS[h.status] || h.status)}</span><span class="muted small">${fmtDateTime(h.created_at)}</span></li>`).join('')}</ol>
        </section>
      </div>
    </div>`;

  const setStatus = async (status, btn) => busy(btn, async () => {
    await q(sb.from('orders').update({ status }).eq('id', o.id));
    toast(`Order ${o.id}: ${STATUS[status]}`, { tone: 'ok' });
    ctx.refreshBadge();
    await renderOrder(root, id, ctx);
  });
  $('[data-next]', root)?.addEventListener('click', (e) => setStatus(e.currentTarget.dataset.next, e.currentTarget));
  $('[data-pick]', root)?.addEventListener('change', (e) => { if (e.target.value !== o.status) setStatus(e.target.value, null); });
  $('[data-cancel]', root)?.addEventListener('click', async (e) => {
    const ok = await confirmDialog('Cancel this order?', `Order <strong>${esc(o.id)}</strong> will be cancelled and its ${items.reduce((n, i) => n + i.qty, 0)} item(s) go back into stock. A cancelled order can’t be reopened.`, { ok: 'Cancel order', danger: true });
    if (ok) setStatus('cancelled', e.currentTarget);
  });
  $('[data-notes]', root).addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      await q(sb.from('orders').update({ internal_notes: e.target.notes.value.trim() }).eq('id', o.id));
      toast('Notes saved.', { tone: 'ok' });
    });
  });
}

