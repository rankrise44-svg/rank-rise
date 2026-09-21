import { AlertTriangle, FileWarning } from 'lucide-react';
import {
  contact,
  displayableLicences,
  isComplianceDraft,
  legalEntity,
  licences,
  offices,
  outstandingComplianceItems,
  productClaims,
  riskWarning,
} from '../../config/compliance';
import { Container } from '../ui/Layout';

/**
 * Compliance surfaces. All of them read from src/config/compliance.ts — none
 * hold their own copy of a licence number or a risk figure.
 */

/**
 * Standing risk warning.
 *
 * Every major regulator requires a risk disclosure visible on each page of a
 * CFD provider's site, not buried in a terms page. It is deliberately not
 * dismissible.
 */
export function RiskWarningStrip() {
  const percentage = riskWarning.lossPercentage;

  return (
    <div className="border-t border-line bg-surface-1">
      <Container>
        <div className="flex items-start gap-3 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          <p className="text-[12px] leading-[1.6] text-text-muted">
            <span className="font-semibold text-text">Risk warning: </span>
            {riskWarning.short}{' '}
            {percentage !== null ? (
              <>
                <span className="font-semibold text-text">{percentage}%</span> of retail investor
                accounts lose money when trading CFDs with this provider.
              </>
            ) : (
              <span className="text-text-subtle italic">
                [Firm-specific retail loss percentage pending — required by most regulators.]
              </span>
            )}{' '}
            You should consider whether you understand how CFDs work and whether you can afford to
            take the high risk of losing your money.
          </p>
        </div>
      </Container>
    </div>
  );
}

/**
 * Draft banner.
 *
 * Shown whenever anything in the compliance config is unconfirmed. It exists so
 * an unverified regulatory claim cannot quietly reach production — if this strip
 * is visible on a live site, the site is not ready to be live.
 */
export function ComplianceDraftNotice() {
  if (!isComplianceDraft()) return null;

  const outstanding = outstandingComplianceItems();

  return (
    <div className="border-b border-warn/30 bg-warn/10" role="status">
      <Container>
        <div className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <FileWarning className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            <span className="text-[12px] font-semibold text-warn">Draft — not for publication</span>
          </div>
          <span className="text-[12px] text-text-muted">
            {outstanding.length} regulatory {outstanding.length === 1 ? 'item' : 'items'} awaiting
            verification. Regulatory claims are suppressed until{' '}
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-text">
              src/config/compliance.ts
            </code>{' '}
            is signed off.
          </span>
        </div>
      </Container>
    </div>
  );
}

/**
 * Regulatory disclosure block for the footer.
 *
 * While in draft, licences are listed as pending rather than asserted — the
 * data stays visible to whoever is reviewing it, without the site claiming it.
 */
export function RegulatoryDisclosure() {
  const confirmed = displayableLicences();
  const draft = isComplianceDraft();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
          Regulatory status
        </h3>

        {confirmed.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {confirmed.map((licence) => (
              <li key={licence.licenceNumber} className="text-small text-text-muted">
                <span className="text-text">{legalEntity.name}</span> is authorised and regulated by
                the {licence.authority} ({licence.abbreviation}), licence no.{' '}
                <span className="font-mono text-text">{licence.licenceNumber}</span>
                {licence.registerUrl && (
                  <>
                    {' — '}
                    <a
                      href={licence.registerUrl}
                      className="text-accent underline underline-offset-2 hover:text-accent-hover"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      verify on the public register
                    </a>
                  </>
                )}
                .
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-line-strong p-4">
            <p className="text-small text-text-muted">
              Regulatory authorisations are pending verification and are not displayed. The
              following entries are held in draft:
            </p>
            <ul className="mt-3 space-y-1.5">
              {licences.map((licence) => (
                <li key={licence.licenceNumber} className="text-small text-text-subtle">
                  {licence.authority} ({licence.abbreviation}) · licence{' '}
                  <span className="font-mono">{licence.licenceNumber}</span> ·{' '}
                  <span className="italic">unverified</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
          Offices
        </h3>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {offices.map((office) => (
            <li key={office.label} className="text-small">
              <span className="block font-semibold text-text">
                {office.label}
                {draft && !office.verified && (
                  <span className="ml-2 font-normal italic text-text-subtle">(unverified)</span>
                )}
              </span>
              <address className="mt-1 not-italic text-text-muted">
                {office.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
          Risk disclosure
        </h3>
        <p className="mt-3 max-w-4xl text-small leading-relaxed text-text-muted">
          {riskWarning.full}
        </p>
        {productClaims.maxLeverageAppliesTo && (
          <p className="mt-3 max-w-4xl text-small leading-relaxed text-text-subtle">
            Leverage of up to {productClaims.maxLeverage} is available to{' '}
            {productClaims.maxLeverageAppliesTo.toLowerCase()}. Retail client leverage is capped at
            lower levels in several jurisdictions, including the EU and UK.
          </p>
        )}
        <p className="mt-3 text-small text-text-muted">
          Compliance enquiries:{' '}
          <a
            href={`mailto:${contact.compliance}`}
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {contact.compliance}
          </a>
        </p>
      </div>
    </div>
  );
}
