/* Lightweight toast notifications, announced to screen readers. */

import { esc, icon } from '../lib/dom.js';

let region;

function ensureRegion() {
  if (region) return region;
  region = document.createElement('div');
  region.className = 'toasts';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.appendChild(region);
  return region;
}

/**
 * toast('Added to cart', { action: { label: 'View cart', href: 'cart.html' } })
 */
export function toast(message, { action, tone = 'default', timeout = 3600 } = {}) {
  const host = ensureRegion();
  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.innerHTML = `
    <span class="toast__icon">${icon(tone === 'error' ? 'close' : 'check', { size: 16 })}</span>
    <span class="toast__msg">${esc(message)}</span>
    ${action ? `<a class="toast__action" href="${esc(action.href)}">${esc(action.label)}</a>` : ''}
    <button class="toast__close" type="button" aria-label="Dismiss">${icon('close', { size: 16 })}</button>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));

  const close = () => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector('.toast__close').addEventListener('click', close);
  if (timeout) setTimeout(close, timeout);
  // Keep at most three on screen.
  while (host.children.length > 3) host.firstElementChild.remove();
}
