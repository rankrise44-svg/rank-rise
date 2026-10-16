/* Checkout. Validates the form, prices the order with the shared
   pricing module, creates it (pending_payment) through
   services/orders.js, then runs the chosen method through
   services/payments.js. The page owns every shopper-facing step —
   3-D Secure, wallet approval — via the `ui` callbacks below. */

import { CONFIG } from '../config.js';
import { $, $$, esc, icon, setTitle, params } from '../lib/dom.js';
import { formatCents, toCents } from '../lib/money.js';
import { rules, bindForm, normalizeLebanesePhone } from '../lib/validate.js';
import { cardRules, formatNumber, formatExpiry, brandOf, digits, BRAND_NAMES } from '../lib/card.js';
import { initLayout } from '../ui/layout.js';
import { emptyState } from '../ui/empty.js';
import { totalsHtml, shipProgressHtml } from '../ui/summary.js';
import { payMark, paymentBadgesHtml, METHOD_MARKS } from '../ui/payment-badges.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import * as cart from '../services/cart.js';
import * as orders from '../services/orders.js';
import * as payments from '../services/payments.js';
import * as account from '../services/account.js';

await initLayout();
const root = $('[data-checkout-root]');
let placing = false;

const METHOD_ICONS = { cod: 'cash', card: 'card', wallet: 'wallet' };
const prettyPhone = (e164) => (e164 ? `+961 ${e164.slice(4).replace(/^(\d{1,2})(\d{3})(\d{3})$/, '$1 $2 $3')}` : '');

