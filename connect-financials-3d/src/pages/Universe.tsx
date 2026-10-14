import { useEffect } from 'react';
import { NAV } from '../config/pages';
import { navigate } from '../lib/route';
import { CosmicBackdrop } from '../ui/CosmicBackdrop';
import { OrbitMenu } from '../ui/OrbitMenu';
import { RiskNote } from '../ui/RiskNote';
import { useValgon } from '../valgon/store';
import { Orb } from '../valgon/ui/Orb';
import { Composer, Transcript, VoiceToggle } from '../valgon/ui/Parts';

/**
 * The first page: the Connect Financials universe. A gold sun with every
 * page a planet on its own orbit (pointing at a planet freezes the
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
    <main data-page="universe" className="cf-stars relative flex h-[100svh] min-h-[620px] flex-col overflow-hidden px-4 pb-3 pt-24 sm:px-10">
      <CosmicBackdrop />
      {/* the logo and the name are in the header above; the page title stays for screen readers */}
      <h1 className="sr-only">Connect Financials</h1>
      <OrbitMenu big label="Pages" items={[{ label: 'Valgon', page: 'valgon' }, ...NAV]} isActive={() => false} onGo={(n) => navigate(n.page, n.section)} />
      <ValgonBar />
      <RiskNote className="relative z-40 mx-auto mt-2 text-center" />
    </main>
  );
}

/** Valgon below the universe: his eye, his last words, and the voice and text box. */
function ValgonBar() {
  const { lines, status, interim } = useValgon();
  return (
    <section aria-label="Ask Valgon" className="relative z-40 mx-auto mt-2 w-full max-w-2xl rounded-3xl border border-gold/20 bg-abyss/60 p-2.5 backdrop-blur-md sm:p-3">
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
      <Composer />
    </section>
  );
}
