import { COMPANY } from '../config/company';
import { MENU } from '../scene/eagle/anchors';
import { scrollToId } from '../story/smoothScroll';
import { goTo } from '../lib/route';
import { openAccount } from '../ui/openAccount';
import { RiskNote } from '../ui/RiskNote';
import { ChartCard } from './ChartCard';
import type { ReactNode } from 'react';

/** Section shell: transparent over the 3D scene, gold eyebrow, big display heading. */
export function Beat({ id, beat, eyebrow, title, intro, children, className = '' }: { id: string; beat: string; eyebrow: string; title: ReactNode; intro?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section id={id} data-beat={beat} aria-labelledby={`${id}-h`} className={`relative z-20 px-4 py-24 outline-none sm:px-8 lg:px-16 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
        <h2 id={`${id}-h`} className="mt-3 max-w-4xl text-balance font-display text-[clamp(2.2rem,5.5vw,5rem)] font-semibold uppercase leading-[0.92] text-ink">
          {title}
        </h2>
        {intro && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

/** Empty gold-edged frame the 3D eagle docks into. */
export function DockFrame({ id, className = '', caption }: { id: string; className?: string; caption?: string }) {
  return (
    <figure className={`relative ${className}`} aria-hidden>
      <div data-eagle-dock={id} className="absolute inset-0 rounded-[28px] border border-gold/35 bg-gradient-to-b from-navy-mid/30 to-abyss/10 shadow-[inset_0_0_80px_rgba(212,175,55,0.08)]" />
      {['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-l border-b', 'right-3 bottom-3 border-r border-b'].map((c) => (
        <span key={c} className={`absolute h-5 w-5 border-gold-hi ${c}`} />
      ))}
      {caption && <figcaption className="absolute inset-x-0 bottom-5 text-center text-[10px] uppercase tracking-[0.3em] text-muted">{caption}</figcaption>}
    </figure>
  );
}

/** Beat 8: big split words with gold double lines, layered cards passing. */
export function SplitWords() {
  const row = (a: string, b: string, k: number) => (
    <div className="flex items-center justify-center gap-3 md:gap-6" data-split-row={k}>
      <span data-split="l" className="font-display text-[clamp(1.5rem,7.4vw,8.5rem)] font-semibold uppercase leading-none text-ink">{a}</span>
      <span data-split="m" className="flex w-[6vw] min-w-5 flex-col gap-1.5" aria-hidden>
        <span className="gold-line" />
        <span className="gold-line" />
      </span>
      <span data-split="r" className="font-display text-[clamp(1.5rem,7.4vw,8.5rem)] font-semibold uppercase leading-none text-transparent [-webkit-text-stroke:1.5px_#F5D27A]">{b}</span>
    </div>
  );
  return (
    <section id="values" data-beat="words" aria-label="Speed, precision, trust, growth" className="relative z-20 overflow-hidden py-[22vh]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div data-par="-0.5" className="absolute left-[4%] top-[6%] w-[40vw] max-w-[230px] opacity-70 blur-[1px]"><ChartCard id="EURUSD" /></div>
        <div data-par="-1.1" className="absolute right-[5%] top-[40%] w-[44vw] max-w-[260px]"><ChartCard id="NAS100" /></div>
        <div data-par="-0.3" className="absolute bottom-[4%] left-[22%] w-[36vw] max-w-[200px] opacity-60 blur-[1.5px]"><ChartCard id="BTCUSD" /></div>
      </div>
      <div className="relative flex flex-col gap-[10vh]">
        {row('Speed', 'Precision', 0)}
        {row('Trust', 'Growth', 1)}
      </div>
    </section>
  );
}

/** Beat 12: the eagle returns calm; quote, CTA, full nav. */
export function Closing() {
  return (
    <section id="open-account" data-beat="closing" aria-labelledby="closing-h" className="relative z-20 flex min-h-[150vh] flex-col items-center justify-end px-4 pb-24 text-center outline-none [text-shadow:0_2px_24px_rgba(5,11,26,0.9)]">
      <blockquote className="max-w-3xl">
        <p id="closing-h" className="text-balance font-display text-[clamp(1.8rem,4.5vw,3.8rem)] font-semibold uppercase leading-[0.98] text-ink">
          “Trade smarter, <span className="text-gold-hi">move faster,</span> go further.”
        </p>
        <footer className="mt-4 text-[11px] uppercase tracking-[0.35em] text-gold">{COMPANY.brand}</footer>
      </blockquote>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => openAccount()}
          className="rounded-full bg-gradient-to-b from-gold-hi to-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-abyss shadow-[0_0_40px_rgba(212,175,55,0.45)] transition hover:brightness-110"
        >
          Open Account
        </button>
        <button type="button" onClick={() => goTo('portal')} className="rounded-full border border-gold/40 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-ink hover:border-gold-hi hover:text-gold-hi">
          Trader Portal
        </button>
      </div>
      <RiskNote className="mt-4 text-center" />
      <nav aria-label="All sections" className="mt-12">
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {MENU.map((m) => (
            <li key={m.id}>
              <a
                href={`#${m.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (m.id === 'open-account') openAccount();
                  else scrollToId(m.id);
                }}
                className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted hover:text-gold-hi"
              >
                {m.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
