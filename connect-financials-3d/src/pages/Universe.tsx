import { useEffect } from 'react';
import { NAV } from '../config/pages';
import { navigate } from '../lib/route';
import { OrbitMenu } from '../ui/OrbitMenu';
import { RiskNote } from '../ui/RiskNote';

/**
 * The first page: the Connect Financials universe. A gold sun, and every page
 * a planet on its own orbit. Pointing at a planet freezes the orbits; clicking
 * it opens that page.
 */
export function UniverseLanding() {
  // Warm up the falcon page (three.js) while the visitor looks around.
  useEffect(() => {
    const t = window.setTimeout(() => void import('./Home'), 2500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main data-page="universe" className="cf-stars relative flex h-[100svh] min-h-[640px] flex-col overflow-hidden px-4 pb-4 pt-28 sm:px-10">
      <header className="pointer-events-none relative z-40 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-gold">Welcome to</p>
        <h1 className="mt-2 font-display text-[clamp(1.6rem,3.4vw,2.8rem)] font-semibold uppercase leading-none tracking-[0.08em] text-ink">
          Connect <span className="text-gold-hi">Financials</span>
        </h1>
      </header>
      <OrbitMenu big label="Pages" items={[{ label: 'Valgon', page: 'valgon' }, ...NAV]} isActive={() => false} onGo={(n) => navigate(n.page, n.section)} />
      <RiskNote className="relative z-40 mx-auto mt-2 text-center" />
    </main>
  );
}
