/* Sign in · forgot password · set a new password (from an email link). */
import { sb, friendly } from '../sb.js';
import { $, field, showErrors, val, busy, toast } from '../ui.js';

const brand = '<div class="auth__brand"><span class="logo">Cedarline</span><span class="tag">Admin</span></div>';
const here = () => `${location.origin}${location.pathname}`;

export function renderLogin(app, { onDone }) {
  app.className = 'boot';
  app.innerHTML = `<div class="auth">
    ${brand}
    <div><h1>Sign in</h1><p class="muted">Store team only.</p></div>
    <div class="alert alert--err" data-alert hidden></div>
    <form data-login novalidate>
      ${field({ name: 'email', label: 'Email', type: 'email', attrs: 'autocomplete="username" required' })}
      ${field({ name: 'password', label: 'Password', type: 'password', attrs: 'autocomplete="current-password" required' })}
      <button class="btn btn--gold btn--block" type="submit">Sign in</button>
    </form>
    <div class="auth__links"><button type="button" class="link" data-forgot>Forgot password?</button><a class="link" href="../index.html">Back to the store</a></div>
  </div>`;
  const form = $('[data-login]', app);
  const alertEl = $('[data-alert]', app);
  form.email.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alertEl.hidden = true;
    const email = val(form, 'email');
    const password = form.password.value;
    if (!showErrors(form, { email: /^\S+@\S+\.\S+$/.test(email) ? '' : 'Enter your email.', password: password ? '' : 'Enter your password.' })) return;
    busy(form.querySelector('[type=submit]'), async () => {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        alertEl.textContent = /invalid login|credentials/i.test(error.message)
          ? 'That email and password don’t match. Check them and try again.'
          : /confirm/i.test(error.message) ? 'This account hasn’t been confirmed yet.' : friendly(error).message;
        alertEl.hidden = false;
        return;
      }
      onDone();
    });
  });
  $('[data-forgot]', app).addEventListener('click', () => renderForgot(app, { onDone, email: val(form, 'email') }));
}

function renderForgot(app, { onDone, email = '' }) {
  app.innerHTML = `<div class="auth">
    ${brand}
    <div><h1>Reset your password</h1><p class="muted">We’ll email you a link to choose a new password.</p></div>
    <div class="alert" data-alert hidden></div>
    <form data-forgot-form novalidate>
      ${field({ name: 'email', label: 'Email', type: 'email', value: email, attrs: 'autocomplete="username" required' })}
      <button class="btn btn--gold btn--block" type="submit">Send reset link</button>
    </form>
    <div class="auth__links"><button type="button" class="link" data-back>Back to sign in</button></div>
  </div>`;
  const form = $('[data-forgot-form]', app);
  const alertEl = $('[data-alert]', app);
  form.email.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const em = val(form, 'email');
    if (!showErrors(form, { email: /^\S+@\S+\.\S+$/.test(em) ? '' : 'Enter your email.' })) return;
    busy(form.querySelector('[type=submit]'), async () => {
      const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: here() });
      alertEl.className = error ? 'alert alert--err' : 'alert alert--ok';
      alertEl.textContent = error ? friendly(error).message : 'If that email belongs to the store team, a reset link is on its way. Open it on this device.';
      alertEl.hidden = false;
    });
  });
  $('[data-back]', app).addEventListener('click', () => renderLogin(app, { onDone }));
}

export function renderSetPassword(app, { onDone, reason = 'recovery' }) {
  app.className = 'boot';
  app.innerHTML = `<div class="auth">
    ${brand}
    <div><h1>${reason === 'invite' ? 'Welcome! Choose a password' : 'Choose a new password'}</h1><p class="muted">At least 10 characters. Use something you don’t use anywhere else.</p></div>
    <form data-setpw novalidate>
      ${field({ name: 'password', label: 'New password', type: 'password', attrs: 'autocomplete="new-password" required minlength="10"' })}
      ${field({ name: 'password2', label: 'Repeat it', type: 'password', attrs: 'autocomplete="new-password" required' })}
      <button class="btn btn--gold btn--block" type="submit">Save password</button>
    </form>
  </div>`;
  const form = $('[data-setpw]', app);
  history.replaceState(null, '', location.pathname); // drop the one-time link from the address bar
  form.password.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = form.password.value;
    if (!showErrors(form, {
      password: p.length >= 10 ? '' : 'Use at least 10 characters.',
      password2: p === form.password2.value ? '' : 'The two passwords don’t match.',
    })) return;
    busy(form.querySelector('[type=submit]'), async () => {
      const { error } = await sb.auth.updateUser({ password: p });
      if (error) throw friendly(error);
      toast('Password saved.', { tone: 'ok' });
      onDone();
    });
  });
}
