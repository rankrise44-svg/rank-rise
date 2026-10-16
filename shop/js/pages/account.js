/* Account (demo): sign in / register, profile, order history. */
import { $, $$, esc, icon, params, setTitle } from '../lib/dom.js';
import { formatCents } from '../lib/money.js';
import { rules, bindForm, normalizeLebanesePhone } from '../lib/validate.js';
import { initLayout } from '../ui/layout.js';
import { toast } from '../ui/toast.js';
import * as account from '../services/account.js';
import * as orders from '../services/orders.js';

await initLayout();
const root = $('[data-account-root]');
const next = params().get('next') === 'checkout' ? 'checkout.html' : '';
const pwRule = (v) => (String(v ?? '').length >= 8 ? '' : 'Use at least 8 characters.');

const fieldHtml = (id, label, input) => `<div class="field"><label for="${id}">${label}</label>${input}<p class="field__error" id="${id}-err" data-error-for="${input.match(/name="([^"]+)"/)[1]}"></p></div>`;

function authView(tab = 'signin') {
  setTitle(tab === 'signin' ? 'Sign in' : 'Create account');
  root.innerHTML = `<div class="narrow">
    <div class="form-card">
      <div class="tabs" role="tablist">
        <button type="button" role="tab" id="tab-signin" aria-selected="${tab === 'signin'}" aria-controls="panel-auth" data-tab="signin">Sign in</button>
        <button type="button" role="tab" id="tab-register" aria-selected="${tab === 'register'}" aria-controls="panel-auth" data-tab="register">Create account</button>
      </div>
      <div id="panel-auth" role="tabpanel" aria-labelledby="tab-${tab}">
      ${tab === 'signin' ? `
        <form data-auth="signin" novalidate class="form-grid">
          ${fieldHtml('si-email', 'Email', '<input id="si-email" name="email" type="email" autocomplete="email" aria-describedby="si-email-err">')}
          ${fieldHtml('si-pass', 'Password', '<input id="si-pass" name="password" type="password" autocomplete="current-password" aria-describedby="si-pass-err">')}
          <button class="btn btn--gold btn--lg btn--block" type="submit">Sign in</button>
        </form>` : `
        <form data-auth="register" novalidate class="form-grid">
          ${fieldHtml('re-name', 'Full name', '<input id="re-name" name="name" type="text" autocomplete="name" maxlength="80" aria-describedby="re-name-err">')}
          ${fieldHtml('re-email', 'Email', '<input id="re-email" name="email" type="email" autocomplete="email" aria-describedby="re-email-err">')}
          ${fieldHtml('re-phone', 'Mobile number <span class="opt">(optional)</span>', '<input id="re-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="03 123 456" aria-describedby="re-phone-err">')}
          ${fieldHtml('re-pass', 'Password', '<input id="re-pass" name="password" type="password" autocomplete="new-password" aria-describedby="re-pass-err">')}
          <button class="btn btn--gold btn--lg btn--block" type="submit">Create account</button>
        </form>`}
      <p class="summary__note" style="margin-top:14px">Demo accounts live only in this browser. Passwords are checked and then discarded — never stored.</p>
      </div>
    </div>
  </div>`;

  $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => authView(b.dataset.tab)));
  const form = $('[data-auth]', root);
  const v = bindForm(form, tab === 'signin'
    ? { email: [rules.required('Email'), rules.email], password: [rules.required('Password'), pwRule] }
    : { name: [rules.required('Full name'), rules.name, rules.minLength(3, 'Full name')], email: [rules.required('Email'), rules.email], phone: [rules.lebanesePhone], password: [rules.required('Password'), pwRule] });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!v.validate()) return;
    const btn = form.querySelector('[type="submit"]');
    btn.classList.add('is-loading');
    const val = v.values();
    if (tab === 'signin') await account.signIn({ email: val.email.trim() });
    else await account.register({ name: val.name, email: val.email, phone: normalizeLebanesePhone(val.phone) || '' });
    toast(tab === 'signin' ? 'Signed in' : 'Account created — welcome!');
    if (next) { location.href = next; return; }
    dashboard();
  });
  form.querySelector('input')?.focus();
}

function dashboard() {
  const a = account.current();
  setTitle('My account');
  const list = orders.listOrders();
  const mine = list.filter((o) => !a.email || !o.customer?.email || o.customer.email === a.email);
  root.innerHTML = `<div class="account">
    <aside class="account__card">
      <div class="account__avatar" aria-hidden="true">${esc((a.name || a.email).charAt(0).toUpperCase())}</div>
      <div><strong>${esc(a.name || 'Customer')}</strong><br><span class="muted">${esc(a.email)}</span></div>
      <form data-profile novalidate class="form-grid" style="margin-top:6px">
        <div class="field"><label for="pf-name">Name</label><input id="pf-name" name="name" value="${esc(a.name)}" autocomplete="name" aria-describedby="pf-name-err"><p class="field__error" id="pf-name-err" data-error-for="name"></p></div>
        <div class="field"><label for="pf-phone">Mobile number</label><input id="pf-phone" name="phone" type="tel" value="${esc(a.phone ? a.phone.replace(/^\+961/, '0') : '')}" placeholder="03 123 456" autocomplete="tel" aria-describedby="pf-phone-err"><p class="field__error" id="pf-phone-err" data-error-for="phone"></p></div>
        <button class="btn btn--dark btn--block" type="submit">Save details</button>
      </form>
      <button class="btn btn--outline btn--block" type="button" data-signout>${icon('logout', { size: 16 })}Sign out</button>
    </aside>
    <section aria-labelledby="orders-title">
      <h2 id="orders-title" style="margin-bottom:14px">Your orders</h2>
      ${mine.length ? `<ul class="order-list">${mine.map((o) => `<li class="order-row">
          <div><span class="order-row__id">${esc(o.id)}</span><br><span class="order-row__meta">${new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${o.items.reduce((n, i) => n + i.qty, 0)} items · ${formatCents(o.totals.total)}</span></div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
            <span class="status status--${esc(o.status)}">${esc(orders.STATUS[o.status] || o.status)}</span>
            <a class="btn btn--outline btn--sm" href="track-order.html?order=${encodeURIComponent(o.id)}">Track</a>
          </div></li>`).join('')}</ul>`
        : `<div class="alert alert--info">${icon('package', { size: 18 })}<span>No orders yet. <a class="link" href="shop.html">Start shopping</a> — your orders will appear here.</span></div>`}
    </section>
  </div>`;

  const pf = $('[data-profile]', root);
  const v = bindForm(pf, { name: [rules.required('Name'), rules.name], phone: [rules.lebanesePhone] });
  pf.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!v.validate()) return;
    account.updateProfile({ name: pf.name.value.trim(), phone: normalizeLebanesePhone(pf.phone.value) || '' });
    toast('Details saved');
  });
  $('[data-signout]', root).addEventListener('click', () => { account.signOut(); toast('Signed out'); authView(); });
}

if (account.current()) dashboard(); else authView(params().get('tab') === 'register' ? 'register' : 'signin');
