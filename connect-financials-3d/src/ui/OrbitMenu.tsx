import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PageId } from '../config/pages';
import { hrefFor } from '../lib/route';

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
 * The site menu as a solar system: a gold sun, and each tab a planet on its own
 * orbit (tilted, so planets pass in front of and behind the sun). The planets
 * turn together, evenly spaced, so they never run into each other; each name
 * finds a free place beside its planet every frame (right, left, above or
 * below), clear of the other names, the other planets and the sun, and fades
 * only if there is truly no room. Pointing at a planet pauses them so it can
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
  const size = useRef({ w: 0, h: 0 });
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [frozen, setFrozen] = useState(reduced);
  const [selected, setSelected] = useState<number | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const frozenRef = useRef(frozen);
  const hover = useRef(false);
  const hotRef = useRef<number | null>(null);
  frozenRef.current = frozen || selected !== null;
  hotRef.current = hot;

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
    const dimmed: boolean[] = [];
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
      const P: { x: number; y: number; depth: number; r: number; cos: number }[] = [];
      for (let i = 0; i < n; i++) {
        // evenly spread round the sun, all turning together: planets never collide
        const a = (i / n) * Math.PI * 2 + Math.PI * 0.35 + spin;
        const depth = (Math.sin(a) + 1) / 2; // 1 = nearest the viewer (below the sun)
        const size0 = PLANETS[i].size * g.scale;
        P.push({ x: g.cx + g.rx[i] * Math.cos(a), y: g.cy + g.ry[i] * Math.sin(a), depth, r: size0 / 2, cos: Math.cos(a) });
        const el = planets.current[i];
        if (!el) continue;
        el.style.transform = `translate3d(${P[i].x.toFixed(1)}px, ${P[i].y.toFixed(1)}px, 0)`;
        el.style.setProperty('--depth', depth.toFixed(3));
        el.style.zIndex = String(depth > 0.5 ? 30 + Math.round(depth * 10) : 10 + Math.round(depth * 10));
      }

      // Place the names: nearest planets (and the one being pointed at) choose first.
      const obstacles: Rect[] = P.map((p) => {
        const r = p.r * (0.78 + 0.32 * p.depth);
        return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
      });
      const sunR = g.sun / 2 + 4;
      obstacles.push({ x: g.cx - sunR, y: g.cy - sunR, w: sunR * 2, h: sunR * 2 });
      const placed: Rect[] = [];
      const order = [...P.keys()].sort((x, y) => (x === hotRef.current ? -1 : y === hotRef.current ? 1 : P[y].depth - P[x].depth));
      for (const i of order) {
        const lab = labels.current[i];
        const el = planets.current[i];
        if (!lab || !el) continue;
        const lw = LW[i];
        const lh = LH[i];
        const { x, y, r } = P[i];
        const rectFor = (side: Side): Rect =>
          side === 'right' ? { x: x + r + 8, y: y - lh / 2, w: lw, h: lh }
          : side === 'left' ? { x: x - r - 8 - lw, y: y - lh / 2, w: lw, h: lh }
          : side === 'top' ? { x: x - lw / 2, y: y - r - 6 - lh, w: lw, h: lh }
          : { x: x - lw / 2, y: y + r + 6, w: lw, h: lh };
        const free = (side: Side) => {
          const q = rectFor(side);
          if (q.x < 0 || q.y < 0 || q.x + q.w > W || q.y + q.h > H) return false;
          for (let k = 0; k < obstacles.length; k++) if (k !== i && hit(q, obstacles[k], 2)) return false;
          for (const o of placed) if (hit(q, o)) return false;
          return true;
        };
        const natural: Side = P[i].cos > 0.3 ? 'left' : 'right';
        const prefs: Side[] = [natural, natural === 'left' ? 'right' : 'left', 'top', 'bottom'];
        // keep the current place while it stays free, so names do not jump about
        let side = sides[i] && free(sides[i]!) ? sides[i]! : prefs.find(free);
        const crowded = !side;
        if (!side) side = sides[i] ?? natural;
        placed.push(rectFor(side));
        if (sides[i] !== side) {
          sides[i] = side;
          el.dataset.side = side;
        }
        if (dimmed[i] !== crowded) {
          dimmed[i] = crowded;
          el.toggleAttribute('data-crowded', crowded);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [n, big]);

  const go = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (selected !== null) return;
    setSelected(i);
    window.setTimeout(() => onGo(items[i]), reduced ? 0 : 650);
  };

  return (
    <div ref={box} className={`cf-orbits relative mx-auto min-h-[340px] w-full flex-1 ${big ? 'is-big max-w-[1500px]' : 'max-w-[1200px]'}`} data-selected={selected !== null ? '' : undefined}>
      {dims.w > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {geo.rx.map((rx, i) => (
            <ellipse key={i} cx={geo.cx} cy={geo.cy} rx={rx} ry={geo.ry[i]} fill="none" stroke={selected === i ? 'rgba(245,210,122,0.75)' : hot === i ? 'rgba(245,210,122,0.45)' : 'rgba(212,175,55,0.16)'} strokeWidth={selected === i ? 1.4 : hot === i ? 1.2 : 1} />
          ))}
        </svg>
      )}

      <button
        type="button"
        onClick={() => setFrozen((f) => !f)}
        aria-pressed={frozen}
        aria-label={frozen ? 'Resume the orbits' : 'Pause the orbits'}
        title={frozen ? 'Resume the orbits' : 'Pause the orbits'}
        className="cf-sun absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: geo.cx, top: geo.cy, width: geo.sun, height: geo.sun }}
      >
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
                style={{ '--size': `${Math.round(p.size * geo.scale)}px` } as CSSProperties}
              >
                <a
                  href={hrefFor(item.page, item.section)}
                  onClick={go(i)}
                  // pointing at a planet (or focusing it) freezes the orbits until the pointer leaves
                  onPointerEnter={() => ((hover.current = true), setHot(i))}
                  onPointerLeave={() => ((hover.current = false), setHot(null))}
                  onFocus={() => ((hover.current = true), setHot(i))}
                  onBlur={() => ((hover.current = false), setHot(null))}
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
            ? `${items[hot].label} · click to open`
            : frozen
              ? 'Orbits paused · tap the sun to resume'
              : 'Point at a planet to stop the orbits · click it to go'}
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
  return { cx, cy, rx, ry, sun, scale };
}

/**
 * The header's menu icon: a small solar system whose planets orbit, and freeze
 * while the menu is open (or with reduced motion).
 */
export function UniverseIcon({ frozen }: { frozen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="cf-universe h-6 w-6" data-frozen={frozen ? '' : undefined} aria-hidden>
      <defs>
        <radialGradient id="cf-universe-sun" cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#FFF1C4" />
          <stop offset="55%" stopColor="#F5D27A" />
          <stop offset="100%" stopColor="#B8902A" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="5.6" fill="none" stroke="rgba(212,175,55,.45)" strokeWidth=".6" />
      <circle cx="12" cy="12" r="9.6" fill="none" stroke="rgba(212,175,55,.32)" strokeWidth=".6" />
      <circle cx="12" cy="12" r="2.7" fill="url(#cf-universe-sun)" />
      <g className="cf-uo cf-uo-a">
        <circle cx="17.6" cy="12" r="1.25" fill="#5B8CFF" />
      </g>
      <g className="cf-uo cf-uo-b">
        <circle cx="12" cy="2.4" r="1.6" fill="#E2C27A" />
      </g>
      <g className="cf-uo cf-uo-c">
        <circle cx="5.2" cy="18.8" r="1.05" fill="#D35A2C" />
      </g>
    </svg>
  );
}
