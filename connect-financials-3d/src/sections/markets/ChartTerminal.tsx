import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatPrice, shortSymbol, useMarket } from '../../feed/market';
import { INITIAL_INSTRUMENTS, generateInitialCandles } from '../../data/market';
import { Flash } from '../../ui/Flash';
import type { Candle, ChartTimeframe, Instrument } from '../../types';

type Kind = 'candles' | 'line' | 'area';

const TIMEFRAMES: { id: ChartTimeframe; minutes: number }[] = [
  { id: 'M1', minutes: 1 },
  { id: 'M5', minutes: 5 },
  { id: 'M15', minutes: 15 },
  { id: 'H1', minutes: 60 },
  { id: 'H4', minutes: 240 },
  { id: 'D1', minutes: 1440 },
];
const KINDS: { id: Kind; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
];

const COUNT = 80;
/** Feed ticks (for this instrument) per new candle. */
const TICKS_PER_CANDLE = 8;

const C = {
  gold: '#D4AF37',
  goldHi: '#F5D27A',
  ink: '#F5F7FA',
  muted: '#8A94A8',
  abyss: '#050B1A',
  navyMid: '#12244D',
  grid: 'rgba(138,148,168,0.10)',
  down: 'rgba(245,247,250,0.72)',
};
const FONT = '10px Inter, ui-sans-serif, system-ui, sans-serif';

const SEED_BID: Record<string, number> = Object.fromEntries(INITIAL_INSTRUMENTS.map((i) => [i.id, i.bid]));
const liveChange = (i: Instrument) => {
  const s = SEED_BID[i.id] ?? i.bid;
  return i.change24h + ((i.bid - s) / s) * 100;
};

/** Candles for a timeframe, rescaled so volatility grows with the timeframe and the last close sits on the live bid. */
function buildCandles(bid: number, minutes: number): Candle[] {
  const raw = generateInitialCandles(bid, COUNT, minutes).slice(-COUNT);
  const last = raw[raw.length - 1].close;
  const k = Math.min(6, Math.sqrt(minutes / 5));
  const map = (p: number) => bid + (p - last) * k;
  return raw.map((c) => ({ ...c, open: map(c.open), high: map(c.high), low: map(c.low), close: map(c.close) }));
}

function sma(values: number[], n: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= n) sum -= values[i - n];
    return i >= n - 1 ? sum / n : null;
  });
}

