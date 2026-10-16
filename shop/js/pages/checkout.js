/* Checkout. Two ways to order:
     • Cash on delivery — confirmed here; the courier collects payment.
     • Order via WhatsApp — the order is saved, then sent to the store's
       WhatsApp as a ready-made message; the team confirms in the chat.
   Totals come from the shared pricing module; orders go through
   services/orders.js and the method through services/payments.js. */

import { CONFIG } from '../config.js';
import { $, $$, esc, icon, setTitle, params } from '../lib/dom.js';
import { formatCents, toCents } from '../lib/money.js';
import { rules, bindForm, normalizeLebanesePhone } from '../lib/validate.js';
import { initLayout } from '../ui/layout.js';
import { emptyState } from '../ui/empty.js';
import { totalsHtml, shipProgressHtml } from '../ui/summary.js';
import { toast } from '../ui/toast.js';
import * as cart from '../services/cart.js';
import * as orders from '../services/orders.js';
import * as payments from '../services/payments.js';
import * as account from '../services/account.js';

await initLayout();
const root = $('[data-checkout-root]');
let placing = false;

const METHOD_ICONS = { cod: 'cash', whatsapp: 'whatsapp' };
const prettyPhone = (e164) => (e164 ? `+961 ${e164.slice(4).replace(/^(\d{1,2})(\d{3})(\d{3})$/, '$1 $2 $3')}` : '');

