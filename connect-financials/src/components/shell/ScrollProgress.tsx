import { useEffect, useRef } from 'react';

/**
 * Reading-progress bar across the top of the viewport, as on the RankRise site.
 *
 * Writes straight to the DOM node on scroll rather than through state — a
 * setState per scroll event would re-render the whole shell sixty times a
 * second for a width change.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    function update() {
      raf = 0;
      const bar = barRef.current;
      if (!bar) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      aria-hidden="true"
    >
      <div
        ref={barRef}
        className="rule-gold h-full w-0"
        style={{ transition: 'width 90ms linear' }}
      />
    </div>
  );
}
