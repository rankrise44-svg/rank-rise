import React from 'react';

/**
 * A single figure with its label.
 *
 * Figures use tabular monospace so a row of them stays aligned and doesn't
 * jitter when values tick. The label sits below the value: the number is what
 * the eye is looking for.
 */
export function Stat({
  value,
  label,
  hint,
  tone = 'default',
  size = 'md',
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  tone?: 'default' | 'accent' | 'up' | 'down';
  size?: 'sm' | 'md' | 'lg';
}) {
  const tones = {
    default: 'text-text',
    accent: 'text-accent',
    up: 'text-up',
    down: 'text-down',
  };
  const sizes = {
    sm: 'text-[18px]',
    md: 'text-[24px]',
    lg: 'text-[32px]',
  };

  return (
    <div>
      <div className={`font-mono font-semibold tabular-nums tracking-tight ${sizes[size]} ${tones[tone]}`}>
        {value}
      </div>
      <div className="mt-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-text-subtle">
        {label}
      </div>
      {hint && <div className="mt-1 text-small text-text-muted">{hint}</div>}
    </div>
  );
}