const field = (id, label, input, { hint = '', cls = '', optional = false } = {}) => `
  <div class="field ${cls}">
    <label for="${id}">${label}${optional ? ' <span class="opt">(optional)</span>' : ''}</label>
    ${input}
    ${hint ? `<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    <p class="field__error" id="${id}-err" data-error-for="${input.match(/name="([^"]+)"/)[1]}"></p>
  </div>`;

function methodBody(m) {
  if (m.id === 'cod') {
    return `<div class="field">
        <span class="field__label" id="cod-cur-label">I’ll pay the courier in</span>
        <div class="seg" role="radiogroup" aria-labelledby="cod-cur-label">
          <label><input type="radio" name="codCurrency" value="USD" checked><span>US dollars</span></label>
          <label><input type="radio" name="codCurrency" value="LBP"><span>Lebanese pounds</span></label>
        </div>
        <p class="field__hint" data-lbp-hint></p>
      </div>`;
  }
  return `<p class="wa-note">${icon('whatsapp', { size: 18 })}<span>We’ll open WhatsApp with your order written out — just press send. Our team replies to confirm stock, delivery time and the final total. Your address is optional here; you can share it in the chat.</span></p>`;
}

function formHtml(acc) {
  const zones = CONFIG.delivery.zones.map((z) => `<option value="${z.id}">${esc(z.name)} — ${z.fee ? `$${z.fee}` : 'free'}</option>`).join('');
  const methods = payments.availableMethods();
  const methodsHtml = methods.map((m, i) => `
    <div class="paymethod paymethod--${m.id}" data-method="${m.id}">
      <label class="paymethod__head">
        <input type="radio" name="payment" value="${m.id}" ${i === 0 ? 'checked' : ''} aria-describedby="pm-${m.id}-desc">
        <span class="paymethod__icon">${icon(METHOD_ICONS[m.id] || 'cash', { size: 20 })}</span>
        <span class="paymethod__text"><strong>${esc(m.name)}</strong><small id="pm-${m.id}-desc">${esc(m.description)}</small></span>
      </label>
      <div class="paymethod__body" data-method-body="${m.id}" ${i === 0 ? '' : 'hidden'}>${methodBody(m)}</div>
    </div>`).join('');

  return `
  <form class="co-form" data-co-form novalidate>
    <div class="alert alert--err" data-co-alert role="alert" hidden style="margin-bottom:18px"></div>
    ${acc
      ? `<div class="signin-hint">${icon('user', { size: 16, cls: 'inline' })}<span>Signed in as <strong>${esc(acc.email)}</strong></span><a class="link" href="account.html">Manage account</a></div>`
      : `<div class="signin-hint"><span>Have an account? Sign in for faster checkout and order history.</span><a class="btn btn--outline btn--sm" href="account.html?next=checkout">Sign in</a></div>`}

    <fieldset class="co-section">
      <legend><span class="step">1</span>Contact details</legend>
      <div class="form-grid form-grid--2">
        ${field('co-name', 'Full name', `<input id="co-name" name="fullName" type="text" autocomplete="name" maxlength="80" value="${esc(acc?.name || '')}" aria-describedby="co-name-err">`, { cls: 'span-2' })}
        ${field('co-phone', 'Mobile number', `<input id="co-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="03 123 456" maxlength="20" value="${esc(acc?.phone ? prettyPhone(acc.phone) : '')}" aria-describedby="co-phone-hint co-phone-err">`, { hint: 'We call or WhatsApp this number about your order.' })}
        ${field('co-email', 'Email', `<input id="co-email" name="email" type="email" autocomplete="email" maxlength="120" value="${esc(acc?.email || '')}" aria-describedby="co-email-err">`, { optional: true })}
      </div>
    </fieldset>

    <fieldset class="co-section">
      <legend><span class="step">2</span>How would you like to order?</legend>
      <div class="paymethods">${methodsHtml}</div>
      <p class="field__error" data-error-for="payment" style="margin-top:8px"></p>
    </fieldset>

    <fieldset class="co-section">
      <legend><span class="step">3</span>Delivery address <span class="opt" data-address-opt hidden>(optional for WhatsApp orders)</span></legend>
      <div class="form-grid form-grid--2">
        ${field('co-zone', 'Governorate', `<select id="co-zone" name="zone" autocomplete="address-level1" aria-describedby="co-zone-err"><option value="">Select governorate</option>${zones}</select>`)}
        ${field('co-city', 'City / town', '<input id="co-city" name="city" type="text" autocomplete="address-level2" placeholder="e.g. Jounieh" maxlength="60" aria-describedby="co-city-err">')}
        ${field('co-street', 'Street &amp; area', '<input id="co-street" name="street" type="text" autocomplete="address-line1" placeholder="e.g. Main St., near the pharmacy" maxlength="120" aria-describedby="co-street-err">', { cls: 'span-2' })}
        ${field('co-building', 'Building &amp; floor', '<input id="co-building" name="building" type="text" autocomplete="address-line2" placeholder="e.g. Cedar Bldg, 3rd floor" maxlength="80" aria-describedby="co-building-err">', { cls: 'span-2' })}
        ${field('co-notes', 'Delivery notes', '<textarea id="co-notes" name="notes" maxlength="300" placeholder="Landmarks, best time to call…" aria-describedby="co-notes-err" style="min-height:90px"></textarea>', { cls: 'span-2', optional: true })}
      </div>
    </fieldset>

    <div class="field" style="margin-bottom:18px" data-terms>
      <label class="check" style="font-weight:500;color:var(--text-2)"><input type="checkbox" name="terms" value="yes" aria-describedby="co-terms-err"> I confirm my details are correct and agree to the <a class="link" href="about.html#delivery" target="_blank" rel="noopener">delivery &amp; returns terms</a>.</label>
      <p class="field__error" id="co-terms-err" data-error-for="terms"></p>
    </div>
    <button type="submit" class="btn btn--gold btn--lg btn--block" data-place-order>Place order</button>
    <p class="secure-note" style="margin-top:12px" data-co-foot></p>
  </form>`;
}

function miniLinesHtml(items) {
  return `<ul class="mini-lines">${items.map(({ product: p, qty, lineTotal }) => `
    <li class="mini-line">
      <span class="mini-line__img"><img src="${esc(p.images[0])}" alt="" width="56" height="56"><span class="mini-line__qty" aria-label="Quantity ${qty}">${qty}</span></span>
      <span class="mini-line__name">${esc(p.name)}</span>
      <span class="tabular">${formatCents(lineTotal)}</span>
    </li>`).join('')}</ul>`;
}

const selectedMethod = () => $('input[name="payment"]:checked')?.value || '';
const isWhatsApp = () => selectedMethod() === 'whatsapp';

function updateCta(totals) {
  const btn = $('[data-place-order]');
  const foot = $('[data-co-foot]');
  if (!btn) return;
  const amount = formatCents(totals.total);
  if (isWhatsApp()) {
    btn.className = 'btn btn--whatsapp btn--lg btn--block';
    btn.innerHTML = `${icon('whatsapp', { size: 20 })}Send order on WhatsApp · ${amount}`;
    foot.innerHTML = `${icon('whatsapp', { size: 14 })}Opens a chat with ${esc(CONFIG.store.whatsapp)}`;
  } else {
    btn.className = 'btn btn--gold btn--lg btn--block';
    btn.textContent = `Place order · ${amount}`;
    foot.innerHTML = `${icon('cash', { size: 14 })}Nothing to pay now — pay the courier on delivery`;
  }
}

async function renderSummary() {
  const zoneId = $('#co-zone')?.value || '';
  const { items, totals } = await cart.resolve({ zoneId });
  const el = $('[data-co-summary]');
  if (!el) return { items, totals };
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 id="co-summary-title">Order summary</h2><a class="btn btn--link" href="cart.html">Edit cart</a></div>
    ${miniLinesHtml(items)}
    ${shipProgressHtml(totals)}
    ${totalsHtml(totals, { deliveryPending: isWhatsApp() ? 'Confirmed on WhatsApp' : 'Choose governorate' })}
    ${totals.zone ? `<p class="summary__note">${icon('truck', { size: 14, cls: 'inline' })}Estimated delivery: ${esc(totals.zone.eta)}</p>` : ''}`;
  updateCta(totals);
  const lbp = $('[data-lbp-hint]');
  if (lbp) {
    // Rounded to the nearest 1,000 LBP, as cash is handled in practice.
    const lbpTotal = Math.round(((totals.total / 100) * CONFIG.lbpRate) / 1000) * 1000;
    lbp.textContent = `≈ ${lbpTotal.toLocaleString('en-US')} LBP at ${CONFIG.lbpRate.toLocaleString('en-US')} LBP/$. The courier confirms the day’s rate.`;
  }
  return { items, totals };
}

