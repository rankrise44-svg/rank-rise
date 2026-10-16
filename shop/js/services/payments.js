/* ═══════════════════════════════════════════════════════════════
   PAYMENTS — provider registry
   ───────────────────────────────────────────────────────────────
   Each method in CONFIG.payments maps to a provider here with one
   job: take a created order and return a payment result.

   Today only cash on delivery is live. To add online payment for
   Lebanon, implement a provider that:
     1. asks YOUR server to create a payment session with the
        acquiring bank / gateway (never put gateway secrets here),
     2. redirects to the hosted payment page (or opens its widget),
     3. lets the server confirm the result via the gateway webhook
        before the order is marked paid.
   Then set `enabled: true` for that method in config.js.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';

const providers = {
  cod: {
    async pay(order) {
      // Nothing to charge now — the courier collects on delivery.
      return { status: 'pending', method: 'cod', message: 'Pay the courier when your order arrives.', orderId: order.id };
    },
  },

  card: {
    async pay() {
      // Example shape once a backend exists:
      //   const { redirectUrl } = await fetch(`${CONFIG.api.baseUrl}/payments/session`,
      //     { method: 'POST', body: JSON.stringify({ orderId: order.id }) }).then(r => r.json());
      //   window.location.assign(redirectUrl);
      throw new Error('Card payments are not available yet.');
    },
  },

  wallet: {
    async pay() {
      throw new Error('Wallet payments are not available yet.');
    },
  },
};

export function availableMethods() {
  return CONFIG.payments;
}

export function isEnabled(methodId) {
  return CONFIG.payments.some((m) => m.id === methodId && m.enabled);
}

export async function pay(methodId, order) {
  if (!isEnabled(methodId) || !providers[methodId]) {
    throw new Error('That payment method isn’t available.');
  }
  return providers[methodId].pay(order);
}
