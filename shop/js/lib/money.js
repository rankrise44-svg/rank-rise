/* Money helpers. All arithmetic is done in integer cents to avoid
   floating-point drift (0.1 + 0.2); values are converted back only
   for display. */

import { CONFIG } from '../config.js';

export const toCents = (amount) => Math.round(Number(amount || 0) * 100);
export const fromCents = (cents) => cents / 100;

const formatter = new Intl.NumberFormat(CONFIG.currency.locale, {
  style: 'currency',
  currency: CONFIG.currency.code,
  minimumFractionDigits: 2,
});

/** Format a value in cents, e.g. 3400 → "$34.00". */
export const formatCents = (cents) => formatter.format(fromCents(cents));

/** Format a catalog price (in currency units), e.g. 34 → "$34.00". */
export const formatPrice = (amount) => formatCents(toCents(amount));