async function render() {
  const { items } = await cart.resolve();
  root.removeAttribute('aria-busy');
  if (!items.length) {
    $('[data-co-head]').hidden = true;
    root.innerHTML = emptyState({
      heading: 'h1',
      iconName: 'cart',
      title: 'Your cart is empty',
      text: 'Add something to your cart before checking out.',
      cta: { label: 'Browse the shop', href: 'shop.html' },
    });
    return;
  }
  root.innerHTML = `<div class="checkout">
    <div>${formHtml(account.current())}</div>
    <aside class="summary" data-co-summary aria-labelledby="co-summary-title"></aside>
  </div>`;
  await renderSummary();
  bind();
}

/* ── Form wiring ──────────────────────────────────────────────── */
function bind() {
  const form = $('[data-co-form]');
  const alertEl = $('[data-co-alert]');
  // Address and terms are required for cash on delivery only.
  const codOnly = (rule) => (v) => (isWhatsApp() ? '' : rule(v));

  const validator = bindForm(form, {
    fullName: [rules.required('Full name'), rules.name, rules.minLength(3, 'Full name')],
    phone: [rules.required('Mobile number'), rules.lebanesePhone],
    email: [rules.email],
    payment: [(v) => (payments.isEnabled(v) ? '' : 'Choose how you’d like to order.')],
    zone: [codOnly(rules.required('Governorate'))],
    city: [codOnly(rules.required('City / town')), codOnly(rules.minLength(2, 'City / town'))],
    street: [codOnly(rules.required('Street & area')), codOnly(rules.minLength(3, 'Street & area'))],
    building: [codOnly(rules.required('Building & floor'))],
    notes: [rules.maxLength(300, 'Delivery notes')],
    terms: [codOnly((v) => (v ? '' : 'Please confirm to continue.'))],
  });

  function showMethod() {
    const id = selectedMethod();
    for (const body of $$('[data-method-body]', form)) {
      const on = body.dataset.methodBody === id;
      body.hidden = !on;
      $$('input, select', body).forEach((el) => { el.disabled = !on; });
    }
    $('[data-address-opt]', form).hidden = !isWhatsApp();
    $('[data-terms]', form).hidden = isWhatsApp();
    // Clear address errors that no longer apply.
    if (isWhatsApp()) $$('.field.has-error', form).forEach((f) => { if (!f.querySelector('#co-name, #co-phone, #co-email')) { f.classList.remove('has-error'); f.querySelector('[aria-invalid]')?.removeAttribute('aria-invalid'); const e = f.querySelector('.field__error'); if (e) e.textContent = ''; } });
    renderSummary();
  }
  $$('input[name="payment"]', form).forEach((r) => r.addEventListener('change', showMethod));
  showMethod();

  form.zone.addEventListener('change', renderSummary);
  $$('input[name="codCurrency"]', form).forEach((r) => r.addEventListener('change', renderSummary));

  // Tidy phone numbers once they're valid.
  form.phone.addEventListener('blur', () => {
    const e164 = normalizeLebanesePhone(form.phone.value);
    if (e164) form.phone.value = prettyPhone(e164);
  });

  const clearAlert = () => { if (!alertEl.hidden && !form.querySelector('.field.has-error')) alertEl.hidden = true; };
  form.addEventListener('input', clearAlert);
  form.addEventListener('change', clearAlert);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (placing) return;
    alertEl.hidden = true;

    if (!validator.validate()) {
      const n = $$('.field.has-error', form).length;
      alertEl.innerHTML = `${icon('close', { size: 18 })}<span>Please fix ${n} highlighted field${n === 1 ? '' : 's'} to place your order.</span>`;
      alertEl.hidden = false;
      return;
    }

    const v = validator.values();
    const method = selectedMethod();
    const { items, totals } = await renderSummary();
    if (!items.length) { render(); return; }

    placing = true;
    const btn = $('[data-place-order]');
    btn.classList.add('is-loading');
    btn.disabled = true;

    try {
      let order = await orders.createOrder({
        customer: { fullName: v.fullName.trim(), phone: normalizeLebanesePhone(v.phone), email: v.email.trim() || null },
        address: { zoneId: v.zone || null, zoneName: totals.zone?.name || null, city: v.city.trim(), street: v.street.trim(), building: v.building.trim(), notes: v.notes.trim() || null, country: 'LB' },
        paymentMethod: method,
        items: items.map((i) => ({ productId: i.product.id, slug: i.product.slug, name: i.product.name, unitPrice: toCents(i.product.price), qty: i.qty })),
        totals: { subtotal: totals.subtotal, discount: totals.discount, delivery: totals.delivery ?? 0, total: totals.total, promoCode: totals.promo?.code || null },
      });
      const result = await payments.pay(method, order, { codCurrency: v.codCurrency || 'USD' });
      order = await orders.updateOrder(order.id, {
        status: result.status,
        payment: { method: result.method, codCurrency: result.codCurrency || null, message: result.message },
      }) || { ...order, status: result.status };
      cart.clear();
      if (result.waUrl) window.open(result.waUrl, '_blank', 'noopener');
      showConfirmation(order, result);
    } catch (err) {
      alertEl.innerHTML = `${icon('close', { size: 18 })}<span>${esc(err.message || 'Something went wrong. Please try again.')}</span>`;
      alertEl.hidden = false;
      toast('We couldn’t place your order.', { tone: 'error' });
    } finally {
      placing = false;
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  });
}

