import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Cross-route UI state: the account-opening modal and the fullscreen chart
 * studio. Both can be triggered from any page, so neither can live in a page.
 */

interface UIContextValue {
  accountModalOpen: boolean;
  accountModalTier: string;
  openAccountModal: (tier?: string) => void;
  closeAccountModal: () => void;

  studioOpen: boolean;
  openStudio: (symbol?: string) => void;
  closeStudio: () => void;
  /** Symbol the studio should open on, if one was requested. */
  studioSymbol: string | null;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTier, setAccountModalTier] = useState('plus');
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioSymbol, setStudioSymbol] = useState<string | null>(null);

  const openAccountModal = useCallback((tier: string = 'plus') => {
    setAccountModalTier(tier);
    setAccountModalOpen(true);
  }, []);

  const closeAccountModal = useCallback(() => setAccountModalOpen(false), []);

  const openStudio = useCallback((symbol?: string) => {
    setStudioSymbol(symbol ?? null);
    setStudioOpen(true);
  }, []);

  const closeStudio = useCallback(() => setStudioOpen(false), []);

  const value = useMemo(
    () => ({
      accountModalOpen,
      accountModalTier,
      openAccountModal,
      closeAccountModal,
      studioOpen,
      openStudio,
      closeStudio,
      studioSymbol,
    }),
    [
      accountModalOpen,
      accountModalTier,
      openAccountModal,
      closeAccountModal,
      studioOpen,
      openStudio,
      closeStudio,
      studioSymbol,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a <UIProvider>');
  return ctx;
}
