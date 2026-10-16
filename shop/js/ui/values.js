/* Store promises: the feature strip under the hero and the dark value
   strip. Delivery figures come from config so they never drift. */
import { CONFIG } from '../config.js';
import { esc, icon } from '../lib/dom.js';

export function heroFeatures() {
  return [
    ['truck', 'Free Delivery', `On orders over $${CONFIG.delivery.freeThreshold}`],
    ['return', 'Easy Returns', '14-day return policy'],
    ['cash', 'Cash on Delivery', 'Pay in USD or LBP'],
    ['whatsapp', 'Order on WhatsApp', 'Chat with us to order'],
  ];
}

export function valueStrip() {
  const minFee = Math.min(...CONFIG.delivery.zones.map((z) => z.fee));
  return [
    ['award', 'Premium Quality', 'Built to last, made to love.'],
    ['tag', 'Fair Prices', 'Honest USD pricing, VAT included.'],
    ['truck', 'Fast Delivery', `All 8 governorates from $${minFee}.`],
    ['headset', 'Real Support', 'A Beirut team that replies.'],
  ];
}

export const featureItems = (items, cls = 'feature') =>
  items.map(([i, title, text]) => `<li class="${cls}">${icon(i, { size: 26 })}<div><strong>${esc(title)}</strong><span>${esc(text)}</span></div></li>`).join('');
