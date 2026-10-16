/* ═══════════════════════════════════════════════════════════════
   CEDARLINE ADMIN — app shell
   Sign-in gate → layout (sidebar) → hash router (#/orders, …).
   Checks for new orders every 30 s while the panel is open.
   ═══════════════════════════════════════════════════════════════ */
import { sb, configured, rpc, q, linkType, linkError, signOut } from './sb.js';
import { $, $$, esc, icon, toast, toastError } from './ui.js';
import * as auth from './pages/login.js';

const app = document.getElementById('app');

const ROUTES = [
  { group: 'Store' },
  { path: 'dashboard', label: 'Dashboard', icon: 'home', load: () => import('./pages/dashboard.js') },
  { path: 'orders', label: 'Orders', icon: 'orders', load: () => import('./pages/orders.js'), badge: true },
  { path: 'customers', label: 'Customers', icon: 'users', load: () => import('./pages/customers.js') },
  { group: 'Catalog' },
  { path: 'products', label: 'Products', icon: 'box', load: () => import('./pages/products.js') },
  { path: 'catalog', label: 'Categories & brands', icon: 'layers', load: () => import('./pages/catalog.js') },
  { path: 'inventory', label: 'Inventory', icon: 'stock', load: () => import('./pages/inventory.js') },
  { group: 'Selling' },
  { path: 'promotions', label: 'Promo codes', icon: 'percent', load: () => import('./pages/promotions.js') },
  { path: 'delivery', label: 'Delivery', icon: 'truck', load: () => import('./pages/delivery.js') },
  { group: 'Money' },
  { path: 'reports', label: 'Profit & reports', icon: 'chart', load: () => import('./pages/reports.js') },
  { path: 'expenses', label: 'Expenses', icon: 'wallet', load: () => import('./pages/expenses.js') },
  { group: 'Admin' },
  { path: 'settings', label: 'Store settings', icon: 'gear', load: () => import('./pages/settings.js') },
  { path: 'admins', label: 'Admins', icon: 'shield', load: () => import('./pages/admins.js') },
  { path: 'activity', label: 'Activity log', icon: 'clock', load: () => import('./pages/activity.js') },
];

const ctx = { me: null, sb, navigate: (h) => { location.hash = h; }, refreshBadge: () => checkNewOrders() };

/* ── Start ─────────────────────────────────────────────────────── */
async function start() {
  app.removeAttribute('aria-busy');
  if (!configured) {
    app.innerHTML = '<div class="auth"><h1>Not connected</h1><p class="muted">The store isn’t connected to Supabase yet (shop/js/supabase.config.js is empty).</p></div>';
    return;
  }
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') auth.renderSetPassword(app, { onDone: boot, reason: 'recovery' });
    if (event === 'SIGNED_OUT' || (!session && ctx.me)) { ctx.me = null; stopPolling(); auth.renderLogin(app, { onDone: boot }); }
  });
  if (linkError) toast(linkError, { tone: 'err', ms: 8000 });
  const { data } = await sb.auth.getSession();
  if (data.session && (linkType === 'invite' || linkType === 'recovery')) {
    auth.renderSetPassword(app, { onDone: boot, reason: linkType });
    return;
  }
  if (!data.session) { auth.renderLogin(app, { onDone: boot }); return; }
  boot();
}

/** Signed in: check the account is an admin, then show the panel. */
async function boot() {
  let me;
  try { me = await rpc('admin_me'); } catch (err) { toastError(err); auth.renderLogin(app, { onDone: boot }); return; }
  if (!me?.role) {
    app.className = 'boot';
    app.innerHTML = `<div class="auth"><div class="auth__brand"><span class="logo">Cedarline</span><span class="tag">Admin</span></div>
      <h1>No admin access</h1>
      <p class="muted">You’re signed in as <strong>${esc(me?.email || '')}</strong>, but this account isn’t an admin of the store. Ask the store owner to add you.</p>
      <button class="btn btn--outline" data-signout>Sign out</button></div>`;
    $('[data-signout]', app).addEventListener('click', () => signOut());
    return;
  }
  ctx.me = me;
  renderShell();
  if (!location.hash.startsWith('#/')) history.replaceState(null, '', '#/dashboard');
  route();
  startPolling();
}

