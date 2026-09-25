import { useEffect, useRef, useState } from 'react';
import { MENU } from '../scene/eagle/anchors';
import { scrollToId } from '../story/smoothScroll';
import { openAccount } from './openAccount';
import { RiskNote } from './RiskNote';
import logo from '../assets/logo.png';

/** Logo, Open Account and a full-screen menu so every option is always one tap away. */
export function TopNav() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

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

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (id === 'open-account') openAccount();
    else scrollToId(id);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-8 z-40 flex h-16 items-center justify-between px-4 sm:px-8">
        <a href="#top" onClick={go('top')} className="flex items-center gap-2.5" aria-label="Connect Financials — back to top">
          <img src={logo} alt="" width={28} height={28} className="h-7 w-7" />
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.28em] text-ink">
            Connect <span className="text-gold">Financials</span>
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#portal" className="hidden text-[13px] font-medium text-muted transition-colors hover:text-gold-hi sm:block">
            Trader Portal
          </a>
          <a
            href="#open-account"
            onClick={go('open-account')}
            className="hidden rounded-full bg-gradient-to-b from-gold-hi to-gold px-5 py-2 text-[13px] font-semibold text-abyss shadow-[0_0_24px_rgba(212,175,55,0.35)] transition hover:brightness-110 sm:block"
          >
            Open Account
          </a>
          <button
            ref={button}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="flex h-10 items-center gap-2 rounded-full border border-gold/30 px-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:border-gold-hi"
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block h-px w-4 bg-gold-hi" />
              <span className="block h-px w-4 bg-gold-hi" />
            </span>
            Menu
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
              {MENU.map((m, i) => (
                <li key={m.id}>
                  <a
                    href={`#${m.id}`}
                    onClick={go(m.id)}
                    className="group flex items-baseline gap-4 font-display text-[clamp(2rem,6vw,4.5rem)] font-semibold uppercase leading-none tracking-tight text-ink transition-colors hover:text-gold-hi"
                  >
                    <span className="num text-sm font-medium text-gold">0{i + 1}</span>
                    {m.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#portal" onClick={() => setOpen(false)} className="flex items-baseline gap-4 font-display text-[clamp(1.25rem,3vw,2rem)] font-semibold uppercase text-muted hover:text-gold-hi">
                  <span className="num text-sm text-gold">07</span>Trader Portal
                </a>
              </li>
            </ol>
          </nav>
          <RiskNote className="mt-auto pt-10" />
        </div>
      )}
    </>
  );
}
