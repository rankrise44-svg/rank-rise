import React from 'react';

/**
 * Small status label.
 *
 * `tone` carries meaning: `up`/`down` are reserved for market direction and
 * must not be borrowed for generic success/error, or a table of quotes stops
 * being scannable.
 */

type Tone = 'neutral' | 'accent' | 'up' | 'down' | 'warn' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-text-muted border-line',
  accent: 'bg-accent-quiet text-accent border-accent/30',
  up: 'bg-up-quiet text-up border-up/30',
  down: 'bg-down-quiet text-down border-down/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  info: 'bg-info/10 text-info border-info/30',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Monospace + tabular figures. For numbers, tickers and licence numbers. */
  numeric?: boolean;
  children: React.ReactNode;
}

export function Badge({
  tone = 'neutral',
  numeric = false,
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)]',
        'border text-[11px] font-semibold leading-[1.45]',
        numeric ? 'font-mono tabular-nums' : '',
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * Uppercase section label. Replaces the pill-with-pulsing-dot pattern that ran
 * above almost every heading — eleven pulsing dots on one page is eleven things
 * claiming to be live.
 */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`block text-micro font-semibold uppercase tracking-[0.1em] text-accent ${className}`}
    >
      {children}
    </span>
  );
}
