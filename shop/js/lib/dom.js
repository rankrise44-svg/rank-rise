/* Small DOM helpers shared by every page. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape text before interpolating it into HTML. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function params() {
  return new URLSearchParams(window.location.search);
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function setTitle(title) {
  document.title = title ? `${title} — Cedarline` : 'Cedarline — Home Essentials';
}

export function setDescription(text) {
  const meta = document.querySelector('meta[name="description"]');
  if (meta && text) meta.setAttribute('content', text);
}

/** Inline SVG icons (stroke-based, 24px grid). */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  return: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chat: '<path d="M4 5h16v11H8l-4 4z"/>',
  pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20a3 3 0 0 1-3 2h-2"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3"/><circle cx="16" cy="13.5" r="1.3"/>',
  package: '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
  home: '<path d="m4 11 8-7 8 7v9h-5v-6H9v6H4z"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  fire: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.4 2 1.5 3 2.5 3.5C11 8 12 5 15 3c0 3 4 5.5 4 10.5C19 18.3 16 21 12 21z"/>',
};

export function icon(name, { size = 20, cls = '' } = {}) {
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

/**
 * Two-step confirmation on a button, for destructive actions:
 * the first click arms it ("Tap again to confirm"), the second
 * within 4 seconds returns true. Avoids window.confirm(), which
 * embedded browsers and webviews often block.
 */
export function confirmClick(btn, prompt = 'Tap again to confirm') {
  if (btn.dataset.armed === '1') {
    clearTimeout(Number(btn.dataset.armTimer));
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    return true;
  }
  btn.dataset.label = btn.textContent;
  btn.dataset.armed = '1';
  btn.textContent = prompt;
  btn.dataset.armTimer = String(setTimeout(() => {
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
  }, 4000));
  return false;
}
