/* ═══════════════════════════════════════════════════════════════
   Tiny Supabase client for the storefront (no dependencies)
   ───────────────────────────────────────────────────────────────
   Talks to Supabase's REST API with the public anon key. It can
   only do what the database allows shoppers to do:
     • read the storefront_* views
     • call check_promo, place_order and track_order
   Not imported by any page yet.

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
    Authorization: `Bearer ${SUPABASE.anonKey}`,
    Accept: 'application/json',
    ...extra,
  };
}

async function request(path, init = {}) {
  if (!isSupabaseConfigured()) throw new SupabaseError('Supabase is not configured.', { reason: 'not_configured' });
  let res;
  try {
    res = await fetch(`${SUPABASE.url.replace(/\/+$/, '')}/rest/v1/${path}`, { ...init, headers: headers(init.headers) });
  } catch {
    throw new SupabaseError('We couldn’t reach the store. Check your connection and try again.', { reason: 'network' });
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
export function select(view, query = '') {
  return request(`${encodeURIComponent(view)}?select=*${query ? `&${query}` : ''}`);
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
export const fetchCatalog = async () => {
  const [products, categories, brands] = await Promise.all([
    select('storefront_products'),
    select('storefront_categories'),
    select('storefront_brands'),
  ]);
  return { products, categories, brands };
};
export const fetchSettings = async () => (await select('storefront_settings'))[0] || null;
export const fetchDeliveryZones = () => select('storefront_delivery_zones');
export const checkPromo = (code, subtotalCents) => rpc('check_promo', { p_code: code, p_subtotal_cents: subtotalCents });
export const placeOrder = (order) => rpc('place_order', { p_order: order });
export const trackOrder = (orderId, phone) => rpc('track_order', { p_order_id: orderId, p_phone: phone });
