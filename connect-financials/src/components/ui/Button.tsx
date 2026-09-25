import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The one button.
 *
 * The original had roughly a dozen bespoke button treatments — gradient gold,
 * outlined gold, outlined cyan, flat navy, each with its own padding, radius and
 * hover transform. Three variants cover every use on the site; if a fourth seems
 * necessary, the page probably has too many competing actions.
 */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap ' +
  'rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-fast)] ' +
  'ease-[var(--ease-out)] cursor-pointer select-none ' +
  'disabled:opacity-45 disabled:pointer-events-none active:translate-y-[0.5px]';

const variants: Record<Variant, string> = {
  /* Brushed gold fill, brightening on hover. Its label stays dark navy — gold
     text on a gold fill would disappear, so this is the one variant that does
     not take the metallic hover. */
  primary:
    'bg-gold-metallic bg-gold-metallic-hover border-accent text-on-accent hover:border-accent-hover',
  /* Bordered. The default for everything else. */
  secondary:
    'hover-metal bg-surface-1 border-line text-text hover:bg-surface-2 hover:border-accent/50',
  /* No chrome until hovered. Nav, table actions, tertiary links. */
  ghost:
    'hover-metal bg-transparent border-transparent text-text-muted hover:bg-surface-2',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { to?: never; href?: never };

type InternalLinkProps = CommonProps & { to: string; href?: never };

type ExternalLinkProps = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: never };

export function Button(props: ButtonProps | InternalLinkProps | ExternalLinkProps) {
  const { variant = 'secondary', size = 'md', className = '', children } = props;
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  /* .btn-label is what the metallic hover gradient clips to. See index.css:
     putting background-clip:text on the button itself would erase its fill. */
  const label = <span className="btn-label">{children}</span>;

  if ('to' in props && props.to !== undefined) {
    const { variant: _v, size: _s, className: _c, children: _ch, to, ...rest } = props;
    return (
      <Link to={to} className={cls} {...rest}>
        {label}
      </Link>
    );
  }

  if ('href' in props && props.href !== undefined) {
    const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    return (
      <a className={cls} {...rest}>
        {label}
      </a>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonProps;
  return (
    <button className={cls} {...rest}>
      {label}
    </button>
  );
}
