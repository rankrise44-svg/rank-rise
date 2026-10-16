import { $, $$, esc, icon } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid, skeletonGrid } from '../ui/product-card.js';
import { heroFeatures, valueStrip, featureItems } from '../ui/values.js';
import { HERO_SLIDES, PROMO_BANNERS } from '../data/content.js';
import * as catalog from '../services/catalog.js';

const dealsEl = $('[data-deals]');
const bestEl = $('[data-best]');
dealsEl.innerHTML = skeletonGrid(6);
bestEl.innerHTML = skeletonGrid(6);

const { categories } = await initLayout();

/* ── Hero slider ──────────────────────────────────────────────── */
function initHero() {
  const root = $('[data-hero]');
  const track = $('[data-hero-track]');
  const dots = $('[data-hero-dots]');
  const pauseBtn = $('[data-hero-pause]');
  const n = HERO_SLIDES.length;

  track.innerHTML = HERO_SLIDES.map((s, i) => {
    const H = i === 0 ? 'h1' : 'h2';
    return `<div class="hero__slide${i === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}" ${i ? 'aria-hidden="true"' : ''} data-slide>
      <div class="hero__art"><img src="${esc(s.image)}" alt="" width="1200" height="800" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></div>
      <div class="hero__badge" aria-hidden="true">${esc(s.badge.top)}<strong>${esc(s.badge.big)}</strong>${esc(s.badge.bottom)}</div>
      <div class="container"><div class="hero__copy">
        <p class="hero__eyebrow">${esc(s.eyebrow)}</p>
        <${H} class="hero__title">${esc(s.title)} <span class="hero__accent">${esc(s.accent)}</span></${H}>
        <p class="hero__text">${esc(s.text)}</p>
        <div class="hero__ctas">
          <a class="btn btn--gold btn--lg" href="${esc(s.primary.href)}" ${i ? 'tabindex="-1"' : ''}>${esc(s.primary.label)} ${icon('arrow', { size: 16 })}</a>
          <a class="btn btn--ghost-light btn--lg" href="${esc(s.secondary.href)}" ${i ? 'tabindex="-1"' : ''}>${esc(s.secondary.label)}</a>
        </div>
      </div></div>
    </div>`;
  }).join('');
  dots.innerHTML = HERO_SLIDES.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Show slide ${i + 1}" aria-current="${i === 0}"></button>`).join('');

  const slides = $$('[data-slide]', track);
  let index = 0;
  let timer = null;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function go(i) {
    index = (i + n) % n;
    slides.forEach((el, k) => {
      const on = k === index;
      el.classList.toggle('is-active', on);
      el.toggleAttribute('aria-hidden', !on);
      $$('a', el).forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
    });
    $$('[data-dot]', dots).forEach((d, k) => d.setAttribute('aria-current', String(k === index)));
  }
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { stop(); if (!paused) timer = setInterval(() => go(index + 1), 6500); };
  const setPaused = (p) => {
    paused = p;
    pauseBtn.textContent = p ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
    start();
  };

  $('[data-hero-prev]').addEventListener('click', () => { go(index - 1); start(); });
  $('[data-hero-next]').addEventListener('click', () => { go(index + 1); start(); });
  dots.addEventListener('click', (e) => { const d = e.target.closest('[data-dot]'); if (d) { go(Number(d.dataset.dot)); start(); } });
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', start);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(index + 1); }
    if (e.key === 'ArrowLeft') { go(index - 1); }
  });
  // Swipe on touch screens
  let x0 = null;
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) { go(index + (dx < 0 ? 1 : -1)); start(); }
    x0 = null;
  });
  setPaused(paused);
}

/* ── Rail (deals carousel) ────────────────────────────────────── */
function initRail(track, prev, next) {
  const step = () => track.clientWidth * 0.9;
  const sync = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step() }));
  next.addEventListener('click', () => track.scrollBy({ left: step() }));
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
}

initHero();
$('[data-features]').innerHTML = featureItems(heroFeatures());
$('[data-values]').innerHTML = featureItems(valueStrip(), 'value');

$('[data-cats]').innerHTML = categories.map((c) => `
  <a class="cat" href="shop.html?category=${c.id}">
    <span class="cat__img"><img src="${esc(c.icon)}" alt="" loading="lazy" width="112" height="112"></span>
    <span>${esc(c.name)}</span>
  </a>`).join('');

$('[data-banners]').innerHTML = PROMO_BANNERS.map((b) => `
  <a class="banner banner--${b.theme}" href="${esc(b.href)}">
    <h3>${esc(b.title)}</h3>
    <p>${esc(b.text)}</p>
    <span class="btn btn--gold btn--sm">${esc(b.cta)}</span>
    <img src="${esc(b.image)}" alt="" loading="lazy" width="400" height="400">
  </a>`).join('');

const [deals, products, brands] = await Promise.all([catalog.getDeals(12), catalog.getProducts(), catalog.getBrands()]);
dealsEl.innerHTML = productGrid(deals, categories);
dealsEl.removeAttribute('aria-busy');
initRail(dealsEl, $('[data-rail-prev]'), $('[data-rail-next]'));

const best = catalog.sortProducts(products.filter((p) => p.badges.includes('bestseller')), 'featured').slice(0, 6);
bestEl.innerHTML = productGrid(best, categories);
bestEl.removeAttribute('aria-busy');

$('[data-brands]').innerHTML = brands.map((b) => `<a class="brand-tile" href="shop.html?brand=${b.id}" aria-label="Shop ${esc(b.name)}"><img src="${esc(b.logo)}" alt="${esc(b.name)}" width="240" height="80" loading="lazy"></a>`).join('');
