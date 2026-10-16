/* ═══════════════════════════════════════════════════════════════
   LAYOUT — top bar, masthead, category menu, nav, footer, drawer
   ───────────────────────────────────────────────────────────────
   Every page calls initLayout() once. It renders the shared chrome
   into #site-header / #site-footer, keeps the cart / wishlist /
   account indicators live, and handles every [data-add-to-cart] and
   [data-wishlist-toggle] button on the page.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import { $, $$, esc, icon, debounce, params } from '../lib/dom.js';
import { formatPrice, formatCents } from '../lib/money.js';
import * as catalog from '../services/catalog.js';
import * as cart from '../services/cart.js';
import * as wishlist from '../services/wishlist.js';
import * as account from '../services/account.js';
import { toast } from './toast.js';
import { productUrl } from './product-card.js';
import { paymentBadgesHtml } from './payment-badges.js';

const NAV = [
  { id: 'home', label: 'Home', href: 'index.html' },
  { id: 'shop', label: 'Shop', href: 'shop.html' },
  { id: 'bestsellers', label: 'Best Sellers', href: 'shop.html?collection=bestsellers' },
  { id: 'new', label: 'New Arrivals', href: 'shop.html?collection=new' },
  { id: 'brands', label: 'Brands', href: 'brands.html' },
  { id: 'deals', label: 'Deals', href: 'shop.html?collection=deals' },
  { id: 'blog', label: 'Blog', href: 'blog.html' },
  { id: 'contact', label: 'Contact Us', href: 'contact.html' },
];

/** Which nav item is current — the shop page splits into collections. */
function activeNav(page) {
  if (page !== 'shop') return page;
  const c = params().get('collection');
  return ['bestsellers', 'new', 'deals'].includes(c) ? c : 'shop';
}

export const brandMark = (size = 40) => `<svg class="brand__mark" width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" aria-hidden="true">
  <g stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
    <path d="M12 4v10a3 3 0 0 1-6 0V4M9 4v32"/>
    <ellipse cx="20" cy="9" rx="3.6" ry="5.5"/><path d="M20 14.5V36"/>
    <path d="M31 4c-3 3-3.5 9-.5 11.5V36"/>
  </g></svg>`;

