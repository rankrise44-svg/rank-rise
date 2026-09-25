/**
 * Company facts shown on the site.
 *
 * Source: rankrise44-svg/connect-financials (Footer.tsx, LegalTermsAndContactSection.tsx).
 * The live site, connectfinancials.com, could not be reached from the build
 * environment, so none of this has been checked against it.
 *
 * TODO: confirm with client — every field marked `unverified` must be checked
 * against the company's licence documents before launch. Do not add
 * regulation numbers, addresses or performance figures that aren't supplied
 * by the client.
 */
export const COMPANY = {
  brand: 'Connect Financials',
  legalName: 'Connect Financials Ltd', // unverified
  tagline: 'Trade Smarter, Move Faster, Go Further.',
  description:
    'Connect Financials is an international forex and contracts for difference (CFD) brokerage providing multi-bank liquidity, transparent spreads and fast execution.',
  regulators: [
    // unverified — both come from the old repo only
    { name: 'Seychelles Financial Services Authority (SFSA)', licence: 'SD244' },
    { name: 'Comoros Financial Services Authority (CFSA)', licence: 'HY00523008' },
  ],
  // unverified — the old repo spells this two ways (with and without "302,")
  address: '302, House of Francis, Ile du Port, English River, Mahé, Seychelles',
  emails: {
    info: 'info@connectfinancials.com', // unverified
    support: 'support@connectfinancials.com', // unverified
    compliance: 'compliance@connectfinancials.com', // unverified
  },
  // TODO: confirm with client — the old repo's portal number (+44 20 7946 0912)
  // sits in Ofcom's reserved range for fiction, so it has been left out.
  phone: null as string | null,
  social: {
    telegram: 'https://t.me/connectfinancials', // unverified
    whatsapp: 'https://wa.me/35722250435', // unverified
  },
} as const;

export const RISK_WARNING_SHORT =
  'CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. Only trade with money you can afford to lose.';

export const RISK_WARNING_FULL =
  'Trading foreign exchange (forex) and contracts for difference (CFDs) carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade, carefully consider your investment objectives, level of experience and risk appetite. You may sustain a loss in excess of your initial investment. Only trade with risk capital you can afford to lose.';
