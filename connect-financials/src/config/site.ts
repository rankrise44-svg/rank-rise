/**
 * Site-level configuration: brand, routes and navigation.
 *
 * Navigation lives here rather than inside the header so the header, footer,
 * mobile drawer and sitemap cannot drift apart — previously each kept its own
 * hand-written list, which is how the rebuild initially dropped destinations
 * that only existed in one of them.
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

/** Tabs inside the legal section, linkable as /legal?tab=aml */
export type LegalTab = 'terms' | 'risk' | 'execution' | 'aml' | 'privacy' | 'deposits';

export interface NavItem {
  label: string;
  /** Route, optionally with a query string (e.g. '/legal?tab=aml'). */
  to: string;
  description?: string;
  /** Small marker shown beside the label, as the old mega-menu had. */
  tag?: 'FREE' | 'POPULAR' | 'PRIME' | 'NEW';
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
        label: 'Tradable currencies & FX',
        to: ROUTES.markets,
        description: '50+ major, minor and exotic pairs plus spot metals',
      },
      {
        label: 'Quotes & live market watch',
        to: ROUTES.markets,
        description: 'Full screener with bid, ask, spread and 24h range',
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        label: 'Market terminal & Level II DOM',
        to: ROUTES.platform,
        description: 'Candlestick charting with depth of market',
      },
      {
        label: 'ConnectView studio',
        to: ROUTES.platform,
        description: 'Elliott waves, order blocks, Fibonacci and volume profile',
      },
      {
        label: 'Trader portal',
        to: ROUTES.portal,
        description: 'Positions, funding, history and verification',
      },
    ],
  },
  {
    label: 'Accounts',
    items: [
      {
        label: 'Plus account',
        to: ROUTES.accounts,
        description: 'Low spreads, no commission',
        tag: 'POPULAR',
      },
      {
        label: 'Prime account',
        to: ROUTES.accounts,
        description: 'Raw spreads with fixed commission per lot',
        tag: 'PRIME',
      },
      {
        label: 'VIP institutional',
        to: ROUTES.accounts,
        description: 'Dedicated desk and bespoke pricing',
      },
      {
        label: 'Practice demo account',
        to: ROUTES.accounts,
        description: '$50,000 simulated balance, no deposit',
        tag: 'FREE',
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        label: 'Capital risk & position sizer',
        to: ROUTES.tools,
        description: 'Size every trade against a fixed risk budget',
      },
      {
        label: 'Margin & pip calculators',
        to: ROUTES.tools,
        description: 'Required margin, pip value and profit/loss',
      },
      {
        label: 'Macro economic calendar',
        to: ROUTES.tools,
        description: 'Central bank decisions, inflation and GDP releases',
      },
    ],
  },
  {
    label: 'Institutional',
    items: [
      {
        label: 'About Connect Financials',
        to: ROUTES.about,
        description: 'Corporate profile, infrastructure and desk',
      },
      {
        label: 'Regulation & segregated funds',
        to: `${ROUTES.legal}?tab=terms`,
        description: 'Licensing records and client money handling',
      },
      {
        label: 'Terms & official address',
        to: `${ROUTES.legal}?tab=terms`,
        description: 'Registered office and governing terms',
      },
    ],
  },
];

/** Footer directory. Restores the full link set the original footer carried. */
export const footerNav: NavGroup[] = [
  {
    label: 'Quick links',
    items: [
      { label: 'Tradable currencies & FX', to: ROUTES.markets },
      { label: 'Live market watch screener', to: ROUTES.markets },
      { label: 'Live candlestick terminal', to: ROUTES.platform },
      { label: 'ConnectView studio', to: ROUTES.platform },
      { label: 'Economic calendar', to: ROUTES.tools },
    ],
  },
  {
    label: 'Trading accounts',
    items: [
      { label: 'Plus account', to: ROUTES.accounts },
      { label: 'Prime (raw spread) account', to: ROUTES.accounts },
      { label: 'VIP institutional', to: ROUTES.accounts },
      { label: 'Free practice demo account', to: ROUTES.accounts },
      { label: 'Client portal', to: ROUTES.portal },
    ],
  },
  {
    label: 'Trading tools',
    items: [
      { label: 'Capital & risk management calculator', to: ROUTES.tools },
      { label: 'Margin & pip calculators', to: ROUTES.tools },
      { label: 'Profit & loss calculator', to: ROUTES.tools },
    ],
  },
  {
    label: 'Company & legal',
    items: [
      { label: 'About us', to: ROUTES.about },
      { label: 'Terms & conditions', to: `${ROUTES.legal}?tab=terms` },
      { label: 'Risk disclosure', to: `${ROUTES.legal}?tab=risk` },
      { label: 'Order execution policy', to: `${ROUTES.legal}?tab=execution` },
      { label: 'AML & KYC policy', to: `${ROUTES.legal}?tab=aml` },
      { label: 'Privacy policy', to: `${ROUTES.legal}?tab=privacy` },
      { label: 'Deposits & withdrawals', to: `${ROUTES.legal}?tab=deposits` },
    ],
  },
];

export const brand = {
  name: 'Connect Financials',
  /** Sits under the wordmark. Kept factual — no regulatory claim. */
  descriptor: 'Forex & CFD Brokerage',
  tagline: 'Trade smarter, move faster, go further',
} as const;
