/* ═══════════════════════════════════════════════════════════════
   LAYOUT — header, footer, search, mobile menu, global actions
   ───────────────────────────────────────────────────────────────
   Every page calls initLayout() once. It renders the shared chrome
   into #site-header / #site-footer, keeps the cart and wishlist
   counters live, and handles every [data-add-to-cart] and
   [data-wishlist-toggle] button on the page.
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import { $, $$, esc, icon, debounce, params } from '../lib/dom.js';
import { formatPrice } from '../lib/money.js';
import * as catalog from '../services/catalog.js';
import * as cart from '../services/cart.js';
import * as wishlist from '../services/wishlist.js';
import { toast } from './toast.js';
import { productUrl } from './product-card.js';

const NAV = [
  { id: 'home', label: 'Home', href: 'index.html' },
  { id: 'shop', label: 'Shop', href: 'shop.html' },
  { id: 'about', label: 'About', href: 'about.html' },
  { id: 'contact', label: 'Contact', href: 'contact.html' },
];

function headerHtml(page, categories) {
  const q = page === 'search' ? params().get('q') || '' : '';
  const navLinks = NAV.map((n) =>
    `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="announce"><div class="container">Free delivery across Lebanon on orders over $${CONFIG.delivery.freeThreshold} · Cash on delivery</div></div>
  <header class="site-header" data-header>
    <div class="container header__inner">
      <button class="icon-btn header__menu" type="button" data-menu-open aria-controls="mobile-nav" aria-expanded="false" aria-label="Open menu">${icon('menu', { size: 22 })}</button>
      <a class="logo" href="index.html" aria-label="Cedarline home">Cedarline<span class="logo__dot">.</span></a>
      <nav class="header__nav" aria-label="Main">${navLinks}</nav>
      <form class="search" role="search" action="search.html" data-search>
        <label class="sr-only" for="site-search">Search products</label>
        <input id="site-search" name="q" type="search" placeholder="Search products…" autocomplete="off"
          value="${esc(q)}" aria-controls="search-suggest" aria-expanded="false" maxlength="80">
        <button class="search__btn" type="submit" aria-label="Search">${icon('search', { size: 18 })}</button>
        <div class="suggest" id="search-suggest" hidden></div>
      </form>
      <div class="header__actions">
        <button class="icon-btn header__search-toggle" type="button" data-search-toggle aria-label="Search" aria-expanded="false">${icon('search', { size: 21 })}</button>
        <a class="icon-btn" href="wishlist.html" aria-label="Wishlist"${page === 'wishlist' ? ' aria-current="page"' : ''}>
          ${icon('heart', { size: 21 })}<span class="count" data-wish-count hidden>0</span></a>
        <a class="icon-btn" href="cart.html" aria-label="Cart"${page === 'cart' ? ' aria-current="page"' : ''}>
          ${icon('bag', { size: 21 })}<span class="count" data-cart-count hidden>0</span></a>
      </div>
    </div>
  </header>
  <div class="drawer" id="mobile-nav" data-drawer hidden>
    <div class="drawer__overlay" data-menu-close></div>
    <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="drawer__head">
        <a class="logo" href="index.html">Cedarline<span class="logo__dot">.</span></a>
        <button class="icon-btn" type="button" data-menu-close aria-label="Close menu">${icon('close', { size: 22 })}</button>
      </div>
      <nav class="drawer__nav" aria-label="Mobile">
        ${NAV.map((n) => `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}
        <a href="wishlist.html">Wishlist</a>
        <a href="cart.html">Cart</a>
      </nav>
      <p class="drawer__label">Shop by category</p>
      <nav class="drawer__cats" aria-label="Categories">
        ${categories.map((c) => `<a href="shop.html?category=${c.id}">${esc(c.name)}</a>`).join('')}
      </nav>
    </div>
  </div>`;
}

function footerHtml(categories) {
  const s = CONFIG.store;
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <a class="logo" href="index.html">Cedarline<span class="logo__dot">.</span></a>
        <p class="muted">${esc(s.tagline)}</p>
        <form class="newsletter" data-newsletter novalidate>
          <label for="nl-email" class="footer__label">Get new arrivals by email</label>
          <div class="newsletter__row">
            <input id="nl-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
            <button class="btn btn--dark btn--sm" type="submit">Subscribe</button>
          </div>
          <p class="field__error" data-nl-error role="alert"></p>
        </form>
      </div>
      <div>
        <p class="footer__label">Shop</p>
        <ul class="footer__links">
          <li><a href="shop.html">All products</a></li>
          ${categories.map((c) => `<li><a href="shop.html?category=${c.id}">${esc(c.name)}</a></li>`).join('')}
        </ul>
      </div>
      <div>
        <p class="footer__label">Help</p>
        <ul class="footer__links">
          <li><a href="about.html#delivery">Delivery &amp; returns</a></li>
          <li><a href="contact.html">Contact us</a></li>
          <li><a href="wishlist.html">Wishlist</a></li>
          <li><a href="cart.html">Your cart</a></li>
        </ul>
      </div>
      <div>
        <p class="footer__label">Visit</p>
        <ul class="footer__links footer__contact">
          <li>${esc(s.address)}</li>
          <li>${esc(s.hours)}</li>
          <li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>
          <li><a href="tel:${esc(s.phone.replace(/\s/g, ''))}">${esc(s.phone)}</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer__bottom">
      <p>© ${year} Cedarline. A demo store — products, prices and contact details are fictional.</p>
      <p>Prices in USD · Cash on delivery across Lebanon</p>
    </div>
  </footer>`;
}

/* ── Counters ─────────────────────────────────────────────────── */
function setCount(sel, n) {
  for (const el of $$(sel)) {
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
    const link = el.closest('a');
    if (link) {
      const base = sel === '[data-cart-count]' ? 'Cart' : 'Wishlist';
      link.setAttribute('aria-label', n ? `${base}, ${n} item${n === 1 ? '' : 's'}` : base);
    }
  }
}
const updateCounts = () => {
  setCount('[data-cart-count]', cart.count());
  setCount('[data-wish-count]', wishlist.count());
};

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
    drawer.querySelector('.drawer__panel a, .drawer__panel button')?.focus();
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) close();
  });
}

