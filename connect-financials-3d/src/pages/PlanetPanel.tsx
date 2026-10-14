import { useEffect, useRef, type ReactNode } from 'react';
import { navigate } from '../lib/route';
import { AboutCopy } from '../sections/About';
import { Contact, Legal } from '../sections/LegalContact';
import { PlatformsPartners } from '../sections/PlatformsPartners';
import { AccountCards } from '../sections/accounts/AccountCards';
import { Currencies } from '../sections/markets/Currencies';
import { MarketsTerminal } from '../sections/markets/MarketsTerminal';
import { CapitalRiskCalculator } from '../sections/tools/CapitalRiskCalculator';
import { EconomicCalendar } from '../sections/tools/EconomicCalendar';
import { ForexCalculators } from '../sections/tools/ForexCalculators';
import { RiskNote } from '../ui/RiskNote';
import { greet } from '../valgon/engine';
import { useValgon, valgon } from '../valgon/store';
import { Orb } from '../valgon/ui/Orb';
import { Chips, Composer, Transcript, VoiceToggle } from '../valgon/ui/Parts';

const gold = (s: string) => <span className="text-gold-hi">{s}</span>;

/** A titled block inside a panel (its id is what Valgon scrolls to and points at). */
function Block({ id, title, children }: { id: string; title?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={title ? `${id}-h` : undefined} className="mt-12 scroll-mt-20 first:mt-0">
      {title && (
        <h2 id={`${id}-h`} className="mb-6 flex items-center gap-4 font-display text-lg font-semibold uppercase tracking-[0.12em] text-ink">
          {title}
          <span className="gold-line flex-1 opacity-60" aria-hidden />
        </h2>
      )}
      {children}
    </section>
  );
}

/** Valgon in full, as a panel: his eye, his words, the voice and text box, suggestions. */
function ValgonBody() {
  const { status, voiceReady } = useValgon();
  useEffect(() => {
    if (!valgon.get().lines.length) greet();
  }, []);
  return (
    <div className="flex flex-col items-center">
      <Orb className="h-[min(34svh,340px)] w-[min(34svh,340px)] max-h-[70vw] max-w-[70vw]" />
      <div className="mt-1 flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-hi" aria-live="polite">
          {status || (voiceReady ? 'Listening' : 'Online')}
        </span>
        <VoiceToggle />
      </div>
      <Transcript last={4} className="mt-4 max-h-[26svh] w-full max-w-2xl px-1" />
      <div className="mt-4 w-full max-w-2xl">
        <Composer glass autoFocus big />
        <Chips wrap className="mt-3 justify-center" />
      </div>
    </div>
  );
}

/**
 * Every page, opened inside the universe: clicking a planet shows it here, on
 * glass over the moving universe, with Back (top left, Escape, or the
 * browser's back) returning to the planets.
 */