const field = (id, label, input, { hint = '', cls = '', optional = false } = {}) => `
  <div class="field ${cls}">
    <label for="${id}">${label}${optional ? ' <span class="opt">(optional)</span>' : ''}</label>
    ${input}
    ${hint ? `<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    <p class="field__error" id="${id}-err" data-error-for="${input.match(/name="([^"]+)"/)[1]}"></p>
  </div>`;

function methodBody(m) {
  if (m.kind === 'cod') {
    return `<div class="field">
        <span class="field__label" id="cod-cur-label">I’ll pay the courier in</span>
        <div class="seg" role="radiogroup" aria-labelledby="cod-cur-label">
          <label><input type="radio" name="codCurrency" value="USD" checked><span>US dollars</span></label>
          <label><input type="radio" name="codCurrency" value="LBP"><span>Lebanese pounds</span></label>
        </div>
        <p class="field__hint" data-lbp-hint></p>
      </div>`;
  }
  if (m.kind === 'card') {
    const t = CONFIG.payments.testCards;
    return `<div class="form-grid form-grid--3">
        ${field('cc-holder', 'Name on card', '<input id="cc-holder" name="cardHolder" type="text" autocomplete="cc-name" maxlength="60" aria-describedby="cc-holder-err">', { cls: 'span-all' })}
        <div class="field span-all">
          <label for="cc-number">Card number</label>
          <div class="input-icon">
            <input id="cc-number" name="cardNumber" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" maxlength="23" aria-describedby="cc-number-err">
            <span class="input-icon__marks" aria-hidden="true" data-card-marks>${payMark('visa')}${payMark('mastercard')}</span>
          </div>
          <p class="field__error" id="cc-number-err" data-error-for="cardNumber"></p>
        </div>
        ${field('cc-exp', 'Expiry', '<input id="cc-exp" name="cardExpiry" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" maxlength="7" aria-describedby="cc-exp-err">', { cls: 'span-2' })}
        ${field('cc-cvc', 'CVC', '<input id="cc-cvc" name="cardCvc" type="text" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="3" aria-describedby="cc-cvc-err">')}
      </div>
      ${payments.isDemoMode() ? `<div class="demo-note"><strong>Demo mode — no card is charged.</strong> Test cards (any future expiry, any CVC):<br>
        <button type="button" data-fill-card="${t.success}">Use</button> <code>${t.success}</code> approves ·
        <button type="button" data-fill-card="${t.declined}">Use</button> <code>${t.declined}</code> is declined ·
        <button type="button" data-fill-card="${t.insufficient}">Use</button> <code>${t.insufficient}</code> has insufficient funds.<br>The bank verification code is <code>123456</code>.</div>` : ''}`;
  }
  // wallet
  return `${field(`wp-${m.id}`, `${esc(m.name)} mobile number`, `<input id="wp-${m.id}" name="walletPhone-${m.id}" type="tel" inputmode="tel" autocomplete="tel" placeholder="03 123 456" maxlength="20" aria-describedby="wp-${m.id}-hint wp-${m.id}-err" data-wallet-phone>`, { hint: `We’ll send a payment request to this ${esc(m.name)} account. Approve it in the app to finish.` })}
    ${payments.isDemoMode() ? `<div class="demo-note"><strong>Demo mode — no money moves.</strong> You’ll see the approval screen and can approve, cancel or let it expire.</div>` : ''}`;
}

function formHtml(acc) {
  const zones = CONFIG.delivery.zones.map((z) => `<option value="${z.id}">${esc(z.name)} — ${z.fee ? `$${z.fee}` : 'free'}</option>`).join('');
  const methods = payments.availableMethods();
  const first = methods.find((m) => m.available);
  const methodsHtml = methods.map((m) => `
    <div class="paymethod${m.available ? '' : ' is-disabled'}" data-method="${m.id}">
      <label class="paymethod__head">
        <input type="radio" name="payment" value="${m.id}" ${m.id === first?.id ? 'checked' : ''} ${m.available ? '' : 'disabled'} aria-describedby="pm-${m.id}-desc">
        <span class="paymethod__icon">${icon(METHOD_ICONS[m.kind], { size: 20 })}</span>
        <span class="paymethod__text"><strong>${esc(m.name)}${m.available ? '' : ' <span class="opt">· coming soon</span>'}</strong><small id="pm-${m.id}-desc">${esc(m.description)}</small></span>
        <span class="paymethod__marks" aria-hidden="true">${(METHOD_MARKS[m.id] || []).map(payMark).join('')}</span>
      </label>
      ${m.available ? `<div class="paymethod__body" data-method-body="${m.id}" ${m.id === first?.id ? '' : 'hidden'}>${methodBody(m)}</div>` : ''}
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
        ${field('co-phone', 'Mobile number', `<input id="co-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="03 123 456" maxlength="20" value="${esc(acc?.phone || '')}" aria-describedby="co-phone-hint co-phone-err">`, { hint: 'The courier calls this number before delivery.' })}
        ${field('co-email', 'Email', `<input id="co-email" name="email" type="email" autocomplete="email" maxlength="120" value="${esc(acc?.email || '')}" aria-describedby="co-email-hint co-email-err">`, { optional: true, hint: 'For your order confirmation.' })}
      </div>
    </fieldset>

    <fieldset class="co-section">
      <legend><span class="step">2</span>Delivery address</legend>
      <div class="form-grid form-grid--2">
        ${field('co-zone', 'Governorate', `<select id="co-zone" name="zone" autocomplete="address-level1" aria-describedby="co-zone-err"><option value="">Select governorate</option>${zones}</select>`)}
        ${field('co-city', 'City / town', '<input id="co-city" name="city" type="text" autocomplete="address-level2" placeholder="e.g. Jounieh" maxlength="60" aria-describedby="co-city-err">')}
        ${field('co-street', 'Street &amp; area', '<input id="co-street" name="street" type="text" autocomplete="address-line1" placeholder="e.g. Main St., near the pharmacy" maxlength="120" aria-describedby="co-street-err">', { cls: 'span-2' })}
        ${field('co-building', 'Building &amp; floor', '<input id="co-building" name="building" type="text" autocomplete="address-line2" placeholder="e.g. Cedar Bldg, 3rd floor" maxlength="80" aria-describedby="co-building-err">', { cls: 'span-2' })}
        ${field('co-notes', 'Delivery notes', '<textarea id="co-notes" name="notes" maxlength="300" placeholder="Landmarks, best time to call…" aria-describedby="co-notes-err" style="min-height:90px"></textarea>', { cls: 'span-2', optional: true })}
      </div>
    </fieldset>

    <fieldset class="co-section">
      <legend><span class="step">3</span>Payment method</legend>
      <div class="paymethods">${methodsHtml}</div>
      <p class="field__error" data-error-for="payment" style="margin-top:8px"></p>
    </fieldset>

    <div class="field" style="margin-bottom:18px">
      <label class="check" style="font-weight:500;color:var(--text-2)"><input type="checkbox" name="terms" value="yes" aria-describedby="co-terms-err"> I confirm my details are correct and agree to the <a class="link" href="about.html#delivery" target="_blank" rel="noopener">delivery &amp; returns terms</a>.</label>
      <p class="field__error" id="co-terms-err" data-error-for="terms"></p>
    </div>
    <button type="submit" class="btn btn--gold btn--lg btn--block" data-place-order>Place order</button>
    <p class="secure-note" style="margin-top:12px">${icon('lock', { size: 14 })}Secure checkout${payments.isDemoMode() ? ' · Demo store: no real payment is taken' : ''}</p>
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

