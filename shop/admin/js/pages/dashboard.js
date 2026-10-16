/* Dashboard: today, this month, what needs attention. */
import { sb, q, rpc } from '../sb.js';
import { esc, money, pageHead, statusBadge, timeAgo, beirutToday, imgSrc, emptyRow } from '../ui.js';

export async function render(root, _params, ctx) {
  const today = beirutToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [todayR, monthR, open, recent, low, settings] = await Promise.all([
    rpc('admin_report', { p_from: today, p_to: today }),
    rpc('admin_report', { p_from: monthStart, p_to: today }),
    q(sb.from('orders').select('status').in('status', ['awaiting_whatsapp', 'confirmed', 'packed', 'out_for_delivery'])),
    q(sb.from('orders').select('id, status, full_name, total_cents, created_at, order_method').order('created_at', { ascending: false }).limit(8)),
    q(sb.from('products').select('id, name, stock, is_active, product_images(url, position)').eq('is_active', true).lte('stock', 3).order('stock').limit(10)),
    q(sb.from('store_settings').select('name').maybeSingle()),
  ]);
  const byStatus = (s) => open.filter((o) => o.status === s).length;
  const net = monthR.revenue - monthR.cogs - monthR.expenses;
  const first = String(ctx.me.email || '').split('@')[0];

  root.innerHTML = `
    ${pageHead({ title: `Hello${first ? `, ${first}` : ''}`, sub: `Here’s what’s happening at ${esc(settings?.name || 'the store')} today.` })}
    <div class="stats">
      <a class="stat stat--dark" href="#/orders?status=open"><span class="stat__label">To handle</span><span class="stat__value">${open.length}</span>
        <span class="stat__note">${byStatus('awaiting_whatsapp')} on WhatsApp · ${byStatus('confirmed')} confirmed · ${byStatus('packed')} packed · ${byStatus('out_for_delivery')} on the way</span></a>
      <div class="stat"><span class="stat__label">Today</span><span class="stat__value">${money(todayR.revenue)}</span><span class="stat__note">${todayR.orders} order${todayR.orders === 1 ? '' : 's'}</span></div>
      <div class="stat"><span class="stat__label">This month</span><span class="stat__value">${money(monthR.revenue)}</span><span class="stat__note">${monthR.orders} orders · ${monthR.units} items</span></div>
      <a class="stat" href="#/reports"><span class="stat__label">Profit this month</span><span class="stat__value">${money(net)}</span><span class="stat__note">after product costs and expenses</span></a>
    </div>
    ${monthR.unitsMissingCost ? `<div class="alert alert--warn" style="margin-bottom:16px"><span><strong>${monthR.unitsMissingCost} item${monthR.unitsMissingCost === 1 ? '' : 's'} sold this month have no cost price</strong>, so profit looks higher than it is. Add cost prices in <a class="link" href="#/products">Products</a>.</span></div>` : ''}
    <div class="grid grid--side">
      <section class="card card--flush" aria-labelledby="recent-title">
        <div class="card__head"><h2 id="recent-title">Latest orders</h2><a class="btn btn--outline btn--sm" href="#/orders">All orders</a></div>
        <div class="table-wrap"><table class="responsive"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>
          ${recent.length ? recent.map((o) => `<tr class="is-link" data-href="#/orders/${encodeURIComponent(o.id)}">
            <td><div class="cell-main tabular">${esc(o.id)}</div><div class="cell-sub">${timeAgo(o.created_at)} · ${o.order_method === 'cod' ? 'Cash on delivery' : 'WhatsApp'}</div></td>
            <td data-label="Customer">${esc(o.full_name)}</td>
            <td>${statusBadge(o.status)}</td>
            <td class="num" data-label="Total">${money(o.total_cents)}</td></tr>`).join('') : emptyRow(4, 'No orders yet', 'New orders from the store appear here.')}
        </tbody></table></div>
      </section>
      <div class="stack">
        <section class="card" aria-labelledby="low-title">
          <div class="card__head"><h2 id="low-title">Low stock</h2><a class="btn btn--outline btn--sm" href="#/inventory">Inventory</a></div>
          ${low.length ? `<div class="stack" style="gap:10px">${low.map((p) => {
            const img = (p.product_images || []).sort((a, b) => a.position - b.position)[0];
            return `<a href="#/products/${encodeURIComponent(p.id)}" style="display:flex;gap:10px;align-items:center;text-decoration:none">
              ${img ? `<img class="thumb" src="${esc(imgSrc(img.url))}" alt="">` : '<span class="thumb"></span>'}
              <span style="flex:1;min-width:0"><span class="cell-main" style="display:block">${esc(p.name)}</span></span>
              <span class="badge ${p.stock === 0 ? 'badge--err' : 'badge--warn'}">${p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span></a>`;
          }).join('')}</div>` : '<p class="muted">Everything is well stocked.</p>'}
        </section>
        <section class="card" aria-labelledby="top-title">
          <div class="card__head"><h2 id="top-title">Best sellers this month</h2></div>
          ${monthR.topProducts.length ? `<ol style="margin:0;padding-left:18px;display:grid;gap:6px">${monthR.topProducts.slice(0, 5).map((t) => `<li><strong>${esc(t.name)}</strong> <span class="muted">· ${t.units} sold</span></li>`).join('')}</ol>` : '<p class="muted">No sales yet this month.</p>'}
        </section>
      </div>
    </div>`;
  root.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
}
