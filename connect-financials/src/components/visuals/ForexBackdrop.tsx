import { useEffect, useRef } from 'react';
import { chart } from '../../config/chartPalette';

/**
 * Ambient market backdrop.
 *
 * Replaces the spinning-planet backdrop with something the page is actually
 * about: a price grid, a drifting candlestick field, a moving-average ribbon
 * and a depth band, all in the blue/gold palette.
 *
 * Scroll behaviour is modelled on the RankRise site's starfield — the field
 * translates with scroll position and leans into scroll *velocity*, with the
 * velocity eased (`vel += (raw - vel) * 0.08`) so it keeps moving for a beat
 * after the wheel stops instead of snapping. That lag is what makes it feel
 * attached to the page rather than redrawn on top of it.
 *
 * Costs: one canvas, one rAF loop, paused whenever the tab is hidden or the
 * element is off-screen. Under prefers-reduced-motion it draws a single frame
 * and stops.
 */

interface Props {
  /** 0–1. The backdrop should sit well under the content. */
  opacity?: number;
  className?: string;
}

/* Deterministic noise so the field is identical on every load and between
   server and client — Math.random() here would make the backdrop flicker on
   re-render and differ per visitor for no benefit. */
function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

interface Candle {
  /** Column index — position derives from this, so candles never drift apart. */
  i: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

/** A seeded random walk, so the field reads as a plausible price series. */
function buildSeries(count: number): Candle[] {
  const candles: Candle[] = [];
  let price = 0.5;

  for (let i = 0; i < count; i++) {
    const drift = (hash(i * 3.1) - 0.47) * 0.055;
    const open = price;
    price = Math.min(0.92, Math.max(0.08, price + drift));
    const close = price;

    const wick = 0.012 + hash(i * 7.7) * 0.03;
    candles.push({
      i,
      open,
      close,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick,
    });
  }
  return candles;
}

const COLUMN_WIDTH = 26;
const SERIES_LENGTH = 220;

export function ForexBackdrop({ opacity = 0.5, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const series = buildSeries(SERIES_LENGTH);

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    let visible = true;
    const io =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => (visible = entries[0].isIntersecting), {
            threshold: 0.01,
          })
        : null;
    io?.observe(canvas);

    let lastY = window.scrollY;
    let velocity = 0;
    let raf = 0;
    const start = performance.now();

    function draw(now: number) {
      if (!canvas || !ctx) return;
      const t = (now - start) / 1000;

      /* Eased scroll velocity — the lag is the point. */
      const y = window.scrollY;
      velocity += (y - lastY - velocity) * 0.08;
      lastY = y;

      ctx.clearRect(0, 0, width, height);

      const baseline = height * 0.62;
      const amplitude = height * 0.3;
      /* Scroll drives the field leftward; velocity adds a momentary push. */
      const offset = reduced ? 0 : y * 0.22 + t * 9 + velocity * 5;
      const lift = reduced ? 0 : velocity * 0.45;

      const priceY = (p: number) => baseline - (p - 0.5) * amplitude * 2 + lift;

      /* ── Price grid ─────────────────────────────────────────────── */
      ctx.lineWidth = 1;
      ctx.strokeStyle = chart.grid;
      for (let level = 0; level <= 8; level++) {
        const gy = Math.round(baseline - amplitude + (level / 8) * amplitude * 2 + lift) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      const firstColumn = Math.floor(offset / COLUMN_WIDTH);
      const columns = Math.ceil(width / COLUMN_WIDTH) + 2;

      /* Vertical time ticks, moving with the field. */
      for (let c = 0; c <= columns; c += 4) {
        const gx = Math.round((firstColumn + c) * COLUMN_WIDTH - offset) + 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, baseline - amplitude + lift);
        ctx.lineTo(gx, baseline + amplitude + lift);
        ctx.stroke();
      }

      /* ── Candles ────────────────────────────────────────────────── */
      for (let c = 0; c < columns; c++) {
        const candle = series[(((firstColumn + c) % SERIES_LENGTH) + SERIES_LENGTH) % SERIES_LENGTH];
        const x = (firstColumn + c) * COLUMN_WIDTH - offset;
        const rising = candle.close >= candle.open;

        ctx.strokeStyle = rising ? chart.upWick : chart.downWick;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, priceY(candle.high));
        ctx.lineTo(Math.round(x) + 0.5, priceY(candle.low));
        ctx.stroke();

        const top = priceY(Math.max(candle.open, candle.close));
        const bottom = priceY(Math.min(candle.open, candle.close));
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = rising ? chart.up : chart.down;
        ctx.fillRect(Math.round(x) - 5, top, 10, Math.max(1.5, bottom - top));
      }
      ctx.globalAlpha = 1;

      /* ── Moving-average ribbon, in gold ─────────────────────────── */
      ctx.beginPath();
      for (let c = 0; c <= columns; c++) {
        const idx = firstColumn + c;
        let sum = 0;
        for (let k = 0; k < 9; k++) {
          sum += series[((((idx - k) % SERIES_LENGTH) + SERIES_LENGTH) % SERIES_LENGTH)].close;
        }
        const x = idx * COLUMN_WIDTH - offset;
        const py = priceY(sum / 9);
        if (c === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.strokeStyle = chart.accent;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* ── Depth band below the ribbon ────────────────────────────── */
      ctx.lineTo(width, baseline + amplitude + lift);
      ctx.lineTo(0, baseline + amplitude + lift);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, baseline - amplitude, 0, baseline + amplitude);
      fill.addColorStop(0, 'rgba(212, 175, 55, 0.07)');
      fill.addColorStop(1, 'rgba(46, 127, 232, 0)');
      ctx.fillStyle = fill;
      ctx.globalAlpha = 1;
      ctx.fill();

      /* ── Bid/ask ladder, far right ──────────────────────────────── */
      const rungs = 14;
      for (let r = 0; r < rungs; r++) {
        const ry = baseline - amplitude + (r / rungs) * amplitude * 2 + lift;
        const depth = hash(r * 4.3 + Math.floor(t * 0.4)) * 0.85 + 0.15;
        const above = ry < baseline + lift;
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = above ? chart.down : chart.up;
        ctx.fillRect(width - depth * 130, ry, depth * 130, 6);
      }
      ctx.globalAlpha = 1;
    }

    if (reduced) {
      /* One considered frame, then still. */
      draw(start + 4000);
    } else {
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        draw(now);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      io?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 h-full w-full ${className}`}
      style={{ opacity }}
    />
  );
}
