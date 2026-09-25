import { COMPANY } from '../config/company';

const VALUES = [
  { title: 'Speed', line: 'Orders routed straight through to our liquidity providers, with no dealing-desk intervention.' },
  { title: 'Precision', line: 'Multi-bank pricing and transparent spreads, so you see what you pay.' },
  { title: 'Trust', line: `Regulated by ${COMPANY.regulators.length} authorities, with identity checks on every account.` },
  { title: 'Growth', line: 'A free demo account, trading tools and education to build skill before you risk capital.' },
];

/**
 * Beat 7 — the About Connect text column (sits beside the eagle portrait).
 * Each paragraph carries `data-type-in` for the typewriter reveal; the full
 * text is always in the DOM.
 */
export function AboutCopy() {
  return (
    <div className="max-w-xl">
      <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
        <span className="inline-block h-px w-8 bg-gold" aria-hidden="true" />
        About {COMPANY.brand}
      </p>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink/90 sm:text-base">
        <p data-type-in>
          {COMPANY.brand} is an international forex and CFD brokerage. We connect traders to multi-bank liquidity through
          transparent spreads and fast execution.
        </p>
        <p data-type-in className="text-muted">
          Choose from a range of accounts — from Standard to raw-spread and institutional tiers, including an Islamic swap-free
          option — and trade currencies, metals, indices, energies and crypto CFDs on MetaTrader 5, WebTrader or our own
          ConnectView charting studio.
        </p>
        <p data-type-in className="text-muted">
          Calculators, an economic calendar and a free demo account are there to help you plan every position before you commit
          real money.
        </p>
      </div>

      <ul className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {VALUES.map((v) => (
          <li key={v.title} className="border-t border-gold/30 pt-3">
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold-hi">{v.title}</h3>
            <p className="mt-1.5 text-[13px] leading-snug text-muted">{v.line}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
