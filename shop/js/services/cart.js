/* ═══════════════════════════════════════════════════════════════
   CART STORE
   ───────────────────────────────────────────────────────────────
   Persists only { id, qty } per line. Prices, names and stock are
   always resolved from the catalog at render time, so a stale
   browser can never check out with an old price — the same rule a
   server-side cart will follow.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG, LIVE } from '../config.js';
import * as storage from '../lib/storage.js';
import { checkPromo } from '../lib/supabase-rest.js';
import { getProductMap } from './catalog.js';
import { computeTotals } from './pricing.js';
import { toCents } from '../lib/money.js';

const KEY = CONFIG.storageKeys.cart;
const PROMO_KEY = CONFIG.storageKeys.promo;
const listeners = new Set();

function sanitize(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l && typeof l.id === 'string' && Number.isFinite(l.qty))
    .map((l) => ({ id: l.id, qty: Math.max(1, Math.floor(l.qty)) }));
}

let lines = sanitize(storage.read(KEY, []));

function persist() {
  storage.write(KEY, lines);
  emit();
}

function emit() {
  for (const fn of listeners) fn(lines);
}

storage.onExternalChange(KEY, () => {
  lines = sanitize(storage.read(KEY, []));
  emit();
});

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getLines = () => lines.map((l) => ({ ...l }));
export const count = () => lines.reduce((n, l) => n + l.qty, 0);
export const qtyOf = (id) => lines.find((l) => l.id === id)?.qty || 0;

const maxFor = (product) => Math.max(0, Math.min(product.stock, CONFIG.limits.maxQtyPerLine));

/**
 * Add a product. Returns { added, qty, capped } so the UI can tell
 * the shopper when stock or the per-line limit stopped them.
 */
export function add(product, qty = 1) {
  const max = maxFor(product);
  if (max === 0) return { added: 0, qty: 0, capped: true };
  const line = lines.find((l) => l.id === product.id);
  const current = line?.qty || 0;
  const next = Math.min(max, current + Math.max(1, Math.floor(qty)));
  if (line) line.qty = next; else lines.push({ id: product.id, qty: next });
  persist();
  return { added: next - current, qty: next, capped: current + qty > max };
}

export function setQty(product, qty) {
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n)) return qtyOf(product.id);
  if (n <= 0) { remove(product.id); return 0; }
  const next = Math.min(maxFor(product), n);
  const line = lines.find((l) => l.id === product.id);
  if (line) { line.qty = next; persist(); }
  return next;
}

export function remove(id) {
  lines = lines.filter((l) => l.id !== id);
  persist();
}

export function clear() {
  lines = [];
  storage.remove(PROMO_KEY);
  persist();
}

/* ── Promo code (kept with the cart) ─────────────────────────── */
export const getPromo = () => storage.read(PROMO_KEY, '');
export function setPromo(code) {
  if (code) storage.write(PROMO_KEY, String(code).trim().toUpperCase());
  else storage.remove(PROMO_KEY);
  emit();
}

/* Live mode: promo rules live in the database and are fetched one code
   at a time into CONFIG.promos, so computeTotals works unchanged. The
   database applies the same rule again when the order is placed.
   Resolves to '' when the rule is loaded, or an error message.        */
const promoLookups = new Map();
function loadPromo(code) {
  const key = String(code || '').trim().toUpperCase();
  if (!LIVE || !key || CONFIG.promos[key]) return Promise.resolve('');
  if (!promoLookups.has(key)) {
    // Checked against a very large subtotal ($100,000) to learn the rule
    // itself; the minimum-subtotal check then happens in computeTotals.
    promoLookups.set(key, checkPromo(key, 10000000).then((r) => {
      if (!r?.valid || !r.kind) return r?.error || 'That code isn’t valid.';
      CONFIG.promos[key] = {
        type: r.kind,
        value: Number(r.kind === 'percent' ? r.percentOff : r.amountOff),
        label: r.label || '',
        ...(r.minSubtotal > 0 ? { minSubtotal: Number(r.minSubtotal) } : {}),
      };
      return '';
    }, (err) => {
      promoLookups.delete(key); // network trouble: allow a retry
      return err.message || 'We couldn’t check that code. Please try again.';
    }));
  }
  return promoLookups.get(key);
}

/**
 * Validate a promo code against the current cart and store it only
 * if it applies. Returns { ok, promo } or { ok: false, error }.
 */
export async function tryPromo(code) {
  const lookupError = await loadPromo(code);
  const { items } = await resolve();
  const totals = computeTotals(items.map((i) => ({ price: i.product.price, qty: i.qty })), { promoCode: code });
  if (totals.promo) {
    setPromo(totals.promo.code);
    return { ok: true, promo: totals.promo };
  }
  return { ok: false, error: lookupError || totals.promoError || 'That code isn’t valid.' };
}

/**
 * Resolve lines against the catalog. Drops products that no longer
 * exist and clamps quantities to current stock.
 */
export async function resolve({ zoneId } = {}) {
  const [map] = await Promise.all([getProductMap(), loadPromo(getPromo())]);
  const items = [];
  let changed = false;
  for (const l of lines) {
    const product = map.get(l.id);
    if (!product) { changed = true; continue; }
    const max = maxFor(product);
    const qty = Math.min(l.qty, max);
    if (qty !== l.qty) changed = true;
    if (qty > 0) items.push({ product, qty, lineTotal: toCents(product.price) * qty });
    else changed = true;
  }
  if (changed) {
    lines = items.map((i) => ({ id: i.product.id, qty: i.qty }));
    storage.write(KEY, lines);
  }
  const totals = computeTotals(
    items.map((i) => ({ price: i.product.price, qty: i.qty })),
    { promoCode: getPromo(), zoneId },
  );
  return { items, totals, adjusted: changed };
}
