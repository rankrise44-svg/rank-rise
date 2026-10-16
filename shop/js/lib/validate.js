/* Form validation. Rules are plain functions that return an error
   message or '' — the same rules can run server-side later. */

export const rules = {
  required: (label) => (v) => (String(v ?? '').trim() ? '' : `${label} is required.`),

  minLength: (n, label) => (v) =>
    String(v ?? '').trim().length >= n ? '' : `${label} must be at least ${n} characters.`,

  maxLength: (n, label) => (v) =>
    String(v ?? '').trim().length <= n ? '' : `${label} must be ${n} characters or fewer.`,

  email: (v) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? '' : 'Enter a valid email address, e.g. name@example.com.';
  },

  lebanesePhone: (v) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    return normalizeLebanesePhone(s) ? '' : 'Enter a Lebanese number, e.g. 03 123 456 or +961 71 123 456.';
  },

  name: (v) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    return /^[\p{L}\p{M}' .-]{2,}$/u.test(s) ? '' : 'Use letters only (Arabic or Latin).';
  },
};

/**
 * Normalise a Lebanese phone number to E.164 (+961…), or return null.
 * Accepts +961 / 00961 / a leading 0, spaces, dashes and brackets.
 *   Mobile:   03 + 6 digits, or 70 71 76 78 79 81 + 6 digits
 *   Landline: 01 04 05 06 07 08 09 + 6 digits
 */
export function normalizeLebanesePhone(input) {
  let d = String(input).replace(/[\s\-().]/g, '');
  if (d.startsWith('+961')) d = d.slice(4);
  else if (d.startsWith('00961')) d = d.slice(5);
  else if (d.startsWith('961') && d.length >= 10) d = d.slice(3);
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith('0')) d = d.slice(1);
  const ok = /^3\d{6}$/.test(d) || /^(70|71|76|78|79|81)\d{6}$/.test(d) || /^[1456789]\d{6}$/.test(d);
  return ok ? `+961${d}` : null;
}

/** Run a list of rules, return the first error message or ''. */
export function check(value, ruleList) {
  for (const rule of ruleList) {
    const msg = rule(value);
    if (msg) return msg;
  }
  return '';
}

/**
 * Wire inline validation onto a form.
 *   schema: { fieldName: [rule, rule, …] }
 * Validates on blur, re-validates on input once a field has been
 * touched, and returns { validate() → boolean, values() → object }.
 */
export function bindForm(form, schema) {
  const touched = new Set();

  const fieldEl = (name) => form.elements.namedItem(name);
  const errorEl = (name) => form.querySelector(`[data-error-for="${name}"]`);

  function show(name, msg) {
    const el = fieldEl(name);
    const err = errorEl(name);
    if (!el) return;
    const target = el instanceof RadioNodeList ? el[0] : el;
    const wrap = target.closest('.field');
    if (msg) {
      target.setAttribute('aria-invalid', 'true');
      wrap?.classList.add('has-error');
    } else {
      target.removeAttribute('aria-invalid');
      wrap?.classList.remove('has-error');
    }
    if (err) err.textContent = msg;
  }

  function validateField(name) {
    const el = fieldEl(name);
    const value = el?.type === 'checkbox' ? (el.checked ? 'yes' : '') : el?.value;
    const msg = check(value, schema[name]);
    show(name, msg);
    return msg;
  }

  for (const name of Object.keys(schema)) {
    const el = fieldEl(name);
    if (!el || el instanceof RadioNodeList) continue;
    el.addEventListener('blur', () => { touched.add(name); validateField(name); });
    el.addEventListener('input', () => { if (touched.has(name)) validateField(name); });
    el.addEventListener('change', () => { if (touched.has(name)) validateField(name); });
  }

  return {
    validate() {
      let firstInvalid = null;
      for (const name of Object.keys(schema)) {
        touched.add(name);
        if (validateField(name) && !firstInvalid) firstInvalid = name;
      }
      if (firstInvalid) {
        const el = fieldEl(firstInvalid);
        (el instanceof RadioNodeList ? el[0] : el)?.focus();
      }
      return !firstInvalid;
    },
    values() {
      return Object.fromEntries(new FormData(form).entries());
    },
  };
}
