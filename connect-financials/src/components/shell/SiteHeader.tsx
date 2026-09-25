import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, ShieldCheck, X } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Button } from '../ui/Button';
import { Container } from '../ui/Layout';
import { ROUTES, primaryNav } from '../../config/site';
import { canClaimRegulated, displayableLicences } from '../../config/compliance';
import { useUI } from '../../state/UIProvider';

/**
 * Site header.
 *
 * Replaces a 39 KB header that carried three rows of chrome — a ticker, a
 * utility strip and the nav itself — plus five dropdowns, each with its own
 * open/close state and hover styling.
 *
 * The structure here is one row: brand, navigation, actions. Groups with a
 * single destination link straight there instead of opening a menu of one.
 */
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const location = useLocation();
  const { openAccountModal } = useUI();
  const navRef = useRef<HTMLElement>(null);

  /* Close everything on navigation. */
  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [location.pathname]);

  /* Escape closes the open menu; click-away closes dropdowns. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    }
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  /* Lock body scroll behind the mobile drawer. */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const licence = displayableLicences()[0];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <Container wide>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to={ROUTES.home}
            className="shrink-0 rounded-[var(--radius-sm)]"
            aria-label="Connect Financials — home"
          >
            <Logo size={32} />
          </Link>

          {/* Desktop navigation */}
          <nav ref={navRef} className="hidden lg:flex lg:items-center lg:gap-1" aria-label="Main">
            {primaryNav.map((group) => {
              const single = group.items.length === 1;

              if (single) {
                return (
                  <NavLink
                    key={group.label}
                    to={group.items[0].to}
                    className={({ isActive }) =>
                      [
                        /* inline-block: transform is ignored on an inline box,
                           so without it the lift and zoom do nothing here. */
                        'inline-block rounded-[var(--radius-md)] px-3 py-2 text-[14px] font-medium',
                        isActive
                          ? 'bg-accent-quiet text-accent'
                          : 'link-metal text-text-muted',
                      ].join(' ')
                    }
                  >
                    {group.label}
                  </NavLink>
                );
              }

              const isOpen = openGroup === group.label;
              const groupActive = group.items.some((i) => i.to === location.pathname);

              return (
                <div key={group.label} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group.label)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={[
                      'flex items-center gap-1 rounded-[var(--radius-md)] px-3 py-2',
                      'text-[14px] font-medium transition-colors duration-[var(--duration-fast)]',
                      'cursor-pointer',
                      groupActive || isOpen
                        ? 'bg-accent-quiet text-accent'
                        : 'link-metal text-text-muted',
                    ].join(' ')}
                  >
                    {group.label}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-[var(--duration-fast)] ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-lg)]
                                 border border-line bg-surface-1 p-2 shadow-[var(--shadow-lg)]"
                    >
                      {group.items.map((item) => (
                        <Link
                          key={`${item.to}-${item.label}`}
                          to={item.to}
                          className="group block rounded-[var(--radius-md)] px-3 py-2.5
                                     transition-colors duration-[var(--duration-fast)]
                                     hover:bg-surface-2"
                        >
                          <span className="link-metal flex items-center gap-2 text-[14px] font-semibold text-text">
                            {item.label}
                            {item.tag && (
                              <span className="rounded-[var(--radius-sm)] border border-accent/30
                                               bg-accent-quiet px-1.5 py-0.5 text-[10px]
                                               font-bold tracking-wide text-accent">
                                {item.tag}
                              </span>
                            )}
                          </span>
                          {item.description && (
                            <span className="mt-0.5 block text-[12px] leading-snug text-text-muted">
                              {item.description}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Licence badge. Renders only once a licence is verified — the
                original showed a bare "REGULATED" pill naming no authority. */}
            {canClaimRegulated() && licence && (
              <span className="mr-1 hidden items-center gap-1.5 text-[12px] text-text-muted xl:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {licence.abbreviation} {licence.licenceNumber}
              </span>
            )}

            {/* Wrapped rather than given `hidden sm:inline-flex` directly: the
                Button's own base class already sets `inline-flex`, and between
                two display utilities the stylesheet order decides, not the
                class list — so `hidden` silently lost and these overflowed the
                header on phones. */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button to={ROUTES.portal} variant="ghost" size="sm">
                Client portal
              </Button>
              {/* Wrapped, not `hidden lg:inline-flex` — see the note below. */}
              <span className="hidden lg:block">
                <Button variant="secondary" size="sm" onClick={() => openAccountModal('demo')}>
                  Free demo
                </Button>
              </span>
              <Button variant="primary" size="sm" onClick={() => openAccountModal('plus')}>
                Open live
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--radius-md)]
                         border border-line text-text transition-colors hover:bg-surface-2 lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-0 top-16 z-50 overflow-y-auto border-t border-line bg-canvas lg:hidden"
        >
          <Container>
            <nav className="py-6" aria-label="Mobile">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="mb-2 flex h-9 w-9 cursor-pointer items-center justify-center
                             rounded-[var(--radius-md)] border border-line text-text-muted
                             transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {primaryNav.map((group) => (
                <div key={group.label} className="border-b border-line py-4 first:pt-0">
                  <span className="mb-2 block text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
                    {group.label}
                  </span>
                  {group.items.map((item) => (
                    <NavLink
                      key={`${item.to}-${item.label}`}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          'block rounded-[var(--radius-md)] px-3 py-2.5 -mx-3',
                          isActive ? 'bg-accent-quiet text-accent' : 'text-text',
                        ].join(' ')
                      }
                    >
                      <span className="flex items-center gap-2 text-[15px] font-semibold">
                        {item.label}
                        {item.tag && (
                          <span className="rounded-[var(--radius-sm)] border border-accent/30
                                           bg-accent-quiet px-1.5 py-0.5 text-[10px] font-bold
                                           tracking-wide text-accent">
                            {item.tag}
                          </span>
                        )}
                      </span>
                      {item.description && (
                        <span className="mt-0.5 block text-[13px] text-text-muted">
                          {item.description}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              ))}

              <div className="mt-6 flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setMobileOpen(false);
                    openAccountModal('plus');
                  }}
                >
                  Open account
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setMobileOpen(false);
                    openAccountModal('demo');
                  }}
                >
                  Open a free demo
                </Button>
                <Button to={ROUTES.portal} variant="secondary" size="lg">
                  Client portal
                </Button>
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
