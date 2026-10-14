import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PageId } from '../config/pages';
import { hrefFor } from '../lib/route';
import { universeMotion } from './universeMotion';

export type OrbitItem = { label: string; page: PageId; section?: string };

/** The eight planets, nearest the sun first. */
const PLANETS: { name: string; size: number; period: number; skin: string; ring?: boolean }[] = [
  { name: 'Mercury', size: 15, period: 40, skin: 'radial-gradient(circle at 32% 30%, #e6e1d8, #9a948c 45%, #3a3632 100%)' },
  { name: 'Venus', size: 20, period: 48, skin: 'radial-gradient(circle at 32% 30%, #fff3cf, #e3bb66 45%, #7a5520 100%)' },
  { name: 'Earth', size: 21, period: 56, skin: 'radial-gradient(circle at 62% 64%, rgba(64,150,96,.9) 0 14%, transparent 15%), radial-gradient(circle at 34% 40%, rgba(64,150,96,.85) 0 11%, transparent 12%), radial-gradient(circle at 32% 30%, #cfe6ff, #4a82ff 40%, #183f86 72%, #081a3c 100%)' },
  { name: 'Mars', size: 17, period: 64, skin: 'radial-gradient(circle at 32% 30%, #ffc09a, #d35a2c 45%, #561c0b 100%)' },
  { name: 'Jupiter', size: 36, period: 76, skin: 'radial-gradient(circle at 32% 30%, rgba(255,255,255,.35), transparent 45%), repeating-linear-gradient(172deg, #e9d3ae 0 9%, #b9895a 9% 15%, #f1e2c4 15% 24%, #a5704a 24% 29%), #c79a6b' },
  { name: 'Saturn', size: 29, period: 88, ring: true, skin: 'radial-gradient(circle at 32% 30%, #fff1c4, #e2c27a 45%, #7d5e26 100%)' },
  { name: 'Uranus', size: 24, period: 100, skin: 'radial-gradient(circle at 32% 30%, #effdff, #86d9e2 45%, #2a6c78 100%)' },
  { name: 'Neptune', size: 23, period: 114, skin: 'radial-gradient(circle at 32% 30%, #b9ccff, #4a6dff 45%, #12244D 100%)' },
];

/**
 * The site menu as a solar system: a small black hole at its centre,
 * and each tab a planet on its own (undrawn) orbit (tilted, so planets pass in front of and behind the sun). The planets
 * turn together, evenly spaced, so they never run into each other. Names are
 * hidden until a planet is pointed at (or tapped once on a touch screen); the
 * shown name finds a free place beside its planet (right, left, above or below),
 * clear of the planets and the black hole. Pointing at a planet pauses them so it can
 * be clicked, clicking one freezes the whole system and lights it before its
 * page opens, and the sun pauses or resumes the orbits. With reduced motion the
 * system stands still.
 */

