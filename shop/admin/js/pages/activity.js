/* Activity log: every change to store data, who made it and when. */
import { sb, q, rpc } from '../sb.js';
import { $, esc, pageHead, emptyRow, fmtDateTime, money } from '../ui.js';

const TABLES = {
  products: 'Product', product_images: 'Product photo', categories: 'Category', brands: 'Brand', orders: 'Order',
  promotions: 'Promo code', delivery_zones: 'Delivery area', store_settings: 'Store settings', customers: 'Customer',
  expenses: 'Expense', admin_users: 'Admin',
};
const ACTION = { INSERT: 'added', UPDATE: 'changed', DELETE: 'deleted' };
const SKIP = new Set(['updated_at', 'created_at']);
const LABEL = { price_cents: 'price', compare_at_cents: 'was-price', cost_cents: 'cost', fee_cents: 'fee', amount_cents: 'amount', is_active: 'visible', internal_notes: 'notes', free_delivery_threshold_cents: 'free delivery from' };

const show = (k, v) => (v == null || v === '' ? '—' : /_cents$/.test(k) && typeof v === 'number' ? money(v) : typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60));

function summary(r, who) {
  const row = r.new_data || r.old_data || {};
  const name = row.name || row.full_name || row.code || (row.user_id && who[row.user_id]) || (row.product_id && `${row.product_id} #${(row.position ?? 0) + 1}`)
    || (r.table_name === 'expenses' && row.amount_cents ? `${money(row.amount_cents)} ${row.category}` : '') || r.record_id || '';
  if (r.action !== 'UPDATE') return `<strong>${esc(name)}</strong>`;
  const changes = Object.keys(r.new_data || {}).filter((k) => !SKIP.has(k) && JSON.stringify(r.new_data[k]) !== JSON.stringify(r.old_data?.[k]));
  if (!changes.length) return `<strong>${esc(name)}</strong>`;
  return `<strong>${esc(name)}</strong> <span class="diff">${changes.slice(0, 4).map((k) => `${esc(LABEL[k] || k.replace(/_/g, ' '))}: <code>${esc(show(k, r.old_data?.[k]))}</code> → <code>${esc(show(k, r.new_data[k]))}</code>`).join(' · ')}${changes.length > 4 ? ` · +${changes.length - 4} more` : ''}</span>`;
}

export async function render(root, params) {
  const table = TABLES[params.query.get('t')] ? params.query.get('t') : '';
  let b = sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (table) b = b.eq('table_name', table);
  const [rows, admins] = await Promise.all([q(b), rpc('admin_list_admins').catch(() => [])]);
  const who = Object.fromEntries(admins.map((a) => [a.userId, a.email]));
  root.innerHTML = `
    ${pageHead({ title: 'Activity log', sub: 'The latest 200 changes to store data. “Store” means the change came from a customer’s order.' })}
    <div class="toolbar"><select data-t aria-label="Show"><option value="">Everything</option>${Object.entries(TABLES).map(([k, l]) => `<option value="${k}" ${k === table ? 'selected' : ''}>${l}s</option>`).join('')}</select></div>
    <section class="card card--flush"><div class="table-wrap"><table class="responsive">
      <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>
      ${rows.length ? rows.map((r) => `<tr>
        <td class="nowrap small">${fmtDateTime(r.created_at)}</td>
        <td data-label="Who" class="small">${r.actor ? esc(who[r.actor] || 'Former admin') : '<span class="muted">Store</span>'}</td>
        <td>${esc(TABLES[r.table_name] || r.table_name)} ${ACTION[r.action] || r.action}: ${summary(r, who)}</td></tr>`).join('')
        : emptyRow(3, 'Nothing yet')}
      </tbody></table></div></section>`;
  $('[data-t]', root).addEventListener('change', (e) => { location.hash = e.target.value ? `#/activity?t=${e.target.value}` : '#/activity'; });
}
