import { useEffect, useRef } from 'react';
import { chart } from '../../config/chartPalette';
import earthImage from '../../assets/images/earth_planet_space_fintech_1789815379245.jpg';

/**
 * Ambient market backdrop: a slowly turning globe behind a live candle field.
 *
 * Two layers, one canvas:
 *
 *  1. The globe — the earth photograph, tinted into the palette and rotated on
 *     its own axis. It is drawn with the 'screen' composite so the photo's dark
 *     space background drops out against the navy rather than sitting on it as
 *     a grey rectangle.
 *
 *  2. The market — price grid, drifting candles, a gold moving-average ribbon,
 *     a depth band and a bid/ask ladder.
 *
 * Colour: navy, gold and blue only. The earth is forced into that range by a
 * 'source-atop' gradient pass rather than being left photographic, so nothing
 * in the backdrop reads as white.
 *
 * Scroll behaviour follows the RankRise starfield — the field translates with
 * scroll position and leans into scroll *velocity*, eased at
 * `vel += (raw - vel) * 0.08` so it keeps moving for a beat after the wheel
 * stops. That lag is what makes it feel attached to the page.
 *
 * Costs: one canvas, one rAF loop, paused when the tab is hidden or the element
 * is off-screen. Under prefers-reduced-motion it draws a single frame and stops.
 */

interface Props {
  /** 0–1. The backdrop should sit well under the content. */
  opacity?: number;
  className?: string;
}

/* Deterministic noise so the field is identical on every load — Math.random()
   here would make the backdrop flicker on re-render for no benefit. */
function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

interface Candle {
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
    /* Larger steps than a realistic series would take: the point here is
       silhouette, and small steps read as a flat ribbon at this opacity. */
    const drift = (hash(i * 3.1) - 0.47) * 0.145;
    const open = price;
    price = Math.min(0.94, Math.max(0.06, price + drift));
    const close = price;

