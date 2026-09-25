import { ArrowRight, Calculator, Check, MonitorPlay, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EagleEyeMotionVisual } from '../EagleEyeMotionVisual';
import { MotionChartBackground } from '../MotionChartBackground';
import { Button } from '../ui/Button';
import { Container } from '../ui/Layout';
import { Eyebrow } from '../ui/Badge';
import { ROUTES } from '../../config/site';
import { productClaims } from '../../config/compliance';
import { useTrading } from '../../state/TradingProvider';
import { useUI } from '../../state/UIProvider';

/**
 * Hero trust row.
 *
 * Sourced from the compliance config so a claim can be withdrawn in one place.
 * `segregatedFunds` is a regulatory statement: it only appears while the config
 * asserts it, and the site-wide draft banner flags that it is unconfirmed.
 */
function trustPoints(): string[] {
  const points = ['Low spreads', 'Instant $0 deposit', `Free ${productClaims.demoAccountBalance} practice`];
  if (productClaims.segregatedFunds) points.splice(1, 0, 'Segregated client funds');
  return points;
}

/**
 * Landing hero.
 *
 * The golden eagle is the brand's hero image and keeps the right-hand column.
 * What changed is the framing around it: the headline is sentence case instead
 * of three lines of all-caps, and the two instructional call-outs that used to
 * sit on top of the artwork ("press the crosshair to enter Motion FX") are gone,
 * so the image reads as the brand statement it is rather than as a control
 * panel. Live pricing moved to its own strip directly below.
 */
export function Hero() {
  const { openAccountModal } = useUI();

  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* The animated chart/earth backdrop, restored — but confined to the hero
          instead of running fixed behind every route. The translateZ makes this
          wrapper a containing block, so the component's own `fixed inset-0` is
          clipped to the hero rather than covering the viewport, and the reduced
          opacity keeps the headline readable over it. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-45"
        style={{ transform: 'translateZ(0)' }}
        aria-hidden="true"
      >
        <MotionChartBackground />
      </div>

      <div className="fintech-grid-pattern absolute inset-0 opacity-60" aria-hidden="true" />

      <Container wide className="relative">
        <div className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-20">
          {/* Proposition */}
          <div>
            <Eyebrow>Institutional liquidity, retail access</Eyebrow>

            <h1 className="mt-5 text-[38px] font-bold leading-[1.08] tracking-[-0.022em] text-text sm:text-[46px] lg:text-[52px]">
              Trade smarter, move faster, go further
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-text-muted">
              Raw spreads from 0.0 pips through aggregated multi-bank liquidity, direct STP
              execution, and the risk tooling to size every position before you take it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button variant="primary" size="lg" onClick={() => openAccountModal('plus')}>
                Open live account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => openAccountModal('demo')}>
                Try free {productClaims.demoAccountBalance} demo
              </Button>
            </div>

            {/* Secondary entry points. The original hero surfaced both of these
                as buttons; they are destinations, not conversions, so they read
                as links here. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                to={ROUTES.tools}
                className="inline-flex items-center gap-2 text-small font-medium text-text-muted
                           transition-colors hover:text-accent"
              >
                <Calculator className="h-4 w-4" aria-hidden="true" />
                Risk calculator
              </Link>
              <Link
                to={ROUTES.platform}
                className="inline-flex items-center gap-2 text-small font-medium text-text-muted
                           transition-colors hover:text-accent"
              >
                <MonitorPlay className="h-4 w-4" aria-hidden="true" />
                Web terminal
              </Link>
            </div>

            {/* Trust row, restored from the original hero. Each claim is drawn
                from the compliance config rather than typed into the markup, so
                any of them can be pulled in one place. */}
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
              {trustPoints().map((point) => (
                <li key={point} className="flex items-center gap-1.5 text-small text-text-muted">
                  <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>

            {/* Proof points. Max leverage is read from the compliance config
                because it is jurisdiction-dependent — retail leverage is capped
                far lower in the EU and UK than the headline figure. */}
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-8 sm:grid-cols-4">
              {[
                { value: '0.0', unit: 'pips', label: 'Min. spread' },
                { value: '<10', unit: 'ms', label: 'Avg. execution' },
                { value: productClaims.maxLeverage, unit: '', label: 'Max leverage' },
                { value: '50+', unit: '', label: 'Instruments' },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="sr-only">{item.label}</dt>
                  <dd>
                    <span className="font-mono text-[22px] font-semibold tabular-nums text-text">
                      {item.value}
                    </span>
                    {item.unit && (
                      <span className="ml-1 font-mono text-[13px] text-text-muted">{item.unit}</span>
                    )}
                    <span className="mt-1 block text-micro font-semibold uppercase tracking-[0.08em] text-text-subtle">
                      {item.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The eagle */}
          <div className="relative">
            <EagleEyeMotionVisual onOpenAccount={(tier) => openAccountModal(tier ?? 'plus')} />
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Live pricing strip.
 *
 * Sits under the hero so the board is still the first data on the page, without
 * taking the column the eagle earns.
 */
export function LivePricingStrip() {
  const { instruments, flashingTicks, setSelectedInstrumentId } = useTrading();
  const featured = instruments.slice(0, 6);

  return (
    <section className="border-b border-line bg-surface-1">
      <Container wide>
        <div className="flex items-center justify-between py-3.5">
          <span className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
            Live pricing
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden="true" />
            Simulated feed
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((inst) => {
            const flash = flashingTicks[inst.id];
            const positive = inst.change24h >= 0;

            return (
              <li key={inst.id} className="bg-surface-1">
                <button
                  type="button"
                  onClick={() => setSelectedInstrumentId(inst.id)}
                  className="flex w-full cursor-pointer flex-col gap-1 px-4 py-4 text-left
                             transition-colors duration-[var(--duration-fast)] hover:bg-surface-2"
                >
                  <span className="text-[13px] font-semibold text-text">{inst.symbol}</span>

                  <span
                    className={[
                      'font-mono text-[17px] font-semibold tabular-nums transition-colors',
                      flash === 'up' ? 'text-up' : flash === 'down' ? 'text-down' : 'text-text',
                    ].join(' ')}
                  >
                    {inst.bid.toFixed(inst.digits)}
                  </span>

                  <span
                    className={`flex items-center gap-1 font-mono text-[12px] tabular-nums ${
                      positive ? 'text-up' : 'text-down'
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    )}
                    {positive ? '+' : ''}
                    {inst.change24h.toFixed(2)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end py-3">
          <Button to={ROUTES.markets} variant="ghost" size="sm">
            View all instruments
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </Container>
    </section>
  );
}
