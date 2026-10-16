/* ═══════════════════════════════════════════════════════════════
   PRICING — pure order-total calculation
   ───────────────────────────────────────────────────────────────
   One function computes every total the UI shows (cart drawer,
   cart page, checkout). Inputs are plain data, outputs are integer
   cents, so the same logic can run on the server to re-verify an
   order before charging it.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import { toCents } from '../lib/money.js';

export function findPromo(code) {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  const promo = CONFIG.promos[key];
  return promo ? { code: key, ...promo } : null;
}

export function deliveryZone(zoneId) {
  return CONFIG.delivery.zones.find((z) => z.id === zoneId) || null;
}

/**
 * @param {Array<{price:number, qty:number}>} lines  unit price in currency units
 * @param {{promoCode?:string, zoneId?:string}} opts
 */
export function computeTotals(lines, { promoCode, zoneId } = {}) {
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + toCents(l.price) * l.qty, 0);

  // Discount
  let discount = 0;
  let promo = findPromo(promoCode);
  let promoError = '';
  if (promoCode && !promo) promoError = 'That code isn’t valid.';
  if (promo) {
    if (promo.minSubtotal && subtotal < toCents(promo.minSubtotal)) {
      promoError = `This code needs a subtotal of at least $${promo.minSubtotal}.`;
      promo = null;
    } else if (promo.type === 'percent') {
      discount = Math.round((subtotal * promo.value) / 100);
    } else if (promo.type === 'fixed') {
      discount = Math.min(subtotal, toCents(promo.value));
    }
  }

  // Delivery — free threshold is checked against the discounted subtotal.
  const afterDiscount = subtotal - discount;
  const threshold = toCents(CONFIG.delivery.freeThreshold);
  const zone = deliveryZone(zoneId);
  const qualifiesFree = afterDiscount >= threshold;
  let delivery = null; // null = not yet known (no zone chosen)
  if (itemCount === 0) delivery = 0;
  else if (qualifiesFree) delivery = 0;
  else if (zone) delivery = toCents(zone.fee);

  const total = afterDiscount + (delivery ?? 0);

  return {
    itemCount,
    subtotal,
    discount,
    promo,
    promoError,
    delivery,
    zone,
    freeDeliveryRemaining: Math.max(0, threshold - afterDiscount),
    freeDeliveryProgress: threshold ? Math.min(1, afterDiscount / threshold) : 1,
    total,
  };
}
