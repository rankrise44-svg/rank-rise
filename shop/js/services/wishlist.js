/* Wishlist store — a persisted list of product ids. When accounts
   arrive, sync this list to the user's profile on sign-in. */

import { CONFIG } from '../config.js';
import * as storage from '../lib/storage.js';
import { getProductMap } from './catalog.js';

const KEY = CONFIG.storageKeys.wishlist;
const listeners = new Set();

const sanitize = (raw) => (Array.isArray(raw) ? [...new Set(raw.filter((x) => typeof x === 'string'))] : []);
let ids = sanitize(storage.read(KEY, []));

function persist() {
  storage.write(KEY, ids);
  for (const fn of listeners) fn(ids);
}

storage.onExternalChange(KEY, () => {
  ids = sanitize(storage.read(KEY, []));
  for (const fn of listeners) fn(ids);
});

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const has = (id) => ids.includes(id);
export const count = () => ids.length;

/** Toggle a product; returns true if it is now saved. */
export function toggle(id) {
  if (has(id)) ids = ids.filter((x) => x !== id);
  else ids = [id, ...ids];
  persist();
  return has(id);
}

export function remove(id) {
  ids = ids.filter((x) => x !== id);
  persist();
}

export function clear() {
  ids = [];
  persist();
}

export async function resolve() {
  const map = await getProductMap();
  return ids.map((id) => map.get(id)).filter(Boolean);
}
