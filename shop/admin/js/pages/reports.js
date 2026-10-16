/* Profit & reports: sales, product cost, expenses and profit for a period. */
import { sb, q, rpc } from '../sb.js';
import { $, $$, esc, money, pageHead, beirutToday, addDays, fmtDate, beirutDayStart, icon, downloadCsv, STATUS, METHOD, fmtDateTime } from '../ui.js';
import { CATEGORIES } from './expenses.js';

function presets() {
  const t = beirutToday();
  const ym = t.slice(0, 7);
  const lastMonthEnd = addDays(`${ym}-01`, -1);
  return {
    today: ['Today', t, t],
    week: ['Last 7 days', addDays(t, -6), t],
    month: ['This month', `${ym}-01`, t],
    last: ['Last month', `${lastMonthEnd.slice(0, 7)}-01`, lastMonthEnd],
    d90: ['Last 90 days', addDays(t, -89), t],
    year: ['This year', `${t.slice(0, 4)}-01-01`, t],
  };
}

export async function render(root, params) {
  const P = presets();
  const key = P[params.query.get('p')] ? params.query.get('p') : (params.query.get('from') ? '' : 'month');
  const from = key ? P[key][1] : params.query.get('from');
  const to = key ? P[key][2] : params.query.get('to') || beirutToday();
  const r = await rpc('admin_report', { p_from: from, p_to: to });
  const gross = r.sales - r.cogs;
  const net = r.revenue - r.cogs - r.expenses;
  const maxDay = Math.max(1, ...r.byDay.map((d) => d.revenue));
  const exp = Object.entries(r.expensesByCategory).sort((a, b) => b[1] - a[1]);

  root.innerHTML = `
    ${pageHead({ title: 'Profit & reports', sub: `${fmtDate(from)} – ${fmtDate(to)}. Counts confirmed, packed, on-the-way and delivered orders.`, actions: `<button class="btn btn--outline" data-csv>${icon('download', 16)} Orders CSV</button>` })}
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Period">${Object.entries(P).map(([k, [l]]) => `<button type="button" data-p="${k}" aria-pressed="${k === key}">${l}</button>`).join('')}</div>
      <span class="form-actions"><label class="sr-only" for="r-from">From</label><input id="r-from" type="date" value="${from}" style="width:auto;min-height:36px" data-from>
      <span class="muted">to</span><label class="sr-only" for="r-to">To</label><input id="r-to" type="date" value="${to}" style="width:auto;min-height:36px" data-to>
      <button class="btn btn--outline btn--sm" data-range>Show</button></span>
    </div>
    ${r.unitsMissingCost ? `<div class="alert alert--warn" style="margin-bottom:16px">${icon('warn')}<span><strong>${r.unitsMissingCost} sold item${r.unitsMissingCost === 1 ? ' has' : 's have'} no cost price</strong>, so they count as costing $0 and profit looks higher than it is. Add “Your cost” to those products.</span></div>` : ''}
    <div class="stats">
      <div class="stat"><span class="stat__label">Orders</span><span class="stat__value">${r.orders}</span><span class="stat__note">${r.units} items · ${r.awaiting} awaiting WhatsApp · ${r.cancelled} cancelled</span></div>
      <div class="stat"><span class="stat__label">Money in</span><span class="stat__value">${money(r.revenue)}</span><span class="stat__note">${money(r.sales)} products + ${money(r.delivery)} delivery</span></div>
      <div class="stat"><span class="stat__label">Product cost</span><span class="stat__value">${money(r.cogs)}</span><span class="stat__note">what the items sold cost you</span></div>
      <div class="stat"><span class="stat__label">Expenses</span><span class="stat__value">${money(r.expenses)}</span><span class="stat__note"><a class="link" href="#/expenses">Record expenses</a></span></div>
      <div class="stat stat--dark"><span class="stat__label">Profit</span><span class="stat__value">${money(net)}</span><span class="stat__note">money in − product cost − expenses</span></div>
    </div>
    <div class="grid grid--2" style="align-items:start">
      <section class="card"><div class="card__head"><h2>How the profit adds up</h2></div>
        <div class="totals">
          <div><span>Product sales (after ${money(r.discounts)} discounts)</span><span class="tabular">${money(r.sales)}</span></div>
          <div><span>− Cost of the products sold</span><span class="tabular">−${money(r.cogs)}</span></div>
          <div style="font-weight:700"><span>= Gross profit${r.sales ? ` (${Math.round((gross / r.sales) * 100)}%)` : ''}</span><span class="tabular">${money(gross)}</span></div>
          <div><span>+ Delivery fees charged</span><span class="tabular">${money(r.delivery)}</span></div>
          <div><span>− Expenses</span><span class="tabular">−${money(r.expenses)}</span></div>
          <div class="grand"><span>= Profit</span><span class="tabular">${money(net)}</span></div>
        </div>
        ${exp.length ? `<h3 style="margin:18px 0 10px">Expenses by type</h3><div class="stack" style="gap:8px">${exp.map(([c, v]) => `<div style="display:flex;justify-content:space-between;font-size:14px"><span>${esc(CATEGORIES[c] || c)}</span><span class="tabular">${money(v)}</span></div>`).join('')}</div>` : ''}
      </section>
      <section class="card card--flush"><div class="card__head"><h2>Best sellers</h2></div><div class="table-wrap"><table>
        <thead><tr><th>Product</th><th class="num">Sold</th><th class="num">Sales</th></tr></thead><tbody>
        ${r.topProducts.length ? r.topProducts.map((t) => `<tr><td>${t.productId ? `<a class="link" href="#/products/${encodeURIComponent(t.productId)}">${esc(t.name)}</a>` : esc(t.name)}</td><td class="num">${t.units}</td><td class="num">${money(t.sales)}</td></tr>`).join('')
          : '<tr><td colspan="3"><div class="empty">No sales in this period</div></td></tr>'}
        </tbody></table></div></section>
    </div>
    <section class="card card--flush" style="margin-top:16px"><div class="card__head"><h2>Day by day</h2></div><div class="table-wrap"><table>
      <thead><tr><th>Day</th><th class="num">Orders</th><th class="num">Money in</th><th style="width:40%"><span class="sr-only">Chart</span></th></tr></thead><tbody>
      ${r.byDay.length ? r.byDay.slice().reverse().map((d) => `<tr><td class="nowrap">${fmtDate(d.day)}</td><td class="num">${d.orders}</td><td class="num">${money(d.revenue)}</td><td><div class="bar"><span style="width:${Math.max(2, Math.round((d.revenue / maxDay) * 100))}%"></span></div></td></tr>`).join('')
        : '<tr><td colspan="4"><div class="empty">No orders in this period</div></td></tr>'}
      </tbody></table></div></section>`;

  $$('[data-p]', root).forEach((b) => b.addEventListener('click', () => { location.hash = `#/reports?p=${b.dataset.p}`; }));
  $('[data-range]', root).addEventListener('click', () => {
    const f = $('[data-from]', root).value; const t = $('[data-to]', root).value;
    if (f && t && f <= t) location.hash = `#/reports?from=${f}&to=${t}`;
  });
  $('[data-csv]', root).addEventListener('click', async () => {
    const orders = await q(sb.from('orders').select('id, created_at, status, order_method, full_name, phone, city, zone_name, subtotal_cents, discount_cents, delivery_cents, total_cents, promo_code, order_items(qty, unit_cost_cents)')
      .gte('created_at', beirutDayStart(from)).lt('created_at', beirutDayStart(addDays(to, 1))).order('created_at').limit(10000));
    downloadCsv(`cedarline-orders-${from}-to-${to}.csv`, [
      ['Order', 'Date', 'Status', 'Method', 'Customer', 'Phone', 'City', 'Governorate', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Promo', 'Product cost'],
      ...orders.map((o) => [o.id, fmtDateTime(o.created_at), STATUS[o.status], METHOD[o.order_method], o.full_name, o.phone, o.city, o.zone_name, o.subtotal_cents / 100, o.discount_cents / 100, o.delivery_cents / 100, o.total_cents / 100, o.promo_code || '',
        o.order_items.reduce((s, i) => s + (i.unit_cost_cents ?? 0) * i.qty, 0) / 100]),
    ]);
  });
}
