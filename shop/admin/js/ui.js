/* Small UI helpers shared by every admin page. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Money: the database stores integer cents ─────────────────── */
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (cents) => (cents == null ? '—' : usd.format(cents / 100));
/** "12.5" → 1250. Returns null for empty, NaN for invalid. */
export function parseMoney(v) {
  const s = String(v ?? '').trim().replace(/[$,\s]/g, '');
  if (!s) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
export const centsToInput = (c) => (c == null ? '' : (c / 100).toFixed(2));

/* ── Dates (shown in Beirut time) ─────────────────────────────── */
const TZ = 'Asia/Beirut';
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—');
export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return fmtDate(d);
}
/** YYYY-MM-DD for today in Beirut. */
export const beirutToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
export function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Start of a Beirut day as an ISO timestamp (for created_at filters). */
export function beirutDayStart(ymd) {
  // Beirut is UTC+2 or +3; find the offset for that date.
  const probe = new Date(`${ymd}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(probe);
  const off = (parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+2').replace('GMT', '') || '+0';
  const [h, m = '0'] = off.split(':');
  const sign = h.startsWith('-') ? -1 : 1;
  const mins = sign * (Math.abs(parseInt(h, 10)) * 60 + parseInt(m, 10));
  return new Date(Date.parse(`${ymd}T00:00:00Z`) - mins * 60000).toISOString();
}

/* ── Text helpers ─────────────────────────────────────────────── */
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
export const prettyPhone = (e164) => (e164 && e164.startsWith('+961') ? `+961 ${e164.slice(4).replace(/^(\d{1,2})(\d{3})(\d{3})$/, '$1 $2 $3')}` : e164 || '');
export const waNumber = (phone) => String(phone || '').replace(/\D/g, '');
export const waLink = (phone, text = '') => `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
/** Repo images are stored as paths relative to /shop/. */
export const imgSrc = (url) => (!url ? '' : /^(https?:|data:|blob:)/.test(url) ? url : `../${url.replace(/^\/+/, '')}`);
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ── Order statuses ───────────────────────────────────────────── */
export const STATUS = {
  awaiting_whatsapp: 'Awaiting WhatsApp',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
export const FLOW = ['awaiting_whatsapp', 'confirmed', 'packed', 'out_for_delivery', 'delivered'];
export const statusBadge = (s) => `<span class="badge badge--${esc(s)}">${esc(STATUS[s] || s)}</span>`;
export const METHOD = { cod: 'Cash on delivery', whatsapp: 'WhatsApp' };

/* ── Icons (stroke, 18px) ─────────────────────────────────────── */
const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  orders: '<path d="M6 2h12l2 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><path d="M4 6h16M9 11h6M9 15h6"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  tag: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  layers: '<path d="M12 2l10 6-10 6L2 8z"/><path d="M2 16l10 6 10-6"/>',
  stock: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  truck: '<path d="M1 4h14v12H1z"/><path d="M15 9h4l4 4v3h-8"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M1 21a8 8 0 0 1 16 0"/><path d="M17 4a4 4 0 0 1 0 8M23 21a8 8 0 0 0-5-7.4"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  shield: '<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  wa: '<path d="M20.5 3.5A11 11 0 0 0 3.6 17.2L2 22l4.9-1.5A11 11 0 1 0 20.5 3.5z"/><path d="M8.5 8.5c.5 2.5 2.5 5 5 6l1.5-1.5 2 1-1 2c-4 0-8.5-4.5-8.5-8.5l2-1 1 2z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  download: '<path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/>',
  store: '<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
};
export const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

/* ── Toasts ───────────────────────────────────────────────────── */
export function toast(text, { tone = '', html = false, ms = 4200 } = {}) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast${tone ? ` toast--${tone}` : ''}`;
  el.innerHTML = html ? text : esc(text);
  box.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
export const toastError = (err) => toast(err?.message || String(err), { tone: 'err', ms: 6500 });

/* ── Modal dialogs (never the browser's confirm/alert) ────────── */
export function modal({ title, body = '', wide = false, actions = [] }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal__box${wide ? ' modal__box--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__head"><h2 id="modal-title">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('close', 16)}</button></div>
      <div class="modal__body">${body}</div>
      ${actions.length ? `<div class="modal__foot">${actions.map((a, i) => `<button type="button" class="btn ${a.cls || 'btn--outline'}" data-act="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
    </div>`;
    const prev = document.activeElement;
    const close = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) return close(null);
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = actions[Number(b.dataset.act)];
      if (a.onClick) {
        b.classList.add('is-loading');
        try {
          const r = await a.onClick(wrap);
          if (r !== false) close(r ?? a.value ?? true);
        } catch (err) { toastError(err); } finally { b.classList.remove('is-loading'); }
      } else close(a.value ?? true);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    (wrap.querySelector('input, select, textarea') || wrap.querySelector('[data-act]:last-child') || wrap.querySelector('[data-close]'))?.focus();
  });
}
export const confirmDialog = (title, text, { ok = 'Confirm', danger = false } = {}) =>
  modal({ title, body: `<p>${text}</p>`, actions: [{ label: 'Cancel', value: false }, { label: ok, cls: danger ? 'btn--danger-solid' : 'btn--gold', value: true }] })
    .then((v) => v === true);

