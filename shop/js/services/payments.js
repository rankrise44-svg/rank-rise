/* ═══════════════════════════════════════════════════════════════
   PAYMENTS — provider registry
   ───────────────────────────────────────────────────────────────
   Each method in CONFIG.payments.methods maps to a provider by its
   `kind`. A provider takes an order that already exists (status
   pending_payment) and resolves with a payment result, or throws a
   PaymentError the checkout shows to the shopper.

   Providers never touch the DOM. Steps that need the shopper — the
   3-D Secure code, approving a wallet request — are delegated to the
   `ui` callbacks the checkout page passes in.

   DEMO MODE (CONFIG.payments.mode === 'demo')
     cod     → accepted immediately; pay the courier.
     card    → test cards decide the outcome, then a simulated
               3-D Secure step. No card data leaves the browser.
     wallet  → a simulated "approve in your app" request.

   GOING LIVE — per method, on YOUR server:
     card    → create a payment session with your acquiring bank /
               gateway, redirect to its hosted page (or mount its
               fields), confirm via the gateway webhook. Card numbers
               must never reach your own server or this code.
     wallet  → create a payment request with the wallet provider's
               merchant API, then poll / receive a webhook for approval.
   Then set CONFIG.payments.mode = 'live'.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import { digits, brandOf, BRAND_NAMES } from '../lib/card.js';

export class PaymentError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const isDemo = () => CONFIG.payments.mode === 'demo';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const txId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

const providers = {
  async cod(order, { codCurrency = 'USD' } = {}) {
    return {
      status: 'pending',
      method: 'cod',
      codCurrency,
      message: codCurrency === 'LBP'
        ? 'Pay the courier in Lebanese pounds at the day’s rate when your order arrives.'
        : 'Pay the courier in US dollars when your order arrives.',
    };
  },

  async card(order, details, ui) {
    if (!isDemo()) throw new PaymentError('not_configured', 'Card payments aren’t connected yet. Choose cash on delivery.');
    const number = digits(details.number);
    const t = CONFIG.payments.testCards;
    await ui.processing?.('Contacting your bank…');
    await wait(700);
    if (number === digits(t.declined)) throw new PaymentError('card_declined', 'Your bank declined this card. Try another card or pay cash on delivery.');
    if (number === digits(t.insufficient)) throw new PaymentError('insufficient_funds', 'This card doesn’t have enough funds for this order.');

    // 3-D Secure: the bank asks the shopper for a one-time code.
    const verified = await ui.threeDS({ brand: BRAND_NAMES[brandOf(number)], last4: number.slice(-4), amount: order.totals.total });
    if (!verified) throw new PaymentError('authentication_failed', 'Card verification was cancelled. Your card has not been charged.');
    await ui.processing?.('Confirming payment…');
    await wait(500);
    return {
      status: 'paid',
      method: 'card',
      transactionId: txId('ch'),
      card: { brand: brandOf(number), last4: number.slice(-4) },
      message: `Paid by ${BRAND_NAMES[brandOf(number)]} ending ${number.slice(-4)}.`,
    };
  },

  async wallet(order, details, ui, method) {
    if (!isDemo()) throw new PaymentError('not_configured', `${method.name} isn’t connected yet. Choose cash on delivery.`);
    const outcome = await ui.walletApproval({ provider: method.name, phone: details.walletPhone, amount: order.totals.total });
    if (outcome === 'cancelled') throw new PaymentError('wallet_cancelled', `The ${method.name} request was cancelled. Nothing was charged.`);
    if (outcome === 'timeout') throw new PaymentError('wallet_timeout', `The ${method.name} request expired. Try again or choose another method.`);
    return {
      status: 'paid',
      method: method.id,
      transactionId: txId('wl'),
      wallet: { provider: method.name, phone: details.walletPhone },
      message: `Paid with ${method.name}.`,
    };
  },
};

/** Methods with availability resolved for the current mode. */
export function availableMethods() {
  return CONFIG.payments.methods.map((m) => ({ ...m, available: isDemo() ? m.enabled : m.enabled && m.kind === 'cod' }));
}

export function getMethod(id) {
  return availableMethods().find((m) => m.id === id) || null;
}

export const isEnabled = (id) => !!getMethod(id)?.available;
export const isDemoMode = isDemo;

/**
 * Run payment for a created order.
 * @param {string} methodId
 * @param {object} order     order with id and totals (cents)
 * @param {object} details   method fields: card { number, expiry, cvc, holder } / wallet { walletPhone } / cod { codCurrency }
 * @param {object} ui        { processing(msg), threeDS(info) → bool, walletApproval(info) → 'approved'|'cancelled'|'timeout' }
 */
export async function pay(methodId, order, details = {}, ui = {}) {
  const method = getMethod(methodId);
  if (!method?.available) throw new PaymentError('unavailable', 'That payment method isn’t available.');
  return providers[method.kind](order, details, ui, method);
}
