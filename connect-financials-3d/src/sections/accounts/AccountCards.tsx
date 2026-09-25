import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ACCOUNT_TIERS } from '../../data/market';
import { RiskNote } from '../../ui/RiskNote';
import { openAccount } from '../../ui/openAccount';

type Tier = (typeof ACCOUNT_TIERS)[number];

const MAX_TILT = 9; // degrees

/** True when the device has a fine hover pointer and motion is allowed. */
function useCanTilt() {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setCan(hover.matches && !reduce.matches);
    update();
    hover.addEventListener('change', update);
    reduce.addEventListener('change', update);
    return () => {
      hover.removeEventListener('change', update);
      reduce.removeEventListener('change', update);
    };
  }, []);
  return can;
}

/** All account tiers as tilting glass cards. No heading: the page supplies it. */
export function AccountCards() {
  const canTilt = useCanTilt();
  return (
    <div>
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3" aria-label="Account types">
        {ACCOUNT_TIERS.map((tier) => (
          <li key={tier.id} className="[perspective:1100px]">
            <TierCard tier={tier} canTilt={canTilt} />
          </li>
        ))}
      </ul>
      <RiskNote className="mx-auto mt-8 max-w-2xl text-center" />
    </div>
  );
}

function TierCard({ tier, canTilt }: { tier: Tier; canTilt: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const headingId = `acct-${tier.id}-name`;

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!canTilt || e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${((0.5 - py) * MAX_TILT * 2).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      el.style.setProperty('--sheen', '1');
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--sheen', '0');
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (!canTilt) onLeave();
  }, [canTilt]);

  const specs: [string, string][] = [
    ['Spread', tier.spread],
    ['Commission', tier.commission],
    ['Leverage', tier.leverage],
    ['Execution', tier.execution],
    ['Minimum lot', tier.minLot],
    ['Instruments', tier.instruments],
  ];

  return (
    <article
      ref={ref}
      aria-labelledby={headingId}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))', transformStyle: 'preserve-3d' }}
      className={`group relative flex h-full flex-col rounded-3xl p-[1px] transition-transform duration-300 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none ${
        tier.popular
          ? 'bg-gradient-to-br from-gold-hi via-gold-dark to-gold shadow-[0_0_60px_-12px_rgba(212,175,55,0.55)]'
          : 'bg-gradient-to-br from-gold/60 via-gold/10 to-gold/40'
      }`}
    >
      <div className={`glass relative flex h-full flex-col overflow-hidden rounded-[calc(1.5rem-1px)] !border-0 p-6 sm:p-7 ${tier.popular ? 'bg-navy/60' : ''}`}>
        {/* Moving sheen that follows the pointer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: 'var(--sheen, 0)',
            background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgba(245,210,122,0.18), rgba(212,175,55,0.06) 35%, transparent 60%)',
          }}
        />
        {/* Static top edge highlight */}
        <div aria-hidden className="gold-line absolute inset-x-6 top-0 opacity-80" />

        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
              tier.popular ? 'bg-gold text-abyss font-semibold' : 'border border-gold/35 text-gold-hi'
            }`}
          >
            {tier.badge}
          </span>
        </div>

        <h3 id={headingId} className="relative mt-5 font-display text-2xl font-semibold tracking-wide text-ink">
          {tier.name}
        </h3>

        <div className="relative mt-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Minimum deposit</p>
          <p className="num mt-1 font-display text-4xl font-semibold text-gold-hi">${tier.minDeposit.toLocaleString('en-US')}</p>
        </div>

        <dl className="relative mt-6 space-y-2.5 border-t border-gold/15 pt-5 text-sm">
          {specs.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="text-right text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <ul className="relative mt-5 space-y-2 border-t border-gold/15 pt-5 text-sm text-ink/90">
          {tier.features.map((f) => (
            <li key={f} className="flex gap-2.5">
              <svg aria-hidden viewBox="0 0 12 12" className="mt-[5px] h-3 w-3 shrink-0 text-gold">
                <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="relative mt-auto pt-7">
          <button
            type="button"
            onClick={() => openAccount(tier.id)}
            className={`w-full rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition-colors ${
              tier.popular
                ? 'bg-gradient-to-r from-gold to-gold-hi text-abyss hover:from-gold-hi hover:to-gold-hi'
                : 'border border-gold/60 text-gold-hi hover:bg-gold/15'
            }`}
          >
            Open {tier.name}
          </button>
        </div>
      </div>
    </article>
  );
}
