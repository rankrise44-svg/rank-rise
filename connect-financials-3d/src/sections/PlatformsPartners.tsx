import type { ReactNode } from 'react';

/**
 * Beat 11 — Platforms & partners.
 * Typographic wordmark tiles. Hover or keyboard focus reveals a generated
 * navy/gold scene (no photography or real logos are available yet).
 * Render inside a section that supplies the h2.
 */

type Visual = 'terminal' | 'candles' | 'studio' | 'fix' | 'depth' | 'portal' | 'screener' | 'calendar';

type Platform = {
  name: string;
  kind: string;
  line: string;
  visual: Visual;
  label: string;
};

// Every platform below is named in the previous Connect Financials app;
// each line paraphrases how that app described it.
const PLATFORMS: Platform[] = [
  {
    name: 'MetaTrader 5',
    kind: 'Desktop & mobile',
    line: 'Named in the Client Agreement as a platform through which Connect Financials accounts are traded.',
    visual: 'candles',
    label: 'Animated candlestick chart',
  },
  {
    name: 'WebTrader',
    kind: 'Browser terminal',
    line: 'Place and manage trades from the browser, launched directly from the Trader Portal.',
    visual: 'terminal',
    label: 'Animated terminal order log',
  },
  {
    name: 'ConnectView Studio',
    kind: 'Charting',
    line: 'TradingView-style technical analysis with multi-chart layouts, drawing tools and indicators.',
    visual: 'studio',
    label: 'Animated multi-chart layout with an indicator line',
  },
  {
    name: 'FIX API',
    kind: 'Connectivity',
    line: 'Prime-brokerage style FIX connectivity offered with the top-tier institutional account.',
    visual: 'fix',
    label: 'Animated order-flow lines between two endpoints',
  },
  {
    name: 'Level II Order Book',
    kind: 'Market depth',
    line: 'A depth-of-market (DOM) view of bids and offers stacked around the current price.',
    visual: 'depth',
    label: 'Animated depth-of-market bars',
  },
  {
    name: 'Trader Portal',
    kind: 'Client area',
    line: 'Account overview and open positions in one place, with a direct route into WebTrader.',
    visual: 'portal',
    label: 'Animated account dashboard panels',
  },
  {
    name: 'Market Watch',
    kind: 'Screener',
    line: 'A live quote screener across currency pairs and CFD instruments.',
    visual: 'screener',
    label: 'Animated rows of flickering quotes',
  },
  {
    name: 'Economic Calendar',
    kind: 'Research',
    line: 'Scheduled macroeconomic releases and central bank events that can move the markets.',
    visual: 'calendar',
    label: 'Animated calendar grid with highlighted events',
  },
];

const G = '#D4AF37';
const GH = '#F5D27A';
const GD = '#9C7A1E';
const INK = '#F5F7FA';

function Candles() {
  const bars = [
    [60, 30, 70, 20], [48, 26, 62, 18], [52, 22, 58, 14], [40, 24, 50, 18], [34, 20, 44, 12],
    [38, 16, 46, 10], [28, 18, 40, 12], [22, 14, 30, 8], [26, 12, 34, 6], [18, 12, 26, 6],
  ];
  return (
    <>
      {bars.map(([y, h, top, wick], i) => (
        <g key={i} className="pp-rise" style={{ animationDelay: `${i * 90}ms` }}>
          <line x1={14 + i * 18} x2={14 + i * 18} y1={top - h - wick + 20} y2={top + 12} stroke={GD} strokeWidth="1" />
          <rect x={9 + i * 18} y={y} width="10" height={h} rx="1" fill={i % 3 === 1 ? 'transparent' : G} stroke={G} strokeWidth="1" />
        </g>
      ))}
      <path d="M4 86 C 40 80, 60 70, 90 60 S 150 36, 196 22" fill="none" stroke={GH} strokeWidth="1.2" className="pp-draw" />
    </>
  );
}

function Terminal() {
  const rows = ['> BUY  EURUSD  1.00', '  filled', '> SELL XAUUSD  0.20', '  filled', '> MODIFY SL / TP', '  ok', '> CLOSE #1', '  done'];
  return (
    <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8.5">
      {rows.map((r, i) => (
        <text key={i} x="12" y={16 + i * 11} fill={i % 2 ? GD : INK} className="pp-type" style={{ animationDelay: `${i * 140}ms` }}>
          {r}
        </text>
      ))}
      <rect x="12" y="98" width="6" height="9" fill={GH} className="pp-blink" />
    </g>
  );
}

