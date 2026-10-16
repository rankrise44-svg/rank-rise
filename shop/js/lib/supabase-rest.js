/* ═══════════════════════════════════════════════════════════════
   Tiny Supabase client for the storefront (no dependencies)
   ───────────────────────────────────────────────────────────────
   Talks to Supabase's REST API with the public anon key. It can
   only do what the database allows shoppers to do:
     • read the storefront_* views
     • call check_promo, place_order and track_order
   Used by the storefront's services only when supabase.config.js
   has a URL and key; otherwise the shop runs on js/data/*.js.

   Errors raised by the database (e.g. "Only 2 of … left in stock")
   come back as SupabaseError with the shopper-friendly message
   and a machine-readable `reason` (the function's hint).
   ═══════════════════════════════════════════════════════════════ */

import { SUPABASE, isSupabaseConfigured } from '../supabase.config.js';

export class SupabaseError extends Error {
  constructor(message, { status = 0, reason = '', code = '' } = {}) {
    super(message);
    this.name = 'SupabaseError';
    this.status = status;
    this.reason = reason;
    this.code = code;
  }
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE.anonKey,
    // Legacy anon keys are JWTs and go in Authorization too; the newer
    // "sb_publishable_…" keys must only be sent as `apikey`.
    ...(SUPABASE.anonKey.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE.anonKey}` } : {}),
    Accept: 'application/json',
    ...extra,
  };
}

const TIMEOUT_MS = 12000;

async function request(path, init = {}) {
  if (!isSupabaseConfigured()) throw new SupabaseError('Supabase is not configured.', { reason: 'not_configured' });
  let res;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeout || TIMEOUT_MS);
  try {
    res = await fetch(`${SUPABASE.url.replace(/\/+$/, '')}/rest/v1/${path}`, { ...init, signal: ctrl.signal, headers: headers(init.headers) });
  } catch {
    throw new SupabaseError('We couldn’t reach the store. Check your connection and try again.', { reason: 'network' });
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }
  if (!res.ok) {
    // Database exceptions (P0001) carry a shopper-friendly message; hide anything else.
    const friendly = body?.code === 'P0001' ? body.message : 'Something went wrong. Please try again.';
    throw new SupabaseError(friendly, { status: res.status, reason: body?.hint || '', code: body?.code || '' });
  }
  return body;
}

/** Read a public view, e.g. select('storefront_products', 'order=popularity.desc'). */
export function select(view, query = '', init = {}) {
  return request(`${encodeURIComponent(view)}?select=*${query ? `&${query}` : ''}`, init);
}

/** Call a public database function, e.g. rpc('track_order', { p_order_id, p_phone }). */
export function rpc(fn, args = {}) {
  return request(`rpc/${encodeURIComponent(fn)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}

/* ── Convenience wrappers matching the storefront's services ──── */
// Fetched once per page load (config.js starts it early, catalog.js reuses it).
let catalogRequest = null;
export const fetchCatalog = () => {
  catalogRequest ||= Promise.all([
    select('storefront_products'),
    select('storefront_categories'),
    select('storefront_brands'),
  ]).then(([products, categories, brands]) => ({ products, categories, brands }));
  catalogRequest.catch(() => { catalogRequest = null; });
  return catalogRequest;
};
export const fetchSettings = async (init) => (await select('storefront_settings', '', init))[0] || null;
export const fetchDeliveryZones = (init) => select('storefront_delivery_zones', '', init);
export const checkPromo = (code, subtotalCents) => rpc('check_promo', { p_code: code, p_subtotal_cents: subtotalCents });
export const placeOrder = (order) => rpc('place_order', { p_order: order });
export const trackOrder = (orderId, phone) => rpc('track_order', { p_order_id: orderId, p_phone: phone });
