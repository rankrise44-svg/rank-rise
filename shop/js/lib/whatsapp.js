/* WhatsApp click-to-chat links (https://wa.me/<number>?text=…).
   The number comes from CONFIG.store.whatsapp. */

import { CONFIG } from '../config.js';
import { formatCents, formatPrice } from './money.js';

/** "+961 70 991 555" → "96170991555" (wa.me wants digits only). */
export const waNumber = () => String(CONFIG.store.whatsapp).replace(/\D/g, '');

export const waLink = (text = '') =>
  `https://wa.me/${waNumber()}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const greetingLink = () => waLink(`Hello ${CONFIG.store.name}, I have a question.`);

export const productLink = (p, url = location.href) =>
  waLink(`Hello ${CONFIG.store.name}, I'd like to order:\n• ${p.name} — ${formatPrice(p.price)}\n${url}\n\nIs it available?`);

/** The message sent for an "Order via WhatsApp" checkout. */
export function orderMessage(order) {
  const t = order.totals;
  const a = order.address || {};
  const lines = [
    `Hello ${CONFIG.store.name}, I'd like to place an order.`,
    '',
    `Order: ${order.id}`,
    ...order.items.map((i) => `• ${i.qty} × ${i.name} — ${formatCents(i.unitPrice * i.qty)}`),
    '',
    `Subtotal: ${formatCents(t.subtotal)}`,
    ...(t.discount ? [`Discount${t.promoCode ? ` (${t.promoCode})` : ''}: −${formatCents(t.discount)}`] : []),
    `Delivery: ${a.zoneId ? (t.delivery ? formatCents(t.delivery) : 'Free') : 'to confirm'}`,
    `Total: ${formatCents(t.total)}${a.zoneId ? '' : ' + delivery'}`,
    '',
    `Name: ${order.customer.fullName}`,
    `Phone: ${order.customer.phone}`,
    ...([a.city, a.zoneName].some(Boolean) ? [`Area: ${[a.street, a.building, a.city, a.zoneName].filter(Boolean).join(', ')}`] : []),
    ...(a.notes ? [`Notes: ${a.notes}`] : []),
  ];
  return lines.join('\n');
}
