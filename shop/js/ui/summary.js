/* Order summary rows shared by the cart and checkout pages, so both
   always show identical totals from services/pricing.js. */

import { CONFIG } from '../config.js';
import { esc } from '../lib/dom.js';
import { formatCents, formatPrice } from '../lib/money.js';

export function shipProgressHtml(t) {
  if (t.itemCount === 0) return '';
  const pct = Math.round(t.freeDeliveryProgress * 100);
  const msg = t.freeDeliveryRemaining > 0
    ? `Add <strong>${formatCents(t.freeDeliveryRemaining)}</strong> more for free delivery.`
    : '<strong>You’ve unlocked free delivery.</strong>';
  return `<div class="ship-progress" aria-live="polite">${msg}
    <div class="ship-progress__bar" role="progressbar" aria-label="Progress to free delivery" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
  </div>`;
}

export function totalsHtml(t, { deliveryPending = 'Calculated at checkout' } = {}) {
  let delivery;
  if (t.delivery === 0 && t.itemCount) delivery = 'Free';
  else if (t.delivery == null) delivery = `<span class="muted" style="font-weight:500">${esc(deliveryPending)}</span>`;
  else delivery = formatCents(t.delivery);

  return `<dl class="summary__rows">
    <div class="summary__row"><dt>Subtotal (${t.itemCount} item${t.itemCount === 1 ? '' : 's'})</dt><dd>${formatCents(t.subtotal)}</dd></div>
    ${t.discount ? `<div class="summary__row summary__row--discount"><dt>Discount · ${esc(t.promo.code)}</dt><dd>−${formatCents(t.discount)}</dd></div>` : ''}
    <div class="summary__row"><dt>Delivery${t.zone ? ` · ${esc(t.zone.name)}` : ''}</dt><dd>${delivery}</dd></div>
  </dl>
  <div class="summary__total"><span>${t.delivery == null ? 'Estimated total' : 'Total'}</span><span data-total>${formatCents(t.total)}</span></div>
  <p class="summary__note">Prices in ${esc(CONFIG.currency.code)}, VAT included. Free delivery over ${formatPrice(CONFIG.delivery.freeThreshold)}.</p>`;
}

export function promoHtml(t, code, error = '') {
  if (t.promo) {
    return `<div class="promo-applied"><span><strong>${esc(t.promo.code)}</strong> · ${esc(t.promo.label)}</span>
      <button type="button" class="btn btn--link" data-promo-remove>Remove</button></div>`;
  }
  return `<form class="promo" data-promo-form novalidate>
      <label class="sr-only" for="promo-code">Promo code</label>
      <input id="promo-code" name="code" placeholder="Promo code" autocomplete="off" maxlength="20" value="${esc(code || '')}" aria-describedby="promo-err"${error || t.promoError ? ' aria-invalid="true"' : ''}>
      <button type="submit" class="btn btn--light btn--sm" style="--h:44px">Apply</button>
    </form>
    <p class="field__error" id="promo-err" role="alert">${esc(error || t.promoError || '')}</p>`;
}
