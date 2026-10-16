/* Card-number helpers for the checkout form. These only shape and
   sanity-check input; the payment gateway is the real authority.
   Card details are never stored — orders keep brand + last 4 only. */

export const digits = (v) => String(v ?? '').replace(/\D/g, '');

/** Luhn checksum — catches most typos before the gateway call. */
export function luhn(num) {
  const d = digits(num);
  if (d.length < 12) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

export function brandOf(num) {
  const d = digits(num);
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d)) return 'mastercard';
  return '';
}

export const BRAND_NAMES = { visa: 'Visa', mastercard: 'Mastercard' };

/** "4242424242424242" → "4242 4242 4242 4242" (max 19 digits). */
export const formatNumber = (v) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

/** "1228" → "12 / 28" */
export function formatExpiry(v) {
  const d = digits(v).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) return `0${d} / `;
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

export function parseExpiry(v) {
  const d = digits(v);
  if (d.length !== 4) return null;
  const month = Number(d.slice(0, 2));
  const year = 2000 + Number(d.slice(2));
  return month >= 1 && month <= 12 ? { month, year } : null;
}

/* Validation rules in the shape lib/validate.js expects. */
export const cardRules = {
  number: (v) => {
    const d = digits(v);
    if (!d) return 'Card number is required.';
    if (!brandOf(d)) return 'We accept Visa and Mastercard.';
    if (d.length !== 16 || !luhn(d)) return 'Check the card number — it doesn’t look right.';
    return '';
  },
  expiry: (v, now = new Date()) => {
    if (!digits(v)) return 'Expiry date is required.';
    const e = parseExpiry(v);
    if (!e) return 'Use the format MM / YY.';
    const endOfMonth = new Date(e.year, e.month, 1);
    if (endOfMonth <= now) return 'This card has expired.';
    if (e.year > now.getFullYear() + 20) return 'Check the expiry year.';
    return '';
  },
  cvc: (v) => (/^\d{3}$/.test(digits(v)) && digits(v).length === String(v).trim().length ? '' : 'Enter the 3-digit code on the back.'),
  holder: (v) => (String(v ?? '').trim().length >= 3 ? '' : 'Enter the name shown on the card.'),
};