function headerHtml(page, categories) {
  const p = params();
  const q = page === 'search' ? p.get('q') || '' : '';
  const qCat = page === 'search' ? p.get('cat') || '' : '';
  const active = activeNav(page);
  const s = CONFIG.store;
  const navLinks = (cls = '') => NAV.map((n) =>
    `<a class="${cls}" href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');

  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="topbar">
    <div class="container topbar__inner">
      <p class="topbar__msg">${icon('phone', { size: 15 })}<span><span class="topbar__long">Need help ordering? </span>Call or WhatsApp <strong>${esc(s.phone)}</strong></span></p>
      <a class="btn btn--gold btn--xs topbar__cta" href="contact.html">Let’s Talk ${icon('arrow', { size: 14 })}</a>
    </div>
  </div>
  <header class="masthead" data-header>
    <div class="container masthead__inner">
      <button class="icon-btn masthead__menu" type="button" data-menu-open aria-controls="mobile-nav" aria-expanded="false" aria-label="Open menu">${icon('menu', { size: 24 })}</button>
      <a class="brand" href="index.html" aria-label="${esc(s.name)} home">
        ${brandMark()}
        <span class="brand__text"><span class="brand__name">${esc(s.name)}</span><span class="brand__tag">${esc(s.tagline)}</span></span>
      </a>
      <form class="hsearch" role="search" action="search.html" data-search>
        <label class="sr-only" for="site-search">Search products</label>
        <input id="site-search" name="q" type="search" placeholder="Search for products…" autocomplete="off"
          value="${esc(q)}" aria-controls="search-suggest" aria-expanded="false" maxlength="80">
        <label class="sr-only" for="site-search-cat">Category</label>
        <select id="site-search-cat" name="cat" class="hsearch__cat">
          <option value="">All Categories</option>
          ${categories.map((c) => `<option value="${c.id}"${c.id === qCat ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <button class="hsearch__btn" type="submit" aria-label="Search">${icon('search', { size: 19 })}</button>
        <div class="suggest" id="search-suggest" hidden></div>
      </form>
      <nav class="tools" aria-label="Your shopping">
        <a class="tool tool--track" href="track-order.html"${page === 'track' ? ' aria-current="page"' : ''}>${icon('truck', { size: 24 })}<span class="tool__label">Track Order</span></a>
        <a class="tool" href="wishlist.html" data-wish-link${page === 'wishlist' ? ' aria-current="page"' : ''}>
          <span class="tool__icon">${icon('heart', { size: 24 })}<span class="count" data-wish-count hidden>0</span></span><span class="tool__label">Wishlist</span></a>
        <a class="tool tool--account" href="account.html"${page === 'account' ? ' aria-current="page"' : ''}>${icon('user', { size: 24 })}<span class="tool__label" data-account-label>Account</span></a>
        <a class="tool tool--cart" href="cart.html" data-cart-link${page === 'cart' ? ' aria-current="page"' : ''}>
          <span class="tool__icon">${icon('cart', { size: 26 })}<span class="count" data-cart-count hidden>0</span></span>
          <span class="tool__cart"><span class="tool__label">Cart</span><strong data-cart-total>${formatPrice(0)}</strong></span></a>
      </nav>
    </div>
  </header>
  <div class="navbar">
    <div class="container navbar__inner">
      <div class="catmenu" data-catmenu>
        <button class="catmenu__btn" type="button" aria-expanded="false" aria-controls="catmenu-panel">${icon('menu', { size: 18 })}<span>Shop by Category</span>${icon('chevron', { size: 16, cls: 'catmenu__chev' })}</button>
        <div class="catmenu__panel" id="catmenu-panel" hidden>
          ${categories.map((c) => `<a href="shop.html?category=${c.id}"><span class="catmenu__img"><img src="${esc(c.icon)}" alt="" width="40" height="40"></span>${esc(c.name)}${icon('right', { size: 14, cls: 'catmenu__go' })}</a>`).join('')}
          <a class="catmenu__all" href="shop.html">View all products ${icon('arrow', { size: 14 })}</a>
        </div>
      </div>
      <nav class="mainnav" aria-label="Main">${navLinks()}</nav>
    </div>
  </div>
  <div class="drawer" id="mobile-nav" data-drawer hidden>
    <div class="drawer__overlay" data-menu-close></div>
    <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="drawer__head">
        <a class="brand brand--sm" href="index.html">${brandMark(30)}<span class="brand__name">${esc(s.name)}</span></a>
        <button class="icon-btn" type="button" data-menu-close aria-label="Close menu">${icon('close', { size: 22 })}</button>
      </div>
      <nav class="drawer__nav" aria-label="Mobile">${navLinks()}</nav>
      <div class="drawer__tools">
        <a href="track-order.html">${icon('truck', { size: 18 })}Track order</a>
        <a href="account.html">${icon('user', { size: 18 })}My account</a>
        <a href="wishlist.html">${icon('heart', { size: 18 })}Wishlist</a>
        <a href="cart.html">${icon('cart', { size: 18 })}Cart</a>
      </div>
      <p class="drawer__label">Shop by category</p>
      <nav class="drawer__cats" aria-label="Categories">
        ${categories.map((c) => `<a href="shop.html?category=${c.id}"><img src="${esc(c.icon)}" alt="" width="32" height="32">${esc(c.name)}</a>`).join('')}
      </nav>
    </div>
  </div>`;
}

function footerHtml(categories) {
  const s = CONFIG.store;
  const year = new Date().getFullYear();
  return `
  <section class="newsband" aria-labelledby="nl-title">
    <div class="container newsband__inner">
      <img class="newsband__art" src="assets/products/silicone-utensil-set-t.svg" alt="" width="130" height="130">
      <div class="newsband__text">
        <h2 id="nl-title">Subscribe to Our Newsletter</h2>
        <p>Get the latest updates on new arrivals, exclusive offers and more.</p>
      </div>
      <form class="newsletter" data-newsletter novalidate>
        <label for="nl-email" class="sr-only">Email address</label>
        <div class="newsletter__row">
          <input id="nl-email" name="email" type="email" placeholder="Enter your email address" autocomplete="email" required>
          <button class="btn btn--gold" type="submit">Subscribe</button>
        </div>
        <p class="field__error field__error--dark" data-nl-error role="alert"></p>
      </form>
    </div>
  </section>
  <footer class="site-footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <a class="brand brand--light" href="index.html">${brandMark(34)}<span class="brand__text"><span class="brand__name">${esc(s.name)}</span><span class="brand__tag">${esc(s.tagline)}</span></span></a>
        <p>${esc(s.about)}</p>
      </div>
      <div>
        <p class="footer__label">Shop</p>
        <ul class="footer__links">
          ${categories.slice(0, 6).map((c) => `<li><a href="shop.html?category=${c.id}">${esc(c.name)}</a></li>`).join('')}
          <li><a href="shop.html">All products</a></li>
        </ul>
      </div>
      <div>
        <p class="footer__label">Customer care</p>
        <ul class="footer__links">
          <li><a href="track-order.html">Track your order</a></li>
          <li><a href="account.html">My account</a></li>
          <li><a href="about.html#delivery">Delivery &amp; returns</a></li>
          <li><a href="about.html#payment">Payment methods</a></li>
          <li><a href="contact.html">Contact us</a></li>
        </ul>
      </div>
      <div>
        <p class="footer__label">Company</p>
        <ul class="footer__links">
          <li><a href="about.html">About us</a></li>
          <li><a href="brands.html">Our brands</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="shop.html?collection=deals">Deals</a></li>
        </ul>
      </div>
      <div class="footer__col--contact">
        <p class="footer__label">Get in touch</p>
        <ul class="footer__links footer__contact">
          <li>${icon('pin', { size: 16 })}${esc(s.address)}</li>
          <li>${icon('phone', { size: 16 })}<span class="selectable">${esc(s.phone)}</span></li>
          <li>${icon('mail', { size: 16 })}<span class="selectable">${esc(s.email)}</span></li>
          <li>${icon('clock', { size: 16 })}${esc(s.hours)}</li>
        </ul>
      </div>
    </div>
    <div class="container footer__bottom">
      <p>© ${year} ${esc(s.name)}. Demo store — products, prices and contact details are fictional.</p>
      <div class="footer__pay" aria-label="Payment methods we accept">${paymentBadgesHtml()}</div>
    </div>
  </footer>`;
}

/* ── Counters ─────────────────────────────────────────────────── */
function setCount(sel, n, label) {
  for (const el of $$(sel)) {
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
    const link = el.closest('a');
    if (link) link.setAttribute('aria-label', n ? `${label}, ${n} item${n === 1 ? '' : 's'}` : label);
  }
}

async function updateCartIndicators() {
  setCount('[data-cart-count]', cart.count(), 'Cart');
  const { totals } = await cart.resolve();
  for (const el of $$('[data-cart-total]')) el.textContent = formatCents(totals.subtotal - totals.discount);
}
const updateWish = () => setCount('[data-wish-count]', wishlist.count(), 'Wishlist');

function updateAccountLabel() {
  const a = account.current();
  for (const el of $$('[data-account-label]')) el.textContent = a ? `Hi, ${a.name.split(/\s+/)[0] || 'there'}` : 'Account';
}

function syncWishButtons() {
  for (const btn of $$('[data-wishlist-toggle]')) {
    const saved = wishlist.has(btn.dataset.wishlistToggle);
    btn.setAttribute('aria-pressed', String(saved));
    const label = btn.getAttribute('aria-label') || '';
    btn.setAttribute('aria-label', label.replace(/^(Remove from|Save to) wishlist/, saved ? 'Remove from wishlist' : 'Save to wishlist'));
    const text = btn.querySelector('[data-wish-label]');
    if (text) text.textContent = saved ? 'Saved' : 'Save to wishlist';
  }
}

/* ── Category menu ────────────────────────────────────────────── */
function bindCatMenu() {
  const wrap = $('[data-catmenu]');
  if (!wrap) return;
  const btn = $('.catmenu__btn', wrap);
  const panel = $('.catmenu__panel', wrap);
  const set = (open) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    wrap.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', () => {
    const open = panel.hidden;
    set(open);
    if (open) panel.querySelector('a')?.focus();
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) set(false); });
  wrap.addEventListener('keydown', (e) => {
    const links = $$('a', panel);
    const i = links.indexOf(document.activeElement);
    if (e.key === 'Escape') { set(false); btn.focus(); }
    else if (e.key === 'ArrowDown' && !panel.hidden) { e.preventDefault(); links[Math.min(links.length - 1, i + 1)].focus(); }
    else if (e.key === 'ArrowUp' && !panel.hidden) { e.preventDefault(); (i <= 0 ? btn : links[i - 1]).focus(); }
  });
}

/* ── Mobile menu ──────────────────────────────────────────────── */
function bindMenu() {
  const drawer = $('[data-drawer]');
  const openBtn = $('[data-menu-open]');
  if (!drawer || !openBtn) return;
  const open = () => {
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    drawer.querySelector('.drawer__panel button')?.focus();
  };
  const close = () => {
    drawer.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { drawer.hidden = true; }, 250);
    openBtn.focus();
  };
  openBtn.addEventListener('click', open);
  $$('[data-menu-close]', drawer).forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) close(); });
}

/* ── Search with suggestions ──────────────────────────────────── */
function bindSearch() {
  const form = $('[data-search]');
  const input = $('#site-search');
  const catSel = $('#site-search-cat');
  const box = $('#search-suggest');
  if (!form) return;

  const hide = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); };

  const render = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { hide(); return; }
    const cat = catSel.value;
    const results = (await catalog.search(q, cat)).slice(0, 5);
    const qs = new URLSearchParams({ q, ...(cat ? { cat } : {}) });
    const all = `<a class="suggest__all" href="search.html?${qs}">See all results for “${esc(q)}”${icon('arrow', { size: 16 })}</a>`;
    box.innerHTML = results.length
      ? `<ul>${results.map((p) => `<li><a href="${productUrl(p)}"><img src="${esc(p.images[0])}" alt="" width="44" height="44"><span>${esc(p.name)}</span><span class="suggest__price">${formatPrice(p.price)}</span></a></li>`).join('')}</ul>${all}`
      : `<p class="suggest__empty">No matches for “${esc(q)}”${cat ? ' in this category' : ''}.</p>`;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }, 120);

  input.addEventListener('input', render);
  catSel.addEventListener('change', () => { if (input.value.trim().length >= 2) render(); });
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) render(); });
  form.addEventListener('submit', (e) => {
    if (!input.value.trim()) { e.preventDefault(); input.focus(); return; }
    if (!catSel.value) catSel.disabled = true; // keep the URL clean: no empty &cat=
  });
  form.addEventListener('keydown', (e) => {
    const links = $$('a', box);
    if (box.hidden || !links.length) { if (e.key === 'Escape') hide(); return; }
    const i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); links[Math.min(links.length - 1, i + 1)].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? input : links[i - 1]).focus(); }
    else if (e.key === 'Escape') { hide(); input.focus(); }
  });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) hide(); });
}

/* ── Newsletter (demo) ────────────────────────────────────────── */
function bindNewsletter() {
  const form = $('[data-newsletter]');
  if (!form) return;
  const err = $('[data-nl-error]', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      err.textContent = 'Enter a valid email address, e.g. name@example.com.';
      form.email.setAttribute('aria-invalid', 'true');
      form.email.focus();
      return;
    }
    err.textContent = '';
    form.email.removeAttribute('aria-invalid');
    form.reset();
    toast('Subscribed — new arrivals and offers will come to your inbox.');
  });
}

/* ── Global cart / wishlist actions ───────────────────────────── */
function bindActions() {
  document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn && !addBtn.disabled) {
      e.preventDefault();
      const product = await catalog.getProduct(addBtn.dataset.addToCart);
      if (!product) return;
      const qtyInput = addBtn.dataset.qtyFrom ? $(addBtn.dataset.qtyFrom) : null;
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      const res = cart.add(product, qty);
      if (res.added > 0) {
        toast(`${res.added} × ${product.name} added to cart`, { action: { label: 'View cart', href: 'cart.html' } });
        addBtn.classList.add('is-added');
        setTimeout(() => addBtn.classList.remove('is-added'), 900);
      } else {
        toast(product.stock ? `You already have the maximum of ${res.qty} in your cart.` : `${product.name} is sold out.`, { tone: 'error' });
      }
      return;
    }

    const wishBtn = e.target.closest('[data-wishlist-toggle]');
    if (wishBtn) {
      e.preventDefault();
      const id = wishBtn.dataset.wishlistToggle;
      const product = await catalog.getProduct(id);
      const saved = wishlist.toggle(id);
      if (product) {
        toast(saved ? `Saved ${product.name} to your wishlist` : `Removed ${product.name} from your wishlist`,
          saved ? { action: { label: 'View wishlist', href: 'wishlist.html' } } : {});
      }
    }
  });
}

export async function initLayout() {
  const page = document.body.dataset.page || '';
  const categories = await catalog.getCategories();
  const headerSlot = $('#site-header');
  const footerSlot = $('#site-footer');
  if (headerSlot) headerSlot.outerHTML = headerHtml(page, categories);
  if (footerSlot) footerSlot.outerHTML = footerHtml(categories);

  // Icons in static page markup: <button data-icon="search">, links with data-arrow.
  for (const el of $$('[data-icon]')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, { size: 18 }));
  for (const el of $$('[data-arrow]')) el.insertAdjacentHTML('beforeend', icon('arrow', { size: 16 }));

  bindCatMenu();
  bindMenu();
  bindSearch();
  bindNewsletter();
  bindActions();

  updateCartIndicators();
  updateWish();
  updateAccountLabel();
  cart.subscribe(updateCartIndicators);
  wishlist.subscribe(() => { updateWish(); syncWishButtons(); });
  account.subscribe(updateAccountLabel);

  const header = $('[data-header]');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return { categories };
}
