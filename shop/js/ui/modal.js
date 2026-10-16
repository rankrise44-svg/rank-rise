/* Accessible modal dialog: focus moves in and is trapped, Escape
   closes (when dismissible), and focus returns to the opener.

   const m = openModal({ title: 'Verify payment', icon: 'lock' });
   m.setBody('<p>…</p>');            // swap content between steps
   const result = await m.result;     // value passed to m.close(value)
*/

import { esc, icon } from '../lib/dom.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function openModal({ title, icon: iconName = '', dismissible = true, dismissValue = 'dismissed' } = {}) {
  const opener = document.activeElement;
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="modal__overlay"></div>
    <div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__head">
        <h2 id="modal-title">${iconName ? icon(iconName, { size: 18 }) : ''}${esc(title)}</h2>
        ${dismissible ? `<button type="button" class="icon-btn" data-modal-close aria-label="Close">${icon('close', { size: 20 })}</button>` : ''}
      </div>
      <div class="modal__body"></div>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('no-scroll');

  let resolve;
  const result = new Promise((r) => { resolve = r; });
  let closed = false;

  function close(value) {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    el.remove();
    if (!document.querySelector('.modal')) document.body.classList.remove('no-scroll');
    if (opener && document.contains(opener)) opener.focus();
    resolve(value);
  }

  function onKey(e) {
    if (e.key === 'Escape' && dismissible) { e.preventDefault(); close(dismissValue); return; }
    if (e.key !== 'Tab') return;
    const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  el.querySelector('[data-modal-close]')?.addEventListener('click', () => close(dismissValue));
  if (dismissible) el.querySelector('.modal__overlay').addEventListener('click', () => close(dismissValue));

  const body = el.querySelector('.modal__body');
  return {
    el,
    body,
    result,
    close,
    get closed() { return closed; },
    setTitle(text, iconName2 = iconName) {
      el.querySelector('#modal-title').innerHTML = `${iconName2 ? icon(iconName2, { size: 18 }) : ''}${esc(text)}`;
    },
    setBody(html, focusSel) {
      body.innerHTML = html;
      const target = (focusSel && body.querySelector(focusSel)) || body.querySelector(FOCUSABLE) || el.querySelector('.modal__box');
      if (target === el.querySelector('.modal__box')) target.setAttribute('tabindex', '-1');
      target.focus();
    },
  };
}
