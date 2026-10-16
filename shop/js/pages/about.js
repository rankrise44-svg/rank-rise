import { CONFIG } from '../config.js';
import { $, esc, icon } from '../lib/dom.js';
import { formatPrice } from '../lib/money.js';
import { initLayout } from '../ui/layout.js';
import { valueStrip, featureItems } from '../ui/values.js';
import { greetingLink } from '../lib/whatsapp.js';
import * as payments from '../services/payments.js';

await initLayout();

$('[data-about-values]').innerHTML = featureItems(valueStrip(), 'value');
$('[data-free-threshold]').textContent = formatPrice(CONFIG.delivery.freeThreshold);
$('[data-delivery-rows]').innerHTML = CONFIG.delivery.zones.map((z) =>
  `<tr><td>${esc(z.name)}</td><td class="tabular">${formatPrice(z.fee)}</td><td>${esc(z.eta)}</td></tr>`).join('');

const ICONS = { cod: 'cash', whatsapp: 'whatsapp' };
$('[data-pay-list]').innerHTML = payments.availableMethods().map((m) => `
  <li>${icon(ICONS[m.id] || 'cash', { size: 22 })}
    <div><strong>${esc(m.name)}</strong><p>${esc(m.description)}</p></div>
  </li>`).join('');
$('[data-pay-mode]').innerHTML = `Questions before ordering? <a class="link" href="${esc(greetingLink())}" target="_blank" rel="noopener">Chat with us on WhatsApp</a> at ${esc(CONFIG.store.whatsapp)}.`;