/* ── Layout ────────────────────────────────────────────────────── */
function renderShell() {
  app.className = 'shell';
  app.innerHTML = `
    <header class="topbar">
      <button class="topbar__menu" type="button" data-menu aria-label="Open menu" aria-expanded="false">${icon('menu', 22)}</button>
      <a class="logo" href="#/dashboard">Cedarline</a><span class="tag">ADMIN</span>
      <a class="count" href="#/orders?status=open" data-top-count hidden></a>
    </header>
    <aside class="side" id="side" aria-label="Admin menu">
      <a class="side__brand" href="#/dashboard"><span class="logo">Cedarline</span><span class="tag">Admin</span></a>
      <nav class="nav">${ROUTES.map((r) => (r.group
        ? `<div class="nav__group">${esc(r.group)}</div>`
        : `<a href="#/${r.path}" data-nav="${r.path}">${icon(r.icon)}<span>${esc(r.label)}</span>${r.badge ? '<span class="count" data-count hidden></span>' : ''}</a>`)).join('')}</nav>
      <div class="side__foot">
        <a href="../index.html" target="_blank" rel="noopener" class="small">${icon('store', 14)} View the store</a>
        <span>Signed in as<br><strong>${esc(ctx.me.email)}</strong> · ${ctx.me.role === 'owner' ? 'Owner' : 'Admin'}</span>
        <button type="button" class="link small" data-signout style="justify-self:start">Sign out</button>
      </div>
    </aside>
    <div class="scrim" data-scrim hidden></div>
    <main class="main" id="main" tabindex="-1"></main>`;
  const shell = app;
  const setMenu = (open) => { shell.classList.toggle('is-open', open); $('[data-scrim]').hidden = !open; $('[data-menu]').setAttribute('aria-expanded', String(open)); };
  $('[data-menu]').addEventListener('click', () => setMenu(true));
  $('[data-scrim]').addEventListener('click', () => setMenu(false));
  $$('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  $('[data-signout]').addEventListener('click', () => signOut());
}

/* ── Router ────────────────────────────────────────────────────── */
let routeSeq = 0;
async function route() {
  if (!ctx.me) return;
  const raw = location.hash.replace(/^#\/?/, '');
  if (!location.hash.startsWith('#/')) return; // e.g. leftover auth fragments
  const [pathPart, query = ''] = raw.split('?');
  const [section, ...rest] = pathPart.split('/');
  const r = ROUTES.find((x) => x.path === section) || ROUTES.find((x) => x.path === 'dashboard');
  $$('[data-nav]').forEach((a) => { if (a.dataset.nav === r.path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const main = $('#main');
  const seq = ++routeSeq;
  delete main.dataset.ready;
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const mod = await r.load();
    if (seq !== routeSeq) return;
    document.title = `${r.label} · Cedarline Admin`;
    await mod.render(main, { id: rest.map(decodeURIComponent).join('/') || '', query: new URLSearchParams(query) }, ctx);
    if (seq === routeSeq) { window.scrollTo(0, 0); main.dataset.ready = location.hash; } // "ready" marker, also used by tests
  } catch (err) {
    if (seq !== routeSeq) return;
    main.innerHTML = `<div class="alert alert--err">${icon('warn')}<span>${esc(err.message || 'This page couldn’t load.')}</span></div>`;
  }
}
window.addEventListener('hashchange', route);

/* ── New-order alerts ──────────────────────────────────────────── */
let timer = null;
let lastNewest = null;
function startPolling() { stopPolling(); checkNewOrders(true); timer = setInterval(() => checkNewOrders(), 30000); }
function stopPolling() { clearInterval(timer); timer = null; }
async function checkNewOrders(first = false) {
  if (!ctx.me) return;
  try {
    const { count } = await sb.from('orders').select('id', { count: 'exact', head: true }).in('status', ['awaiting_whatsapp', 'confirmed']);
    const newest = await q(sb.from('orders').select('id, created_at, full_name, total_cents').order('created_at', { ascending: false }).limit(1));
    for (const el of $$('[data-count], [data-top-count]')) {
      el.hidden = !count;
      el.textContent = el.hasAttribute('data-top-count') ? `${count} to handle` : String(count || '');
    }
    const top = newest[0];
    if (top && lastNewest && top.id !== lastNewest && !first) {
      toast(`New order <a href="#/orders/${encodeURIComponent(top.id)}">${esc(top.id)}</a> from ${esc(top.full_name)}`, { html: true, ms: 10000 });
      beep();
      if (location.hash.startsWith('#/orders') && !location.hash.includes('CL-')) route();
    }
    if (top) lastNewest = top.id;
  } catch { /* offline for a moment — try again next time */ }
}
function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.frequency.value = 880; g.gain.value = 0.05; o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.18);
  } catch { /* sound is optional */ }
}

start();
