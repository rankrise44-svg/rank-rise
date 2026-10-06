import { useEffect } from 'react';
import { EAGLE_CONFIG } from '../../config/eagle';
import { RISK_WARNING_SHORT } from '../../config/company';
import { hrefFor, navigate } from '../../lib/route';
import { ask, greet, repeatLast } from '../engine';
import { useValgon } from '../store';
import { unlockVoice } from '../voice';
import { Orb } from './Orb';
import { Chips, Composer, Transcript, VoiceToggle } from './Parts';

const DESTINATIONS: { n: string; title: string; sub: string; q: string }[] = [
  { n: '01', title: 'The Falcon', sub: 'Home, the company and the accounts', q: 'Show me the falcon' },
  { n: '02', title: 'Accounts', sub: 'Six accounts, from free demo to VIP', q: 'Compare the accounts' },
  { n: '03', title: 'Connect View', sub: 'Live charts, market watch, order book', q: 'Open Connect View' },
  { n: '04', title: 'Tools', sub: 'Pip, margin, position size, risk', q: 'Take me to the calculators' },
  { n: '05', title: 'Calendar', sub: 'Economic events by impact', q: 'Open the economic calendar' },
  { n: '06', title: 'Platforms', sub: 'Trading platforms and partners', q: 'Show me the platforms' },
  { n: '07', title: 'Open Account', sub: 'A few minutes to start', q: 'Open an account' },
  { n: '08', title: 'Trader Portal', sub: 'Accounts, trading, funds', q: 'Open the Trader Portal' },
];

/** While the visitor talks to Valgon, quietly fetch the first falcon frames so home opens fast. */
function usePrefetchFalcon() {
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const m = await (await fetch(EAGLE_CONFIG.framesManifest)).json();
        const narrow = window.matchMedia('(max-width: 767.98px)').matches;
        const pattern: string = narrow && m.mobilePattern ? m.mobilePattern : m.pattern;
        for (let i = 0; i < Math.min(m.count, 48); i += 4) fetch(pattern.replace('{index}', String(i + 1).padStart(m.pad, '0'))).catch(() => {});
      } catch {
        /* the falcon will load on its own */
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);
}

/**
 * The first page: Valgon, ready to talk. The header stays above, so anyone who
 * would rather not talk can go straight to a page or press the logo.
 */
export function ValgonLanding() {
  const { status, mode, voiceReady } = useValgon();
  usePrefetchFalcon();
  useEffect(() => {
    greet();
  }, []);

  return (
    <main data-page="valgon" className="vg-landing relative flex min-h-[100svh] flex-col items-center overflow-x-clip px-4 pb-8 pt-28 outline-none">
      <div className="vg-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col items-center">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-gold">Valgon</span>
          <span className="h-px w-8 bg-gold/40" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.3em] text-muted">Connect Financials AI guide</span>
        </div>

        <button
          type="button"
          onClick={() => {
            const first = !voiceReady;
            unlockVoice();
            if (first) repeatLast();
          }}
          className="group relative mt-2 rounded-full focus-visible:outline-offset-8"
          aria-label={voiceReady ? 'Valgon' : 'Tap to hear Valgon'}
        >
          <Orb className="h-[min(44svh,480px)] w-[min(44svh,480px)] max-w-[86vw] max-h-[86vw]" />
          {!voiceReady && (
            <span className="absolute inset-x-0 bottom-[12%] mx-auto w-max rounded-full border border-gold/30 bg-abyss/70 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-hi opacity-90 backdrop-blur transition group-hover:border-gold-hi">
              Tap to hear me
            </span>
          )}
        </button>

        <div className="mt-1 flex items-center gap-3">
          <span className={`h-1.5 w-1.5 rounded-full ${mode === 'hear' ? 'bg-[#5B8CFF]' : 'bg-gold-hi'} vg-blink`} aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-hi" aria-live="polite">
            {status}
          </span>
          <VoiceToggle />
        </div>

        <Transcript last={3} className="mt-4 max-h-[22svh] w-full max-w-2xl px-1" />

        <div className="mt-4 w-full max-w-2xl">
          <Composer autoFocus big />
          <Chips wrap className="mt-3 justify-center" />
        </div>

        <nav aria-label="Destinations" className="mt-8 w-full">
          <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {DESTINATIONS.map((d) => (
              <li key={d.n}>
                <button
                  type="button"
                  onClick={() => (unlockVoice(), ask(d.q))}
                  className={`vg-tile group flex h-full w-full flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition sm:p-4 ${
                    d.n === '07' ? 'border-gold bg-gold/90 text-abyss hover:bg-gold-hi' : 'border-gold/20 bg-navy/60 hover:border-gold/60 hover:bg-navy-mid/70'
                  }`}
                >
                  <span className={`num text-[10px] ${d.n === '07' ? 'text-abyss/60' : 'text-gold'}`}>{d.n}</span>
                  <span className={`font-display text-[14px] font-semibold uppercase tracking-[0.12em] ${d.n === '07' ? '' : 'text-ink group-hover:text-gold-hi'}`}>{d.title}</span>
                  <span className={`text-[12px] leading-snug ${d.n === '07' ? 'text-abyss/75' : 'text-muted'}`}>{d.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <a href={hrefFor('home')} onClick={(e) => (e.preventDefault(), navigate('home'))} className="text-[12px] font-semibold uppercase tracking-[0.28em] text-muted transition hover:text-gold-hi">
            Skip, enter the website →
          </a>
          <p className="max-w-xl text-[11px] leading-relaxed text-muted/70">{RISK_WARNING_SHORT}</p>
        </div>
      </div>
    </main>
  );
}