const selectedMethod = () => payments.getMethod($('input[name="payment"]:checked')?.value || '');

function placeLabel(totals) {
  const m = selectedMethod();
  const amount = formatCents(totals.total);
  if (!m) return `Place order · ${amount}`;
  if (m.kind === 'card') return `Pay ${amount}`;
  if (m.kind === 'wallet') return `Pay ${amount} with ${m.name}`;
  return `Place order · ${amount}`;
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
    ${totalsHtml(totals, { deliveryPending: 'Choose governorate' })}
    ${totals.zone ? `<p class="summary__note">${icon('truck', { size: 14, cls: 'inline' })}Estimated delivery: ${esc(totals.zone.eta)}</p>` : ''}
    <div class="summary__pay" aria-label="Payment methods we accept">${paymentBadgesHtml()}</div>`;
  $('[data-place-order]').textContent = placeLabel(totals);
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

/* ── Payment UI steps (modal) ─────────────────────────────────── */
function paymentUi() {
  let modal = null;
  const ensure = (title) => {
    if (!modal || modal.closed) modal = openModal({ title, icon: 'lock', dismissible: false });
    else modal.setTitle(title, 'lock');
    return modal;
  };
  return {
    get modal() { return modal; },
    close() { modal?.close(); },

    processing(message) {
      ensure('Secure payment').setBody(`<div class="spinner" role="status" aria-label="${esc(message)}"></div><p style="text-align:center;font-weight:700">${esc(message)}</p>`);
    },

    threeDS({ brand, last4, amount }) {
      const m = ensure('Verify with your bank');
      return new Promise((resolve) => {
        let attempts = 3;
        const draw = (err = '') => {
          m.setBody(`
            <p class="muted">Your bank needs to confirm this payment.</p>
            <div class="wallet-phone">${icon('card', { size: 20 })}<span><strong>${esc(brand)} •••• ${esc(last4)}</strong><br><span class="muted">Merchant: ${esc(CONFIG.store.name)}</span></span></div>
            <div class="modal__amount">${formatCents(amount)}</div>
            <form data-otp novalidate class="field">
              <label for="otp">Enter the 6-digit code sent to your phone</label>
              <input id="otp" class="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-describedby="otp-err otp-hint">
              <p class="field__hint" id="otp-hint">${payments.isDemoMode() ? 'Demo code: <strong>123456</strong>' : ''}</p>
              <p class="field__error" id="otp-err" role="alert">${esc(err)}</p>
              <div class="modal__actions" style="margin-top:6px">
                <button type="submit" class="btn btn--gold btn--block">Verify and pay</button>
                <button type="button" class="btn btn--outline btn--block" data-otp-cancel>Cancel payment</button>
              </div>
            </form>`, '#otp');
          m.body.querySelector('[data-otp]').addEventListener('submit', (e) => {
            e.preventDefault();
            const code = digits(e.target.otp.value);
            if (code === '123456') { resolve(true); return; }
            attempts -= 1;
            if (attempts <= 0) { resolve(false); return; }
            draw(code.length !== 6 ? 'Enter all 6 digits.' : `That code is incorrect. ${attempts} attempt${attempts === 1 ? '' : 's'} left.`);
          });
          m.body.querySelector('[data-otp-cancel]').addEventListener('click', () => resolve(false));
        };
        draw();
      });
    },

    walletApproval({ provider, phone, amount }) {
      const m = ensure(`Approve in ${provider}`);
      return new Promise((resolve) => {
        let left = 120;
        let timer;
        const done = (v) => { clearInterval(timer); resolve(v); };
        m.setBody(`
          <p class="muted">We sent a payment request to your ${esc(provider)} account. Open the app and approve it.</p>
          <div class="wallet-phone">${icon('phone', { size: 20 })}<span><strong>${esc(prettyPhone(phone))}</strong><br><span class="muted">${esc(provider)}</span></span></div>
          <div class="modal__amount">${formatCents(amount)}</div>
          <div class="spinner" aria-hidden="true"></div>
          <p class="countdown" aria-live="polite" data-countdown>Waiting for approval · 2:00</p>
          <div class="modal__actions">
            ${payments.isDemoMode() ? '<button type="button" class="btn btn--gold btn--block" data-wallet-approve>Simulate approval in app</button>' : ''}
            <button type="button" class="btn btn--outline btn--block" data-wallet-cancel>Cancel request</button>
          </div>`, '[data-wallet-approve], [data-wallet-cancel]');
        const cd = m.body.querySelector('[data-countdown]');
        timer = setInterval(() => {
          left -= 1;
          cd.textContent = `Waiting for approval · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
          if (left <= 0) done('timeout');
        }, 1000);
        m.body.querySelector('[data-wallet-approve]')?.addEventListener('click', () => done('approved'));
        m.body.querySelector('[data-wallet-cancel]').addEventListener('click', () => done('cancelled'));
      });
    },
  };
}