function Studio() {
  return (
    <>
      {[0, 1].map((c) =>
        [0, 1].map((r) => (
          <g key={`${c}${r}`} className="pp-rise" style={{ animationDelay: `${(c * 2 + r) * 120}ms` }}>
            <rect x={6 + c * 96} y={6 + r * 52} width="92" height="48" fill="rgba(18,36,77,.6)" stroke={GD} strokeWidth=".6" />
            <polyline
              points={Array.from({ length: 10 }, (_, k) => `${12 + c * 96 + k * 9},${30 + r * 52 + Math.sin(k * 0.9 + c + r * 2) * 11}`).join(' ')}
              fill="none"
              stroke={(c + r) % 2 ? GH : G}
              strokeWidth="1.1"
              className="pp-draw"
            />
          </g>
        )),
      )}
    </>
  );
}

function Fix() {
  return (
    <>
      <rect x="8" y="40" width="34" height="30" rx="3" fill="none" stroke={G} />
      <rect x="158" y="40" width="34" height="30" rx="3" fill="none" stroke={G} />
      <text x="25" y="59" textAnchor="middle" fontSize="8" fill={INK} fontFamily="ui-monospace, monospace">
        CLIENT
      </text>
      <text x="175" y="59" textAnchor="middle" fontSize="8" fill={INK} fontFamily="ui-monospace, monospace">
        FIX
      </text>
      {[24, 40, 55, 70, 86].map((y, i) => (
        <path key={y} d={`M42 55 C 90 55, 110 ${y}, 158 55`} fill="none" stroke={i % 2 ? GD : G} strokeWidth=".9" className="pp-flow" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </>
  );
}

function Depth() {
  const bids = [70, 58, 50, 38, 30, 20];
  const asks = [22, 34, 44, 52, 62, 76];
  return (
    <>
      {bids.map((w, i) => (
        <rect key={`b${i}`} x={100 - w} y={8 + i * 16} width={w} height="12" fill={G} opacity={0.35 + i * 0.1} className="pp-grow-l" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
      {asks.map((w, i) => (
        <rect key={`a${i}`} x="100" y={8 + i * 16} width={w} height="12" fill="none" stroke={GH} strokeWidth=".8" className="pp-grow-r" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
      <line x1="100" x2="100" y1="4" y2="106" stroke={INK} strokeDasharray="2 3" strokeWidth=".6" />
    </>
  );
}

function Portal() {
  return (
    <>
      <rect x="8" y="8" width="184" height="18" rx="2" fill="rgba(18,36,77,.7)" stroke={GD} strokeWidth=".6" className="pp-rise" />
      <rect x="8" y="32" width="88" height="70" rx="2" fill="rgba(18,36,77,.5)" stroke={GD} strokeWidth=".6" className="pp-rise" style={{ animationDelay: '120ms' }} />
      <rect x="104" y="32" width="88" height="32" rx="2" fill="rgba(18,36,77,.5)" stroke={GD} strokeWidth=".6" className="pp-rise" style={{ animationDelay: '220ms' }} />
      <rect x="104" y="70" width="88" height="32" rx="2" fill="rgba(18,36,77,.5)" stroke={GD} strokeWidth=".6" className="pp-rise" style={{ animationDelay: '320ms' }} />
      <circle cx="52" cy="67" r="22" fill="none" stroke={GD} strokeWidth="6" />
      <circle cx="52" cy="67" r="22" fill="none" stroke={G} strokeWidth="6" strokeDasharray="138" className="pp-ring" transform="rotate(-90 52 67)" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="112" y={40 + i * 7} width={60 - i * 14} height="3" fill={i ? GD : GH} className="pp-grow-r" style={{ animationDelay: `${300 + i * 90}ms` }} />
      ))}
      <polyline points="110,96 124,88 138,92 152,80 166,84 184,74" fill="none" stroke={GH} strokeWidth="1.1" className="pp-draw" />
    </>
  );
}

function Screener() {
  return (
    <g fontFamily="ui-monospace, monospace" fontSize="8">
      {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'US500', 'BTCUSD'].map((s, i) => (
        <g key={s} className="pp-rise" style={{ animationDelay: `${i * 70}ms` }}>
          <text x="12" y={18 + i * 16} fill={INK}>
            {s}
          </text>
          <rect x="84" y={11 + i * 16} width="44" height="9" fill={G} opacity=".18" className="pp-flicker" style={{ animationDelay: `${i * 330}ms` }} />
          <rect x="140" y={11 + i * 16} width="44" height="9" fill={GH} opacity=".18" className="pp-flicker" style={{ animationDelay: `${i * 330 + 160}ms` }} />
        </g>
      ))}
    </g>
  );
}

function Calendar() {
  const hot = new Set([3, 9, 12, 18, 23]);
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => (
        <rect
          key={i}
          x={12 + (i % 7) * 26}
          y={10 + Math.floor(i / 7) * 24}
          width="20"
          height="18"
          rx="2"
          fill={hot.has(i) ? G : 'rgba(18,36,77,.6)'}
          stroke={GD}
          strokeWidth=".5"
          className={hot.has(i) ? 'pp-pulse' : 'pp-rise'}
          style={{ animationDelay: `${i * 25}ms` }}
        />
      ))}
    </>
  );
}

const VISUALS: Record<Visual, () => ReactNode> = {
  candles: Candles,
  terminal: Terminal,
  studio: Studio,
  fix: Fix,
  depth: Depth,
  portal: Portal,
  screener: Screener,
  calendar: Calendar,
};

const STYLES = `
.pp-tile .pp-scene * { animation-play-state: paused; }
.pp-tile:hover .pp-scene *, .pp-tile:focus-within .pp-scene *, .pp-tile:focus .pp-scene * { animation-play-state: running; }
@keyframes pp-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes pp-draw { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }
@keyframes pp-flow { 0% { stroke-dashoffset: 60; } 100% { stroke-dashoffset: 0; } }
@keyframes pp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pp-blink { 50% { opacity: 0; } }
@keyframes pp-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes pp-flicker { 0%,100% { opacity: .15; } 40% { opacity: .75; } }
@keyframes pp-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes pp-ring { from { stroke-dashoffset: 138; } to { stroke-dashoffset: 46; } }
.pp-rise { animation: pp-rise .6s ease-out both; transform-box: fill-box; }
.pp-draw { stroke-dasharray: 400; animation: pp-draw 1.6s ease-out both; }
.pp-flow { stroke-dasharray: 6 24; animation: pp-flow 1.2s linear infinite; }
.pp-grow-l, .pp-grow-r { transform-box: fill-box; animation: pp-grow .7s ease-out both; }
.pp-grow-l { transform-origin: right; }
.pp-grow-r { transform-origin: left; }
.pp-blink { animation: pp-blink 1s steps(1) infinite; }
.pp-type { animation: pp-type .5s steps(18) both; }
.pp-flicker { animation: pp-flicker 1.4s ease-in-out infinite; }
.pp-pulse { animation: pp-pulse 1.6s ease-in-out infinite; }
.pp-ring { animation: pp-ring 1.4s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .pp-scene * { animation: none !important; }
}
`;

function Tile({ p, i }: { p: Platform; i: number }) {
  const Scene = VISUALS[p.visual];
  const id = `pp-tile-${i}`;
  return (
    <li>
      <article
        tabIndex={0}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-line`}
        className="pp-tile glass group relative flex h-full min-h-[190px] flex-col overflow-hidden rounded-xl p-4 transition-colors duration-300 hover:border-gold/70 focus:border-gold/70 sm:min-h-[220px] sm:p-5"
      >
        {/* Generated scene — clip-reveals from the bottom on hover / focus */}
        <div
          className="pp-scene pointer-events-none absolute inset-0 opacity-0 transition-[clip-path,opacity] duration-700 ease-out [clip-path:inset(100%_0_0_0)] group-hover:opacity-100 group-hover:[clip-path:inset(0_0_0_0)] group-focus:opacity-100 group-focus:[clip-path:inset(0_0_0_0)]"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-abyss/30 via-navy/70 to-abyss/95" />
          <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid meet" role="img" aria-label={p.label} className="absolute inset-x-0 top-2 h-[58%] w-full opacity-80">
            <Scene />
          </svg>
        </div>

        <p className="relative text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">{p.kind}</p>
        <h3
          id={`${id}-name`}
          className="relative mt-3 font-display text-[15px] font-bold uppercase leading-tight tracking-wide text-ink [overflow-wrap:anywhere] transition-transform duration-500 group-hover:-translate-y-1 group-focus:-translate-y-1 sm:text-lg lg:text-xl"
        >
          {p.name}
        </h3>
        <div className="gold-line relative mt-3 w-10 transition-all duration-500 group-hover:w-20 group-focus:w-20" aria-hidden="true" />
        <p id={`${id}-line`} className="relative mt-auto pt-4 text-[12px] leading-snug text-muted transition-colors group-hover:text-ink group-focus:text-ink sm:text-[13px]">
          {p.line}
        </p>
      </article>
    </li>
  );
}

export function PlatformsPartners() {
  return (
    <div className="w-full">
      <style>{STYLES}</style>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {PLATFORMS.map((p, i) => (
          <Tile key={p.name} p={p} i={i} />
        ))}
      </ul>
      <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted/80">
        <span className="inline-block h-px w-6 bg-gold/40" aria-hidden="true" />
        Partner logos to be supplied
      </p>
    </div>
  );
}
