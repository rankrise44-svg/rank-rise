import { useEffect, useRef } from 'react';
import { signal } from '../store';

/**
 * Valgon's body for now: a holographic core in the site's navy, blue and gold.
 * A particle sphere turns inside segmented HUD rings; a ring of voice bars
 * rises with every spoken word; while listening, ripples run inward; while
 * working, the scanner speeds up. One canvas, drawn every frame from `signal`
 * (no React re-renders). Swap this component for the final design later.
 */

const GOLD = '212,175,55';
const GOLD_HI = '245,210,122';
const BLUE = '91,140,255';
const ICE = '200,225,255';

// Points spread evenly over a sphere (Fibonacci lattice).
function spherePoints(n: number) {
  const pts: [number, number, number][] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    pts.push([Math.cos(g * i) * r, y, Math.sin(g * i) * r]);
  }
  return pts;
}

export function Orb({ className = '', detail = 'full', label = 'Valgon' }: { className?: string; detail?: 'full' | 'compact'; label?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const box = wrap.current!;
    const ctx = cv.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const full = detail === 'full';
    const pts = spherePoints(full ? 340 : 140);
    const BARS = full ? 120 : 64;
    const noise = Array.from({ length: BARS }, () => Math.random());
    let size = 0;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    let speed = 1;
    let visible = true;
    const ripples: { r: number; a: number }[] = [];
    let rippleClock = 0;

    const resize = () => {
      const s = Math.max(40, Math.min(box.clientWidth, box.clientHeight || box.clientWidth));
      size = s;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(s * dpr);
      cv.height = Math.round(s * dpr);
      cv.style.width = `${s}px`;
      cv.style.height = `${s}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(box);

    const arc = (r: number, a0: number, a1: number, color: string | CanvasGradient, w: number) => {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, a0, a1);
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = signal.mode;
      // Voice level: word pulses push it up; it settles back smoothly.
      const base = m === 'speak' ? 0.35 + 0.25 * Math.abs(Math.sin(t * 7.3)) : m === 'hear' ? 0.25 + 0.2 * Math.abs(Math.sin(t * 4.1)) : 0.05 + 0.04 * Math.sin(t * 1.4);
      signal.target = Math.max(base, signal.pulse);
      signal.pulse *= Math.pow(0.02, dt);
      signal.level += (signal.target - signal.level) * Math.min(1, dt * 14);
      const lv = reduced ? Math.min(signal.level, 0.25) : signal.level;
      const wantSpeed = m === 'work' ? 3.2 : m === 'speak' ? 1.6 : m === 'hear' ? 1.2 : 0.7;
      speed += (wantSpeed - speed) * Math.min(1, dt * 3);
      t += dt * (reduced ? 0.25 : 1) * speed;

      const c = size / 2;
      const R = size / 2;
      ctx.clearRect(0, 0, size, size);

      // ambient glow
      const glow = ctx.createRadialGradient(c, c, R * 0.1, c, c, R);
      glow.addColorStop(0, `rgba(${BLUE},${0.22 + lv * 0.25})`);
      glow.addColorStop(0.45, `rgba(${GOLD},${0.06 + lv * 0.06})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // HUD rings (full detail only draws all of them)
      ctx.lineCap = 'round';
      const segs = 7;
      for (let i = 0; i < segs; i++) {
        const a = t * 0.35 + (i / segs) * Math.PI * 2;
        arc(R * 0.86, a, a + (Math.PI * 2) / segs - 0.18, `rgba(${GOLD},0.55)`, full ? 2 : 1.4);
      }
      if (full) {
        // tick ring
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(-t * 0.18);
        for (let i = 0; i < 144; i++) {
          const long = i % 12 === 0;
          const a = (i / 144) * Math.PI * 2;
          const r1 = R * 0.93;
          const r2 = r1 - (long ? R * 0.035 : R * 0.016);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          ctx.strokeStyle = `rgba(${long ? GOLD_HI : GOLD},${long ? 0.8 : 0.32})`;
          ctx.lineWidth = long ? 1.6 : 1;
          ctx.stroke();
        }
        ctx.restore();
        // dashed inner ring
        ctx.setLineDash([2, 7]);
        arc(R * 0.72, t * -0.5, t * -0.5 + Math.PI * 2, `rgba(${BLUE},0.5)`, 1);
        ctx.setLineDash([]);
      }
      // scanner: a bright arc with a head, fast while working
      const sa = t * 1.4;
      const scan = ctx.createConicGradient ? ctx.createConicGradient(sa - 1.6, c, c) : null;
      if (scan) {
        scan.addColorStop(0, `rgba(${GOLD_HI},0)`);
        scan.addColorStop(0.25, `rgba(${GOLD_HI},0.9)`);
        scan.addColorStop(0.2501, 'rgba(0,0,0,0)');
        scan.addColorStop(1, 'rgba(0,0,0,0)');
        arc(R * 0.79, sa - 1.6, sa, scan, full ? 2.2 : 1.6);
      } else arc(R * 0.79, sa - 1.2, sa, `rgba(${GOLD_HI},0.7)`, 2);
      ctx.beginPath();
      ctx.arc(c + Math.cos(sa) * R * 0.79, c + Math.sin(sa) * R * 0.79, full ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GOLD_HI},1)`;
      ctx.shadowColor = `rgba(${GOLD_HI},1)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // voice bars around the core
      const r0 = R * 0.34 * (1 + lv * 0.07);
      const barBase = R * 0.5;
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const wob = 0.5 + 0.5 * Math.sin(t * 6 + i * 0.7 + noise[i] * 6) * Math.sin(t * 2.3 + i * 0.21);
        const len = R * (0.012 + lv * 0.17 * (0.35 + 0.65 * Math.abs(wob)) * (0.6 + noise[i] * 0.4));
        const x1 = c + Math.cos(a) * barBase;
        const y1 = c + Math.sin(a) * barBase;
        const x2 = c + Math.cos(a) * (barBase + len);
        const y2 = c + Math.sin(a) * (barBase + len);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        const mix = (Math.sin(a + t) + 1) / 2;
        ctx.strokeStyle = mix > 0.5 ? `rgba(${BLUE},${0.45 + lv * 0.5})` : `rgba(${GOLD_HI},${0.4 + lv * 0.5})`;
        ctx.lineWidth = full ? 2 : 1.5;
        ctx.stroke();
      }

      // listening: ripples running inward
      if (m === 'hear') {
        rippleClock += dt;
        if (rippleClock > 0.45) {
          rippleClock = 0;
          ripples.push({ r: R * 0.7, a: 0.7 });
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r -= dt * R * 0.5;
        rp.a -= dt * 0.9;
        if (rp.r < r0 || rp.a <= 0) ripples.splice(i, 1);
        else arc(rp.r, 0, Math.PI * 2, `rgba(${ICE},${rp.a})`, 1.2);
      }

      // core sphere
      const core = ctx.createRadialGradient(c - r0 * 0.3, c - r0 * 0.35, r0 * 0.05, c, c, r0);
      core.addColorStop(0, `rgba(235,244,255,${0.9})`);
      core.addColorStop(0.25, `rgba(${BLUE},0.95)`);
      core.addColorStop(0.7, 'rgba(18,36,77,0.95)');
      core.addColorStop(1, 'rgba(5,11,26,0.9)');
      ctx.beginPath();
      ctx.arc(c, c, r0, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.shadowColor = `rgba(${BLUE},${0.6 + lv * 0.4})`;
      ctx.shadowBlur = R * (0.12 + lv * 0.18);
      ctx.fill();
      ctx.shadowBlur = 0;
      arc(r0, 0, Math.PI * 2, `rgba(${GOLD_HI},${0.55 + lv * 0.4})`, full ? 1.5 : 1);

      // particle sphere, turning; nearer points brighter (blue front, gold back)
      const ry = t * 0.6;
      const rx = 0.45 + Math.sin(t * 0.3) * 0.25;
      const sr = r0 * (1.32 + lv * 0.18);
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      for (const [px, py, pz] of pts) {
        const x1 = px * cy + pz * sy;
        const z1 = -px * sy + pz * cy;
        const y2 = py * cx - z1 * sx;
        const z2 = py * sx + z1 * cx;
        const depth = (z2 + 1) / 2; // 0 back … 1 front
        const jitter = 1 + lv * 0.08 * Math.sin(t * 9 + px * 12);
        const X = c + x1 * sr * jitter;
        const Y = c + y2 * sr * jitter;
        ctx.beginPath();
        ctx.arc(X, Y, (full ? 1.5 : 1.1) * (0.5 + depth), 0, Math.PI * 2);
        ctx.fillStyle = depth > 0.5 ? `rgba(${ICE},${0.15 + depth * 0.7})` : `rgba(${GOLD},${0.12 + depth * 0.5})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [detail]);

  return (
    <div ref={wrap} className={`relative grid place-items-center ${className}`} role="img" aria-label={label}>
      <canvas ref={canvas} />
    </div>
  );
}