/* ── Form wiring ──────────────────────────────────────────────── */
function bind() {
  const form = $('[data-co-form]');
  const alertEl = $('[data-co-alert]');
  const kind = () => selectedMethod()?.kind;
  const when = (k, rule) => (v) => (kind() === k ? rule(v) : '');

  const validator = bindForm(form, {
    fullName: [rules.required('Full name'), rules.name, rules.minLength(3, 'Full name')],
    phone: [rules.required('Mobile number'), rules.lebanesePhone],
    email: [rules.email],
    zone: [rules.required('Governorate')],
    city: [rules.required('City / town'), rules.minLength(2, 'City / town')],
    street: [rules.required('Street & area'), rules.minLength(3, 'Street & area')],
    building: [rules.required('Building & floor')],
    notes: [rules.maxLength(300, 'Delivery notes')],
    payment: [(v) => (v && payments.isEnabled(v) ? '' : 'Choose a payment method.')],
    cardHolder: [when('card', cardRules.holder)],
    cardNumber: [when('card', cardRules.number)],
    cardExpiry: [when('card', (v) => cardRules.expiry(v))],
    cardCvc: [when('card', cardRules.cvc)],
    // One number field per wallet; only the selected wallet's is checked.
    ...Object.fromEntries(payments.availableMethods().filter((m) => m.kind === 'wallet' && m.available).map((m) => {
      const onlyThis = (rule) => (val) => (selectedMethod()?.id === m.id ? rule(val) : '');
      return [`walletPhone-${m.id}`, [onlyThis(rules.required('Mobile number')), onlyThis(rules.lebanesePhone)]];
    })),
    terms: [(v) => (v ? '' : 'Please confirm to continue.')],
  });

  // Only the selected method's fields are part of the form.
  function showMethod() {
    const id = selectedMethod()?.id;
    for (const body of $$('[data-method-body]', form)) {
      const on = body.dataset.methodBody === id;
      body.hidden = !on;
      $$('input, select', body).forEach((el) => { el.disabled = !on; });
    }
    // Prefill the wallet number from the contact number.
    const wp = $(`[data-method-body="${id}"] [data-wallet-phone]`, form);
    if (wp && !wp.value && normalizeLebanesePhone(form.phone.value)) wp.value = prettyPhone(normalizeLebanesePhone(form.phone.value));
    renderSummary();
  }
  $$('input[name="payment"]', form).forEach((r) => r.addEventListener('change', showMethod));
  showMethod();

  form.zone.addEventListener('change', renderSummary);
  $$('input[name="codCurrency"]', form).forEach((r) => r.addEventListener('change', renderSummary));

  // Tidy phone numbers once they're valid.
  form.addEventListener('focusout', (e) => {
    if (e.target.type !== 'tel') return;
    const e164 = normalizeLebanesePhone(e.target.value);
    if (e164) e.target.value = prettyPhone(e164);
  });

  // Card field formatting + brand marks
  const num = $('#cc-number', form);
  if (num) {
    const marks = $('[data-card-marks]', form);
    num.addEventListener('input', () => {
      num.value = formatNumber(num.value);
      const b = brandOf(num.value);
      $$('.pay-badge', marks).forEach((el) => el.classList.toggle('is-on', (b === 'visa' && el.classList.contains('pay-badge--visa')) || (b === 'mastercard' && el.classList.contains('pay-badge--mc'))));
    });
    const exp = $('#cc-exp', form);
    exp.addEventListener('input', (e) => { if (e.inputType !== 'deleteContentBackward') exp.value = formatExpiry(exp.value); });
    $('#cc-cvc', form).addEventListener('input', (e) => { e.target.value = digits(e.target.value).slice(0, 3); });
    $$('[data-fill-card]', form).forEach((b) => b.addEventListener('click', () => {
      num.value = b.dataset.fillCard;
      num.dispatchEvent(new Event('input'));
      const d = new Date();
      exp.value = `12 / ${String((d.getFullYear() + 3) % 100).padStart(2, '0')}`;
      $('#cc-cvc', form).value = '123';
      if (!$('#cc-holder', form).value) $('#cc-holder', form).value = form.fullName.value || 'Demo Shopper';
      toast('Test card filled in');
    }));
  }

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
    const ui = paymentUi();
    let order = null;

    try {
      order = await orders.createOrder({
        customer: { fullName: v.fullName.trim(), phone: normalizeLebanesePhone(v.phone), email: v.email.trim() || null },
        address: { zoneId: v.zone, zoneName: totals.zone?.name, city: v.city.trim(), street: v.street.trim(), building: v.building.trim(), notes: v.notes.trim() || null, country: 'LB' },
        paymentMethod: method.id,
        items: items.map((i) => ({ productId: i.product.id, slug: i.product.slug, name: i.product.name, unitPrice: toCents(i.product.price), qty: i.qty })),
        totals: { subtotal: totals.subtotal, discount: totals.discount, delivery: totals.delivery ?? 0, total: totals.total, promoCode: totals.promo?.code || null },
      });

      // Sensitive card fields are passed to the provider in memory only — never stored.
      const details = method.kind === 'card'
        ? { number: v.cardNumber, expiry: v.cardExpiry, cvc: v.cardCvc, holder: v.cardHolder }
        : method.kind === 'wallet' ? { walletPhone: normalizeLebanesePhone(v[`walletPhone-${method.id}`]) } : { codCurrency: v.codCurrency || 'USD' };
      const result = await payments.pay(method.id, order, details, ui);
      ui.close();

      const payment = { method: result.method, status: result.status, transactionId: result.transactionId || null, card: result.card || null, wallet: result.wallet || null, codCurrency: result.codCurrency || null, message: result.message };
      order = await orders.updateOrder(order.id, { status: 'confirmed', payment }) || { ...order, status: 'confirmed', payment };
      cart.clear();
      showConfirmation(order);
    } catch (err) {
      ui.close();
      if (order) await orders.updateOrder(order.id, { status: 'payment_failed', paymentError: err.code || 'error' });
      alertEl.innerHTML = `${icon('close', { size: 18 })}<span><strong>Payment not completed.</strong> ${esc(err.message || 'Something went wrong. Please try again.')}</span>`;
      alertEl.hidden = false;
      alertEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast(err.message || 'Payment not completed', { tone: 'error' });
    } finally {
      placing = false;
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  });
}

