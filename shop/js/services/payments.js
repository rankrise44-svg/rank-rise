/* ═══════════════════════════════════════════════════════════════
   ORDERING METHODS
   ───────────────────────────────────────────────────────────────
   Two ways to order, both settled outside the website:

     cod       → the order is confirmed here; the courier collects
                 cash (USD or LBP) on delivery.
     whatsapp  → the order is sent to the store's WhatsApp as a
                 message; the team confirms it in the chat.

   Each method resolves with a result the checkout stores on the
   order. To add an online method later, add it to
   CONFIG.payments.methods and give it a function here.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import { waLink, orderMessage } from '../lib/whatsapp.js';

const methods = {
  async cod(order, { codCurrency = 'USD' } = {}) {
    return {
      status: 'confirmed',
      method: 'cod',
      codCurrency,
      message: codCurrency === 'LBP'
        ? 'Pay the courier in Lebanese pounds at the day’s rate when your order arrives.'
        : 'Pay the courier in US dollars when your order arrives.',
    };
  },

  async whatsapp(order) {
    return {
      status: 'awaiting_whatsapp',
      method: 'whatsapp',
      waUrl: waLink(orderMessage(order)),
      message: 'Send the WhatsApp message to finish — we’ll confirm your order and delivery in the chat.',
    };
  },
};

export const availableMethods = () => CONFIG.payments.methods;
export const getMethod = (id) => CONFIG.payments.methods.find((m) => m.id === id) || null;
export const isEnabled = (id) => !!getMethod(id) && !!methods[id];

export async function pay(methodId, order, details = {}) {
  if (!isEnabled(methodId)) throw new Error('That ordering method isn’t available.');
  return methods[methodId](order, details);
}
