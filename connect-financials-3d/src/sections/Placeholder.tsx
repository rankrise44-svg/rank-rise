import type { ReactNode } from 'react';

/** A section that exists (so every option scrolls somewhere) but whose full build is a later stage. */
export function Section({ id, eyebrow, title, children, stage }: { id: string; eyebrow: string; title: string; children: ReactNode; stage: string }) {
  return (
    <section id={id} className="relative z-20 border-t border-gold/10 bg-abyss px-6 py-24 outline-none sm:px-12 lg:px-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[clamp(2rem,5vw,4rem)] font-semibold uppercase leading-none text-ink">{title}</h2>
      <div className="mt-6 max-w-3xl text-muted">{children}</div>
      <p className="mt-8 inline-block rounded-full border border-dashed border-gold/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted">
        Full 3D beat: {stage}
      </p>
    </section>
  );
}
