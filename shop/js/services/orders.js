/* ═══════════════════════════════════════════════════════════════
   ORDERS SERVICE
   ───────────────────────────────────────────────────────────────
   Demo mode: orders are saved to this browser's localStorage.
   Live mode (CONFIG.api.baseUrl set):
     POST  {base}/orders            create (server re-prices + reserves stock)
     PATCH {base}/orders/:id        status updates (normally webhooks do this)
     GET   {base}/orders/track?id=&phone=   order tracking
   Lifecycle: cash on delivery → confirmed → out_for_delivery → delivered
              WhatsApp → awaiting_whatsapp → confirmed (by the team) → …
              (or cancelled)
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import * as storage from '../lib/storage.js';
import { normalizeLebanesePhone } from '../lib/validate.js';

const KEY = CONFIG.storageKeys.orders;
const api = CONFIG.api.baseUrl;

export const STATUS = {
  pending_payment: 'Not placed',
  awaiting_whatsapp: 'Awaiting WhatsApp confirmation',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function makeOrderId() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `CL-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const readAll = () => storage.read(KEY, []).filter((o) => o && o.id);
const writeAll = (orders) => storage.write(KEY, orders.slice(0, 30));

/**
 * payload: { customer, address, paymentMethod, items, totals }
 * (see checkout.js for the exact shape; money in cents)
 */
export async function createOrder(payload) {
  if (api) {
    const res = await fetch(`${api}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('We couldn’t place your order. Please try again.');
    return res.json();
  }
  await new Promise((r) => setTimeout(r, 400));
  const now = new Date().toISOString();
  const order = {
    id: makeOrderId(),
    createdAt: now,
    status: 'pending_payment',
    history: [{ status: 'pending_payment', at: now }],
    currency: CONFIG.currency.code,
    ...payload,
  };
  writeAll([order, ...readAll()]);
  return order;
}

export async function updateOrder(id, patch) {
  if (api) {
    const res = await fetch(`${api}/orders/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) throw new Error('Order update failed.');
    return res.json();
  }
  const orders = readAll();
  const o = orders.find((x) => x.id === id);
  if (!o) return null;
  Object.assign(o, patch);
  if (patch.status) o.history = [...(o.history || []), { status: patch.status, at: new Date().toISOString() }];
  writeAll(orders);
  return o;
}

/** Orders placed from this browser, newest first. */
export const listOrders = () => readAll();

export const getOrder = (id) => readAll().find((o) => o.id === id) || null;

/** Tracking lookup: order number + the phone used at checkout. */
export async function trackOrder(id, phone) {
  const cleanId = String(id || '').trim().toUpperCase();
  const e164 = normalizeLebanesePhone(phone);
  if (api) {
    const res = await fetch(`${api}/orders/track?id=${encodeURIComponent(cleanId)}&phone=${encodeURIComponent(e164 || '')}`);
    return res.ok ? res.json() : null;
  }
  const o = getOrder(cleanId);
  return o && o.customer?.phone === e164 ? o : null;
}
