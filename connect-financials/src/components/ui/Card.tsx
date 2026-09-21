import React from 'react';

/**
 * Panel surface. Flat fill, hairline border, no backdrop blur.
 *
 * `interactive` adds a hover state and should only be set when the whole card
 * is clickable — a hover effect on a static card promises an action that isn't
 * there.
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  /** Raises the surface one step. For cards on top of other cards. */
  raised?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  interactive = false,
  raised = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        raised ? 'bg-surface-2' : 'bg-surface-1',
        'border border-line rounded-[var(--radius-lg)]',
        paddings[padding],
        interactive
          ? 'transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)] ' +
            'hover:border-line-strong hover:bg-surface-2 cursor-pointer'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
