/* Store settings (shown across the store) + my password. */
import { sb, q, friendly } from '../sb.js';
import { $, pageHead, field, showErrors, val, busy, toast } from '../ui.js';

export async function render(root) {
  const s = await q(sb.from('store_settings').select('*').maybeSingle());
  root.innerHTML = `
    ${pageHead({ title: 'Store settings', sub: 'These details appear across the store (header, footer, contact page, WhatsApp buttons). Changes show immediately.' })}
    <div class="grid grid--side">
      <form class="card form" data-settings novalidate>
        <div class="card__head"><h2>Store details</h2></div>
        <div class="form-grid">
          ${field({ name: 'name', label: 'Store name', value: s?.name || '', attrs: 'maxlength="60"' })}
          ${field({ name: 'tagline', label: 'Tagline', value: s?.tagline || '', optional: true, attrs: 'maxlength="80"' })}
          ${field({ name: 'about', label: 'About the store', type: 'textarea', value: s?.about || '', cls: 'span-2', optional: true, attrs: 'rows="3" maxlength="400"' })}
          ${field({ name: 'whatsapp', label: 'WhatsApp number', value: s?.whatsapp || '', hint: 'Orders “via WhatsApp” and every WhatsApp button go to this number. Include +961.', attrs: 'inputmode="tel"' })}
          ${field({ name: 'phone', label: 'Phone number', value: s?.phone || '', attrs: 'inputmode="tel"' })}
          ${field({ name: 'email', label: 'Email', type: 'email', value: s?.email || '', optional: true })}
          ${field({ name: 'hours', label: 'Opening hours', value: s?.hours || '', optional: true })}
          ${field({ name: 'address', label: 'Address', value: s?.address || '', cls: 'span-2', optional: true })}
        </div>
        <div class="card__head" style="margin-top:8px"><h2>Money & limits</h2></div>
        <div class="form-grid">
          ${field({ name: 'lbp_rate', label: 'LBP per US dollar', type: 'number', value: s?.lbp_rate ?? 89500, attrs: 'min="1" step="1"', hint: 'Used for the “pay in Lebanese pounds” estimate at checkout.' })}
          ${field({ name: 'max_qty', label: 'Max quantity of one product per order', type: 'number', value: s?.max_qty_per_line ?? 10, attrs: 'min="1" max="100" step="1"' })}
        </div>
        <p class="field__hint">Delivery fees and the free-delivery amount are on the <a class="link" href="#/delivery">Delivery</a> page.</p>
        <div class="form-actions"><button class="btn btn--gold" type="submit">Save settings</button></div>
      </form>
      <form class="card form" data-password novalidate>
        <div class="card__head"><h2>My password</h2></div>
        ${field({ name: 'password', label: 'New password', type: 'password', attrs: 'autocomplete="new-password" minlength="10"' })}
        ${field({ name: 'password2', label: 'Repeat it', type: 'password', attrs: 'autocomplete="new-password"' })}
        <button class="btn btn--outline" type="submit">Change password</button>
      </form>
    </div>`;

  const form = $('[data-settings]', root);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const wa = val(form, 'whatsapp');
    const rate = Number(form.lbp_rate.value);
    const max = Number(form.max_qty.value);
    const email = val(form, 'email');
    if (!showErrors(form, {
      name: val(form, 'name').length >= 2 ? '' : 'Enter the store name.',
      whatsapp: wa.replace(/\D/g, '').length >= 8 ? '' : 'Enter the full number, e.g. +961 70 123 456.',
      email: !email || /^\S+@\S+\.\S+$/.test(email) ? '' : 'Check the email.',
      lbp_rate: Number.isInteger(rate) && rate > 0 ? '' : 'A whole number, e.g. 89500.',
      max_qty: Number.isInteger(max) && max >= 1 && max <= 100 ? '' : 'Between 1 and 100.',
    })) return;
    busy(e.submitter, async () => {
      await q(sb.from('store_settings').update({
        name: val(form, 'name'), tagline: val(form, 'tagline'), about: form.about.value.trim(), whatsapp: wa, phone: val(form, 'phone'),
        email, hours: val(form, 'hours'), address: val(form, 'address'), lbp_rate: rate, max_qty_per_line: max,
      }).eq('id', true));
      toast('Settings saved. The store shows them now.', { tone: 'ok' });
    });
  });

  const pw = $('[data-password]', root);
  pw.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = pw.password.value;
    if (!showErrors(pw, { password: p.length >= 10 ? '' : 'Use at least 10 characters.', password2: p === pw.password2.value ? '' : 'The two passwords don’t match.' })) return;
    busy(e.submitter, async () => {
      const { error } = await sb.auth.updateUser({ password: p });
      if (error) throw friendly(error);
      pw.reset();
      toast('Password changed.', { tone: 'ok' });
    });
  });
}
