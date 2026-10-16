import { CONFIG } from '../config.js';
import { $, esc } from '../lib/dom.js';
import { formatPrice } from '../lib/money.js';
import { initLayout } from '../ui/layout.js';
import { valuesHtml } from '../ui/values.js';

await initLayout();

$('[data-about-values]').innerHTML = valuesHtml();
$('[data-free-threshold]').textContent = formatPrice(CONFIG.delivery.freeThreshold);
$('[data-delivery-rows]').innerHTML = CONFIG.delivery.zones.map((z) =>
  `<tr><td>${esc(z.name)}</td><td>${formatPrice(z.fee)}</td><td>${esc(z.eta)}</td></tr>`).join('');
