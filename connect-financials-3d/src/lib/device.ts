export type Quality = 'high' | 'low';

const mq = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches;

export const prefersReducedMotion = () => mq('(prefers-reduced-motion: reduce)');

export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high';
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'low' || forced === 'high') return forced;
  const coarse = mq('(pointer: coarse)');
  const narrow = mq('(max-width: 820px)');
  const weakCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || narrow || weakCpu ? 'low' : 'high';
}

// Matches Tailwind's md breakpoint: below it the wing menu uses its own grid layout.
export const isNarrow = () => mq('(max-width: 767.98px)');
