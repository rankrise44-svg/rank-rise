/* Promo codes: percent or fixed amount, minimum order, dates, usage limit. */
import { sb, q } from '../sb.js';
import { $, $$, esc, money, parseMoney, centsToInput, pageHead, field, checkbox, showErrors, val, checked, toast, modal, confirmDialog, emptyRow, fmtDate } from '../ui.js';

const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

function stateOf(p) {
  const now = Date.now();
  if (!p.is_active) return ['off', 'Off'];
  if (p.starts_at && new Date(p.starts_at) > now) return ['warn', 'Scheduled'];
  if (p.ends_at && new Date(p.ends_at) <= now) return ['off', 'Ended'];
  if (p.usage_limit && p.times_used >= p.usage_limit) return ['off', 'Used up'];
  return ['ok', 'Active'];
}

export async function render(root) {
  const promos = await q(sb.from('promotions').select('*').order('created_at', { ascending: false }));
  root.innerHTML = `
    ${pageHead({ title: 'Promo codes', sub: 'Shoppers type these at the cart. The database checks every code again when the order is placed.', actions: '<button class="btn btn--gold" data-add>+ New code</button>' })}
    <section class="card card--flush"><div class="table-wrap"><table class="responsive">
      <thead><tr><th>Code</th><th>Discount</th><th>Minimum order</th><th>Dates</th><th class="num">Used</th><th>Status</th><th></th></tr></thead><tbody>
      ${promos.length ? promos.map((p) => { const [tone, label] = stateOf(p); return `<tr>
        <td><div class="cell-main tabular">${esc(p.code)}</div><div class="cell-sub">${esc(p.label)}</div></td>
        <td data-label="Discount">${p.kind === 'percent' ? `${p.percent_off}% off` : `${money(p.amount_off_cents)} off`}</td>
        <td data-label="Minimum">${p.min_subtotal_cents ? money(p.min_subtotal_cents) : '—'}</td>
        <td data-label="Dates" class="small">${p.starts_at || p.ends_at ? `${p.starts_at ? fmtDate(p.starts_at) : 'Now'} → ${p.ends_at ? fmtDate(p.ends_at) : 'no end'}` : 'Always'}</td>
        <td class="num" data-label="Used">${p.times_used}${p.usage_limit ? ` / ${p.usage_limit}` : ''}</td>
        <td><span class="badge badge--${tone}">${label}</span></td>
        <td class="actions"><button class="btn btn--outline btn--sm" data-edit="${esc(p.code)}">Edit</button></td></tr>`; }).join('')
        : emptyRow(7, 'No promo codes yet', 'Create one to offer a discount.')}
      </tbody></table></div></section>`;
  $('[data-add]', root).addEventListener('click', () => editPromo(null, () => render(root)));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => editPromo(promos.find((p) => p.code === b.dataset.edit), () => render(root))));
}

