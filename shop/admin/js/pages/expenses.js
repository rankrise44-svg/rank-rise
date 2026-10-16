/* Expenses: what the shop spends, by month. Used in the profit report. */
import { sb, q } from '../sb.js';
import { $, $$, esc, money, parseMoney, centsToInput, pageHead, field, showErrors, val, toast, modal, confirmDialog, emptyRow, fmtDate, beirutToday, icon, downloadCsv } from '../ui.js';

export const CATEGORIES = {
  stock: 'Buying stock', delivery: 'Delivery / courier', marketing: 'Marketing & ads', packaging: 'Packaging',
  rent: 'Rent', salaries: 'Salaries', utilities: 'Electricity, internet…', fees: 'Fees & subscriptions', other: 'Other',
};

const monthLabel = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const shiftMonth = (ym, n) => { const d = new Date(`${ym}-15T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const monthEnd = (ym) => { const d = new Date(`${shiftMonth(ym, 1)}-01T12:00:00Z`); d.setUTCDate(0); return d.toISOString().slice(0, 10); };

export async function render(root, params) {
  const month = /^\d{4}-\d{2}$/.test(params.query.get('month') || '') ? params.query.get('month') : beirutToday().slice(0, 7);
  const rows = await q(sb.from('expenses').select('*').gte('spent_on', `${month}-01`).lte('spent_on', monthEnd(month)).order('spent_on', { ascending: false }).order('created_at', { ascending: false }));
  const total = rows.reduce((s, r) => s + r.amount_cents, 0);
  const byCat = Object.entries(rows.reduce((m, r) => ({ ...m, [r.category]: (m[r.category] || 0) + r.amount_cents }), {})).sort((a, b) => b[1] - a[1]);
  const isCurrent = month >= beirutToday().slice(0, 7);

  root.innerHTML = `
    ${pageHead({ title: 'Expenses', sub: 'Record what you spend so the profit report is accurate.', actions: `<button class="btn btn--outline" data-csv>${icon('download', 16)} CSV</button><button class="btn btn--gold" data-add>+ Add expense</button>` })}
    <div class="toolbar">
      <a class="btn btn--outline btn--sm" href="#/expenses?month=${shiftMonth(month, -1)}">${icon('left', 14)} Previous</a>
      <strong>${esc(monthLabel(month))}</strong>
      ${isCurrent ? '' : `<a class="btn btn--outline btn--sm" href="#/expenses?month=${shiftMonth(month, 1)}">Next ${icon('right', 14)}</a>`}
    </div>
    <div class="grid grid--side">
      <section class="card card--flush"><div class="table-wrap"><table class="responsive">
        <thead><tr><th>Date</th><th>Type</th><th>Note</th><th class="num">Amount</th><th></th></tr></thead><tbody>
        ${rows.length ? rows.map((r) => `<tr>
          <td class="nowrap">${fmtDate(r.spent_on)}</td><td data-label="Type">${esc(CATEGORIES[r.category] || r.category)}</td>
          <td data-label="Note">${esc(r.note)}</td><td class="num" data-label="Amount">${money(r.amount_cents)}</td>
          <td class="actions"><button class="btn btn--outline btn--sm" data-edit="${r.id}">Edit</button></td></tr>`).join('')
          : emptyRow(5, 'No expenses this month')}
        </tbody></table></div></section>
      <section class="card"><div class="card__head"><h2>Total</h2></div>
        <p class="stat__value">${money(total)}</p>
        ${byCat.length ? `<div class="stack" style="gap:10px;margin-top:14px">${byCat.map(([c, v]) => `<div><div style="display:flex;justify-content:space-between;gap:10px;font-size:14px"><span>${esc(CATEGORIES[c] || c)}</span><strong class="tabular">${money(v)}</strong></div><div class="bar"><span style="width:${Math.round((v / total) * 100)}%"></span></div></div>`).join('')}</div>` : ''}
      </section>
    </div>`;

  const again = () => render(root, params);
  $('[data-add]', root).addEventListener('click', () => editExpense(null, again));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => editExpense(rows.find((r) => r.id === b.dataset.edit), again)));
  $('[data-csv]', root).addEventListener('click', () => downloadCsv(`cedarline-expenses-${month}.csv`, [['Date', 'Type', 'Note', 'Amount (USD)'], ...rows.map((r) => [r.spent_on, CATEGORIES[r.category], r.note, (r.amount_cents / 100).toFixed(2)])]));
}

function editExpense(r, done) {
  const isNew = !r;
  const d = r || { spent_on: beirutToday(), category: 'stock', amount_cents: null, note: '' };
  const body = `<form class="form" data-exp novalidate>
    ${field({ name: 'spent_on', label: 'Date', type: 'date', value: d.spent_on })}
    ${field({ name: 'category', label: 'Type', value: d.category, options: Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })) })}
    ${field({ name: 'amount', label: 'Amount', value: centsToInput(d.amount_cents), money: true })}
    ${field({ name: 'note', label: 'Note', value: d.note, optional: true, attrs: 'maxlength="200"', hint: 'e.g. supplier name, invoice number.' })}
    ${isNew ? '' : '<hr class="sep"><button type="button" class="btn btn--danger btn--sm" data-del style="justify-self:start">Delete expense</button>'}
  </form>`;
  modal({
    title: isNew ? 'Add expense' : 'Edit expense', body,
    actions: [{ label: 'Cancel', value: false }, {
      label: 'Save', cls: 'btn--gold', onClick: async (wrap) => {
        const form = $('[data-exp]', wrap);
        const amount = parseMoney(form.amount.value);
        if (!showErrors(form, { spent_on: form.spent_on.value ? '' : 'Choose a date.', amount: amount > 0 ? '' : 'Enter an amount like 25 or 12.50.' })) return false;
        const row = { spent_on: form.spent_on.value, category: form.category.value, amount_cents: amount, note: val(form, 'note') };
        if (isNew) await q(sb.from('expenses').insert(row)); else await q(sb.from('expenses').update(row).eq('id', d.id));
        toast('Expense saved.', { tone: 'ok' });
        done();
        return true;
      },
    }],
  });
  const wrap = document.querySelector('.modal:last-of-type');
  $('[data-del]', wrap)?.addEventListener('click', async () => {
    wrap.querySelector('[data-close]').click();
    if (!(await confirmDialog('Delete this expense?', `${money(d.amount_cents)} · ${esc(CATEGORIES[d.category])}`, { ok: 'Delete', danger: true }))) return;
    try { await q(sb.from('expenses').delete().eq('id', d.id)); toast('Expense deleted.', { tone: 'ok' }); done(); } catch (err) { toast(err.message, { tone: 'err' }); }
  });
}
