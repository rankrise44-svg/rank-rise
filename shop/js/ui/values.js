/* Store promises, shown on Home and About. Delivery figures come from config. */
import { CONFIG } from '../config.js';
import { esc, icon } from '../lib/dom.js';

export function valuesHtml() {
  const minFee = Math.min(...CONFIG.delivery.zones.map((z) => z.fee));
  const items = [
    { icon: 'truck', title: 'Delivery across Lebanon', text: `All eight governorates from $${minFee}. Free over $${CONFIG.delivery.freeThreshold}.` },
    { icon: 'cash', title: 'Cash on delivery', text: 'Pay the courier in USD or LBP when your order arrives.' },
    { icon: 'return', title: '14-day returns', text: 'Unused items back in original packaging, no fuss.' },
    { icon: 'leaf', title: 'Natural materials', text: 'Wood, glass, stone, linen and cotton — built to last.' },
  ];
  return items.map((v) => `<div class="value">
    <div class="value__icon">${icon(v.icon, { size: 20 })}</div>
    <div><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></div>
  </div>`).join('');
}
