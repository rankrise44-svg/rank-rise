import type { ReactNode } from 'react';
import type { PageId } from '../config/pages';
import { Footer } from '../sections/Footer';

/**
 * Layout for every page except the falcon page and Valgon: the falcon, wings
 * open, watches from behind the title; the site's black, navy and gold, and the
 * same headings as the home page.
 */
export function PageShell({ page, eyebrow, title, intro, children }: { page: PageId; eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <>
      <main data-page={page} className="cf-page relative overflow-x-clip outline-none">
        <div className="cf-page-bg pointer-events-none absolute inset-x-0 top-0 h-[90vh]" aria-hidden>
          <picture>
            <source media="(max-width: 767.98px)" srcSet="eagle-frames/mobile/0243.webp" />
            <img src="eagle-frames/0243.webp" alt="" className="cf-page-falcon" decoding="async" />
          </picture>
        </div>
        <header className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-36 sm:px-8 lg:px-16 lg:pt-44">
          <p className="cf-rise text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
          <h1 className="cf-rise mt-3 max-w-4xl text-balance font-display text-[clamp(2.4rem,6vw,5.5rem)] font-semibold uppercase leading-[0.92] text-ink [animation-delay:80ms]">{title}</h1>
          {intro && <p className="cf-rise mt-5 max-w-2xl text-[15px] leading-relaxed text-muted [animation-delay:160ms]">{intro}</p>}
          <span className="cf-draw gold-line mt-8 block max-w-xs" aria-hidden />
        </header>
        <div className="cf-rise relative z-10 [animation-delay:220ms]">{children}</div>
      </main>
      <Footer />
    </>
  );
}

/** A titled block on a page. */
export function PageSection({ id, title, intro, children }: { id: string; title?: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={title ? `${id}-h` : undefined} className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-12 outline-none sm:px-8 lg:px-16">
      {title && (
        <h2 id={`${id}-h`} className="mb-6 flex items-center gap-4 font-display text-lg font-semibold uppercase tracking-[0.12em] text-ink">
          {title}
          <span className="gold-line flex-1 opacity-60" aria-hidden />
        </h2>
      )}
      {intro && <p className="-mt-3 mb-6 max-w-2xl text-[14px] leading-relaxed text-muted">{intro}</p>}
      {children}
    </section>
  );
}
