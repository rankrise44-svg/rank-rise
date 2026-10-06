import { useEffect, useRef } from 'react';
import { signal } from '../store';

/**
 * Valgon's body: a round, holographic blue eagle eye, drawn in light.
 * Rings and strands of light for the iris, a targeting ring for the pupil that
 * pulses with his voice (wide while listening, narrow while thinking),
 * scanlines, flicker and the odd glitch, a gold brow ridge; he blinks, glances
 * around and follows the pointer. Each visit he starts asleep (eye closed,
 * breathing glow) and wakes up: a sleepy flutter, the eye opens, the hologram
 * powers up.
 * Gold HUD rings and a ring of voice bars frame it. One canvas, drawn every
 * frame from `signal` (no React re-renders). Kept under the name Orb so it can
 * be swapped for the final design in one place.
 */

const GOLD = '212,175,55';
const GOLD_HI = '245,210,122';
const BLUE = '91,140,255';
const ICE = '200,225,255';

export function Orb({ className = '', detail = 'full', label = 'Valgon' }: { className?: string; detail?: 'full' | 'compact'; label?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const box = wrap.current!;
    const ctx = cv.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const full = detail === 'full';
    const FIBRES = full ? 150 : 70;
    const fibres = Array.from({ length: FIBRES }, (_, i) => ({ a: (i / FIBRES) * Math.PI * 2 + Math.random() * 0.03, len: 0.55 + Math.random() * 0.45, w: 0.6 + Math.random() * 1.1, light: Math.random() }));
    const flecks = Array.from({ length: full ? 26 : 10 }, () => ({ a: Math.random() * Math.PI * 2, r: 0.42 + Math.random() * 0.4, s: 0.5 + Math.random() }));
    const BARS = full ? 110 : 56;
    const noise = Array.from({ length: BARS }, () => Math.random());

    let size = 0;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    let speed = 1;
    let visible = true;
    // gaze (−1…1), pupil size, blink
    const gaze = { x: 0, y: 0, tx: 0, ty: 0, nextSaccade: 1.5 };
    const pointer = { x: 0, y: 0, at: -10 };
    let pupil = 0.36;
    let blink = 0; // 0 open … 1 closed
    let blinkT = -1;
    let nextBlink = 2 + Math.random() * 3;
    let glitch = 0;
    // asleep → awake, once per visit, on the big first-page eye
    const sleeper = full && !signal.awake;
    let wakeT = 0;
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
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
    const onPointer = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      pointer.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.45)));
      pointer.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.45)));
      pointer.at = t;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const ring = (r: number, a0: number, a1: number, color: string | CanvasGradient, w: number) => {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, a0, a1);
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
    };

    /** The round eye and its lids: two curves that meet in the middle when closed. */
    const eyeShape = (c: number, re: number, open: number) => {
      const circle = new Path2D();
      circle.arc(c, c, re, 0, Math.PI * 2);
      const w = re * 1.2;
      const up = c - 2.3 * re * open;
      const down = c + 2.1 * re * open;
      const lids = new Path2D();
      lids.moveTo(c - w, c);
      lids.quadraticCurveTo(c, up, c + w, c);
      lids.quadraticCurveTo(c, down, c - w, c);
      lids.closePath();
      const upper = new Path2D();
      upper.moveTo(c - w, c);
      upper.quadraticCurveTo(c, up, c + w, c);
      const lower = new Path2D();
      lower.moveTo(c - w, c);
      lower.quadraticCurveTo(c, down, c + w, c);
      return { circle, lids, upper, lower };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = signal.mode;

      // voice level: word pulses push it up, it settles back
      const base = m === 'speak' ? 0.35 + 0.25 * Math.abs(Math.sin(t * 7.3)) : m === 'hear' ? 0.25 + 0.2 * Math.abs(Math.sin(t * 4.1)) : 0.05 + 0.04 * Math.sin(t * 1.4);
      signal.target = Math.max(base, signal.pulse);
      signal.pulse *= Math.pow(0.02, dt);
      signal.level += (signal.target - signal.level) * Math.min(1, dt * 14);
      const lv = reduced ? Math.min(signal.level, 0.25) : signal.level;
      const wantSpeed = m === 'work' ? 3 : m === 'speak' ? 1.5 : m === 'hear' ? 1.2 : 0.7;
      speed += (wantSpeed - speed) * Math.min(1, dt * 3);
      t += dt * (reduced ? 0.25 : 1) * speed;

      // pupil: wide while listening, narrow while thinking, pulsing with the voice
      const wantPupil = m === 'hear' ? 0.5 : m === 'work' ? 0.24 : m === 'speak' ? 0.3 + lv * 0.16 : 0.36 + Math.sin(t * 0.9) * 0.02;
      pupil += (wantPupil - pupil) * Math.min(1, dt * (m === 'speak' ? 16 : 5));

      // waking up: closed and breathing, a sleepy flutter, then fully open
      let lidOpen = 1;
      let power = 1;
      const waking = sleeper && !signal.awake;
      if (waking) {
        wakeT += dt;
        const asleep = reduced ? 0.3 : 1.1;
        if (wakeT < asleep) {
          lidOpen = 0;
          power = 0.32 + 0.08 * Math.sin(wakeT * 3.2);
        } else {
          const u = (wakeT - asleep) * (reduced ? 3 : 1);
          lidOpen = u < 0.35 ? easeOut(u / 0.35) * 0.38 : u < 0.6 ? 0.38 - ((u - 0.35) / 0.25) * 0.3 : 0.08 + 0.92 * easeOut(Math.min(1, (u - 0.6) / 0.9));
          power = Math.min(1, 0.32 + (u / 1.5) * 0.68);
          if (u > 1.7) signal.awake = true;
        }
        pupil += ((wakeT < asleep ? 0.55 : 0.5) - pupil) * Math.min(1, dt * 3);
      }

      // gaze: follow the pointer for a moment after it moves, otherwise glance around
      if (!reduced && !waking) {
        if (t - pointer.at < 2.5) {
          gaze.tx = pointer.x;
          gaze.ty = pointer.y;
        } else if ((gaze.nextSaccade -= dt) <= 0) {
          const look = m === 'speak' || m === 'hear';
          gaze.tx = look ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 1.4;
          gaze.ty = look ? (Math.random() - 0.5) * 0.2 : (Math.random() - 0.5) * 0.7;
          gaze.nextSaccade = 0.8 + Math.random() * 2.6;
        }
        gaze.x += (gaze.tx - gaze.x) * Math.min(1, dt * 9);
        gaze.y += (gaze.ty - gaze.y) * Math.min(1, dt * 9);
        // blink every few seconds (a quick close and open)
        if ((nextBlink -= dt) <= 0 && blinkT < 0) blinkT = 0;
        if (blinkT >= 0) {
          blinkT += dt;
          const d = 0.2;
          blink = blinkT < d / 2 ? blinkT / (d / 2) : Math.max(0, 1 - (blinkT - d / 2) / (d / 2));
          if (blinkT > d) {
            blinkT = -1;
            blink = 0;
            nextBlink = (Math.random() < 0.18 ? 0.25 : 2.5 + Math.random() * 4);
          }
        }
      }

      const c = size / 2;
      const R = size / 2;
      ctx.clearRect(0, 0, size, size);
      ctx.globalAlpha = 0.35 + 0.65 * power;

      // ambient glow
      const glow = ctx.createRadialGradient(c, c, R * 0.1, c, c, R);
      glow.addColorStop(0, `rgba(${BLUE},${0.26 + lv * 0.25})`);
      glow.addColorStop(0.5, `rgba(${GOLD},${0.05 + lv * 0.05})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // gold HUD rings
      ctx.lineCap = 'round';
      const segs = 7;
      for (let i = 0; i < segs; i++) {
        const a = t * 0.3 + (i / segs) * Math.PI * 2;
        ring(R * 0.9, a, a + (Math.PI * 2) / segs - 0.2, `rgba(${GOLD},0.5)`, full ? 1.8 : 1.3);
      }
      if (full) {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(-t * 0.15);
        for (let i = 0; i < 144; i++) {
          const long = i % 12 === 0;
          const a = (i / 144) * Math.PI * 2;
          const r1 = R * 0.96;
          const r2 = r1 - (long ? R * 0.035 : R * 0.015);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          ctx.strokeStyle = `rgba(${long ? GOLD_HI : GOLD},${long ? 0.75 : 0.28})`;
          ctx.lineWidth = long ? 1.5 : 1;
          ctx.stroke();
        }
        ctx.restore();
      }
      // scanner with a bright head, fast while thinking
      const sa = t * 1.3;
      const scan = ctx.createConicGradient ? ctx.createConicGradient(sa - 1.6, c, c) : null;
      if (scan) {
        scan.addColorStop(0, `rgba(${GOLD_HI},0)`);
        scan.addColorStop(0.25, `rgba(${GOLD_HI},0.85)`);
        scan.addColorStop(0.2501, 'rgba(0,0,0,0)');
        scan.addColorStop(1, 'rgba(0,0,0,0)');
        ring(R * 0.83, sa - 1.6, sa, scan, full ? 2 : 1.5);
      }
      ctx.beginPath();
      ctx.arc(c + Math.cos(sa) * R * 0.83, c + Math.sin(sa) * R * 0.83, full ? 2.8 : 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GOLD_HI},1)`;
      ctx.shadowColor = `rgba(${GOLD_HI},1)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // voice bars ringing the eye
      const barBase = R * 0.66;
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const wob = Math.sin(t * 6 + i * 0.7 + noise[i] * 6) * Math.sin(t * 2.3 + i * 0.21);
        const len = R * (0.008 + lv * 0.13 * (0.35 + 0.65 * Math.abs(wob)) * (0.6 + noise[i] * 0.4));
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * barBase, c + Math.sin(a) * barBase);
        ctx.lineTo(c + Math.cos(a) * (barBase + len), c + Math.sin(a) * (barBase + len));
        ctx.strokeStyle = (Math.sin(a + t) + 1) / 2 > 0.5 ? `rgba(${BLUE},${0.35 + lv * 0.6})` : `rgba(${GOLD_HI},${0.3 + lv * 0.6})`;
        ctx.lineWidth = full ? 1.8 : 1.4;
        ctx.stroke();
      }

      // listening: ripples running in toward the eye
      if (m === 'hear') {
        rippleClock += dt;
        if (rippleClock > 0.45) {
          rippleClock = 0;
          ripples.push({ r: R * 0.82, a: 0.7 });
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r -= dt * R * 0.45;
        rp.a -= dt * 0.9;
        if (rp.r < R * 0.5 || rp.a <= 0) ripples.splice(i, 1);
        else ring(rp.r, 0, Math.PI * 2, `rgba(${ICE},${rp.a})`, 1.2);
      }

      /* ── the eye: a round hologram drawn in light ── */
      ctx.globalAlpha = 1;
      const re = R * 0.42;
      const open = Math.max(0.03, Math.min(lidOpen, 1 - blink));
      const eye = eyeShape(c, re, open);
      // projector flicker (heavy while powering up) and an occasional glitch
      const settle = reduced ? 1 : 0.86 + 0.14 * Math.abs(Math.sin(t * 23) * Math.sin(t * 7.7));
      const flicker = power < 1 && !reduced ? power * (0.55 + 0.45 * Math.random()) : power * settle;
      if (!reduced && !waking && glitch <= 0 && Math.random() < dt * 0.25) glitch = 0.09;
      glitch -= dt;
      const gl = glitch > 0 ? (Math.random() - 0.5) * R * 0.06 : 0;

      const ix = c + gaze.x * re * 0.13 + gl;
      const iy = c + gaze.y * re * 0.13;
      const ri = re * 0.9;
      const pr = ri * pupil;
      const rot = t * 0.08;

      // the socket: a faint ring of light that stays visible even with the eye shut
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.5 * power;
      ctx.strokeStyle = `rgba(${ICE},0.28)`;
      ctx.lineWidth = full ? 1.2 : 1;
      ctx.stroke(eye.circle);
      ctx.restore();

      ctx.save();
      ctx.clip(eye.circle);
      ctx.clip(eye.lids);
      const vol = ctx.createRadialGradient(ix, iy, 0, ix, iy, re * 1.2);
      vol.addColorStop(0, `rgba(${BLUE},${(0.24 + lv * 0.18) * power})`);
      vol.addColorStop(1, `rgba(${BLUE},0.02)`);
      ctx.fillStyle = vol;
      ctx.fillRect(c - re, c - re, re * 2, re * 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flicker;

      // iris: rings of light, dashed ones turning both ways
      for (let k = 1; k <= 5; k++) {
        const rr = pr + (ri - pr) * (k / 5);
        ctx.setLineDash(k % 2 ? [] : [3, 5 + k]);
        ctx.beginPath();
        ctx.arc(ix, iy, rr, rot * (k % 2 ? 1 : -1.6), rot * (k % 2 ? 1 : -1.6) + Math.PI * 2);
        ctx.strokeStyle = `rgba(${k === 5 ? ICE : BLUE},${(k === 5 ? 0.75 : 0.22 + k * 0.05) + lv * 0.25})`;
        ctx.lineWidth = k === 5 ? (full ? 1.8 : 1.3) : 1;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // strands of light radiating from the pupil
      for (const f of fibres) {
        const ang = f.a + rot * 0.6;
        const r1 = pr * 1.12;
        const r2 = pr + (ri * 0.96 - pr) * f.len;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(ang) * r1, iy + Math.sin(ang) * r1);
        ctx.lineTo(ix + Math.cos(ang) * r2, iy + Math.sin(ang) * r2);
        ctx.strokeStyle = f.light > 0.7 ? `rgba(${ICE},${0.32 + lv * 0.4})` : `rgba(${BLUE},${0.16 + lv * 0.3})`;
        ctx.lineWidth = full ? 0.9 : 0.7;
        ctx.stroke();
      }
      // gold data points
      for (const fl of flecks) {
        const ang = fl.a - rot;
        const rr = pr + (ri - pr) * fl.r;
        ctx.fillStyle = `rgba(${GOLD_HI},${0.45 + lv * 0.4})`;
        ctx.fillRect(ix + Math.cos(ang) * rr - 1, iy + Math.sin(ang) * rr - 1, full ? 2 : 1.5, full ? 2 : 1.5);
      }

      // pupil: a dark core inside a ring of light, with targeting ticks
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(ix, iy, pr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,2,10,0.78)';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = `rgba(${BLUE},1)`;
      ctx.shadowBlur = R * 0.05;
      ctx.beginPath();
      ctx.arc(ix, iy, pr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ICE},${0.85 + lv * 0.15})`;
      ctx.lineWidth = full ? 1.8 : 1.3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let k = 0; k < 4; k++) {
        const ang = k * (Math.PI / 2) + rot * 2;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(ang) * pr * 0.55, iy + Math.sin(ang) * pr * 0.55);
        ctx.lineTo(ix + Math.cos(ang) * pr * 0.82, iy + Math.sin(ang) * pr * 0.82);
        ctx.strokeStyle = `rgba(${GOLD_HI},0.7)`;
        ctx.lineWidth = full ? 1.4 : 1;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(ix, iy, Math.max(1.2, pr * 0.1), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ICE},${0.5 + lv * 0.5})`;
      ctx.fill();

      // scanlines and a band of light sweeping down
      ctx.globalCompositeOperation = 'source-over';
      const step = full ? 3 : 2.5;
      const off = (t * 18) % step;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      for (let y = c - re + off; y < c + re; y += step) ctx.fillRect(c - re, y, re * 2, step * 0.45);
      ctx.globalCompositeOperation = 'lighter';
      const bandY = c - re + ((t * 0.35) % 1) * re * 2;
      const band = ctx.createLinearGradient(0, bandY - re * 0.18, 0, bandY + re * 0.18);
      band.addColorStop(0, `rgba(${ICE},0)`);
      band.addColorStop(0.5, `rgba(${ICE},0.16)`);
      band.addColorStop(1, `rgba(${ICE},0)`);
      ctx.fillStyle = band;
      ctx.fillRect(c - re, bandY - re * 0.18, re * 2, re * 0.36);
      ctx.restore();

      // the lids, in light: a faint colour split, then the bright line (inside the round eye)
      ctx.save();
      ctx.clip(eye.circle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(flicker, 0.45);
      ctx.lineCap = 'round';
      for (const [dx, col] of [[-1.2, 'rgba(255,90,140,0.22)'], [1.2, 'rgba(90,220,255,0.28)']] as const) {
        ctx.translate(dx, 0);
        ctx.strokeStyle = col;
        ctx.lineWidth = full ? 1.6 : 1.2;
        ctx.stroke(eye.upper);
        ctx.stroke(eye.lower);
        ctx.translate(-dx, 0);
      }
      ctx.shadowColor = `rgba(${BLUE},1)`;
      ctx.shadowBlur = R * (0.06 + lv * 0.06);
      ctx.strokeStyle = `rgba(${ICE},${0.8 + lv * 0.2})`;
      ctx.lineWidth = full ? 1.9 : 1.4;
      ctx.stroke(eye.upper);
      ctx.stroke(eye.lower);
      ctx.restore();

      // the round outline glows once the eye is open
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = open * flicker;
      ctx.shadowColor = `rgba(${BLUE},1)`;
      ctx.shadowBlur = R * (0.05 + lv * 0.06);
      ctx.strokeStyle = `rgba(${ICE},${0.7 + lv * 0.25})`;
      ctx.lineWidth = full ? 1.8 : 1.3;
      ctx.stroke(eye.circle);

      // the gold brow ridge, in light
      ctx.globalAlpha = 0.45 + 0.55 * power;
      ctx.beginPath();
      ctx.moveTo(c - re * 1.15, c - re * 0.5);
      ctx.bezierCurveTo(c - re * 0.55, c - re * 1.38, c + re * 0.6, c - re * 1.45, c + re * 1.28, c - re * 0.92);
      const brow = ctx.createLinearGradient(c - re, 0, c + re, 0);
      brow.addColorStop(0, `rgba(${GOLD},0.15)`);
      brow.addColorStop(0.55, `rgba(${GOLD_HI},0.95)`);
      brow.addColorStop(1, `rgba(${GOLD},0.7)`);
      ctx.shadowColor = `rgba(${GOLD_HI},0.9)`;
      ctx.shadowBlur = R * 0.05;
      ctx.strokeStyle = brow;
      ctx.lineCap = 'round';
      ctx.lineWidth = full ? R * 0.024 : R * 0.04;
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [detail]);

  return (
    <div ref={wrap} className={`relative grid place-items-center ${className}`} role="img" aria-label={label}>
      <canvas ref={canvas} />
    </div>
  );
}
