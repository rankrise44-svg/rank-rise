/* ═══════════════════════════════════════════════════════════════
   ACCOUNT SERVICE (demo)
   ───────────────────────────────────────────────────────────────
   A browser-only stand-in for customer accounts so the UI (sign in,
   register, profile, order history, checkout prefill) can be built
   and tested now. Passwords are checked for shape and then DISCARDED
   — nothing secret is ever written to storage.

   Going live: replace signIn/register/signOut with calls to your
   auth backend (or Shopify customer accounts) and keep the same
   return shape { name, email, phone }.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import * as storage from '../lib/storage.js';

const KEY = CONFIG.storageKeys.account;
const listeners = new Set();

const sanitize = (a) => (a && typeof a.email === 'string' ? { name: String(a.name || ''), email: a.email, phone: String(a.phone || ''), since: a.since || null } : null);
let account = sanitize(storage.read(KEY, null));

function emit() { for (const fn of listeners) fn(account); }
storage.onExternalChange(KEY, () => { account = sanitize(storage.read(KEY, null)); emit(); });

export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const current = () => account;

function save(next) {
  account = next;
  if (next) storage.write(KEY, next); else storage.remove(KEY);
  emit();
  return account;
}

export async function signIn({ email }) {
  await new Promise((r) => setTimeout(r, 400));
  const existing = sanitize(storage.read(`${KEY}:profile:${email.toLowerCase()}`, null));
  return save(existing || { name: email.split('@')[0], email: email.toLowerCase(), phone: '', since: new Date().toISOString() });
}

export async function register({ name, email, phone }) {
  await new Promise((r) => setTimeout(r, 400));
  const profile = { name: name.trim(), email: email.trim().toLowerCase(), phone: phone || '', since: new Date().toISOString() };
  storage.write(`${KEY}:profile:${profile.email}`, profile);
  return save(profile);
}

export function updateProfile(patch) {
  if (!account) return null;
  const next = { ...account, ...patch };
  storage.write(`${KEY}:profile:${next.email}`, next);
  return save(next);
}

export const signOut = () => save(null);
