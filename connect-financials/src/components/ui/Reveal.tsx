import React, { useEffect, useRef, useState } from 'react';

/**
 * Scroll reveal, ported from the RankRise site.
 *
 * Same signature as the original so the two properties feel related:
 *   - 36px upward travel, 0.9s, cubic-bezier(.2, .7, .2, 1) — a hard start that
 *     settles slowly
 *   - 70ms between siblings inside a group, capped at six steps so a long list
 *     never drags
 *
 * Why stagger at all: a heading and six cards arriving at the same instant
 * reads as a page that loaded, not one that was composed.
 *
 * Anything that is never observed would stay at opacity 0 for good, so the
 * fallbacks matter — no IntersectionObserver, or reduced motion, means visible
 * immediately.
 */

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const DURATION = 900;
const TRAVEL = 36;
const STAGGER = 70;
const MAX_STEPS = 6;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function Reveal({
  children,
  /** Position within a group. Drives the stagger delay. */
  index = 0,
  /** Extra delay in ms on top of the stagger. */
  delay = 0,
  as: Tag = 'div',
  className = '',
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setShown(true);
        io.disconnect(); // reveal once; re-animating on every pass is noise
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const totalDelay = Math.min(index, MAX_STEPS) * STAGGER + delay;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${TRAVEL}px)`,
        transition: `opacity ${DURATION}ms ${EASE}, transform ${DURATION}ms ${EASE}`,
        transitionDelay: `${totalDelay}ms`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Wraps each child in a <Reveal> and hands it its position, so a list staggers
 * without every call site counting indices by hand.
 */
export function RevealGroup({
  children,
  className = '',
  as,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section';
}) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <Reveal key={i} index={i} as={as}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
