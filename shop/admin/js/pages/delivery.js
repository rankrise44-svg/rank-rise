/* Delivery: fee and time per governorate, free-delivery threshold. */
import { sb, q } from '../sb.js';
import { $, $$, esc, money, parseMoney, centsToInput, pageHead, field, checkbox, showErrors, val, checked, busy, toast, modal, confirmDialog, emptyRow, slugify } from '../ui.js';

export async function render(root) {
  const [zones, s] = await Promise.all([
    q(sb.from('delivery_zones').select('*').order('sort_order').order('name')),
    q(sb.from('store_settings').select('free_delivery_threshold_cents, delivery_eta_text').maybeSingle()),
  ]);
  root.innerHTML = `
    ${pageHead({ title: 'Delivery', sub: 'Shoppers pick their governorate at checkout; the fee is added automatically.', actions: '<button class="btn btn--gold" data-add>+ Add area</button>' })}
    <div class="grid grid--side">
      <section class="card card--flush"><div class="table-wrap"><table class="responsive">
        <thead><tr><th>Area</th><th class="num">Fee</th><th>Delivery time</th><th>Status</th><th></th></tr></thead><tbody>
        ${zones.length ? zones.map((z) => `<tr>
          <td class="cell-main">${esc(z.name)}</td>
          <td class="num" data-label="Fee">${z.fee_cents ? money(z.fee_cents) : 'Free'}</td>
          <td data-label="Time">${esc(z.eta)}</td>
          <td>${z.is_active ? '<span class="badge badge--ok">Delivering</span>' : '<span class="badge badge--off">Off</span>'}</td>
          <td class="actions"><button class="btn btn--outline btn--sm" data-edit="${esc(z.id)}">Edit</button></td></tr>`).join('')
          : emptyRow(5, 'No delivery areas', 'Add at least one so shoppers can choose cash on delivery.')}
        </tbody></table></div></section>
      <section class="card"><div class="card__head"><h2>For every order</h2></div>
        <form class="form" data-general novalidate>
          ${field({ name: 'free', label: 'Free delivery from', value: centsToInput(s?.free_delivery_threshold_cents), money: true, hint: 'Order total after discounts. Use 0 for always free.' })}
          ${field({ name: 'eta', label: 'Delivery time shown on product pages', value: s?.delivery_eta_text || '', attrs: 'maxlength="60"' })}
          <button class="btn btn--gold" type="submit">Save</button>
        </form></section>
    </div>`;

  const form = $('[data-general]', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const free = parseMoney(form.free.value);
    if (!showErrors(form, { free: free === null || Number.isNaN(free) ? 'Enter an amount like 75.' : '', eta: val(form, 'eta') ? '' : 'Enter a delivery time.' })) return;
    busy(e.submitter, async () => {
      await q(sb.from('store_settings').update({ free_delivery_threshold_cents: free, delivery_eta_text: val(form, 'eta') }).eq('id', true));
      toast('Delivery settings saved.', { tone: 'ok' });
    });
  });
  $('[data-add]', root).addEventListener('click', () => editZone(null, zones.length, () => render(root)));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => editZone(zones.find((z) => z.id === b.dataset.edit), zones.length, () => render(root))));
}

function editZone(z, count, done) {
  const isNew = !z;
  const d = z || { name: '', fee_cents: null, eta: '1–2 working days', sort_order: count + 1, is_active: true };
  const body = `<form class="form" data-zone novalidate>
    ${field({ name: 'name', label: 'Area name', value: d.name, attrs: 'maxlength="60"', hint: isNew ? 'e.g. a governorate or a city.' : '' })}
    ${field({ name: 'fee', label: 'Delivery fee', value: centsToInput(d.fee_cents), money: true, hint: '0 for free delivery.' })}
    ${field({ name: 'eta', label: 'Delivery time', value: d.eta, attrs: 'maxlength="60"' })}
    ${field({ name: 'sort', label: 'Order in the list', type: 'number', value: d.sort_order, attrs: 'step="1"' })}
    ${checkbox('active', 'We deliver here', d.is_active)}
    ${isNew ? '' : '<hr class="sep"><button type="button" class="btn btn--danger btn--sm" data-del style="justify-self:start">Delete area</button>'}
  </form>`;
  modal({
    title: isNew ? 'Add delivery area' : `Edit ${d.name}`, body,
    actions: [{ label: 'Cancel', value: false }, {
      label: 'Save', cls: 'btn--gold', onClick: async (wrap) => {
        const form = $('[data-zone]', wrap);
        const fee = parseMoney(form.fee.value);
        const sort = Number(form.sort.value || 0);
        if (!showErrors(form, {
          name: val(form, 'name').length >= 2 ? '' : 'Enter a name.',
          fee: fee === null || Number.isNaN(fee) ? 'Enter a fee like 3 or 0.' : '',
          eta: val(form, 'eta') ? '' : 'Enter a delivery time.',
          sort: Number.isInteger(sort) ? '' : 'A whole number.',
        })) return false;
        const row = { name: val(form, 'name'), fee_cents: fee, eta: val(form, 'eta'), sort_order: sort, is_active: checked(form, 'active') };
        if (isNew) await q(sb.from('delivery_zones').insert({ id: slugify(row.name).slice(0, 40), ...row }));
        else await q(sb.from('delivery_zones').update(row).eq('id', d.id));
        toast('Delivery area saved.', { tone: 'ok' });
        done();
        return true;
      },
    }],
  });
  const wrap = document.querySelector('.modal:last-of-type');
  $('[data-del]', wrap)?.addEventListener('click', async () => {
    wrap.querySelector('[data-close]').click();
    if (!(await confirmDialog(`Delete ${d.name}?`, 'Shoppers won’t be able to choose it. Past orders keep the area name. To pause it instead, untick “We deliver here”.', { ok: 'Delete', danger: true }))) return;
    try { await q(sb.from('delivery_zones').delete().eq('id', d.id)); toast('Area deleted.', { tone: 'ok' }); done(); } catch (err) { toast(err.message, { tone: 'err' }); }
  });
}
