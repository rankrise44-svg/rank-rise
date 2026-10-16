/* Checkout (demo). Validates the form, prices the order with the
   shared pricing module, creates it through services/orders.js and
   hands payment to services/payments.js — the same flow a live
   backend and gateway will plug into. */

import { CONFIG } from '../config.js';
import { $, $$, esc, icon, setTitle } from '../lib/dom.js';
import { formatCents, toCents } from '../lib/money.js';
import { rules, bindForm, normalizeLebanesePhone } from '../lib/validate.js';
import { initLayout } from '../ui/layout.js';
import { emptyState } from '../ui/empty.js';
import { totalsHtml, shipProgressHtml } from '../ui/summary.js';
import { toast } from '../ui/toast.js';
import * as cart from '../services/cart.js';
import * as orders from '../services/orders.js';
import * as payments from '../services/payments.js';

await initLayout();
const root = $('[data-checkout-root]');
let placing = false;

const field = (id, label, input, { hint = '', span = false, optional = false } = {}) => `
  <div class="field${span ? ' span-2' : ''}">
    <label for="${id}">${label}${optional ? ' <span class="opt">(optional)</span>' : ''}</label>
    ${input}
    ${hint ? `<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    <p class="field__error" id="${id}-err" data-error-for="${input.match(/name="([^"]+)"/)[1]}"></p>
  </div>`;

function formHtml() {
  const zones = CONFIG.delivery.zones.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join('');
  const methods = payments.availableMethods().map((m, i) => `
    <label class="radio-card${m.enabled ? '' : ' is-disabled'}">
      <input type="radio" name="payment" value="${m.id}" ${m.enabled && i === 0 ? 'checked' : ''} ${m.enabled ? '' : 'disabled'}>
      <span><strong>${esc(m.name)}${m.enabled ? '' : '<span class="soon">Coming soon</span>'}</strong><small>${esc(m.description)}</small></span>
    </label>`).join('');

  return `
  <form class="co-form" data-co-form novalidate>
    <div class="alert alert--err" data-co-alert role="alert" hidden style="margin-bottom:24px"></div>

    <fieldset class="co-section">
      <legend><span class="step">1</span>Contact details</legend>
      <div class="form-grid form-grid--2">
        ${field('co-name', 'Full name', '<input id="co-name" name="fullName" type="text" autocomplete="name" maxlength="80" aria-describedby="co-name-err">', { span: true })}
        ${field('co-phone', 'Mobile number', '<input id="co-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="03 123 456" maxlength="20" aria-describedby="co-phone-hint co-phone-err">', { hint: 'The courier will call this number before delivery.' })}
        ${field('co-email', 'Email', '<input id="co-email" name="email" type="email" autocomplete="email" maxlength="120" aria-describedby="co-email-hint co-email-err">', { optional: true, hint: 'For your order confirmation.' })}
      </div>
    </fieldset>

    <fieldset class="co-section">
      <legend><span class="step">2</span>Delivery address</legend>
      <div class="form-grid form-grid--2">
        ${field('co-zone', 'Governorate', `<select id="co-zone" name="zone" autocomplete="address-level1" aria-describedby="co-zone-err"><option value="">Select governorate</option>${zones}</select>`)}
        ${field('co-city', 'City / town', '<input id="co-city" name="city" type="text" autocomplete="address-level2" placeholder="e.g. Jounieh" maxlength="60" aria-describedby="co-city-err">')}
        ${field('co-street', 'Street &amp; area', '<input id="co-street" name="street" type="text" autocomplete="address-line1" placeholder="e.g. Main St., near the pharmacy" maxlength="120" aria-describedby="co-street-err">', { span: true })}
        ${field('co-building', 'Building &amp; floor', '<input id="co-building" name="building" type="text" autocomplete="address-line2" placeholder="e.g. Cedar Bldg, 3rd floor" maxlength="80" aria-describedby="co-building-err">', { span: true })}
        ${field('co-notes', 'Delivery notes', '<textarea id="co-notes" name="notes" maxlength="300" placeholder="Landmarks, best time to call…" aria-describedby="co-notes-err" style="min-height:96px"></textarea>', { span: true, optional: true })}
      </div>
    </fieldset>

    <fieldset class="co-section">
      <legend><span class="step">3</span>Payment</legend>
      <div class="field">${methods}<p class="field__error" data-error-for="payment"></p></div>
    </fieldset>

    <div class="field" style="margin-bottom:20px">
      <label class="check" style="font-weight:500;color:var(--text-2)"><input type="checkbox" name="terms" value="yes" aria-describedby="co-terms-err"> I confirm my details are correct and agree to the delivery &amp; returns terms.</label>
      <p class="field__error" id="co-terms-err" data-error-for="terms"></p>
    </div>
    <button type="submit" class="btn btn--dark btn--lg btn--block" data-place-order>Place order</button>
    <p class="summary__note" style="text-align:center;margin-top:10px">Demo store — no payment is taken and nothing is shipped.</p>
  </form>`;
}

function miniLinesHtml(items) {
  return `<ul class="mini-lines">${items.map(({ product: p, qty, lineTotal }) => `
    <li class="mini-line">
      <span class="mini-line__img"><img src="${esc(p.images[0])}" alt="" width="56" height="56"><span class="mini-line__qty" aria-label="Quantity ${qty}">${qty}</span></span>
      <span class="mini-line__name">${esc(p.name)}</span>
      <span>${formatCents(lineTotal)}</span>
    </li>`).join('')}</ul>`;
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
    ${totals.zone ? `<p class="summary__note">${icon('truck', { size: 14, cls: 'inline' })} Estimated delivery: ${esc(totals.zone.eta)}</p>` : ''}`;
  $('[data-place-order]').textContent = `Place order · ${formatCents(totals.total)}`;
  return { items, totals };
}

