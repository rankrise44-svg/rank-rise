import { lazy, Suspense, useEffect } from 'react';
import { revealSection, useRoute } from './lib/route';
import { CalendarPage, ContactPage, LegalPage, MarketsPage, PlatformsPage, ToolsPage } from './pages/Pages';
import { OpenAccountModal } from './ui/OpenAccountModal';
import { TickerBar } from './ui/TickerBar';
import { TopNav } from './ui/TopNav';
import { ValgonDock } from './valgon/ui/Dock';
import { ValgonLanding } from './valgon/ui/Landing';
import { unlockVoice } from './valgon/voice';

// The falcon page carries three.js; it loads when someone goes there (Valgon prefetches it).
const Home = lazy(() => import('./pages/Home'));
const Portal = lazy(() => import('./pages/Portal'));

function Loading() {
  return (
    <div className="grid min-h-[100svh] place-items-center" role="status" aria-label="Loading">
      <span className="h-px w-32 animate-pulse bg-gradient-to-r from-transparent via-gold-hi to-transparent" />
    </div>
  );
}

const PAGE = {
  valgon: ValgonLanding,
  home: Home,
  markets: MarketsPage,
  tools: ToolsPage,
  calendar: CalendarPage,
  platforms: PlatformsPage,
  contact: ContactPage,
  legal: LegalPage,
} as const;

export default function App() {
  const { page, section, nonce } = useRoute();

  // Browsers allow Valgon to speak only after the first click or key press.
  useEffect(() => {
    const unlock = () => unlockVoice();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    if (section) revealSection(section);
    else if (nonce) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, section, nonce]);

  // Design review of the falcon alone (?studio=…): no header, no Valgon.
  if (new URLSearchParams(window.location.search).has('studio'))
    return (
      <Suspense fallback={null}>
        <Home />
      </Suspense>
    );

  if (page === 'portal')
    return (
      <Suspense fallback={<Loading />}>
        <Portal />
        <OpenAccountModal />
      </Suspense>
    );

  const Page = PAGE[page];
  return (
    <>
      <TickerBar />
      <TopNav />
      <Suspense fallback={<Loading />}>
        <Page key={page} />
      </Suspense>
      <OpenAccountModal />
      <ValgonDock page={page} />
    </>
  );
}
