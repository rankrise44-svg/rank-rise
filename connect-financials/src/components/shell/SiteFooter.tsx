import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Container } from '../ui/Layout';
import { RegulatoryDisclosure } from '../compliance/ComplianceNotices';
import { brand, footerNav } from '../../config/site';
import { contact } from '../../config/compliance';

/**
 * Site footer.
 *
 * Two bands: a navigation directory, then the regulatory block. Keeping the
 * disclosures visually separate from the marketing links means the legal text
 * reads as legal text rather than as more footer decoration.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-1">
      <Container>
        {/* Directory */}
        <div className="grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Logo size={32} showDescriptor />
            <p className="mt-4 max-w-xs text-small text-text-muted">{brand.tagline}.</p>
          </div>

          {footerNav.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <h2 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
                {group.label}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-small text-text-muted transition-colors
                                 duration-[var(--duration-fast)] hover:text-text"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-micro font-semibold uppercase tracking-[0.1em] text-text-subtle">
              Contact
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
                  WhatsApp
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
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory band */}
        <div className="border-t border-line py-12">
          <RegulatoryDisclosure />
        </div>

        <div className="flex flex-col gap-2 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
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
