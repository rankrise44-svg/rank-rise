import { useEffect, useRef, useState } from 'react';
import { NAV } from '../config/pages';
import { hrefFor, navigate, useRoute } from '../lib/route';
import { closeDock, openDock } from '../valgon/ui/Dock';
import { useValgon } from '../valgon/store';
import { unlockVoice } from '../valgon/voice';
import { openAccount } from './openAccount';
import { RiskNote } from './RiskNote';
import logo from '../assets/logo.svg';

/** Valgon's button in the header: opens his panel, or on his own page puts the cursor in his box. */
function ValgonButton() {
  const { page } = useRoute();
  const { dockOpen } = useValgon();
  const onClick = () => {
    unlockVoice();
    if (page === 'valgon') document.querySelector<HTMLInputElement>('[data-page="valgon"] input[aria-label="Ask Valgon"]')?.focus();
    else if (dockOpen) closeDock();
    else openDock();
  };
  return (
    <button type="button" onClick={onClick} aria-label="Talk to Valgon" className="vg-btn flex h-10 items-center gap-2 rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-ink sm:px-4">
      <span className="vg-dot" aria-hidden />
      <span className="max-[380px]:hidden">Valgon</span>
    </button>
  );
}

/**
 * The site header: logo (to the falcon page), the page links, Valgon, the
 * Trader Portal and Open Account. Below xl the links move into the Menu.
 */
export function TopNav() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const route = useRoute();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a,button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (page: Parameters<typeof navigate>[0], section?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate(page, section);
  };
  const isActive = (n: (typeof NAV)[number]) => route.page === n.page && (n.section ? route.section === n.section : !route.section || n.page !== 'home');

  return (
    <>
      <header className="fixed inset-x-0 top-8 z-40 flex h-16 items-center justify-between gap-3 bg-gradient-to-b from-abyss/80 to-transparent px-4 sm:px-8">
        <a href={hrefFor('home')} onClick={go('home')} className="flex shrink-0 items-center gap-2.5" aria-label="Connect Financials — home">
          <img src={logo} alt="" width={48} height={30} className="h-8 w-auto" />
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.28em] text-ink max-sm:hidden lg:max-2xl:hidden">
            Connect <span className="text-gold">Financials</span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden min-w-0 lg:block">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {NAV.map((n) => {
              const active = isActive(n);
              return (
                <li key={n.label} className={`relative ${n.page === 'home' && !n.section ? 'max-xl:hidden' : ''}`}>
                  <a
                    href={hrefFor(n.page, n.section)}
                    onClick={go(n.page, n.section)}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-gold relative inline-block whitespace-nowrap rounded-full px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] xl:px-3 xl:text-[12px] xl:tracking-[0.16em] ${active ? 'is-active' : ''}`}
                  >
                    {n.label}
                  </a>
                  {active && <span className="pointer-events-none absolute inset-x-2 bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-hi to-transparent xl:inset-x-3" aria-hidden />}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ValgonButton />
          <a href={hrefFor('portal')} onClick={go('portal')} className="hidden text-[13px] font-medium text-muted transition-colors hover:text-gold-hi min-[1760px]:block">
            Trader Portal
          </a>
          <button
            type="button"
            onClick={() => (setOpen(false), openAccount())}
            className="hidden rounded-full bg-gradient-to-b from-gold-hi to-gold px-5 py-2 text-[13px] font-semibold text-abyss shadow-[0_0_24px_rgba(212,175,55,0.35)] transition hover:brightness-110 sm:block"
          >
            Open Account
          </button>
          <button
            ref={button}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-menu"
            title="Menu" className="flex h-10 items-center gap-2 rounded-full border border-gold/30 px-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:border-gold-hi lg:w-10 lg:justify-center lg:px-0"
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block h-px w-4 bg-gold-hi" />
              <span className="block h-px w-4 bg-gold-hi" />
            </span>
            <span className="max-sm:sr-only lg:sr-only">Menu</span>
          </button>
        </div>
      </header>

      {open && (
        <div
          id="site-menu"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-abyss/95 px-6 pb-10 pt-24 backdrop-blur-xl sm:px-16"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
            className="absolute right-4 top-10 h-10 rounded-full border border-gold/30 px-4 text-[12px] font-semibold uppercase tracking-[0.2em] sm:right-8"
          >
            Close
          </button>
          <nav aria-label="Main">
            <ol className="space-y-2">
              {[{ label: 'Valgon', page: 'valgon' as const, section: undefined }, ...NAV].map((n, i) => (
                <li key={n.label}>
                  <a
                    href={hrefFor(n.page, n.section)}
                    onClick={go(n.page, n.section)}
                    aria-current={isActive(n) ? 'page' : undefined}
                    className="group flex items-baseline gap-4 font-display text-[clamp(1.8rem,5.5vw,4rem)] font-semibold uppercase leading-none tracking-tight text-ink transition-colors hover:text-gold-hi aria-[current=page]:text-gold-hi"
                  >
                    <span className="num text-sm font-medium text-gold">{String(i + 1).padStart(2, '0')}</span>
                    {n.label}
                  </a>
                </li>
              ))}
              <li className="flex flex-wrap gap-x-8 gap-y-2 pt-4">
                <a href={hrefFor('portal')} onClick={go('portal')} className="font-display text-[clamp(1.1rem,2.6vw,1.6rem)] font-semibold uppercase text-muted hover:text-gold-hi">
                  Trader Portal
                </a>
                <a href={hrefFor('legal')} onClick={go('legal')} className="font-display text-[clamp(1.1rem,2.6vw,1.6rem)] font-semibold uppercase text-muted hover:text-gold-hi">
                  Legal
                </a>
                <button type="button" onClick={() => (setOpen(false), openAccount())} className="font-display text-[clamp(1.1rem,2.6vw,1.6rem)] font-semibold uppercase text-gold-hi hover:text-ink">
                  Open Account
                </button>
              </li>
            </ol>
          </nav>
          <RiskNote className="mt-auto pt-10" />
        </div>
      )}
    </>
  );
}
