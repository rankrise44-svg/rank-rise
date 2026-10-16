/* Safe localStorage access. Private browsing, blocked storage or a
   corrupted value must never break the store — every call falls back
   to the default and keeps the page working. */

export function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

/* Calls `fn` when another tab changes `key`, so the cart and wishlist
   stay in sync across tabs. */
export function onExternalChange(key, fn) {
  window.addEventListener('storage', (e) => {
    if (e.key === key || e.key === null) fn();
  });
}