export const IN_UNIVERSE: Record<string, { eyebrow: string; title: ReactNode; intro?: string; body: () => ReactNode }> = {
  valgon: {
    eyebrow: 'Valgon',
    title: <>Your {gold('AI guide')}</>,
    intro: 'Ask anything about trading and the markets, or tell him where to go. Tap the microphone to talk.',
    body: () => <ValgonBody />,
  },
  home: {
    eyebrow: 'Home',
    title: <>Connect {gold('Financials')}</>,
    intro: 'Trade Smarter, Move Faster, Go Further.',
    body: () => (
      <Block id="about">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,0.85fr)_1fr]">
          <picture className="mx-auto block w-full max-w-[420px]">
            <source media="(max-width: 767.98px)" srcSet="eagle-frames/mobile/0243.webp" />
            <img src="eagle-frames/0243.webp" alt="The Connect Financials falcon, wings spread" className="w-full rounded-2xl object-cover" decoding="async" />
          </picture>
          <div>
            <AboutCopy />
            <button
              type="button"
              onClick={() => navigate('home')}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-hi to-gold px-6 py-2.5 text-sm font-semibold text-abyss shadow-[0_0_30px_rgba(212,175,55,0.35)] transition hover:brightness-110 [text-shadow:none]"
            >
              Watch the falcon story <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </Block>
    ),
  },
  accounts: {
    eyebrow: 'Accounts',
    title: <>Choose your {gold('account')}</>,
    intro: 'Six accounts, from a free demo to VIP institutional. Every one offers leverage up to 1:500.',
    body: () => (
      <Block id="accounts">
        <AccountCards />
      </Block>
    ),
  },
  markets: {
    eyebrow: 'Connect View',
    title: <>Live markets, {gold('one account')}</>,
    intro: 'Forex majors and crosses, gold, silver and platinum, global indices, oil and crypto CFDs. Watch the spread, read the chart and see the depth before you trade.',
    body: () => (
      <>
        <Block id="terminal" title="Market watch · chart · order book">
          <div className="[perspective:1600px]">
            <MarketsTerminal />
          </div>
        </Block>
        <Block id="currencies" title="Currencies">
          <Currencies />
        </Block>
      </>
    ),
  },
  tools: {
    eyebrow: 'Tools',
    title: <>Plan every {gold('trade')}</>,
    intro: 'Size positions, check margin and see what a losing streak would do to your capital before you risk it.',
    body: () => (
      <>
        <Block id="forex-calculators" title="Forex calculators">
          <ForexCalculators />
        </Block>
        <Block id="capital-risk" title="Capital & risk">
          <CapitalRiskCalculator />
        </Block>
      </>
    ),
  },
  calendar: {
    eyebrow: 'Calendar',
    title: <>Economic {gold('calendar')}</>,
    intro: 'The releases that move markets, filtered by impact. Times in UTC.',
    body: () => (
      <Block id="economic-calendar">
        <EconomicCalendar />
      </Block>
    ),
  },
  platforms: {
    eyebrow: 'Platforms',
    title: <>Platforms & {gold('partners')}</>,
    intro: 'MetaTrader 5, WebTrader, ConnectView Studio and FIX API, and the tools around them.',
    body: () => (
      <Block id="platforms-list">
        <PlatformsPartners />
      </Block>
    ),
  },
  contact: {
    eyebrow: 'Contact',
    title: <>Talk to {gold('us')}</>,
    intro: 'Questions about accounts, funding or the platforms: the team answers by email, Telegram and WhatsApp.',
    body: () => (
      <Block id="contact-form">
        <Contact />
      </Block>
    ),
  },
  legal: {
    eyebrow: 'Legal',
    title: 'Legal & regulation',
    body: () => (
      <Block id="legal-docs">
        <Legal />
      </Block>
    ),
  },
};

export function PlanetPanel({ id }: { id: string }) {
  const def = IN_UNIVERSE[id];
  const back = useRef<HTMLButtonElement>(null);
  const close = () => navigate('universe');

  useEffect(() => {
    if (id !== 'valgon') back.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // a dialog above this one (the account form, Valgon's panel) closes first
      if (document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1 || valgon.get().dockOpen) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id]);

  if (!def) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="planet-panel-title" data-panel-id={id} className="fixed inset-x-0 bottom-0 top-8 z-50 overflow-y-auto overscroll-contain px-3 pb-8 sm:px-8" data-lenis-prevent>
      {/* Back, top left, staying in view while the page scrolls */}
      <div className="sticky top-0 z-10 mx-auto flex max-w-6xl pb-3 pt-4">
        <button
          ref={back}
          type="button"
          onClick={close}
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-abyss/55 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink backdrop-blur-sm transition hover:-translate-x-0.5 hover:border-gold-hi hover:text-gold-hi"
        >
          <span aria-hidden="true">←</span> Back
        </button>
      </div>

      <article className="cf-panel-in mx-auto max-w-6xl rounded-3xl border border-gold/15 bg-abyss/35 p-5 backdrop-blur-[3px] [text-shadow:0_1px_6px_rgba(0,0,0,0.9)] sm:p-8 lg:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">{def.eyebrow}</p>
        <h1 id="planet-panel-title" className="mt-3 font-display text-[clamp(2rem,5vw,4rem)] font-semibold uppercase leading-[0.95] text-ink">
          {def.title}
        </h1>
        {def.intro && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/80">{def.intro}</p>}
        <span className="gold-line mt-6 block max-w-xs" aria-hidden />
        <div className="mt-8">{def.body()}</div>
        {id !== 'accounts' && <RiskNote className="mx-auto mt-10 text-center" />}
      </article>
    </div>
  );
}
