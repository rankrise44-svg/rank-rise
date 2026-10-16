import { CONFIG } from '../config.js';
import { $, esc, icon } from '../lib/dom.js';
import { formatCents, formatPrice } from '../lib/money.js';
import { initLayout } from '../ui/layout.js';
import { productUrl } from '../ui/product-card.js';
import { emptyState } from '../ui/empty.js';
import { totalsHtml, shipProgressHtml, promoHtml } from '../ui/summary.js';
import { toast } from '../ui/toast.js';
import * as cart from '../services/cart.js';

await initLayout();
const root = $('[data-cart-root]');
const sub = $('[data-cart-sub]');
let items = [];
let pendingCode = '';
let promoError = '';

function lineHtml({ product: p, qty, lineTotal }) {
  const max = Math.min(p.stock, CONFIG.limits.maxQtyPerLine);
  return `<li class="line" data-line="${esc(p.id)}">
    <a class="line__img" href="${productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${esc(p.images[0])}" alt="" width="200" height="200"></a>
    <div class="line__info">
      <a class="line__name" href="${productUrl(p)}">${esc(p.name)}</a>
      <span class="line__unit">${formatPrice(p.price)} each</span>
      ${p.stock <= 5 ? `<span class="line__note">Only ${p.stock} left in stock</span>` : ''}
      <div class="line__controls">
        <div class="qty qty--sm">
          <button type="button" data-qty-step="-1" data-id="${esc(p.id)}" data-focus="dec-${esc(p.id)}" aria-label="Decrease quantity of ${esc(p.name)}">${icon(qty <= 1 ? 'trash' : 'minus', { size: 15 })}</button>
          <label class="sr-only" for="qty-${esc(p.id)}">Quantity of ${esc(p.name)}</label>
          <input id="qty-${esc(p.id)}" type="number" inputmode="numeric" min="1" max="${max}" value="${qty}" data-qty-input data-id="${esc(p.id)}" data-focus="in-${esc(p.id)}">
          <button type="button" data-qty-step="1" data-id="${esc(p.id)}" data-focus="inc-${esc(p.id)}" aria-label="Increase quantity of ${esc(p.name)}" ${qty >= max ? 'disabled' : ''}>${icon('plus', { size: 15 })}</button>
        </div>
        <button type="button" class="line__remove" data-remove="${esc(p.id)}">${icon('trash', { size: 15 })}Remove</button>
      </div>
    </div>
    <div class="line__total" aria-label="Line total">${formatCents(lineTotal)}</div>
  </li>`;
}

async function render() {
  const focusKey = document.activeElement?.dataset?.focus;
  const { items: resolved, totals, adjusted } = await cart.resolve();
  items = resolved;
  root.removeAttribute('aria-busy');

  if (!items.length) {
    sub.textContent = '';
    root.innerHTML = emptyState({
      iconName: 'bag',
      title: 'Your cart is empty',
      text: 'Browse the shop and add a few essentials — they’ll wait for you here.',
      cta: { label: 'Start shopping', href: 'shop.html' },
      links: [{ label: 'View wishlist', href: 'wishlist.html' }],
    });
    return;
  }

  sub.textContent = `${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'} · Delivery across Lebanon`;
  root.innerHTML = `<div class="cart">
    <section aria-label="Cart items">
      ${adjusted ? '<div class="alert alert--info" style="margin-bottom:16px">Some quantities were updated to match current stock.</div>' : ''}
      <ul class="lines">${items.map(lineHtml).join('')}</ul>
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px">
        <a class="btn btn--light" href="shop.html">Continue shopping</a>
        <button type="button" class="btn btn--link" data-clear-cart>Empty cart</button>
      </div>
    </section>
    <aside class="summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Order summary</h2>
      ${shipProgressHtml(totals)}
      ${promoHtml(totals, pendingCode || cart.getPromo(), promoError)}
      ${totalsHtml(totals)}
      <a class="btn btn--dark btn--lg btn--block" href="checkout.html">Checkout · ${formatCents(totals.total)}</a>
      <p class="summary__note" style="text-align:center">Cash on delivery · No account needed</p>
    </aside>
  </div>`;

  if (focusKey) root.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`)?.focus();
}

const productOf = (id) => items.find((i) => i.product.id === id)?.product;

root.addEventListener('click', (e) => {
  const step = e.target.closest('[data-qty-step]');
  if (step) {
    const p = productOf(step.dataset.id);
    if (!p) return;
    const next = cart.qtyOf(p.id) + Number(step.dataset.qtyStep);
    if (next <= 0) {
      cart.remove(p.id);
      toast(`Removed ${p.name} from your cart`);
    } else {
      cart.setQty(p, next);
    }
    return;
  }
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    const p = productOf(rm.dataset.remove);
    cart.remove(rm.dataset.remove);
    if (p) toast(`Removed ${p.name} from your cart`);
    return;
  }
  if (e.target.closest('[data-clear-cart]')) {
    if (window.confirm('Remove all items from your cart?')) {
      cart.clear();
      toast('Your cart is now empty');
    }
    return;
  }
  if (e.target.closest('[data-promo-remove]')) {
    pendingCode = '';
    promoError = '';
    cart.setPromo('');
  }
});

root.addEventListener('change', (e) => {
  const input = e.target.closest('[data-qty-input]');
  if (!input) return;
  const p = productOf(input.dataset.id);
  if (!p) return;
  const want = Math.floor(Number(input.value));
  if (!Number.isFinite(want) || want < 1) {
    input.value = cart.qtyOf(p.id);
    return;
  }
  const got = cart.setQty(p, want);
  if (got < want) toast(`Only ${got} available for ${p.name}`, { tone: 'error' });
});

root.addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-promo-form]');
  if (!form) return;
  e.preventDefault();
  const code = form.code.value.trim();
  pendingCode = code;
  promoError = code ? '' : 'Enter a promo code.';
  if (!code) { await render(); $('#promo-code')?.focus(); return; }
  const res = await cart.tryPromo(code);
  if (res.ok) {
    pendingCode = '';
    toast(`Code ${res.promo.code} applied`);
  } else {
    promoError = res.error;
    await render();
    $('#promo-code')?.focus();
  }
});

cart.subscribe(render);
render();
