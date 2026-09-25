import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { IntroGate } from './IntroGate';
import { LiveTickerBar } from '../LiveTickerBar';
import { LiveSupportChat } from '../LiveSupportChat';
import { OpenAccountModal } from '../OpenAccountModal';
import { ConnectViewStudio } from '../ConnectViewStudio';
import { ComplianceDraftNotice, RiskWarningStrip } from '../compliance/ComplianceNotices';
import { ForexBackdrop } from '../visuals/ForexBackdrop';
import { ScrollProgress } from './ScrollProgress';
import { ROUTES } from '../../config/site';
import { useTrading } from '../../state/TradingProvider';
import { useUI } from '../../state/UIProvider';

/** Restores scroll position on navigation — routers do not do this by default. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/**
 * Application frame: everything that persists across routes.
 */
export function AppShell() {
  const navigate = useNavigate();
  const {
    instruments,
    selectedInstrumentId,
    setSelectedInstrumentId,
    flashingTicks,
    executeTrade,
    accountCreated,
  } = useTrading();
  const {
    accountModalOpen,
    accountModalTier,
    closeAccountModal,
    studioOpen,
    studioSymbol,
    closeStudio,
  } = useUI();

  /* Escape closes the fullscreen studio. */
  useEffect(() => {
    if (!studioOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeStudio();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [studioOpen, closeStudio]);

  return (
    /* No background colour on this wrapper: the page background lives on <body>
       (index.css) so the fixed backdrop below can sit between the two. Giving
       this div `bg-canvas` would paint straight over the canvas. */
    <div className="relative flex min-h-screen flex-col text-text">
      <ScrollToTop />
      <IntroGate />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70]
                   focus:rounded-[var(--radius-md)] focus:bg-accent focus:px-4 focus:py-2
                   focus:text-on-accent focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Market backdrop, under every route at low opacity. Replaces the old
          spinning-planet canvas, which was off-topic and opaque enough to
          compete with the copy in front of it. */}
      <ForexBackdrop opacity={0.42} />
      <ScrollProgress />

      <ComplianceDraftNotice />

      <LiveTickerBar
        instruments={instruments}
        selectedInstrumentId={selectedInstrumentId}
        onSelectInstrument={setSelectedInstrumentId}
        flashingTicks={flashingTicks}
      />

      <SiteHeader />

      <main id="main" className="relative z-10 flex-1">
        <Outlet />
      </main>

      <RiskWarningStrip />
      <SiteFooter />

      {/* Fullscreen chart studio */}
      <AnimatePresence>
        {studioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Chart studio"
            className="fixed inset-0 z-50 flex flex-col bg-canvas/95 p-2 backdrop-blur-sm sm:p-4"
          >
            <div className="flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line">
              <ConnectViewStudio
                instruments={instruments}
                initialSymbol={studioSymbol ?? selectedInstrumentId}
                onClose={closeStudio}
                onExecuteTrade={executeTrade}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OpenAccountModal
        isOpen={accountModalOpen}
        onClose={closeAccountModal}
        defaultTier={accountModalTier}
        onAccountCreated={(acc) => {
          accountCreated(acc);
          closeAccountModal();
          navigate(ROUTES.portal);
        }}
      />

      <LiveSupportChat />
    </div>
  );
}
