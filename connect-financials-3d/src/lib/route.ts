import { useSyncExternalStore } from 'react';
import { isPage, LEGACY_ANCHORS, type PageId } from '../config/pages';
import { scrollToId } from '../story/smoothScroll';

/**
 * Hash routing: #/ is Valgon (the first thing a visitor sees), #/home is the
 * falcon page, #/tools, #/calendar… are the other pages, and #/home/accounts
 * opens a page at a section. Works on any static host and inside a sandboxed
 * preview. Old single-page anchors (#tools, #portal) still land in the right place.
 */
export interface Route {
  page: PageId;
  section: string | null;
}

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  if (!h) return { page: 'valgon', section: null };
  const [first, second] = h.split('/');
  if (isPage(first)) return { page: first, section: second || null };
  const legacy = LEGACY_ANCHORS[first];
  if (legacy) return { page: legacy.page, section: legacy.section ?? null };
  return { page: 'valgon', section: null };
}

/**
 * Every visit starts with Valgon, whatever address the visitor arrives on.
 * The page they asked for (or were on last time) is kept so Valgon can offer it.
 */
const arrived = parse(window.location.hash);
export const requestedOnOpen: Route | null = arrived.page !== 'valgon' ? arrived : null;
const reviewing = new URLSearchParams(window.location.search).has('studio');
let current: Route = reviewing ? arrived : { page: 'valgon', section: null };
if (!reviewing && window.location.hash && window.location.hash !== '#/') {
  history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}#/`);
}
/** Bumps when someone asks for the page they are already on, so the section is shown again */
let nonce = 0;
let snapshot = { ...current, nonce };
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = { ...current, nonce };
  listeners.forEach((l) => l());
};
window.addEventListener('hashchange', () => {
  current = parse(window.location.hash);
  emit();
});

export function useRoute() {
  return useSyncExternalStore(
    (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    () => snapshot,
    () => snapshot,
  );
}

export const currentRoute = () => current;

export function hrefFor(page: PageId, section?: string | null) {
  return page === 'valgon' ? '#/' : `#/${page}${section ? `/${section}` : ''}`;
}

/** Go to a page (and optionally a section on it). */
export function navigate(page: PageId, section?: string | null) {
  const target = hrefFor(page, section);
  if (window.location.hash === target || (page === 'valgon' && !window.location.hash)) {
    nonce++;
    emit();
    return;
  }
  window.location.hash = target;
}

/** Kept for the Trader Portal and older call sites. */
export function goTo(view: 'site' | 'portal') {
  navigate(view === 'portal' ? 'portal' : 'home');
}

/** Wait until a selector exists on the page (pages mount after the hash changes). */
export function waitFor(selector: string, timeout = 4000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) resolve(el);
      else if (performance.now() - t0 > timeout) resolve(null);
      else setTimeout(tick, 80);
    };
    tick();
  });
}

/** Bring a section into view once its page has mounted. */
export async function revealSection(section: string) {
  const el = await waitFor(`#${CSS.escape(section)}`);
  if (el) requestAnimationFrame(() => scrollToId(section));
}
