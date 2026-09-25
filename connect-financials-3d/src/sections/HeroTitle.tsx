import { COMPANY } from '../config/company';
import { scrollToId } from '../story/smoothScroll';
import { RiskNote } from '../ui/RiskNote';
import { openAccount } from '../ui/openAccount';

/**
 * Beat 1. "CONNECT ——— FINANCIALS" split either side of the folded eagle,
 * gold hairlines running in toward it. Blurs and parts on scroll.
 */
export function HeroTitle() {
  return (
    <div className="absolute inset-0" data-hero>
      <h1 className="absolute inset-x-0 top-[2vh] flex flex-col items-center gap-2 px-4 font-display md:top-1/2 md:-translate-y-1/2 font-semibold uppercase leading-none text-ink md:flex-row md:justify-between md:gap-[22vw] md:px-[4vw]">
        <span data-word="left" className="flex w-full items-center justify-center gap-4 md:flex-1 md:justify-end">
          <span className="text-[clamp(2.2rem,4.6vw,6.5rem)] tracking-[-0.01em] [text-shadow:0_0_40px_rgba(5,11,26,0.9)]">Connect</span>
          <span className="gold-line hidden w-[6vw] md:block" aria-hidden />
        </span>
        <span className="gold-line w-28 md:hidden" aria-hidden />
        <span data-word="right" className="flex w-full items-center justify-center gap-4 md:flex-1 md:justify-start">
          <span className="gold-line hidden w-[6vw] md:block" aria-hidden />
          <span className="text-[clamp(2.2rem,4.6vw,6.5rem)] tracking-[-0.01em] text-gold-hi [text-shadow:0_0_40px_rgba(5,11,26,0.9)]">Financials</span>
        </span>
      </h1>

      <div data-hero-sub className="pointer-events-auto absolute inset-x-0 bottom-[3vh] flex flex-col items-center gap-3 px-6 md:bottom-[5vh] md:gap-4 text-center">
        <p className="font-display text-[clamp(1rem,1.6vw,1.35rem)] font-medium tracking-wide text-ink/90">{COMPANY.tagline}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#open-account"
            onClick={(e) => (e.preventDefault(), openAccount())}
            className="rounded-full bg-gradient-to-b from-gold-hi to-gold px-6 py-2.5 text-sm font-semibold text-abyss shadow-[0_0_30px_rgba(212,175,55,0.4)] transition hover:brightness-110"
          >
            Open Account
          </a>
          <a
            href="#trade"
            onClick={(e) => (e.preventDefault(), scrollToId('trade'))}
            className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-gold-hi hover:text-gold-hi"
          >
            Explore markets
          </a>
        </div>
        <RiskNote className="text-center" />
        <span className="mt-1 flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-muted" aria-hidden>
          Scroll
          <span className="block h-6 w-px bg-gradient-to-b from-gold-hi to-transparent [animation:cue_2s_ease-in-out_infinite]" />
        </span>
      </div>
    </div>
  );
}