/** One full turn of the system, in seconds */
const PERIOD = 120;
type Side = 'right' | 'left' | 'top' | 'bottom';
type Rect = { x: number; y: number; w: number; h: number };
const hit = (a: Rect, b: Rect, pad = 4) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
export function OrbitMenu({
  items,
  isActive,
  onGo,
  big = false,
  label = 'Site pages',
}: {
  items: OrbitItem[];
  isActive: (n: OrbitItem) => boolean;
  onGo: (n: OrbitItem) => void;
  /** The full-page universe: larger planets and labels */
  big?: boolean;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const planets = useRef<(HTMLLIElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const selectedRef = useRef<number | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [frozen, setFrozen] = useState(reduced);
  const [selected, setSelected] = useState<number | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const frozenRef = useRef(frozen);
  const hover = useRef(false);
  const hotRef = useRef<number | null>(null);
  const noHover = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
  frozenRef.current = frozen || selected !== null;
  hotRef.current = hot;
  selectedRef.current = selected;

  const n = Math.min(items.length, PLANETS.length);
  const geo = orbitGeometry(dims.w, dims.h, n, big);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      size.current = { w: e.contentRect.width, h: e.contentRect.height };
      setDims(size.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One loop moves every planet and places every name by writing styles directly (no React render per frame).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const sides: (Side | undefined)[] = [];
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!frozenRef.current && !hover.current) t += dt;
      // read the name sizes first, before any style is written this frame (no forced layout)
      const LW = labels.current.map((l) => l?.offsetWidth ?? 0);
      const LH = labels.current.map((l) => l?.offsetHeight ?? 0);
      const W = size.current.w;
      const H = size.current.h - 24;
      const g = orbitGeometry(size.current.w, size.current.h, n, big);
      const spin = (2 * Math.PI * t) / PERIOD;
      // the camera drifts: the plane's tilt opens and closes slowly, so the system reads in 3D
      const tilt = big && !reduced ? 0.92 + 0.08 * Math.sin((2 * Math.PI * t) / 46) : 1;
      universeMotion.hold = hover.current || frozenRef.current;
      universeMotion.warp = selectedRef.current !== null;
      if (box.current && n > 0) universeMotion.plane = { box: box.current, cx: g.cx, cy: g.cy, r0: g.rx[0] * 0.75, r1: g.rx[n - 1] * 1.12, k: (g.ry[n - 1] * tilt) / Math.max(1, g.rx[n - 1]) };
      const P: { x: number; y: number; depth: number; r: number; cos: number }[] = [];
      for (let i = 0; i < n; i++) {
        // evenly spread round the sun, all turning together: planets never collide
        const a = (i / n) * Math.PI * 2 + Math.PI * 0.35 + spin;
        const depth = (Math.sin(a) + 1) / 2; // 1 = nearest the viewer (below the sun)
        const size0 = PLANETS[i].size * g.scale;
        P.push({ x: g.cx + g.rx[i] * Math.cos(a), y: g.cy + g.ry[i] * tilt * Math.sin(a), depth, r: size0 / 2, cos: Math.cos(a) });
        const el = planets.current[i];
        if (!el) continue;
        el.style.transform = `translate3d(${P[i].x.toFixed(1)}px, ${P[i].y.toFixed(1)}px, 0)`;
        el.style.setProperty('--depth', depth.toFixed(3));
        el.style.zIndex = String(depth > 0.5 ? 30 + Math.round(depth * 10) : 10 + Math.round(depth * 10));
      }

      // Names are hidden until a planet is pointed at or clicked; place the one that is shown,
      // clear of the planets and the black hole.
      const obstacles: Rect[] = P.map((p) => {
        const r = p.r * (0.78 + 0.32 * p.depth);
        return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
      });
      const sunR = g.hole / 2 + 4;
      obstacles.push({ x: g.cx - sunR, y: g.cy - sunR, w: sunR * 2, h: sunR * 2 });
      for (let i = 0; i < n; i++) {
        const el = planets.current[i];
        if (!el) continue;
        const natural: Side = P[i].cos > 0.3 ? 'left' : 'right';
        let side: Side = natural;
        if (i === hotRef.current || i === selectedRef.current) {
          const lw = LW[i];
          const lh = LH[i];
          const { x, y, r } = P[i];
          const rectFor = (sd: Side): Rect =>
            sd === 'right' ? { x: x + r + 8, y: y - lh / 2, w: lw, h: lh }
            : sd === 'left' ? { x: x - r - 8 - lw, y: y - lh / 2, w: lw, h: lh }
            : sd === 'top' ? { x: x - lw / 2, y: y - r - 6 - lh, w: lw, h: lh }
            : { x: x - lw / 2, y: y + r + 6, w: lw, h: lh };
          const free = (sd: Side) => {
            const q = rectFor(sd);
            if (q.x < 0 || q.y < 0 || q.x + q.w > W || q.y + q.h > H) return false;
            for (let k = 0; k < obstacles.length; k++) if (k !== i && hit(q, obstacles[k], 2)) return false;
            return true;
          };
          // keep the current place while it stays free, so the name does not jump about
          const prefs: Side[] = [natural, natural === 'left' ? 'right' : 'left', 'top', 'bottom'];
          side = sides[i] && free(sides[i]!) ? sides[i]! : prefs.find(free) ?? natural;
        }
        if (sides[i] !== side) {
          sides[i] = side;
          el.dataset.side = side;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      universeMotion.plane = null;
      universeMotion.hold = universeMotion.warp = false;
    };
  }, [n, big, reduced]);

  const go = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (selected !== null) return;
    // phones and tablets have no pointer to hover with: the first tap shows the name and holds the orbits
    if (noHover && hotRef.current !== i) {
      hover.current = true;
      setHot(i);
      return;
    }
    setSelected(i);
    window.setTimeout(() => {
      onGo(items[i]);
      // if the page opened inside the universe, the planets stay: let them move again
      setSelected(null);
      setHot(null);
      hover.current = false;
    }, reduced ? 0 : 650);
  };

  return (
    <div ref={box} className={`cf-orbits relative mx-auto min-h-[340px] w-full flex-1 ${big ? 'is-big cf-arrive max-w-[1500px]' : 'max-w-[1200px]'}`} data-selected={selected !== null ? '' : undefined}
      onPointerDown={(e) => {
        // on touch, tapping anywhere but a planet hides the name and lets the orbits run again
        if (noHover && !(e.target as Element).closest('.cf-planet-link')) {
          hover.current = false;
          setHot(null);
        }
      }}
    >

      <button
        type="button"
        onClick={() => setFrozen((f) => !f)}
        aria-pressed={frozen}
        aria-label={frozen ? 'Resume the orbits' : 'Pause the orbits'}
        title={frozen ? 'Resume the orbits' : 'Pause the orbits'}
        className="cf-sun absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: geo.cx, top: geo.cy, width: geo.hole, height: geo.hole }}
      >
        {/* a small black hole: the deep end of the wormhole, with its thin bright rim */}
        <BlackHole />
        <span className="sr-only">{frozen ? 'Resume' : 'Pause'}</span>
      </button>

      <nav aria-label={label}>
        <ol>
          {items.slice(0, n).map((item, i) => {
            const p = PLANETS[i];
            const active = isActive(item);
            return (
              <li
                key={item.label}
                ref={(el) => {
                  planets.current[i] = el;
                }}
                className="cf-planet absolute left-0 top-0"
                data-side="right"
                data-picked={selected === i ? '' : undefined}
                data-hot={hot === i ? '' : undefined}
                style={{ '--size': `${Math.round(p.size * geo.scale)}px` } as CSSProperties}
              >
                <a
                  href={hrefFor(item.page, item.section)}
                  onClick={go(i)}
                  // pointing at a planet (or focusing it) freezes the orbits until the pointer leaves
                  onPointerEnter={(e) => e.pointerType !== 'touch' && ((hover.current = true), setHot(i))}
                  onPointerLeave={(e) => e.pointerType !== 'touch' && ((hover.current = false), setHot(null))}
                  // keyboard focus counts as pointing; the focus a tap gives a link does not (the tap is handled in go)
                  onFocus={(e) => e.currentTarget.matches(':focus-visible') && ((hover.current = true), setHot(i))}
                  onBlur={() => hotRef.current === i && !noHover && ((hover.current = false), setHot(null))}
                  aria-current={active ? 'page' : undefined}
                  className="cf-planet-link group"
                >
                  <span className={`cf-planet-body ${p.ring ? 'has-ring' : ''}`} style={{ background: p.skin }} aria-hidden />
                  <span
                    className="cf-planet-label"
                    ref={(el) => {
                      labels.current[i] = el;
                    }}
                  >
                    <span className="num text-gold">{String(i + 1).padStart(2, '0')}</span> {item.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-[11px] uppercase tracking-[0.24em] text-muted/80">
        {selected !== null
          ? `Opening ${items[selected].label}…`
          : hot !== null
            ? `${items[hot].label} · ${noHover ? 'tap again to open' : 'click to open'}`
            : frozen
              ? 'Orbits paused · tap the black hole to resume'
              : noHover
                ? 'Tap a planet to see its name · tap again to go'
                : 'Point at a planet to see its name · click it to go'}
      </p>
    </div>
  );
}

/** Orbit sizes for the space available: tilted ellipses on wide screens, taller ones on phones. */
function orbitGeometry(w: number, h: number, n: number, big = false) {
  const cx = w / 2;
  const cy = (h - 24) / 2;
  const narrow = w < 640;
  const scale = (narrow ? 0.72 : w < 1000 ? 0.86 : 1) * (big && !narrow ? 1.3 : 1);
  const sun = Math.round(Math.max(48, Math.min(big ? 150 : 120, Math.min(w, h) * (narrow ? 0.17 : big ? 0.17 : 0.15))));
  const rxMax = Math.max(0, w / 2 - 22 * scale);
  const ryMax = Math.max(0, (h - 24) / 2 - 20 * scale);
  const rx0 = sun / 2 + (narrow ? 22 : 40);
  const ry0 = Math.min(ryMax, sun / 2 + (narrow ? 26 : 14));
  const rx: number[] = [];
  const ry: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 1;
    rx.push(rx0 + (rxMax - rx0) * k);
    ry.push(ry0 + (ryMax - ry0) * k);
  }
  // the black hole itself is drawn at half the room kept for it, so it reads as a small, deep hole
  const hole = Math.round(sun * 0.5);
  return { cx, cy, rx, ry, sun, hole, scale };
}

/**
 * The black hole at the centre: a black hole with a thin bright rim, and a fine
 * arc of light bent over its top (and faintly under it). The button is one hole
 * across; the drawing has room around it for the arcs.
 */
function BlackHole() {
  return (
    <svg className="cf-bh" viewBox="-180 -70 360 140" aria-hidden>
      <defs>
        <radialGradient id="bh-core" cx="0" cy="0" r="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.82" stopColor="#000" />
          <stop offset="0.94" stopColor="#0c0804" />
          <stop offset="1" stopColor="#24170a" />
        </radialGradient>
        <filter id="bh-soft" x="-10%" y="-80%" width="120%" height="260%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* light bent over the top of the hole and faintly under it */}
      <path d="M -46 3 A 46 47 0 0 1 46 3" fill="none" stroke="#ffd98c" strokeWidth="7" opacity="0.35" filter="url(#bh-soft)" />
      <path d="M -44 3 A 44 45 0 0 1 44 3" fill="none" stroke="#fff0c8" strokeWidth="1.8" opacity="0.9" />
      <path d="M -43 3 A 43 44 0 0 0 43 3" fill="none" stroke="#ffcf7a" strokeWidth="1.2" opacity="0.35" />

      {/* the hole, with its thin bright rim */}
      <circle r="40" fill="url(#bh-core)" />
      <circle r="41" fill="none" stroke="#ffe6b0" strokeWidth="1.1" opacity="0.85" />
    </svg>
  );
}
