import {
  ArrowRight,
  BarChart3,
  Calculator,
  Gauge,
  Layers,
  LineChart,
  ShieldCheck,
} from 'lucide-react';
import { Hero, LivePricingStrip } from '../components/home/Hero';
import { MarketChartTerminal } from '../components/MarketChartTerminal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Container, Section, SectionHeading } from '../components/ui/Layout';
import { ROUTES } from '../config/site';
import { productClaims } from '../config/compliance';
import { useTrading } from '../state/TradingProvider';
import { useUI } from '../state/UIProvider';

const capabilities = [
  {
    icon: Layers,
    title: 'Aggregated liquidity',
    body: 'Pricing is sourced from multiple bank and non-bank providers and aggregated into a single book, so spreads stay tight through the London and New York sessions.',
  },
  {
    icon: Gauge,
    title: 'Direct STP execution',
    body: 'Orders route straight through to the liquidity pool with no dealing desk between you and the fill. No requotes, no intervention on profitable accounts.',
  },
  {
    icon: Calculator,
    title: 'Risk tooling that comes first',
    body: 'Position sizing, margin and pip value calculators sit alongside the terminal — not buried in a help centre — so exposure is decided before the order, not after.',
  },
];

const platformFeatures = [
  { icon: LineChart, label: 'Charting with drawing tools, Fibonacci and structure markup' },
  { icon: BarChart3, label: 'Level II market depth on every instrument' },
  { icon: ShieldCheck, label: 'Stop loss and take profit attached at order entry' },
];

export function HomePage() {
  const { openAccountModal } = useUI();
  const { currentInstrument, currentCandles, timeframe, setTimeframe, executeTrade } =
    useTrading();

  return (
    <>
      <Hero />
      <LivePricingStrip />

      {/* What the firm actually offers */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Why Connect"
            title="Built around execution quality"
            description="Three things determine what a trading account is worth over a year: the price you get, the speed you get it, and whether you sized the position correctly in the first place."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <Card key={title} padding="lg">
                <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="mt-5 text-h3 font-semibold text-text">{title}</h3>
                <p className="mt-3 text-small leading-relaxed text-text-muted">{body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Platform */}
      <Section>
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="The terminal"
                title="A platform that shows you the whole book"
                description="Charting, depth of market and execution in one view, with the analysis tools most brokers make you leave the site to use."
              />

              <ul className="mt-8 space-y-4">
                {platformFeatures.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span className="text-small text-text-muted">{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button to={ROUTES.platform} variant="secondary">
                  Open the terminal
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* The real terminal, not a drawing of one. It was a static bar
                illustration before, which meant the home page was showing a
                picture of the product instead of the product. */}
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line">
              <MarketChartTerminal
                instrument={currentInstrument}
                candles={currentCandles}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                onExecuteTrade={executeTrade}
                showOrderEntry={false}
              />
            </div>
          </div>
        </Container>
      </Section>

      {/* Closing call to action */}
      <Section bordered={false}>
        <Container>
          <Card padding="lg" className="text-center">
            <h2 className="text-h2 font-bold text-text">Start on a demo, move when you're ready</h2>
            <p className="mx-auto mt-4 max-w-xl text-body text-text-muted">
              A {productClaims.demoAccountBalance} practice account runs on the same pricing and the
              same terminal as a live one. No deposit, no card.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => openAccountModal('demo')}>
                Try a demo account
              </Button>
              <Button variant="secondary" size="lg" onClick={() => openAccountModal('plus')}>
                Open a live account
              </Button>
            </div>
          </Card>
        </Container>
      </Section>
    </>
  );
}