function editPromo(p, done) {
  const isNew = !p;
  const d = p || { code: '', label: '', kind: 'percent', percent_off: 10, amount_off_cents: null, min_subtotal_cents: 0, starts_at: null, ends_at: null, usage_limit: null, is_active: true, times_used: 0 };
  const body = `<form class="form" data-promo-form novalidate><div class="form-grid">
    ${field({ name: 'code', label: 'Code', value: d.code, attrs: `maxlength="24" style="text-transform:uppercase" ${isNew ? '' : 'readonly'}`, hint: isNew ? 'Letters and numbers, e.g. SUMMER15.' : 'Codes can’t be renamed — create a new one instead.' })}
    ${field({ name: 'label', label: 'Description', value: d.label, optional: true, hint: 'Shown to the shopper, e.g. “15% off for summer”.' })}
    ${field({ name: 'kind', label: 'Type', value: d.kind, options: [{ value: 'percent', label: 'Percentage off' }, { value: 'fixed', label: 'Fixed amount off' }] })}
    ${field({ name: 'amount', label: d.kind === 'percent' ? 'Percent off' : 'Amount off ($)', value: d.kind === 'percent' ? d.percent_off : centsToInput(d.amount_off_cents), attrs: 'inputmode="decimal"' })}
    ${field({ name: 'min', label: 'Minimum order', value: d.min_subtotal_cents ? centsToInput(d.min_subtotal_cents) : '', money: true, optional: true })}
    ${field({ name: 'limit', label: 'Total uses allowed', type: 'number', value: d.usage_limit ?? '', optional: true, attrs: 'min="1" step="1"', hint: `Used ${d.times_used} time(s) so far.` })}
    ${field({ name: 'starts', label: 'Starts', type: 'datetime-local', value: toLocalInput(d.starts_at), optional: true })}
    ${field({ name: 'ends', label: 'Ends', type: 'datetime-local', value: toLocalInput(d.ends_at), optional: true })}
    <div class="span-2">${checkbox('is_active', 'Code is switched on', d.is_active)}</div>
  </div>${isNew ? '' : '<hr class="sep"><button type="button" class="btn btn--danger btn--sm" data-del style="justify-self:start">Delete code</button>'}</form>`;

  const save = async (wrap) => {
    const form = $('[data-promo-form]', wrap);
    const code = val(form, 'code').toUpperCase();
    const kind = form.kind.value;
    const amountRaw = val(form, 'amount');
    const pct = Number(amountRaw);
    const fixed = parseMoney(amountRaw);
    const min = parseMoney(form.min.value);
    const limit = val(form, 'limit') ? Number(val(form, 'limit')) : null;
    const starts = fromLocalInput(form.starts.value);
    const ends = fromLocalInput(form.ends.value);
    const errors = {
      code: /^[A-Z0-9_-]{3,24}$/.test(code) ? '' : '3–24 letters, numbers, - or _.',
      amount: kind === 'percent' ? (Number.isInteger(pct) && pct >= 1 && pct <= 100 ? '' : 'A whole number from 1 to 100.') : (fixed > 0 ? '' : 'Enter an amount like 5 or 7.50.'),
      min: Number.isNaN(min) ? 'Use a number like 40.' : '',
      limit: limit === null || (Number.isInteger(limit) && limit > 0) ? '' : 'A whole number, or leave empty for no limit.',
      ends: starts && ends && new Date(ends) <= new Date(starts) ? 'Must be after the start.' : '',
    };
    if (!showErrors(form, errors)) return false;
    const row = {
      label: val(form, 'label'), kind, percent_off: kind === 'percent' ? pct : null, amount_off_cents: kind === 'fixed' ? fixed : null,
      min_subtotal_cents: min || 0, usage_limit: limit, starts_at: starts, ends_at: ends, is_active: checked(form, 'is_active'),
    };
    if (isNew) await q(sb.from('promotions').insert({ code, ...row }));
    else await q(sb.from('promotions').update(row).eq('code', d.code));
    toast(`Code ${code} saved.`, { tone: 'ok' });
    done();
    return true;
  };

  modal({ title: isNew ? 'New promo code' : `Edit ${d.code}`, wide: true, body, actions: [{ label: 'Cancel', value: false }, { label: 'Save', cls: 'btn--gold', onClick: save }] });
  const wrap = document.querySelector('.modal:last-of-type');
  const form = $('[data-promo-form]', wrap);
  form.kind.addEventListener('change', () => { wrap.querySelector('label[for="f-amount"]').textContent = form.kind.value === 'percent' ? 'Percent off' : 'Amount off ($)'; form.amount.value = ''; form.amount.focus(); });
  $('[data-del]', wrap)?.addEventListener('click', async () => {
    wrap.querySelector('[data-close]').click();
    if (!(await confirmDialog(`Delete ${d.code}?`, 'Shoppers won’t be able to use it any more. Past orders keep their discount.', { ok: 'Delete', danger: true }))) return;
    try { await q(sb.from('promotions').delete().eq('code', d.code)); toast('Code deleted.', { tone: 'ok' }); done(); } catch (err) { toast(err.message, { tone: 'err' }); }
  });
}
