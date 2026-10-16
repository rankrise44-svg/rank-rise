/* Track order — look up by order number + the phone used at checkout. */
import { CONFIG } from '../config.js';
import { $, esc, icon, params, setTitle } from '../lib/dom.js';
import { formatCents } from '../lib/money.js';
import { rules, bindForm } from '../lib/validate.js';
import { initLayout } from '../ui/layout.js';
import * as orders from '../services/orders.js';
import { waLink, orderMessage } from '../lib/whatsapp.js';

await initLayout();
const form = $('[data-track-form]');
const out = $('[data-track-result]');

const prefill = params().get('order');
if (prefill) form.order.value = prefill.toUpperCase();
const recent = orders.listOrders().find((o) => o.id === prefill);
if (recent?.customer?.phone) form.phone.value = recent.customer.phone.replace(/^\+961/, '0');

const validator = bindForm(form, {
  order: [rules.required('Order number'), (v) => (/^CL-\d{6}-[A-Z0-9]{4}$/i.test(String(v).trim()) ? '' : 'Order numbers look like CL-261016-AB12.')],
  phone: [rules.required('Mobile number'), rules.lebanesePhone],
});

const STEPS = [
  ['confirmed', 'Order confirmed', 'We’ve received your order and are preparing it.', 'check'],
  ['packed', 'Packed', 'Packed at our Beirut warehouse.', 'package'],
  ['out_for_delivery', 'Out for delivery', 'The courier will call before arriving.', 'truck'],
  ['delivered', 'Delivered', 'Enjoy your new kitchen pieces!', 'home'],
];

function timeline(order) {
  if (order.status === 'awaiting_whatsapp') {
    // Full order details exist only in the browser that placed the order.
    const msg = order.customer ? orderMessage(order) : `Hello ${CONFIG.store.name}, I'd like to confirm my order ${order.id}.`;
    return `<div class="alert alert--warn">${icon('whatsapp', { size: 18 })}<span><strong>Waiting for confirmation on WhatsApp.</strong> If you haven’t sent your order message yet, <a class="link" href="${esc(waLink(msg))}" target="_blank" rel="noopener">send it now</a> — we confirm stock and delivery in the chat.</span></div>`;
  }
  if (order.status === 'cancelled') {
    return `<div class="alert alert--err">${icon('close', { size: 18 })}<span><strong>This order was cancelled.</strong> Questions? <a class="link" href="contact.html">Contact us</a>.</span></div>`;
  }
  if (order.status === 'pending_payment') {
    return `<div class="alert alert--warn">${icon('package', { size: 18 })}<span><strong>This order wasn’t completed.</strong> You can place it again from your cart.</span></div>`;
  }
  const reached = { confirmed: 0, packed: 1, out_for_delivery: 2, delivered: 3 }[order.status] ?? 0;
  return `<ol class="timeline">${STEPS.map(([, title, text, ic], i) => `
    <li class="${i <= reached ? 'is-done' : ''} ${i === reached + 1 ? 'is-current' : ''}">
      <span class="timeline__dot">${icon(i <= reached ? 'check' : ic, { size: 16 })}</span>
      <div><strong>${title}</strong><span>${i <= reached ? text : i === reached + 1 ? 'Next step' : 'Pending'}</span></div>
    </li>`).join('')}</ol>`;
}

function show(order) {
  if (!order) {
    out.innerHTML = `<div class="alert alert--err" role="alert">${icon('search', { size: 18 })}<span>We couldn’t find an order with that number and phone. Check both and try again, or <a class="link" href="contact.html">contact us</a>.</span></div>`;
    return;
  }
  setTitle(`Order ${order.id}`);
  const placed = new Date(order.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  out.innerHTML = `<div class="form-card fade-in" style="display:grid;gap:18px">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
      <div><p class="eyebrow">Order</p><h2 class="tabular">${esc(order.id)}</h2></div>
      <span class="status status--${esc(order.status)}">${esc(orders.STATUS[order.status] || order.status)}</span>
    </div>
    <dl class="confirm__meta">
      <div><dt>Placed</dt><dd>${esc(placed)}</dd></div>
      <div><dt>Total</dt><dd class="tabular">${formatCents(order.totals.total)}</dd></div>
      <div><dt>Deliver to</dt><dd>${esc(order.address.city)}, ${esc(order.address.zoneName || '')}</dd></div>
      <div><dt>Items</dt><dd>${order.items.reduce((n, i) => n + i.qty, 0)}</dd></div>
    </dl>
    ${timeline(order)}
  </div>`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validator.validate()) return;
  const btn = form.querySelector('[type="submit"]');
  btn.classList.add('is-loading');
  try {
    show(await orders.trackOrder(form.order.value, form.phone.value));
  } catch (err) {
    out.innerHTML = `<div class="alert alert--err" role="alert">${icon('close', { size: 18 })}<span>${esc(err.message || 'Something went wrong. Please try again.')}</span></div>`;
  } finally {
    btn.classList.remove('is-loading');
  }
});

if (prefill && form.phone.value) form.requestSubmit();
