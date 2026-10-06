import { Contact, Legal } from '../sections/LegalContact';
import { PlatformsPartners } from '../sections/PlatformsPartners';
import { Currencies } from '../sections/markets/Currencies';
import { MarketsTerminal } from '../sections/markets/MarketsTerminal';
import { CapitalRiskCalculator } from '../sections/tools/CapitalRiskCalculator';
import { EconomicCalendar } from '../sections/tools/EconomicCalendar';
import { ForexCalculators } from '../sections/tools/ForexCalculators';
import { PageSection, PageShell } from './PageShell';

const gold = (s: string) => <span className="text-gold-hi">{s}</span>;

export function MarketsPage() {
  return (
    <PageShell
      page="markets"
      eyebrow="Connect View"
      title={<>Live markets, {gold('one account')}</>}
      intro="Forex majors and crosses, gold, silver and platinum, global indices, oil and crypto CFDs. Watch the spread, read the chart and see the depth before you trade."
    >
      <PageSection id="terminal" title="Market watch · chart · order book">
        <div className="[perspective:1600px]">
          <MarketsTerminal />
        </div>
      </PageSection>
      <PageSection id="currencies" title="Currencies">
        <Currencies />
      </PageSection>
    </PageShell>
  );
}

export function ToolsPage() {
  return (
    <PageShell page="tools" eyebrow="Tools" title={<>Plan every {gold('trade')}</>} intro="Size positions, check margin and see what a losing streak would do to your capital before you risk it.">
      <PageSection id="forex-calculators" title="Forex calculators">
        <ForexCalculators />
      </PageSection>
      <PageSection id="capital-risk" title="Capital & risk">
        <CapitalRiskCalculator />
      </PageSection>
    </PageShell>
  );
}

export function CalendarPage() {
  return (
    <PageShell page="calendar" eyebrow="Calendar" title={<>Economic {gold('calendar')}</>} intro="The releases that move markets, filtered by impact. Times in UTC.">
      <PageSection id="economic-calendar">
        <EconomicCalendar />
      </PageSection>
    </PageShell>
  );
}

export function PlatformsPage() {
  return (
    <PageShell page="platforms" eyebrow="Platforms" title={<>Platforms & {gold('partners')}</>} intro="MetaTrader 5, WebTrader, ConnectView Studio and FIX API, and the tools around them.">
      <PageSection id="platforms-list">
        <PlatformsPartners />
      </PageSection>
    </PageShell>
  );
}

export function ContactPage() {
  return (
    <PageShell page="contact" eyebrow="Contact" title={<>Talk to {gold('us')}</>} intro="Questions about accounts, funding or the platforms: the team answers by email, Telegram and WhatsApp.">
      <PageSection id="contact-form">
        <Contact />
      </PageSection>
    </PageShell>
  );
}

export function LegalPage() {
  return (
    <PageShell page="legal" eyebrow="Legal" title="Legal & regulation">
      <PageSection id="legal-docs">
        <Legal />
      </PageSection>
    </PageShell>
  );
}