/* ── Search with suggestions ──────────────────────────────────── */
function bindSearch() {
  const form = $('[data-search]');
  const input = $('#site-search');
  const box = $('#search-suggest');
  const header = $('[data-header]');
  const toggle = $('[data-search-toggle]');
  if (!form) return;

  toggle?.addEventListener('click', () => {
    const on = !header.classList.contains('search-open');
    header.classList.toggle('search-open', on);
    toggle.setAttribute('aria-expanded', String(on));
    if (on) input.focus();
  });

  const hide = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); };

  const render = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { hide(); return; }
    const results = (await catalog.search(q)).slice(0, 5);
    const all = `<a class="suggest__all" href="search.html?q=${encodeURIComponent(q)}">See all results for “${esc(q)}”${icon('arrow', { size: 16 })}</a>`;
    box.innerHTML = results.length
      ? `<ul>${results.map((p) => `<li><a href="${productUrl(p)}"><img src="${esc(p.images[0])}" alt="" width="44" height="44"><span>${esc(p.name)}</span><span class="suggest__price">${formatPrice(p.price)}</span></a></li>`).join('')}</ul>${all}`
      : `<p class="suggest__empty">No matches for “${esc(q)}”.</p>`;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }, 120);

  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) render(); });
  form.addEventListener('submit', (e) => {
    if (!input.value.trim()) { e.preventDefault(); input.focus(); }
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
      err.textContent = 'Enter a valid email address.';
      form.email.setAttribute('aria-invalid', 'true');
      form.email.focus();
      return;
    }
    err.textContent = '';
    form.email.removeAttribute('aria-invalid');
    form.reset();
    toast('Thanks — you’re on the list.');
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

  bindMenu();
  bindSearch();
  bindNewsletter();
  bindActions();

  updateCounts();
  cart.subscribe(updateCounts);
  wishlist.subscribe(() => { updateCounts(); syncWishButtons(); });

  // Sticky header shadow once the page scrolls.
  const header = $('[data-header]');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return { categories };
}
