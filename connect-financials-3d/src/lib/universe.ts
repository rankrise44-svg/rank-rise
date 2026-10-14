import type { PageId } from '../config/pages';

/**
 * The whole site lives in the universe: each page opens as a panel over it at
 * #/universe/<panel>. This maps a page (and section) to its panel; the Trader
 * Portal (a separate app) has none.
 */
export function panelFor(page: PageId, section?: string | null): string | null {
  if (page === 'home') return section === 'accounts' || section === 'open-account' ? 'accounts' : 'home';
  if (page === 'valgon' || page === 'markets' || page === 'tools' || page === 'calendar' || page === 'platforms' || page === 'contact' || page === 'legal') return page;
  return null;
}
