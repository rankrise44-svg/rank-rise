/* ═══════════════════════════════════════════════════════════════
   ORDERS SERVICE
   ───────────────────────────────────────────────────────────────
   Demo mode: orders are saved to this browser's localStorage.
   Live mode (CONFIG.api.baseUrl set): POST {base}/orders with the
   payload below; the server re-prices the lines, reserves stock,
   stores the order and returns it with its id.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import * as storage from '../lib/storage.js';

const KEY = CONFIG.storageKeys.orders;

function makeOrderId() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CL-${ymd}-${rand}`;
}

/**
 * @param {object} payload
 *   customer: { fullName, phone, email }
 *   address:  { zoneId, zoneName, city, street, building, notes }
 *   paymentMethod: 'cod' | …
 *   items:    [{ productId, name, unitPrice, qty }]   (unitPrice in cents)
 *   totals:   { subtotal, discount, delivery, total, promoCode } (cents)
 */
export async function createOrder(payload) {
  if (CONFIG.api.baseUrl) {
    const res = await fetch(`${CONFIG.api.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('We couldn’t place your order. Please try again.');
    return res.json();
  }

  // Demo: simulate a short network round-trip.
  await new Promise((r) => setTimeout(r, 600));
  const order = {
    id: makeOrderId(),
    createdAt: new Date().toISOString(),
    status: 'received',
    currency: CONFIG.currency.code,
    ...payload,
  };
  const orders = storage.read(KEY, []);
  orders.unshift(order);
  storage.write(KEY, orders.slice(0, 20));
  return order;
}

export function getOrder(id) {
  return storage.read(KEY, []).find((o) => o.id === id) || null;
}