    /* Every so often a much longer wick, so the field has a skyline instead of
       an even hedge. */
    const spike = hash(i * 11.3) > 0.86 ? 0.09 : 0;
    const wick = 0.02 + hash(i * 7.7) * 0.05 + spike;

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

const COLUMN_WIDTH = 34;
const SERIES_LENGTH = 260;
const GLOBE_TEXTURE = 900;

/**
 * Pre-tints the earth photograph into the palette, once.
 *
 * Doing this per frame would mean a full-size composite pass every 16ms; the
 * texture never changes, so it is built once and only rotated afterwards.
 */
function buildGlobeTexture(image: HTMLImageElement): HTMLCanvasElement | null {
  const size = GLOBE_TEXTURE;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const g = off.getContext('2d');
  if (!g) return null;

  /* Clip to the disc so the photo's square corners never show. */
  g.save();
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.clip();
  g.drawImage(image, 0, 0, size, size);

  /* Duotone the photograph into gold/blue.
     'multiply' is the operation that matters here: white * colour = colour, so
     the cloud tops and ice caps take the gradient exactly instead of staying
     white. A 'source-atop' tint at any alpha leaves highlights white, which is
     what the first pass got wrong. */
  g.globalCompositeOperation = 'multiply';
  const tint = g.createLinearGradient(size * 0.15, 0, size * 0.85, size);
  tint.addColorStop(0, '#e3c65c'); // gold, sunlit limb
  tint.addColorStop(0.38, '#d4af37');
  tint.addColorStop(0.68, '#2e7fe8'); // brand blue
  tint.addColorStop(1, '#0b2044'); // navy, night side
  g.fillStyle = tint;
  g.fillRect(0, 0, size, size);

  /* Multiply flattens contrast, so put some back: 'overlay' deepens the oceans
     and lets the landmasses read again. */
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = 'rgba(46, 127, 232, 0.28)';
  g.fillRect(0, 0, size, size);

  /* Darken the limb so the sphere reads as a sphere and not a flat disc. */
  g.globalCompositeOperation = 'source-atop';
  const limb = g.createRadialGradient(
    size * 0.38,
    size * 0.34,
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  limb.addColorStop(0, 'rgba(255, 255, 255, 0)');
  limb.addColorStop(0.62, 'rgba(7, 23, 52, 0.25)');
  limb.addColorStop(1, 'rgba(7, 23, 52, 0.92)');
  g.fillStyle = limb;
  g.fillRect(0, 0, size, size);

  g.restore();
  return off;
}

export function ForexBackdrop({ opacity = 0.55, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const series = buildSeries(SERIES_LENGTH);

    let globe: HTMLCanvasElement | null = null;
    const image = new Image();
    image.src = earthImage;
    image.decoding = 'async';
    image.onload = () => {
      globe = buildGlobeTexture(image);
      if (reduced) draw(performance.now());
    };

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      /* ── Layer 1: the globe ─────────────────────────────────────── */
      if (globe) {
        const radius = Math.min(width, height) * (width < 700 ? 0.58 : 0.62);
        const cx = width * (width < 700 ? 0.5 : 0.62);
        /* Drifts upward as the page scrolls, so it moves with the content
           instead of sitting pinned behind it. */
        const cy = height * 0.5 - (reduced ? 0 : y * 0.045);
        const spin = reduced ? 0.4 : t * 0.018 + y * 0.00012;

        /* Atmosphere, behind the disc. */
        const halo = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.32);
        halo.addColorStop(0, 'rgba(46, 127, 232, 0.16)');
        halo.addColorStop(1, 'rgba(46, 127, 232, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.globalAlpha = 0.8;
        /* 'screen' drops the photo's dark space background against the navy. */
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.drawImage(globe, -radius, -radius, radius * 2, radius * 2);
        ctx.restore();

        /* Gold terminator along the sunlit limb. */
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = chart.accent;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI * 0.85, -Math.PI * 0.1);
        ctx.stroke();
        ctx.restore();
      }

      /* ── Layer 2: the market ────────────────────────────────────── */
      const baseline = height * 0.58;
      const amplitude = height * 0.44;
      const offset = reduced ? 0 : y * 0.26 + t * 14 + velocity * 6;
      const lift = reduced ? 0 : velocity * 0.45;

      const priceY = (p: number) => baseline - (p - 0.5) * amplitude * 2 + lift;

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

      for (let c = 0; c <= columns; c += 4) {
        const gx = Math.round((firstColumn + c) * COLUMN_WIDTH - offset) + 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, baseline - amplitude + lift);
        ctx.lineTo(gx, baseline + amplitude + lift);
        ctx.stroke();
      }

      for (let c = 0; c < columns; c++) {
        const candle = series[(((firstColumn + c) % SERIES_LENGTH) + SERIES_LENGTH) % SERIES_LENGTH];
        const x = (firstColumn + c) * COLUMN_WIDTH - offset;
        const rising = candle.close >= candle.open;

        ctx.strokeStyle = rising ? chart.upWick : chart.downWick;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.62;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, priceY(candle.high));
        ctx.lineTo(Math.round(x) + 0.5, priceY(candle.low));
        ctx.stroke();

        const top = priceY(Math.max(candle.open, candle.close));
        const bottom = priceY(Math.min(candle.open, candle.close));
        ctx.globalAlpha = 0.46;
        ctx.fillStyle = rising ? chart.up : chart.down;
        ctx.fillRect(Math.round(x) - 7, top, 14, Math.max(2, bottom - top));
      }
      ctx.globalAlpha = 1;

      /* Moving-average ribbon, in gold. */
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
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      /* Depth band below the ribbon. */
      ctx.lineTo(width, baseline + amplitude + lift);
      ctx.lineTo(0, baseline + amplitude + lift);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, baseline - amplitude, 0, baseline + amplitude);
      fill.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
      fill.addColorStop(1, 'rgba(46, 127, 232, 0)');
      ctx.fillStyle = fill;
      ctx.globalAlpha = 1;
      ctx.fill();

      /* Bid/ask ladder, far right. */
      const rungs = 14;
      for (let r = 0; r < rungs; r++) {
        const ry = baseline - amplitude + (r / rungs) * amplitude * 2 + lift;
        const depth = hash(r * 4.3 + Math.floor(t * 0.4)) * 0.85 + 0.15;
        const above = ry < baseline + lift;
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = above ? chart.down : chart.up;
        ctx.fillRect(width - depth * 130, ry, depth * 130, 6);
      }
      ctx.globalAlpha = 1;
    }

    if (reduced) {
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
      image.onload = null;
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
