import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { EagleEyeMotionVisual } from '../EagleEyeMotionVisual';
import { Button } from '../ui/Button';
import { Container } from '../ui/Layout';
import { Eyebrow } from '../ui/Badge';
import { ROUTES } from '../../config/site';
import { productClaims } from '../../config/compliance';
import { useTrading } from '../../state/TradingProvider';
import { useUI } from '../../state/UIProvider';

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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => openAccountModal('plus')}>
                Open an account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button to={ROUTES.platform} variant="secondary" size="lg">
                Explore the platform
              </Button>
            </div>

            <p className="mt-4 text-small text-text-subtle">
              Or practise first with a free {productClaims.demoAccountBalance} demo account — no
              deposit required.
            </p>

            {/* Proof points. Deliberately excludes any regulatory claim: those
                live in the footer, sourced from the compliance config. */}
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-8 sm:grid-cols-4">
              {[
                { value: '0.0', unit: 'pips', label: 'Min. spread' },
                { value: '<10', unit: 'ms', label: 'Execution' },
                { value: '50+', unit: '', label: 'Instruments' },
                { value: '24/5', unit: '', label: 'Support' },
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