function timeLabel(t: number, tf: ChartTimeframe) {
  const d = new Date(t);
  if (tf === 'D1') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function ChartTerminal({ instrumentId }: { instrumentId: string }) {
  const { byId, moved, seq } = useMarket();
  const inst = byId[instrumentId] ?? INITIAL_INSTRUMENTS[0];

  const [tf, setTf] = useState<ChartTimeframe>('M15');
  const [kind, setKind] = useState<Kind>('candles');
  const [ma20, setMa20] = useState(true);
  const [ma50, setMa50] = useState(false);
  const [showVol, setShowVol] = useState(true);
  const [hover, setHover] = useState<{ i: number; y: number | null } | null>(null);
  const [version, setVersion] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const candlesRef = useRef<Candle[]>([]);
  const ticksRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const instRef = useRef(inst);
  instRef.current = inst;

  const minutes = TIMEFRAMES.find((t) => t.id === tf)!.minutes;

  // Regenerate history when the instrument or timeframe changes, seeded from the current bid.
  useEffect(() => {
    candlesRef.current = buildCandles(instRef.current.bid, minutes);
    ticksRef.current = 0;
    setHover(null);
    setVersion((v) => v + 1);
  }, [instrumentId, minutes]);

  // Stream the live bid into the last candle.
  useEffect(() => {
    if (!moved[instrumentId]) return;
    const cs = candlesRef.current;
    if (!cs.length) return;
    const bid = inst.bid;
    ticksRef.current += 1;
    if (ticksRef.current >= TICKS_PER_CANDLE) {
      ticksRef.current = 0;
      const prev = cs[cs.length - 1];
      const next: Candle = { time: prev.time + minutes * 60_000, open: prev.close, high: Math.max(prev.close, bid), low: Math.min(prev.close, bid), close: bid, volume: 120 + Math.floor(Math.random() * 200) };
      candlesRef.current = [...cs.slice(1), next];
    } else {
      const last = cs[cs.length - 1];
      cs[cs.length - 1] = { ...last, close: bid, high: Math.max(last.high, bid), low: Math.min(last.low, bid), volume: last.volume + 10 + Math.floor(Math.random() * 60) };
    }
    setVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const { w, h } = sizeRef.current;
    const cs = candlesRef.current;
    if (!canvas || !w || !h || !cs.length) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const i0 = instRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;
    ctx.textBaseline = 'middle';

    const axisW = 68;
    const timeH = 20;
    const plotW = w - axisW;
    const volH = showVol ? Math.max(28, (h - timeH) * 0.16) : 0;
    const priceH = h - timeH - volH - 8;
    const n = cs.length;
    const slot = plotW / n;
    const body = Math.max(1, Math.min(12, slot * 0.62));

    const closes = cs.map((c) => c.close);
    const m20 = ma20 ? sma(closes, 20) : [];
    const m50 = ma50 ? sma(closes, 50) : [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of cs) {
      lo = Math.min(lo, kind === 'candles' ? c.low : c.close);
      hi = Math.max(hi, kind === 'candles' ? c.high : c.close);
    }
    for (const v of [...m20, ...m50]) if (v != null) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
    lo = Math.min(lo, i0.bid);
    hi = Math.max(hi, i0.bid);
    const pad = (hi - lo || i0.pipSize * 10) * 0.08;
    lo -= pad;
    hi += pad;
    const y = (p: number) => 8 + ((hi - p) / (hi - lo)) * priceH;
    const x = (i: number) => i * slot + slot / 2;

    // Grid + price axis labels
    ctx.lineWidth = 1;
    const rows = Math.max(3, Math.floor(priceH / 48));
    for (let r = 0; r <= rows; r++) {
      const p = hi - ((hi - lo) * r) / rows;
      const yy = Math.round(y(p)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(plotW, yy);
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(i0, p), plotW + 8, yy);
    }
    const every = Math.max(1, Math.ceil(90 / slot));
    ctx.textAlign = 'center';
    for (let i = n - 1; i >= 0; i -= every) {
      const xx = Math.round(x(i)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(xx, 8);
      ctx.lineTo(xx, h - timeH);
      ctx.stroke();
      if (xx > 24 && xx < plotW - 24) {
        ctx.fillStyle = C.muted;
        ctx.fillText(timeLabel(cs[i].time, tf), xx, h - timeH / 2);
      }
    }

    // Volume
    if (showVol) {
      const maxV = Math.max(...cs.map((c) => c.volume));
      const base = h - timeH;
      cs.forEach((c, i) => {
        const vh = (c.volume / maxV) * (volH - 4);
        ctx.fillStyle = c.close >= c.open ? 'rgba(212,175,55,0.32)' : 'rgba(245,247,250,0.14)';
        ctx.fillRect(x(i) - body / 2, base - vh, body, vh);
      });
    }

    // Series
    if (kind === 'candles') {
      cs.forEach((c, i) => {
        const up = c.close >= c.open;
        const xx = Math.round(x(i)) + 0.5;
        const yo = y(c.open);
        const yc = y(c.close);
        const top = Math.min(yo, yc);
        const bh = Math.max(1, Math.abs(yc - yo));
        ctx.strokeStyle = up ? C.gold : C.down;
        ctx.beginPath();
        ctx.moveTo(xx, y(c.high));
        ctx.lineTo(xx, top);
        ctx.moveTo(xx, top + bh);
        ctx.lineTo(xx, y(c.low));
        ctx.stroke();
        if (up) {
          ctx.fillStyle = C.gold;
          ctx.fillRect(xx - body / 2, top, body, bh);
        } else {
          ctx.strokeRect(Math.round(xx - body / 2) + 0.5, Math.round(top) + 0.5, Math.max(1, Math.round(body) - 1), Math.max(1, Math.round(bh) - 1));
        }
      });
    } else {
      ctx.beginPath();
      cs.forEach((c, i) => (i ? ctx.lineTo(x(i), y(c.close)) : ctx.moveTo(x(i), y(c.close))));
      if (kind === 'area') {
        ctx.save();
        ctx.lineTo(x(n - 1), h - timeH - volH);
        ctx.lineTo(x(0), h - timeH - volH);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, 8, 0, h - timeH - volH);
        g.addColorStop(0, 'rgba(212,175,55,0.35)');
        g.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        cs.forEach((c, i) => (i ? ctx.lineTo(x(i), y(c.close)) : ctx.moveTo(x(i), y(c.close))));
      }
      ctx.strokeStyle = C.goldHi;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Moving averages
    const line = (vals: (number | null)[], color: string, dash: number[]) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      vals.forEach((v, i) => {
        if (v == null) return;
        if (!started) ctx.moveTo(x(i), y(v));
        else ctx.lineTo(x(i), y(v));
        started = true;
      });
      ctx.stroke();
      ctx.restore();
    };
    if (ma20) line(m20, C.goldHi, []);
    if (ma50) line(m50, 'rgba(245,247,250,0.6)', [4, 3]);

    // Live price line + tag
    const ly = Math.round(y(i0.bid)) + 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(212,175,55,0.7)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(plotW, ly);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.gold;
    ctx.fillRect(plotW + 2, ly - 9, axisW - 4, 18);
    ctx.fillStyle = C.abyss;
    ctx.textAlign = 'left';
    ctx.font = `600 ${FONT}`;
    ctx.fillText(formatPrice(i0, i0.bid), plotW + 8, ly);
    ctx.font = FONT;

    // Crosshair
    if (hover && hover.i >= 0 && hover.i < n) {
      const hx = Math.round(x(hover.i)) + 0.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(245,210,122,0.45)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, 8);
      ctx.lineTo(hx, h - timeH);
      if (hover.y != null && hover.y > 8 && hover.y < 8 + priceH) {
        ctx.moveTo(0, Math.round(hover.y) + 0.5);
        ctx.lineTo(plotW, Math.round(hover.y) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
      if (hover.y != null && hover.y > 8 && hover.y < 8 + priceH) {
        const p = hi - ((hover.y - 8) / priceH) * (hi - lo);
        ctx.fillStyle = C.navyMid;
        ctx.strokeStyle = 'rgba(212,175,55,0.5)';
        ctx.fillRect(plotW + 2, hover.y - 9, axisW - 4, 18);
        ctx.strokeRect(plotW + 2.5, hover.y - 8.5, axisW - 5, 17);
        ctx.fillStyle = C.ink;
        ctx.textAlign = 'left';
        ctx.fillText(formatPrice(i0, p), plotW + 8, hover.y);
      }
      const label = timeLabel(cs[hover.i].time, tf);
      const tw = ctx.measureText(label).width + 12;
      const tx = Math.min(Math.max(hx - tw / 2, 0), plotW - tw);
      ctx.fillStyle = C.navyMid;
      ctx.fillRect(tx, h - timeH + 2, tw, timeH - 4);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tw / 2, h - timeH / 2);
    }
  }, [hover, kind, ma20, ma50, showVol, tf]);

  // Redraw whenever data or options change.
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw, version]);

  // Resize-aware, HiDPI-crisp.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      sizeRef.current = { w: Math.floor(width), h: Math.floor(height) };
      drawRef.current();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const indexAt = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const plotW = rect.width - 68;
    const px = clientX - rect.left;
    if (px < 0 || px > plotW) return -1;
    return Math.min(candlesRef.current.length - 1, Math.floor((px / plotW) * candlesRef.current.length));
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const i = indexAt(e.clientX);
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(i < 0 ? null : { i, y: e.clientY - rect.top });
  };
  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const n = candlesRef.current.length;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    e.preventDefault();
    if (e.key === 'Escape') return setHover(null);
    const cur = hover?.i ?? n;
    const next = Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowLeft' ? -1 : 1)));
    setHover({ i: next, y: null });
  };

  const cs = candlesRef.current;
  const shown = hover ? cs[hover.i] : cs[cs.length - 1];
  const ch = liveChange(inst);
  const up = ch >= 0;
  const fmt = (v: number) => formatPrice(inst, v);

  const pill = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors ${
      active ? 'bg-gold/15 text-gold-hi shadow-[inset_0_0_0_1px_rgba(212,175,55,0.55)]' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="flex h-full min-w-0 flex-col p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-xl font-semibold tracking-wide text-ink sm:text-2xl">{shortSymbol(inst)}</h3>
            <span className={`num text-xs ${up ? 'text-gold' : 'text-muted'}`}>
              <span aria-hidden>{up ? '▲' : '▼'} </span>
              {up ? '+' : '−'}
              {Math.abs(ch).toFixed(2)}%
            </span>
          </div>
          <p className="truncate text-[11px] text-muted">{inst.name}</p>
        </div>
        <dl className="num flex gap-5 text-right">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-muted">Bid</dt>
            <dd>
              <Flash dir={moved[inst.id]} seq={seq} className="rounded font-display text-base font-semibold text-gold-hi sm:text-lg">
                {fmt(inst.bid)}
              </Flash>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-muted">Ask</dt>
            <dd>
              <Flash dir={moved[inst.id]} seq={seq} className="rounded font-display text-base font-semibold text-ink sm:text-lg">
                {fmt(inst.ask)}
              </Flash>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-muted">Spread</dt>
            <dd className="font-display text-base font-semibold text-ink/80 sm:text-lg">{inst.spread.toFixed(1)}</dd>
          </div>
        </dl>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-gold/15 py-2">
        <div role="group" aria-label="Timeframe" className="flex gap-0.5">
          {TIMEFRAMES.map((t) => (
            <button key={t.id} type="button" aria-pressed={tf === t.id} onClick={() => setTf(t.id)} className={pill(tf === t.id)}>
              {t.id}
            </button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-gold/20 sm:block" aria-hidden />
        <div role="group" aria-label="Chart type" className="flex gap-0.5">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={pill(kind === k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-gold/20 sm:block" aria-hidden />
        <div role="group" aria-label="Overlays" className="flex gap-0.5">
          <button type="button" aria-pressed={ma20} onClick={() => setMa20((v) => !v)} className={pill(ma20)}>
            MA20
          </button>
          <button type="button" aria-pressed={ma50} onClick={() => setMa50((v) => !v)} className={pill(ma50)}>
            MA50
          </button>
          <button type="button" aria-pressed={showVol} onClick={() => setShowVol((v) => !v)} className={pill(showVol)}>
            Volume
          </button>
        </div>
      </div>

      {/* OHLC readout (doubles as the tooltip for the crosshair) */}
      <div className="num mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted" aria-live="off">
        {shown && (
          <>
            <span className="text-ink/80">{new Date(shown.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span>O <span className="text-ink">{fmt(shown.open)}</span></span>
            <span>H <span className="text-ink">{fmt(shown.high)}</span></span>
            <span>L <span className="text-ink">{fmt(shown.low)}</span></span>
            <span>C <span className={shown.close >= shown.open ? 'text-gold-hi' : 'text-ink'}>{fmt(shown.close)}</span></span>
            {ma20 && <span className="text-gold-hi/80">MA20</span>}
            {ma50 && <span className="text-ink/60">MA50 ┄</span>}
          </>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-muted/80">Indicative · simulated</span>
      </div>

      <div ref={wrapRef} className="relative mt-2 h-[260px] min-h-[220px] flex-1 sm:h-[340px]">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`${shortSymbol(inst)} ${tf} ${kind} chart, simulated. Last price ${fmt(inst.bid)}. Use left and right arrow keys to inspect candles.`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          className="absolute inset-0 h-full w-full touch-pan-y cursor-crosshair rounded"
        />
      </div>
    </div>
  );
}
