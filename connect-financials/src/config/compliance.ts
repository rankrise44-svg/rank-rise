/**
 * Connect Financials — regulatory & compliance data.
 *
 * ---------------------------------------------------------------------------
 * DRAFT. Every value below is marked `verified: false`.
 * ---------------------------------------------------------------------------
 * These figures were lifted verbatim from the components they were previously
 * hard-coded into (Footer, LegalTermsAndContactSection). Nothing here has been
 * checked against a regulator's public register, and nothing here was invented.
 *
 * To take this live:
 *   1. Confirm or correct each entry.
 *   2. Flip `verified` to true on the entries you have confirmed.
 *   3. Set COMPLIANCE_REVIEWED below to true.
 *
 * Until COMPLIANCE_REVIEWED is true the UI renders a draft notice and
 * `npm run check:compliance` fails, so unverified claims cannot ship by
 * accident. See docs/COMPLIANCE.md.
 */

/** Flip to true only after a compliance review has signed off on this file. */
export const COMPLIANCE_REVIEWED = false;

export interface Licence {
  /** Regulator's full name. */
  authority: string;
  /** Regulator's common abbreviation. */
  abbreviation: string;
  jurisdiction: string;
  licenceNumber: string;
  /** Public register URL. Needed before any "regulated" claim is made. */
  registerUrl: string | null;
  verified: boolean;
}

export interface Office {
  label: string;
  /** True for the address of the licensed entity. */
  registered: boolean;
  lines: string[];
  verified: boolean;
}

export const legalEntity = {
  name: 'Connect Financials Ltd',
  /** Company registration number — not present anywhere in the original site. */
  registrationNumber: null as string | null,
  verified: false,
};

export const licences: Licence[] = [
  {
    authority: 'Seychelles Financial Services Authority',
    abbreviation: 'SFSA',
    jurisdiction: 'Seychelles',
    licenceNumber: 'SD244',
    registerUrl: null,
    verified: false,
  },
  {
    authority: 'Comoros Financial Services Authority',
    abbreviation: 'CFSA',
    jurisdiction: 'Union of the Comoros',
    licenceNumber: 'HY00523008',
    registerUrl: null,
    verified: false,
  },
];

export const offices: Office[] = [
  {
    label: 'Registered Office',
    registered: true,
    lines: ['House of Francis, Ile du Port', 'English River', 'Mahé, Seychelles'],
    verified: false,
  },
  {
    label: 'European Office — Cyprus',
    registered: false,
    lines: ['Taki Sofokleous 23A', '2049 Strovolos', 'Nicosia, Cyprus'],
    verified: false,
  },
];

export const contact = {
  general: 'info@connectfinancials.com',
  support: 'support@connectfinancials.com',
  compliance: 'compliance@connectfinancials.com',
  whatsapp: 'https://wa.me/35722250435',
  telegram: 'https://t.me/connectfinancials',
  website: 'https://connectfinancials.com',
  verified: false,
};

/**
 * Product claims that carry regulatory weight. Kept beside the licences
 * because in most jurisdictions the permitted answer depends on the licence
 * and on the client's classification (retail vs. professional).
 */
export const productClaims = {
  maxLeverage: '1:500',
  /** Retail leverage is capped far lower in the EU/UK (30:1 on majors). */
  maxLeverageAppliesTo: 'Professional and non-EU retail clients' as string | null,
  segregatedFunds: true,
  negativeBalanceProtection: null as boolean | null,
  investorCompensationScheme: null as string | null,
  demoAccountBalance: '$50,000',
  verified: false,
};

/**
 * Risk warning. A generic, conservative CFD disclosure — it is NOT tailored to
 * the licences above and carries no firm-specific loss percentage, because that
 * figure has to come from the firm's own client data.
 */
export const riskWarning = {
  short:
    'CFDs are complex instruments and carry a high risk of losing money rapidly due to leverage.',
  /** Most regulators require the firm's actual figure here. */
  lossPercentage: null as number | null,
  full:
    'Trading foreign exchange and contracts for difference on margin carries a high level of risk and may not be suitable for all investors. Leverage works both ways and can amplify losses as readily as gains. You could lose more than your initial deposit. Before trading, consider your investment objectives, level of experience and risk appetite, and seek independent advice if necessary. Past performance is not a reliable indicator of future results.',
  verified: false,
};

/** Jurisdictions the firm does not accept clients from. Required on most sites. */
export const restrictedJurisdictions: string[] | null = null;

/* -------------------------------------------------------------------------- */

/** Every item in the file that still needs a human to confirm it. */
export function outstandingComplianceItems(): string[] {
  const missing: string[] = [];

  if (!legalEntity.verified) missing.push('legalEntity: unverified');
  if (!legalEntity.registrationNumber) missing.push('legalEntity.registrationNumber: missing');

  for (const licence of licences) {
    if (!licence.verified) missing.push(`licence ${licence.abbreviation}: unverified`);
    if (!licence.registerUrl) missing.push(`licence ${licence.abbreviation}.registerUrl: missing`);
  }

  for (const office of offices) {
    if (!office.verified) missing.push(`office "${office.label}": unverified`);
  }

  if (!contact.verified) missing.push('contact: unverified');
  if (!productClaims.verified) missing.push('productClaims: unverified');
  if (productClaims.negativeBalanceProtection === null)
    missing.push('productClaims.negativeBalanceProtection: missing');
  if (productClaims.investorCompensationScheme === null)
    missing.push('productClaims.investorCompensationScheme: missing');
  if (!riskWarning.verified) missing.push('riskWarning: unverified');
  if (riskWarning.lossPercentage === null) missing.push('riskWarning.lossPercentage: missing');
  if (restrictedJurisdictions === null) missing.push('restrictedJurisdictions: missing');

  return missing;
}

/** True when anything in this file is still unconfirmed. */
export function isComplianceDraft(): boolean {
  return !COMPLIANCE_REVIEWED || outstandingComplianceItems().length > 0;
}

/**
 * Whether the UI may describe the firm as regulated.
 *
 * The original header showed a bare "REGULATED" badge with no authority named,
 * which is the specific pattern regulators treat as a misleading claim. The
 * badge now renders only once at least one licence is confirmed, and it always
 * names the authority and number.
 */
export function canClaimRegulated(): boolean {
  return COMPLIANCE_REVIEWED && licences.some((l) => l.verified);
}

/** Licences safe to display. Empty while in draft. */
export function displayableLicences(): Licence[] {
  return COMPLIANCE_REVIEWED ? licences.filter((l) => l.verified) : [];
}
