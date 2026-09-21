import React from 'react';
import { Eyebrow } from './Badge';

/**
 * Layout primitives.
 *
 * One container width and one vertical rhythm, applied everywhere. The original
 * mixed max-w-7xl with full-bleed sections and py values from 6 to 10 chosen
 * per section, so nothing lined up down the page.
 */

/** Page gutter + max width. `wide` is for data tables and the terminal. */
export function Container({
  wide = false,
  className = '',
  children,
}: {
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full ${wide ? 'max-w-[1400px]' : 'max-w-[1200px]'} px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Vertical section rhythm. `spacing` is the only knob — sections should not
 * invent their own padding.
 */
export function Section({
  id,
  spacing = 'md',
  bordered = true,
  className = '',
  children,
}: {
  id?: string;
  spacing?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const spacings = {
    sm: 'py-10 sm:py-12',
    md: 'py-14 sm:py-20',
    lg: 'py-20 sm:py-28',
  };
  return (
    <section
      id={id}
      className={`${spacings[spacing]} ${bordered ? 'border-b border-line' : ''} ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Section heading block. Takes the eyebrow/title/description triplet that was
 * being rebuilt by hand, differently, in every section.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  actions,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  actions?: React.ReactNode;
  className?: string;
}) {
  const centered = align === 'center';
  return (
    <div
      className={[
        'flex gap-5',
        centered
          ? 'flex-col items-center text-center'
          : 'flex-col md:flex-row md:items-end md:justify-between',
        className,
      ].join(' ')}
    >
      <div className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h2 className="text-h2 font-bold text-text">{title}</h2>
        {description && <p className="mt-3 text-body text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Interior page masthead. Gives every non-home route the same opening shape, so
 * moving between them feels like one site rather than a set of landing pages.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  wide = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="border-b border-line bg-surface-1">
      <Container wide={wide}>
        <div className="flex flex-col gap-6 py-12 sm:py-16 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
            <h1 className="text-h1 font-bold text-text">{title}</h1>
            {description && <p className="mt-4 text-body text-text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </Container>
    </div>
  );
}
