import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CinematicEagleIntro } from '../CinematicEagleIntro';
import { ROUTES } from '../../config/site';
import { useUI } from '../../state/UIProvider';

const SEEN_KEY = 'cf:intro-seen';

/**
 * Gates the cinematic intro.
 *
 * The intro itself is unchanged — what changes is how often anyone has to sit
 * through it. Previously it opened on every single page load, in front of every
 * visitor, including a client trying to reach their account.
 *
 * It now shows once per browser, is skipped entirely for visitors who have asked
 * for reduced motion, and can always be replayed from the footer or by clearing
 * the flag. Escape closes it, as does the intro's own skip control.
 */
export function IntroGate() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const { openAccountModal } = useUI();

  useEffect(() => {
    /* Anyone who has asked the OS for less motion should not meet a
       full-screen cinematic as their first impression. */
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* Private mode or blocked storage — treat as seen rather than trapping
         the visitor behind a splash they cannot dismiss permanently. */
      seen = true;
    }

    if (!seen) setShow(true);
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* Nothing to do — the intro simply shows again next visit. */
    }
  }, []);

  /* Escape always works, whatever the intro's internal state. */
  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [show, dismiss]);

  const handleEnter = useCallback(
    (targetSection?: string) => {
      dismiss();
      /* The intro's calls-to-action used to scroll to an anchor on the single
         page. They now map onto routes. */
      const routeForSection: Record<string, string> = {
        'chart-terminal-section': ROUTES.platform,
        'connectview-section': ROUTES.platform,
        'currencies-section': ROUTES.markets,
        'market-watch-section': ROUTES.markets,
        'calculators-section': ROUTES.tools,
        'accounts-section': ROUTES.accounts,
      };
      if (targetSection && routeForSection[targetSection]) {
        navigate(routeForSection[targetSection]);
      }
    },
    [dismiss, navigate],
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed inset-0 z-[60]"
        >
          <CinematicEagleIntro
            onEnterPlatform={handleEnter}
            onOpenAccountModal={() => {
              dismiss();
              openAccountModal('plus');
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Lets the intro be replayed deliberately, e.g. from the footer. */
export function replayIntro() {
  try {
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
  window.location.assign(ROUTES.home);
}
