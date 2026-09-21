import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { HomePage } from './routes/HomePage';
import { PlatformPage } from './routes/PlatformPage';
import { MarketsPage } from './routes/MarketsPage';
import { AccountsPage } from './routes/AccountsPage';
import { ToolsPage } from './routes/ToolsPage';
import { AboutPage } from './routes/AboutPage';
import { LegalPage } from './routes/LegalPage';
import { PortalPage } from './routes/PortalPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { TradingProvider } from './state/TradingProvider';
import { UIProvider } from './state/UIProvider';
import { ROUTES } from './config/site';

/**
 * Previously this file was a ~700 line component holding every piece of state
 * on the site plus the markup for eleven stacked sections. State now lives in
 * the two providers, layout in <AppShell>, and content in the route modules.
 */
export default function App() {
  return (
    <BrowserRouter>
      <TradingProvider>
        <UIProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.platform} element={<PlatformPage />} />
              <Route path={ROUTES.markets} element={<MarketsPage />} />
              <Route path={ROUTES.accounts} element={<AccountsPage />} />
              <Route path={ROUTES.tools} element={<ToolsPage />} />
              <Route path={ROUTES.about} element={<AboutPage />} />
              <Route path={ROUTES.legal} element={<LegalPage />} />
              <Route path={ROUTES.portal} element={<PortalPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </UIProvider>
      </TradingProvider>
    </BrowserRouter>
  );
}
