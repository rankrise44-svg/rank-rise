import { brand } from '../../config/site';
import eagleMark from '../../assets/images/golden_eagle_3d_1789734294509.jpg';

/**
 * Brand mark.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDER — awaiting the real logo files.
 * ---------------------------------------------------------------------------
 * The previous header used a photographic eagle JPEG scaled down to 40px, which
 * turned to mush at small sizes, carried a dark rectangle into a dark header and
 * could not be used on light backgrounds or in a favicon.
 *
 * This is a temporary geometric stand-in that behaves correctly: vector, single
 * accent colour, legible at 20px, and inheriting `currentColor` for the wordmark
 * so it works on any surface.
 *
 * To swap in the real logo, replace ONLY the <Mark> component below (and the
 * wordmark typography if the real logo is a lockup). Nothing else imports the
 * SVG directly — every surface goes through <Logo>.
 */

interface LogoProps {
  /** `full` = mark + wordmark, `mark` = mark alone (favicon, mobile, footer badge). */
  variant?: 'full' | 'mark';
  /** Mark size in px. The wordmark scales from this. */
  size?: number;
  /** Show the "Forex & CFD Brokerage" descriptor under the wordmark. */
  showDescriptor?: boolean;
  className?: string;
}

function Mark({ size }: { size: number }) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-[var(--radius-md)]
                 border border-accent/45 bg-surface-2"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* The eagle, tightly cropped to the head so it still reads at 32px.
          The original used the full uncropped photograph, which turned to
          noise at this size. */}
      <img
        src={eagleMark}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: '50% 32%', transform: 'scale(1.35)' }}
      />
    </span>
  );
}

export function Logo({
  variant = 'full',
  size = 32,
  showDescriptor = false,
  className = '',
}: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={className} role="img" aria-label={brand.name}>
        <Mark size={size} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className="font-bold tracking-tight text-text"
          style={{ fontSize: size * 0.5, letterSpacing: '-0.01em' }}
        >
          Connect <span className="text-accent">Financials</span>
        </span>
        {showDescriptor && (
          <span
            className="mt-1 font-medium uppercase text-text-subtle"
            style={{ fontSize: size * 0.28, letterSpacing: '0.1em' }}
          >
            {brand.descriptor}
          </span>
        )}
      </span>
    </span>
  );
}
