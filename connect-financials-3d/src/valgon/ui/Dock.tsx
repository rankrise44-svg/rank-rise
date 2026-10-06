import { useEffect, useRef } from 'react';
import { PAGES, type PageId } from '../../config/pages';
import { stopAll } from '../engine';
import { useValgon, valgon } from '../store';
import { Orb } from './Orb';
import { Chips, Composer, Transcript, VoiceToggle } from './Parts';

export const openDock = () => {
  const s = valgon.get();
  valgon.set({ dockOpen: true, suggestions: s.suggestions.length ? s.suggestions : PAGES.valgon.suggestions });
};
export const closeDock = () => valgon.set({ dockOpen: false });

/**
 * Valgon on every other page: a floating orb in the corner that opens into a
 * call panel. The conversation from the first page carries on here.
 */
export function ValgonDock({ page }: { page: PageId }) {
  const { dockOpen, status, mode } = useValgon();
  const panel = useRef<HTMLDivElement>(null);

  // Offer this page's questions when arriving on it with nothing else queued.
  useEffect(() => {
    const s = valgon.get();
    if (s.mode === 'idle' || s.mode === 'listen') valgon.set({ suggestions: PAGES[page].suggestions });
  }, [page]);

  useEffect(() => {
    if (!dockOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDock();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dockOpen]);

  if (page === 'valgon' || page === 'portal') return null;

  return (
    <>
      {!dockOpen && (
        <button type="button" onClick={openDock} className="vg-fab fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-gold/40 bg-abyss/80 py-1.5 pl-1.5 pr-4 backdrop-blur-md transition hover:border-gold-hi sm:bottom-6 sm:right-6" aria-label="Talk to Valgon">
          <Orb detail="compact" className="h-11 w-11" label="" />
          <span className="font-display text-[12px] font-semibold uppercase tracking-[0.24em] text-ink">Valgon</span>
        </button>
      )}
      {dockOpen && (
        <div ref={panel} role="dialog" aria-label="Valgon" className="vg-dock fixed inset-x-2 bottom-2 z-[60] flex max-h-[min(62svh,calc(100svh-7rem))] flex-col sm:max-h-[calc(100svh-7rem)] overflow-hidden rounded-3xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]">
          <header className="flex items-center gap-3 border-b border-gold/15 px-4 py-3">
            <Orb detail="compact" className="h-12 w-12 shrink-0" label="" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-semibold uppercase tracking-[0.26em] text-ink">Valgon</p>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold-hi">
                <span className={`h-1.5 w-1.5 rounded-full ${mode === 'hear' ? 'bg-[#5B8CFF]' : 'bg-gold-hi'} vg-blink`} aria-hidden />
                {status}
              </p>
            </div>
            <VoiceToggle />
            <button type="button" onClick={closeDock} aria-label="Minimise Valgon" title="Minimise" className="grid h-8 w-8 place-items-center rounded-full border border-gold/25 text-ink/85 hover:border-gold-hi">
              –
            </button>
            <button type="button" onClick={() => (stopAll(), closeDock())} aria-label="Stop and close" title="Stop" className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#C0392B] text-[12px] text-white">
              ✕
            </button>
          </header>
          <Transcript className="min-h-[120px] flex-1 px-4 py-3" />
          <Chips className="px-4 pb-2" />
          <div className="border-t border-gold/15 p-3">
            <Composer autoFocus />
          </div>
        </div>
      )}
    </>
  );
}