function showConfirmation(order, result) {
  const viaWa = result.method === 'whatsapp';
  setTitle(viaWa ? 'Send your order on WhatsApp' : 'Order confirmed');
  $('[data-co-head]').hidden = true;
  $('.crumbs')?.setAttribute('hidden', '');
  const first = order.customer.fullName.split(/\s+/)[0];
  const where = [order.address.city, order.address.zoneName].filter(Boolean).join(', ');
  root.innerHTML = `<section class="confirm fade-in" aria-labelledby="confirm-title">
    <div class="confirm__icon${viaWa ? ' confirm__icon--wa' : ''}">${icon(viaWa ? 'whatsapp' : 'check', { size: 30 })}</div>
    <p class="eyebrow">Order ${esc(order.id)}</p>
    <h1 id="confirm-title" tabindex="-1">${viaWa ? `Almost done, ${esc(first)}!` : `Thank you, ${esc(first)}!`}</h1>
    <p class="lead">${viaWa
      ? 'Send the WhatsApp message with your order and we’ll reply to confirm stock, delivery and the final total.'
      : `Your order is confirmed. We’ll call <strong>${esc(prettyPhone(order.customer.phone))}</strong> before delivery.`}</p>
    ${viaWa ? `<div class="empty__links" style="margin-top:22px">
      <a class="btn btn--whatsapp btn--lg" href="${esc(result.waUrl)}" target="_blank" rel="noopener" data-wa-send>${icon('whatsapp', { size: 20 })}Send order on WhatsApp</a></div>
      <p class="summary__note" style="margin-top:10px">WhatsApp didn’t open? Tap the button above. Chat number: <span class="selectable">${esc(CONFIG.store.whatsapp)}</span></p>` : ''}
    <div class="confirm__card">
      <dl class="confirm__meta">
        <div><dt>Order number</dt><dd class="selectable">${esc(order.id)}</dd></div>
        <div><dt>Total</dt><dd class="tabular">${formatCents(order.totals.total)}${order.address.zoneId ? '' : ' + delivery'}</dd></div>
        <div><dt>How you’re ordering</dt><dd>${viaWa ? 'WhatsApp' : `Cash on delivery (${order.payment?.codCurrency === 'LBP' ? 'LBP' : 'USD'})`}</dd></div>
        <div><dt>Deliver to</dt><dd>${where ? esc(where) : 'Confirm on WhatsApp'}</dd></div>
      </dl>
      <ul class="mini-lines">${order.items.map((i) => `<li class="mini-line" style="grid-template-columns:1fr auto"><span><span class="mini-line__name">${esc(i.name)}</span> <span class="muted">× ${i.qty}</span></span><span class="tabular">${formatCents(i.unitPrice * i.qty)}</span></li>`).join('')}</ul>
      <p class="summary__note">${esc(result.message)}</p>
    </div>
    <div class="empty__links" style="margin-top:26px">
      <a class="btn btn--outline btn--lg" href="track-order.html?order=${encodeURIComponent(order.id)}">Track this order</a>
      <a class="btn btn--outline btn--lg" href="shop.html">Continue shopping</a>
    </div>
  </section>`;
  window.scrollTo({ top: 0 });
  $('#confirm-title')?.focus();
}

// If another tab changes the cart mid-checkout, refresh the summary.
cart.subscribe(() => { if (!placing && $('[data-co-summary]')) renderSummary(); });

// ?method=whatsapp preselects WhatsApp (used by the cart page).
render().then(() => {
  const want = params().get('method');
  const r = want && $(`input[name="payment"][value="${CSS.escape(want)}"]`);
  if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
});
