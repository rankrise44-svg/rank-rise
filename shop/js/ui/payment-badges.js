/* Small "how you can order" marks for the footer, cart and product page. */

import { icon } from '../lib/dom.js';

const MARKS = {
  cod: `<span class="pay-badge pay-badge--cod">${icon('cash', { size: 14 })}Cash on delivery</span>`,
  whatsapp: `<span class="pay-badge pay-badge--wa">${icon('whatsapp', { size: 14 })}Order on WhatsApp</span>`,
};

export const payMark = (id) => MARKS[id] || '';

export function paymentBadgesHtml(ids = ['cod', 'whatsapp']) {
  return ids.map(payMark).join('');
}
