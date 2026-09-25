import type { ReactNode } from 'react';
import type { Direction } from '../feed/priceFeed';

/** Re-mounts on each tick that moves this instrument, replaying the flash. */
export function Flash({ dir, seq, children, className = '' }: { dir?: Direction; seq: number; children: ReactNode; className?: string }) {
  return (
    <span key={dir ? `${seq}-${dir}` : 'still'} className={`${className} ${dir === 'up' ? 'tick-up' : dir === 'down' ? 'tick-down' : ''}`}>
      {children}
    </span>
  );
}
