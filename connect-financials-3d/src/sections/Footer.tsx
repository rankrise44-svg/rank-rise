import { COMPANY, RISK_WARNING_FULL } from '../config/company';

export function Footer() {
  return (
    <footer className="relative z-20 border-t border-gold/20 bg-navy px-6 pb-10 pt-14 text-[12px] leading-relaxed text-muted sm:px-12 lg:px-24">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.28em] text-ink">
            Connect <span className="text-gold">Financials</span>
          </p>
          <p className="mt-3 max-w-xs">{COMPANY.description}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Registered office</p>
          <p className="mt-2">{COMPANY.address}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Contact</p>
          <ul className="mt-2 space-y-1">
            {Object.values(COMPANY.emails).map((e) => (
              <li key={e}>
                <a className="hover:text-gold-hi" href={`mailto:${e}`}>
                  {e}
                </a>
              </li>
            ))}
            <li>
              <a className="hover:text-gold-hi" href={COMPANY.social.telegram} target="_blank" rel="noopener noreferrer">
                Telegram
              </a>{' '}
              ·{' '}
              <a className="hover:text-gold-hi" href={COMPANY.social.whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-10 space-y-3 border-t border-gold/10 pt-6">
        <p>
          <strong className="text-ink">Risk warning:</strong> {RISK_WARNING_FULL}
        </p>
        <p>
          <strong className="text-ink">Regulation:</strong> {COMPANY.legalName} is authorised and regulated by{' '}
          {COMPANY.regulators.map((r, i) => (
            <span key={r.licence}>
              {i > 0 && ' and '}the {r.name} under licence no. {r.licence}
            </span>
          ))}
          .
        </p>
        <p>
          © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
