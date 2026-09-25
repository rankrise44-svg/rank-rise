import { useSyncExternalStore } from 'react';

/**
 * Two views: the site and the Trader Portal. Routed by a bare hash token
 * (#portal) so it works on any static host and inside a sandboxed preview;
 * section anchors never change the hash (they scroll with scrollToId).
 */
export type View = 'site' | 'portal';

const read = (): View => (window.location.hash === '#portal' || window.location.pathname.endsWith('/portal') ? 'portal' : 'site');

export function useView() {
  return useSyncExternalStore(
    (fn) => (window.addEventListener('hashchange', fn), () => window.removeEventListener('hashchange', fn)),
    read,
    read,
  );
}

export function goTo(view: View) {
  window.location.hash = view === 'portal' ? 'portal' : '';
  window.scrollTo(0, 0);
}
