/**
 * Every page of the site, in one place. The header, the menu, the footer, the
 * wing menu and Valgon all read from here, so adding a page (or a section that
 * Valgon can take people to) is one entry.
 *
 * Routing is by hash (#/tools, #/home/accounts) so the site works on any static
 * host and inside a sandboxed preview.
 */
export type PageId = 'valgon' | 'home' | 'markets' | 'tools' | 'calendar' | 'platforms' | 'contact' | 'legal' | 'portal';

export interface PageSection {
  id: string;
  label: string;
}

export interface PageDef {
  id: PageId;
  label: string;
  /** One line Valgon can say about the page */
  blurb: string;
  sections: PageSection[];
  /** Questions Valgon suggests while this page is open */
  suggestions: string[];
}

export const PAGES: Record<PageId, PageDef> = {
  valgon: {
    id: 'valgon',
    label: 'Valgon',
    blurb: 'Valgon, the Connect Financials guide.',
    sections: [],
    suggestions: ['Show me the falcon', 'Which account suits me?', 'Open Connect View', 'Take me to the calculators'],
  },
  home: {
    id: 'home',
    label: 'Home',
    blurb: 'the falcon, the company and the accounts',
    sections: [
      { id: 'about', label: 'About Connect' },
      { id: 'values', label: 'Speed, precision, trust, growth' },
      { id: 'accounts', label: 'Accounts' },
      { id: 'open-account', label: 'Open an account' },
    ],
    suggestions: ['Compare the accounts', 'What is the Raw account?', 'Open Connect View', 'Open an account'],
  },
  markets: {
    id: 'markets',
    label: 'Connect View',
    blurb: 'live market watch, charts from one minute to daily, the order book, currency strength and trading sessions',
    sections: [
      { id: 'terminal', label: 'Market watch, chart and order book' },
      { id: 'currencies', label: 'Currency strength and sessions' },
    ],
    suggestions: ['Show me the gold chart', 'Which sessions are open?', 'What is the price of Bitcoin?', 'Take me to the calculators'],
  },
  tools: {
    id: 'tools',
    label: 'Tools',
    blurb: 'pip value, margin, position size, profit and loss, and capital and risk calculators',
    sections: [
      { id: 'forex-calculators', label: 'Forex calculators' },
      { id: 'capital-risk', label: 'Capital and risk' },
    ],
    suggestions: ['How do I size a position?', 'Open the economic calendar', 'Show me the accounts'],
  },
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    blurb: 'the economic calendar with high, medium and low impact events',
    sections: [{ id: 'economic-calendar', label: 'Economic calendar' }],
    suggestions: ['Open Connect View', 'Take me to the calculators', 'Talk to a person'],
  },
  platforms: {
    id: 'platforms',
    label: 'Platforms',
    blurb: 'the trading platforms and partners',
    sections: [{ id: 'platforms-list', label: 'Platforms and partners' }],
    suggestions: ['Open the Trader Portal', 'Compare the accounts', 'Talk to a person'],
  },
  contact: {
    id: 'contact',
    label: 'Contact',
    blurb: 'how to reach the team',
    sections: [{ id: 'contact-form', label: 'Contact the team' }],
    suggestions: ['Deposits and withdrawals', 'Is Connect regulated?', 'Open an account'],
  },
  legal: {
    id: 'legal',
    label: 'Legal',
    blurb: 'legal documents, regulation and the risk disclosure',
    sections: [{ id: 'legal-docs', label: 'Legal and regulation' }],
    suggestions: ['Talk to a person', 'Back to the falcon'],
  },
  portal: {
    id: 'portal',
    label: 'Trader Portal',
    blurb: 'the Trader Portal preview: accounts, trading, funds and verification',
    sections: [],
    suggestions: [],
  },
};

/** Header links, in order. Accounts lives on the home page. */
export const NAV: { label: string; page: PageId; section?: string }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Accounts', page: 'home', section: 'accounts' },
  { label: 'Connect View', page: 'markets' },
  { label: 'Tools', page: 'tools' },
  { label: 'Calendar', page: 'calendar' },
  { label: 'Platforms', page: 'platforms' },
  { label: 'Contact', page: 'contact' },
];

export const isPage = (s: string): s is PageId => s in PAGES;

/** Which page an old single-page anchor (#tools, #trade…) now lives on */
export const LEGACY_ANCHORS: Record<string, { page: PageId; section?: string }> = {
  trade: { page: 'markets' },
  markets: { page: 'markets' },
  tools: { page: 'tools' },
  calendar: { page: 'calendar' },
  platforms: { page: 'platforms' },
  contact: { page: 'contact' },
  legal: { page: 'legal' },
  about: { page: 'home', section: 'about' },
  accounts: { page: 'home', section: 'accounts' },
  'open-account': { page: 'home', section: 'open-account' },
  top: { page: 'home' },
  portal: { page: 'portal' },
};
