import { useEffect } from 'react';
import { NAV } from '../config/pages';
import { navigate } from '../lib/route';
import logo from '../assets/logo.svg';
import { CosmicBackdrop } from '../ui/CosmicBackdrop';
import { OrbitMenu } from '../ui/OrbitMenu';
import { RiskNote } from '../ui/RiskNote';
import { useValgon } from '../valgon/store';
import { Orb } from '../valgon/ui/Orb';
import { Composer, Transcript, VoiceToggle } from '../valgon/ui/Parts';

/**
 * The first page: the Connect Financials universe. The logo, a gold sun with
 * every page a planet on its own orbit (pointing at a planet freezes the
 * orbits; clicking it opens that page), and Valgon below, ready to answer by
 * voice or text.
 */
export function UniverseLanding() {
  // Warm up the falcon page (three.js) while the visitor looks around.
  useEffect(() => {
    const t = window.setTimeout(() => void import('./Home'), 2500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main data-page="universe" className="cf-stars relative flex h-[100svh] min-h-[620px] flex-col overflow-hidden px-4 pb-3 pt-14 sm:px-10">
      <CosmicBackdrop />
      <header className="pointer-events-none relative z-40 flex flex-col items-center justify-center gap-2 text-center [@media(max-height:820px)]:flex-row [@media(max-height:820px)]:gap-4">
        <img src={logo} alt="" width={96} height={60} className="h-11 w-auto drop-shadow-[0_0_16px_rgba(212,175,55,0.5)] sm:h-14 [@media(max-height:820px)]:h-9" />
        <h1 className="font-display text-[clamp(1.4rem,3vw,2.5rem)] font-semibold uppercase leading-none tracking-[0.08em] text-ink">
          Connect <span className="text-gold-hi">Financials</span>
        </h1>
      </header>
      <OrbitMenu big label="Pages" items={[{ label: 'Valgon', page: 'valgon' }, ...NAV]} isActive={() => false} onGo={(n) => navigate(n.page, n.section)} />
      <ValgonBar />
      <RiskNote className="relative z-40 mx-auto mt-2 text-center" />
    </main>
  );
}

/** Valgon below the universe, on see-through glass: his eye, his last words, and the voice and text box. */
function ValgonBar() {
  const { lines, status, interim } = useValgon();
  return (
    <section aria-label="Ask Valgon" className="relative z-40 mx-auto mt-2 w-full max-w-2xl rounded-3xl border border-gold/15 bg-abyss/10 p-2.5 backdrop-blur-[1px] [text-shadow:0_1px_6px_rgba(0,0,0,0.95)] sm:p-3">
      <div className="flex items-center gap-3 px-1 pb-2">
        <Orb detail="compact" className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" label="" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">Valgon</span>
            <span className="truncate text-[10px] uppercase tracking-[0.2em] text-muted">{status || 'AI voice and text assistant'}</span>
          </div>
          {lines.length || interim ? (
            <Transcript last={2} className="mt-1 max-h-[4.6rem] pr-1 text-left [&_.vg-line]:gap-0.5" />
          ) : (
            <p className="mt-0.5 text-[13.5px] leading-snug text-ink/90 sm:text-[14.5px]">Ask me anything about trading and the markets, or tell me where to go. Tap the microphone to talk.</p>
          )}
        </div>
        <VoiceToggle className="shrink-0" />
      </div>
      <Composer glass />
    </section>
  );
}
