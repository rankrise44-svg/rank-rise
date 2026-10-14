import { useEffect, useRef, type ReactNode } from 'react';
import { navigate } from '../lib/route';
import { Contact } from '../sections/LegalContact';

/**
 * Pages that open inside the universe: clicking their planet shows them here,
 * on glass over the moving universe, with Back (top left, Escape, or the
 * browser's back) returning to the planets. Add a page by adding an entry.
 */
export const IN_UNIVERSE: Record<string, { eyebrow: string; title: ReactNode; intro?: string; body: () => ReactNode }> = {
  contact: {
    eyebrow: 'Contact',
    title: (
      <>
        Talk to <span className="text-gold-hi">us</span>
      </>
    ),
    intro: 'Questions about accounts, funding or the platforms: the team answers by email, Telegram and WhatsApp.',
    body: () => <Contact />,
  },
};

export function PlanetPanel({ id }: { id: string }) {
  const def = IN_UNIVERSE[id];
  const back = useRef<HTMLButtonElement>(null);
  const close = () => navigate('universe');

  useEffect(() => {
    back.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id]);

  if (!def) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="planet-panel-title" className="fixed inset-x-0 bottom-0 top-8 z-50 overflow-y-auto overscroll-contain px-3 pb-8 sm:px-8" data-lenis-prevent>
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
      </article>
    </div>
  );
}
