import { CONFIG } from '../config.js';
import { $, esc, icon } from '../lib/dom.js';
import { formatPrice } from '../lib/money.js';
import { initLayout } from '../ui/layout.js';
import { valueStrip, featureItems } from '../ui/values.js';
import { payMark, METHOD_MARKS } from '../ui/payment-badges.js';
import * as payments from '../services/payments.js';

await initLayout();

$('[data-about-values]').innerHTML = featureItems(valueStrip(), 'value');
$('[data-free-threshold]').textContent = formatPrice(CONFIG.delivery.freeThreshold);
$('[data-delivery-rows]').innerHTML = CONFIG.delivery.zones.map((z) =>
  `<tr><td>${esc(z.name)}</td><td class="tabular">${formatPrice(z.fee)}</td><td>${esc(z.eta)}</td></tr>`).join('');

const ICONS = { cod: 'cash', card: 'card', wallet: 'wallet' };
$('[data-pay-list]').innerHTML = payments.availableMethods().map((m) => `
  <li>${icon(ICONS[m.kind], { size: 22 })}
    <div><strong>${esc(m.name)}${m.available ? '' : ' · coming soon'}</strong><p>${esc(m.description)}</p></div>
    <span class="pay-marks" aria-hidden="true">${(METHOD_MARKS[m.id] || []).map(payMark).join('')}</span>
  </li>`).join('');
$('[data-pay-mode]').textContent = payments.isDemoMode()
  ? 'This is a demo store: every method can be tried at checkout, and no money is taken.'
  : 'Card details are entered on our payment partner’s secure page and never stored by us.';