function paymentSummary(order) {
  const p = order.payment || {};
  if (p.card) return `${BRAND_NAMES[p.card.brand]} •••• ${p.card.last4} — paid`;
  if (p.wallet) return `${p.wallet.provider} — paid`;
  return `Cash on delivery (${p.codCurrency === 'LBP' ? 'LBP' : 'USD'})`;
}

function showConfirmation(order) {
  setTitle('Order confirmed');
  $('[data-co-head]').hidden = true;
  $('.crumbs')?.setAttribute('hidden', '');
  const first = order.customer.fullName.split(/\s+/)[0];
  const paid = order.payment?.status === 'paid';
  root.innerHTML = `<section class="confirm fade-in" aria-labelledby="confirm-title">
    <div class="confirm__icon">${icon('check', { size: 30 })}</div>
    <p class="eyebrow">Order ${esc(order.id)}</p>
    <h1 id="confirm-title" tabindex="-1">Thank you, ${esc(first)}!</h1>
    <p class="lead">${paid ? 'Your payment went through and your order is confirmed.' : 'Your order is confirmed.'} We’ll call <strong>${esc(prettyPhone(order.customer.phone))}</strong> before delivery.</p>
    <div class="confirm__card">
      <dl class="confirm__meta">
        <div><dt>Order number</dt><dd class="selectable">${esc(order.id)}</dd></div>
        <div><dt>Total</dt><dd class="tabular">${formatCents(order.totals.total)}</dd></div>
        <div><dt>Payment</dt><dd>${esc(paymentSummary(order))}</dd></div>
        <div><dt>Deliver to</dt><dd>${esc(order.address.city)}, ${esc(order.address.zoneName)}</dd></div>
      </dl>
      <ul class="mini-lines">${order.items.map((i) => `<li class="mini-line" style="grid-template-columns:1fr auto"><span><span class="mini-line__name">${esc(i.name)}</span> <span class="muted">× ${i.qty}</span></span><span class="tabular">${formatCents(i.unitPrice * i.qty)}</span></li>`).join('')}</ul>
      <p class="summary__note">${esc(order.payment?.message || '')} This is a demo store — nothing will actually be delivered.</p>
    </div>
    <div class="empty__links" style="margin-top:26px">
      <a class="btn btn--gold btn--lg" href="track-order.html?order=${encodeURIComponent(order.id)}">Track this order</a>
      <a class="btn btn--outline btn--lg" href="shop.html">Continue shopping</a>
    </div>
  </section>`;
  window.scrollTo({ top: 0 });
  $('#confirm-title')?.focus();
}

// If another tab changes the cart mid-checkout, refresh the summary.
cart.subscribe(() => { if (!placing && $('[data-co-summary]')) renderSummary(); });

// ?method=card etc. preselects a method (used by links from the cart page).
render().then(() => {
  const want = params().get('method');
  const r = want && $(`input[name="payment"][value="${CSS.escape(want)}"]:not(:disabled)`);
  if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
});
