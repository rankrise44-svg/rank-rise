/* ═══════════════════════════════════════════════════════════════
   Supabase connection for the admin panel
   ───────────────────────────────────────────────────────────────
   Same project and PUBLIC key as the store (../../js/supabase.config.js).
   What an admin can do comes from their login: the database's
   row-level security only lets accounts listed in admin_users in.
   No secret key is ever used or stored here.
   ═══════════════════════════════════════════════════════════════ */
import { SUPABASE, isSupabaseConfigured } from '../../js/supabase.config.js';

export const configured = isSupabaseConfigured() && typeof window.supabase?.createClient === 'function';

// Invite / password-reset links arrive as #access_token=…&type=recovery|invite.
// Read the type before the client consumes the link.
const authHash = new URLSearchParams(location.hash.startsWith('#access_token') || location.hash.includes('type=') ? location.hash.slice(1) : '');
export const linkType = authHash.get('type') || '';
export const linkError = authHash.get('error_description') || '';

export const sb = configured
  ? window.supabase.createClient(SUPABASE.url, SUPABASE.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'cedarline-admin-auth' },
  })
  : null;

export const BUCKET = 'product-images';
export const publicUrl = (path) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/** Turn database errors into sentences a shop owner can act on. */
export function friendly(error) {
  if (!error) return new Error('Something went wrong.');
  const code = error.code || '';
  const msg = String(error.message || '');
  let text;
  if (code === 'P0001') text = msg;
  else if (code === '23505') text = 'That already exists — use a different name, code or link.';
  else if (code === '23503') text = msg.includes('delete') || msg.includes('still referenced')
    ? 'It’s still in use (for example by products or orders), so it can’t be deleted. You can hide it instead.'
    : 'That refers to something that doesn’t exist any more. Refresh and try again.';
  else if (code === '23514') text = 'One of the values isn’t allowed. Check the numbers and try again.';
  else if (code === '22P02' || code === '22003') text = 'One of the numbers isn’t valid.';
  else if (code === '42501' || /row-level security|permission denied/i.test(msg)) text = 'Your account isn’t allowed to do that.';
  else if (code === 'PGRST301' || /JWT|token/i.test(msg)) text = 'Your session has expired. Please sign in again.';
  else if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) text = 'Couldn’t reach the database. Check your internet connection.';
  else text = msg || 'Something went wrong. Please try again.';
  const err = new Error(text);
  err.code = code;
  err.reason = error.hint || '';
  return err;
}

/** Await a Supabase query; throw a friendly error, return data. */
export async function q(builder) {
  const { data, error } = await builder;
  if (error) throw friendly(error);
  return data;
}

/** Same, returning { data, count } for queries with { count: 'exact' }. */
export async function qc(builder) {
  const { data, error, count } = await builder;
  if (error) throw friendly(error);
  return { data, count };
}

export const rpc = (fn, args) => q(sb.rpc(fn, args));

/** Sign out; if the server can't be reached, still forget the login on this device. */
export async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) {
    try { localStorage.removeItem('cedarline-admin-auth'); } catch { /* storage blocked */ }
    location.reload();
  }
}
