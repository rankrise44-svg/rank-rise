import { ACCOUNT_TIERS, INITIAL_INSTRUMENTS } from '../data/market';
import { RiskNote } from '../ui/RiskNote';
import { Section } from './Placeholder';

const count = (c: string) => INITIAL_INSTRUMENTS.filter((i) => i.category === c).length;

export function StubSections() {
  return (
    <>
      <Section id="trade" eyebrow="Trade" title="Markets" stage="Stage 2 — Market Watch, chart terminal, order book">
        <p>
          {INITIAL_INSTRUMENTS.length} instruments: {count('forex_majors')} FX majors, {count('forex_minors')} FX crosses, {count('metals')} metals,{' '}
          {count('indices')} indices, {count('energies')} energies and {count('crypto')} crypto CFDs.
        </p>
      </Section>
      <Section id="accounts" eyebrow="Accounts" title="Trading accounts" stage="Stage 3 — tilting glass account cards">
        <ul className="grid gap-2 sm:grid-cols-2">
          {ACCOUNT_TIERS.map((t) => (
            <li key={t.id} className="flex justify-between gap-4 border-b border-gold/10 py-2">
              <span className="text-ink">{t.name}</span>
              <span className="num text-gold">{t.minDeposit ? `Min $${t.minDeposit.toLocaleString()}` : 'Free'}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="platforms" eyebrow="Platforms" title="Platforms & partners" stage="Stage 4 — logo grid with hover reveals">
        <p>Platform line-up and partner logos to be confirmed with the client.</p>
      </Section>
      <Section id="tools" eyebrow="Tools" title="Calculators & calendar" stage="Stage 3 — forex and capital/risk calculators, economic calendar">
        <p>Pip, margin and position-size calculators, the capital and risk calculator, and the economic calendar.</p>
      </Section>
      <Section id="about" eyebrow="About" title="About Connect" stage="Stage 2 — the eagle shrinks into a portrait card">
        <p>An international forex and CFD brokerage built around multi-bank liquidity, transparent spreads and fast execution.</p>
      </Section>
      <Section id="open-account" eyebrow="Open Account" title="Start trading" stage="Stage 4 — multi-step Open Account form">
        <p>The multi-step application form opens here.</p>
        <RiskNote className="mt-4" />
      </Section>
    </>
  );
}