/* ── Buttons ──────────────────────────────────────────────────── */
/** Run an async action with a spinner on the button; errors become toasts. */
export async function busy(btn, fn) {
  if (btn?.classList.contains('is-loading')) return undefined;
  btn?.classList.add('is-loading');
  try { return await fn(); } catch (err) { toastError(err); return undefined; } finally { btn?.classList.remove('is-loading'); }
}

/* ── Forms ────────────────────────────────────────────────────── */
export function field({ name, label, type = 'text', value = '', hint = '', optional = false, cls = '', attrs = '', options = null, money: isMoney = false }) {
  const id = `f-${name}`;
  let input;
  if (options) {
    input = `<select id="${id}" name="${name}" ${attrs}>${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  } else if (type === 'textarea') {
    input = `<textarea id="${id}" name="${name}" ${attrs}>${esc(value)}</textarea>`;
  } else {
    input = `<input id="${id}" name="${name}" type="${isMoney ? 'text' : type}" value="${esc(value)}" ${isMoney ? 'inputmode="decimal" autocomplete="off"' : ''} ${attrs}>`;
    if (isMoney) input = `<div class="money">${input}</div>`;
  }
  return `<div class="field ${cls}" data-field="${name}">
    <label for="${id}">${esc(label)}${optional ? ' <span class="opt">(optional)</span>' : ''}</label>
    ${input}
    ${hint ? `<p class="field__hint">${hint}</p>` : ''}
    <p class="field__error" data-error-for="${name}"></p>
  </div>`;
}
export const checkbox = (name, label, checked) =>
  `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}> ${esc(label)}</label>`;

/** Show field errors: { name: 'message' }. Returns true when there are none. */
export function showErrors(form, errors) {
  $$('.field', form).forEach((f) => f.classList.remove('has-error'));
  $$('[data-error-for]', form).forEach((e) => { e.textContent = ''; });
  const names = Object.keys(errors).filter((k) => errors[k]);
  for (const n of names) {
    const box = form.querySelector(`[data-error-for="${n}"]`);
    if (box) { box.textContent = errors[n]; box.closest('.field')?.classList.add('has-error'); }
  }
  if (names.length) form.querySelector(`[name="${names[0]}"]`)?.focus();
  return names.length === 0;
}
export const val = (form, name) => (form.elements[name]?.value ?? '').trim();
export const checked = (form, name) => !!form.elements[name]?.checked;

export const loading = (root) => { root.innerHTML = '<p class="loading">Loading…</p>'; };
export const emptyRow = (cols, title, text = '') =>
  `<tr><td colspan="${cols}"><div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div></td></tr>`;
export function pageHead({ title, sub = '', actions = '', crumb = null }) {
  return `<div class="page-head"><div>
    ${crumb ? `<a class="crumb" href="${crumb.href}">${icon('left', 14)}${esc(crumb.label)}</a>` : ''}
    <h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>
    ${actions ? `<div class="page-head__actions">${actions}</div>` : ''}</div>`;
}

/** Download rows as a CSV file. */
export function downloadCsv(filename, rows) {
  const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
