import { Link } from 'react-router-dom';
import { Layers, Mail, MessageCircle, PlayCircle, Send, Shield } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Container } from '../ui/Layout';
import { Button } from '../ui/Button';
import { RegulatoryDisclosure } from '../compliance/ComplianceNotices';
import { replayIntro } from './IntroGate';
import { brand, footerNav, ROUTES } from '../../config/site';
import { contact, productClaims } from '../../config/compliance';

/**
 * Site footer.
 *
 * Three bands: a navigation directory, the regulatory block, then the base
 * line. Keeping disclosures visually separate from the marketing links means
 * the legal text reads as legal text rather than as more footer decoration.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-1">
      <Container>
        {/* Brand + channels */}
        <div className="grid gap-10 border-b border-line py-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Logo size={32} showDescriptor />
            <p className="mt-4 max-w-sm text-small text-text-muted">{brand.tagline}.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button to={ROUTES.accounts} variant="primary" size="sm">
                Open a live account
              </Button>
              <Button to={ROUTES.accounts} variant="secondary" size="sm">
                Free {productClaims.demoAccountBalance} demo
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
              Join our channels
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={`mailto:${contact.support}`}
                  className="inline-flex items-center gap-2 text-small text-text-muted
                             transition-colors hover:text-text"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {contact.support}
                </a>
              </li>
              <li>
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-small text-text-muted
                             transition-colors hover:text-text"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Direct WhatsApp support
                </a>
              </li>
              <li>
                <a
                  href={contact.telegram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-small text-text-muted
                             transition-colors hover:text-text"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Telegram channel
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.compliance}`}
                  className="inline-flex items-center gap-2 text-small text-text-muted
                             transition-colors hover:text-text"
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Compliance desk
                </a>
              </li>
              <li>
                {/* The cinematic intro is no longer forced on every visit, so it
                    needs a deliberate way back in — the old header had one. */}
                <button
                  type="button"
                  onClick={replayIntro}
                  className="inline-flex cursor-pointer items-center gap-2 text-small
                             text-text-muted transition-colors hover:text-text"
                >
                  <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Replay the cinematic intro
                </button>
              </li>
              {/* Internal, temporary: reachable only from here so the superseded
                  components can be reviewed. Remove with the route once they are
                  kept or dropped. */}
              <li>
                <Link
                  to="/preview-unused"
                  className="inline-flex items-center gap-2 text-small text-text-subtle
                             transition-colors hover:text-text"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  Internal: unused components
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Directory */}
        <div className="grid gap-10 border-b border-line py-12 sm:grid-cols-2 lg:grid-cols-4">
          {footerNav.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <h2 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
                {group.label}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <Link
                      to={item.to}
                      className="link-metal text-small text-text-muted"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Regulatory band */}
        <div className="border-b border-line py-12">
          <RegulatoryDisclosure />
        </div>

        <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-text-subtle">
            © {year} {brand.name}. All rights reserved.
          </p>
          <p className="text-[12px] text-text-subtle">
            Market data shown on this site is simulated for demonstration.
          </p>
        </div>
      </Container>
    </footer>
  );
}