async function render() {
  const { items } = await cart.resolve();
  root.removeAttribute('aria-busy');
  if (!items.length) {
    $('[data-co-head]').hidden = true;
    root.innerHTML = emptyState({
      iconName: 'bag',
      title: 'Your cart is empty',
      text: 'Add something to your cart before checking out.',
      cta: { label: 'Browse the shop', href: 'shop.html' },
    });
    return;
  }

  root.innerHTML = `<div class="checkout">
    <div>${formHtml()}</div>
    <aside class="summary" data-co-summary aria-labelledby="co-summary-title"></aside>
  </div>`;
  await renderSummary();
  bind();
}

function bind() {
  const form = $('[data-co-form]');
  const alertEl = $('[data-co-alert]');
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
    terms: [(v) => (v ? '' : 'Please confirm to continue.')],
  });

  form.zone.addEventListener('change', renderSummary);

  // Drop the error banner once every highlighted field has been fixed.
  const clearAlert = () => { if (!alertEl.hidden && !form.querySelector('.field.has-error')) alertEl.hidden = true; };
  form.addEventListener('input', clearAlert);
  form.addEventListener('change', clearAlert);

  // Tidy the phone into a readable format once it is valid.
  form.phone.addEventListener('blur', () => {
    const e164 = normalizeLebanesePhone(form.phone.value);
    if (e164) form.phone.value = `+961 ${e164.slice(4).replace(/^(\d{1,2})(\d{3})(\d{3})$/, '$1 $2 $3')}`;
  });

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
    const { items, totals } = await renderSummary();
    if (!items.length) { render(); return; }

    placing = true;
    const btn = $('[data-place-order]');
    btn.classList.add('is-loading');
    btn.disabled = true;

    try {
      const order = await orders.createOrder({
        customer: { fullName: v.fullName.trim(), phone: normalizeLebanesePhone(v.phone), email: v.email.trim() || null },
        address: { zoneId: v.zone, zoneName: totals.zone?.name, city: v.city.trim(), street: v.street.trim(), building: v.building.trim(), notes: v.notes.trim() || null, country: 'LB' },
        paymentMethod: v.payment,
        items: items.map((i) => ({ productId: i.product.id, slug: i.product.slug, name: i.product.name, unitPrice: toCents(i.product.price), qty: i.qty })),
        totals: { subtotal: totals.subtotal, discount: totals.discount, delivery: totals.delivery ?? 0, total: totals.total, promoCode: totals.promo?.code || null },
      });
      const payment = await payments.pay(v.payment, order);
      cart.clear();
      showConfirmation(order, payment);
    } catch (err) {
      alertEl.innerHTML = `${icon('close', { size: 18 })}<span>${esc(err.message || 'Something went wrong. Please try again.')}</span>`;
      alertEl.hidden = false;
      alertEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast('We couldn’t place your order.', { tone: 'error' });
    } finally {
      placing = false;
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  });
}

function showConfirmation(order, payment) {
  setTitle('Order confirmed');
  $('[data-co-head]').hidden = true;
  $('.crumbs')?.setAttribute('hidden', '');
  const first = order.customer.fullName.split(/\s+/)[0];
  const method = CONFIG.payments.find((m) => m.id === order.paymentMethod)?.name || order.paymentMethod;
  root.innerHTML = `<section class="confirm fade-in" aria-labelledby="confirm-title">
    <div class="confirm__icon">${icon('check', { size: 30 })}</div>
    <p class="eyebrow">Order ${esc(order.id)}</p>
    <h1 id="confirm-title" tabindex="-1">Thank you, ${esc(first)}!</h1>
    <p class="lead">Your order has been received. We’ll call <strong>${esc(order.customer.phone)}</strong> to confirm before delivery.</p>
    <div class="confirm__card">
      <dl class="confirm__meta">
        <div><dt>Order number</dt><dd>${esc(order.id)}</dd></div>
        <div><dt>Total</dt><dd>${formatCents(order.totals.total)}</dd></div>
        <div><dt>Payment</dt><dd>${esc(method)}</dd></div>
        <div><dt>Deliver to</dt><dd>${esc(order.address.city)}, ${esc(order.address.zoneName)}</dd></div>
      </dl>
      <ul class="mini-lines">${order.items.map((i) => `<li class="mini-line" style="grid-template-columns:1fr auto"><span><span class="mini-line__name">${esc(i.name)}</span> <span class="muted">× ${i.qty}</span></span><span>${formatCents(i.unitPrice * i.qty)}</span></li>`).join('')}</ul>
      <p class="summary__note">${esc(payment.message)} This is a demo — no order will actually be delivered.</p>
    </div>
    <div class="empty__links" style="margin-top:28px">
      <a class="btn btn--dark btn--lg" href="shop.html">Continue shopping</a>
      <a class="btn btn--light btn--lg" href="index.html">Back to home</a>
    </div>
  </section>`;
  window.scrollTo({ top: 0 });
  $('#confirm-title')?.focus();
}

// If another tab changes the cart mid-checkout, refresh the summary.
cart.subscribe(() => { if (!placing && $('[data-co-summary]')) renderSummary(); });

render();
