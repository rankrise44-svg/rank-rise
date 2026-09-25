import { COMPANY, RISK_WARNING_FULL } from '../config/company';
import { goTo } from '../lib/route';
import { MENU } from '../scene/eagle/anchors';
import { scrollToId } from '../story/smoothScroll';

const NAV: { label: string; action: () => void }[] = [
  ...MENU.map((m) => ({ label: m.label, action: () => scrollToId(m.id) })),
  { label: 'Legal', action: () => scrollToId('legal') },
  { label: 'Contact', action: () => scrollToId('contact') },
  { label: 'Trader Portal', action: () => goTo('portal') },
];

const EMAILS = [
  { label: 'General', address: COMPANY.emails.info },
  { label: 'Support', address: COMPANY.emails.support },
  { label: 'Compliance', address: COMPANY.emails.compliance },
];

const colHead = 'text-[10px] font-semibold uppercase tracking-[0.26em] text-gold';
const link = 'text-muted transition-colors hover:text-gold-hi';

export function Footer() {
  const regulation = COMPANY.regulators.map((r) => `the ${r.name} under licence no. ${r.licence}`).join(' and ');

  return (
    <footer className="relative z-20 bg-navy text-[13px] leading-relaxed text-muted">
      <div className="gold-line" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.3fr_1.2fr]">
          {/* Brand */}
          <div>
            <p className="font-display text-lg font-bold uppercase tracking-[0.24em] text-ink">
              Connect <span className="text-gold">Financials</span>
            </p>
            <p className="mt-3 font-display text-sm uppercase tracking-[0.14em] text-gold-hi">{COMPANY.tagline}</p>
            <p className="mt-4 max-w-xs">{COMPANY.description}</p>
          </div>

          {/* Navigation */}
          <nav aria-labelledby="footer-nav">
            <h3 id="footer-nav" className={colHead}>
              Explore
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
              {NAV.map((n) => (
                <li key={n.label}>
                  <button type="button" onClick={n.action} className={`${link} text-left`}>
                    {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className={colHead}>Contact</h3>
            <address className="mt-4 not-italic">{COMPANY.address}</address>
            <ul className="mt-4 space-y-2">
              {EMAILS.map((e) => (
                <li key={e.address}>
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-muted/70">{e.label}</span>
                  <a href={`mailto:${e.address}`} className={`${link} break-all text-ink/85`}>
                    {e.address}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              <a href={COMPANY.social.telegram} target="_blank" rel="noopener noreferrer" className={link}>
                Telegram<span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a href={COMPANY.social.whatsapp} target="_blank" rel="noopener noreferrer" className={link}>
                WhatsApp<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>

          {/* Regulators */}
          <div>
            <h3 className={colHead}>Regulation</h3>
            <ul className="mt-4 space-y-3">
              {COMPANY.regulators.map((r) => (
                <li key={r.licence} className="border-l border-gold/40 pl-3">
                  <span className="block text-ink/90">{r.name}</span>
                  <span className="text-[12px]">
                    Licence no. <span className="num text-gold-hi">{r.licence}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 space-y-4 border-t border-gold/15 pt-6 text-[12px]">
          <p>
            <strong className="font-semibold text-ink">Risk warning:</strong> {RISK_WARNING_FULL}
          </p>
          <p>
            <strong className="font-semibold text-ink">Regulation:</strong> {COMPANY.legalName} is authorised and regulated by {regulation}.
            Registered office: {COMPANY.address}.
          </p>
          <p className="pt-2 text-muted/80">
            © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
