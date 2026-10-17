/* ═══════════════════════════════════════════════════════════════
   ADD-TO-CART FLIGHT
   ───────────────────────────────────────────────────────────────
   A small copy of the product image glides from the product to the
   header cart icon, then the icon gives a short "added" nod.

   Purely visual and fully separate from the cart logic: the existing
   [data-add-to-cart] handler (ui/layout.js) still does the adding.
   This module only
     1. notes which button was clicked and that product's quantity
        before the click (capture phase, so it runs first), and
     2. starts the flight when the cart reports that quantity went up,
   so nothing flies when the add was refused (sold out / at the limit)
   and the add itself is never delayed. Reduced motion: no flight,
   just a quiet highlight on the cart icon.
   ═══════════════════════════════════════════════════════════════ */

import * as cart from '../services/cart.js';
import { getProduct } from '../services/catalog.js';

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let pending = null;

/** The cart icon currently on screen (desktop or mobile header), or null. */
function cartTarget() {
  for (const el of document.querySelectorAll('[data-cart-link] .tool__icon')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && r.bottom > 0 && r.top < window.innerHeight) return el;
  }
  return null;
}

/** The image of the product that was added: its card, the product page gallery, or any image near the button. */
function sourceImage(btn) {
  const scope = btn.closest('.pcard, .pdp, [data-product-id]') || btn.parentElement;
  const img = scope?.querySelector('.pcard__img img, [data-gallery-main], img');
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

function confirmAt(target) {
  if (!target) return;
  target.classList.remove('is-added-bump');
  void target.offsetWidth; // restart the animation on quick repeat adds
  target.classList.add('is-added-bump');
  const tick = document.createElement('span');
  tick.className = 'cart-tick';
  tick.setAttribute('aria-hidden', 'true'); // the existing toast already announces the add
  tick.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  target.appendChild(tick);
  setTimeout(() => { tick.remove(); target.classList.remove('is-added-bump'); }, 1100);
}

async function fly(btn, productId) {
  const target = cartTarget();
  if (prefersReduced() || !target || typeof document.body.animate !== 'function') { confirmAt(target); return; }

  const img = sourceImage(btn);
  const from = (img || btn).getBoundingClientRect();
  if (!from.width) { confirmAt(target); return; }
  const to = target.getBoundingClientRect();

  // Thumbnail: the real image when it's on the page, else the product's own photo, else a plain silver chip.
  const size = Math.max(44, Math.min(96, Math.min(from.width, from.height) * 0.6));
  const thumb = document.createElement('div');
  thumb.className = 'fly-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  let src = img?.currentSrc || img?.src || '';
  if (!src) { try { src = (await getProduct(productId))?.images?.[0] || ''; } catch { src = ''; } }
  if (src) {
    const pic = new Image();
    pic.alt = '';
    pic.src = src;
    thumb.appendChild(pic);
  } else {
    thumb.classList.add('fly-thumb--plain');
  }
  const x0 = from.left + from.width / 2 - size / 2;
  const y0 = from.top + from.height / 2 - size / 2;
  Object.assign(thumb.style, { width: `${size}px`, height: `${size}px`, left: `${x0}px`, top: `${y0}px` });
  document.body.appendChild(thumb);

  const dx = to.left + to.width / 2 - (x0 + size / 2);
  const dy = to.top + to.height / 2 - (y0 + size / 2);
  const lift = Math.min(120, Math.max(40, Math.abs(dx) * 0.18)); // a gentle arc
  const end = 22 / size;
  const anim = thumb.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${(1 + end) / 2})`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: 0.35 },
  ], { duration: 720, easing: 'cubic-bezier(.45, .05, .35, 1)', fill: 'forwards' });
  const done = () => { thumb.remove(); confirmAt(target); };
  anim.onfinish = done;
  anim.oncancel = () => thumb.remove();
}

export function initFlyToCart() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-add-to-cart]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.addToCart;
    pending = { id, before: cart.qtyOf(id), btn, at: performance.now() };
  }, true);

  cart.subscribe(() => {
    const p = pending;
    if (!p || performance.now() - p.at > 4000) return;
    if (cart.qtyOf(p.id) <= p.before) return;
    pending = null;
    fly(p.btn, p.id).catch(() => {});
  });
}
