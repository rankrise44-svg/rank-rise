import { CONFIG } from '../config.js';
import { $, esc, icon } from '../lib/dom.js';
import { rules, bindForm } from '../lib/validate.js';
import { initLayout } from '../ui/layout.js';
import { toast } from '../ui/toast.js';

await initLayout();

const s = CONFIG.store;
$('[data-contact-info]').innerHTML = [
  ['phone', 'Call or WhatsApp', `<a href="tel:${esc(s.phone.replace(/\s/g, ''))}">${esc(s.phone)}</a>`],
  ['mail', 'Email', `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`],
  ['pin', 'Showroom', `<span>${esc(s.address)}</span>`],
  ['clock', 'Opening hours', `<span>${esc(s.hours)}</span>`],
].map(([i, label, value]) => `<div class="info-item">${icon(i, { size: 20 })}<div><strong>${label}</strong>${value}</div></div>`).join('');

const form = $('[data-contact-form]');
const success = $('[data-contact-success]');

const validator = bindForm(form, {
  name: [rules.required('Full name'), rules.name, rules.minLength(2, 'Full name')],
  email: [rules.required('Email'), rules.email],
  phone: [rules.lebanesePhone],
  topic: [rules.required('Topic')],
  message: [rules.required('Message'), rules.minLength(10, 'Message'), rules.maxLength(1000, 'Message')],
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validator.validate()) {
    toast('Please check the highlighted fields.', { tone: 'error' });
    return;
  }
  const btn = form.querySelector('[type="submit"]');
  btn.classList.add('is-loading');
  btn.disabled = true;
  // Demo: a real store would POST to `${CONFIG.api.baseUrl}/contact` here.
  await new Promise((r) => setTimeout(r, 500));
  const { name } = validator.values();
  form.hidden = true;
  success.hidden = false;
  success.innerHTML = `<div class="alert alert--ok" role="status">${icon('check', { size: 20 })}
    <div><strong>Thanks, ${esc(name.trim().split(/\s+/)[0])} — your message is in.</strong><br>We’ll reply within one working day.</div></div>
    <button type="button" class="btn btn--light" style="margin-top:16px" data-contact-again>Send another message</button>`;
  success.querySelector('[data-contact-again]').addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    success.hidden = true;
    btn.classList.remove('is-loading');
    btn.disabled = false;
    form.elements.name.focus();
  });
});
