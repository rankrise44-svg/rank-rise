/**
 * Site-level configuration: brand, routes and navigation.
 *
 * Navigation lives here rather than inside the header so the header, footer,
 * mobile drawer and sitemap cannot drift apart — previously each kept its own
 * hand-written list.
 */

export const ROUTES = {
  home: '/',
  platform: '/platform',
  markets: '/markets',
  accounts: '/accounts',
  tools: '/tools',
  about: '/about',
  legal: '/legal',
  portal: '/portal',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export interface NavItem {
  label: string;
  to: RoutePath;
  /** Shown in the mobile drawer and mega-menu; omitted in the top bar. */
  description?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Primary navigation, in the order it appears in the header. */
export const primaryNav: NavGroup[] = [
  {
    label: 'Markets',
    items: [
      {
        label: 'Instruments',
        to: ROUTES.markets,
        description: '50+ FX pairs, spot gold and silver with live pricing',
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        label: 'Trading terminal',
        to: ROUTES.platform,
        description: 'Charting, Level II depth and one-click execution',
      },
    ],
  },
  {
    label: 'Accounts',
    items: [
      {
        label: 'Account types',
        to: ROUTES.accounts,
        description: 'Compare spreads, commission and minimum deposit',
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        label: 'Calculators',
        to: ROUTES.tools,
        description: 'Position size, margin, pip value and risk exposure',
      },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About us', to: ROUTES.about, description: 'Who we are and how we operate' },
      { label: 'Legal & contact', to: ROUTES.legal, description: 'Terms, policies and offices' },
    ],
  },
];

/** Footer columns. Flat lists — the footer is a directory, not a menu. */
export const footerNav: NavGroup[] = [
  {
    label: 'Trading',
    items: [
      { label: 'Instruments', to: ROUTES.markets },
      { label: 'Trading terminal', to: ROUTES.platform },
      { label: 'Account types', to: ROUTES.accounts },
      { label: 'Calculators', to: ROUTES.tools },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About us', to: ROUTES.about },
      { label: 'Legal & contact', to: ROUTES.legal },
      { label: 'Client portal', to: ROUTES.portal },
    ],
  },
];

export const brand = {
  name: 'Connect Financials',
  /** Sits under the wordmark. Kept factual — no regulatory claim. */
  descriptor: 'Forex & CFD Brokerage',
  tagline: 'Trade smarter, move faster, go further',
} as const;
