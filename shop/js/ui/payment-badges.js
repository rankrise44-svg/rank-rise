/* Small payment-method marks for the footer, checkout and cart.
   They are simple text badges — swap in each provider's official
   artwork (from their merchant brand kit) when the method goes live. */

import { icon } from '../lib/dom.js';

const MARKS = {
  cod: `<span class="pay-badge pay-badge--cod">${icon('cash', { size: 14 })}COD</span>`,
  visa: '<span class="pay-badge pay-badge--visa">VISA</span>',
  mastercard: '<span class="pay-badge pay-badge--mc" title="Mastercard"><i></i><i></i><span class="sr-only">Mastercard</span></span>',
  whish: '<span class="pay-badge pay-badge--whish">Whish</span>',
  omt: '<span class="pay-badge pay-badge--omt">OMT Pay</span>',
};

export const payMark = (id) => MARKS[id] || '';

export function paymentBadgesHtml(ids = ['cod', 'visa', 'mastercard', 'whish', 'omt']) {
  return ids.map(payMark).join('');
}

/** Marks shown on each checkout method card. */
export const METHOD_MARKS = {
  cod: ['cod'],
  card: ['visa', 'mastercard'],
  whish: ['whish'],
  omt: ['omt'],
};
