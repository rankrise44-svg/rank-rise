import { useEffect, useMemo, useState } from 'react';
import { formatPrice, shortSymbol, useMarket } from '../../feed/market';
import { INITIAL_INSTRUMENTS } from '../../data/market';
import { Flash } from '../../ui/Flash';
import { Sparkline } from '../../ui/Sparkline';
import { RiskNote } from '../../ui/RiskNote';
import { openAccount } from '../../ui/openAccount';
import type { Instrument } from '../../types';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
] as const;
const CODES = new Set<string>(CURRENCIES.map((c) => c.code));

const MAJORS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];

/** Standard FX session hours in UTC (approximate; ignores daylight saving). */
const SESSIONS = [
  { name: 'Sydney', open: 21, close: 6 },
  { name: 'Tokyo', open: 0, close: 9 },
  { name: 'London', open: 7, close: 16 },
  { name: 'New York', open: 12, close: 21 },
];

const SEED_BID: Record<string, number> = Object.fromEntries(INITIAL_INSTRUMENTS.map((i) => [i.id, i.bid]));
const liveChange = (i: Instrument) => {
  const s = SEED_BID[i.id] ?? i.bid;
  return i.change24h + ((i.bid - s) / s) * 100;
};

const isOpen = (h: number, s: (typeof SESSIONS)[number]) => (s.open > s.close ? h >= s.open || h < s.close : h >= s.open && h < s.close);
const signed = (v: number, dp = 2) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(dp)}%`;

function useUtcNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function Currencies() {
  const { instruments, byId, moved, seq, history } = useMarket();
  const now = useUtcNow();
  const hour = now.getUTCHours();

  // Each pair's move counts for its base and against its quote; average per currency.
  const strength = useMemo(() => {
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const c of CODES) acc[c] = { sum: 0, n: 0 };
    for (const i of instruments) {
      if (!i.category.startsWith('forex') || !CODES.has(i.baseCurrency) || !CODES.has(i.quoteCurrency)) continue;
      const ch = liveChange(i);
      acc[i.baseCurrency].sum += ch;
      acc[i.baseCurrency].n += 1;
      acc[i.quoteCurrency].sum -= ch;
      acc[i.quoteCurrency].n += 1;
    }
    return CURRENCIES.map((c) => ({ ...c, value: acc[c.code].n ? acc[c.code].sum / acc[c.code].n : 0, pairs: acc[c.code].n })).sort(
      (a, b) => b.value - a.value,
    );
  }, [instruments]);
  const maxAbs = Math.max(0.05, ...strength.map((s) => Math.abs(s.value)));

  return (
    <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
      {/* Strength meter */}
      <div className="glass min-w-0 rounded-2xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ink">Currency Strength</h3>
            <p className="mt-1 max-w-xs text-[11px] leading-snug text-muted">
              Average 24h move of each currency across the pairs it trades in. Indicative, from the simulated feed.
            </p>
          </div>
          <p className="num shrink-0 text-right text-[10px] uppercase tracking-[0.16em] text-muted">
            {now.toISOString().slice(11, 16)} UTC
          </p>
        </div>

        <ol className="mt-5 space-y-2.5">
          {strength.map((s, rank) => {
            const pct = (Math.abs(s.value) / maxAbs) * 50;
            const up = s.value >= 0;
            return (
              <li key={s.code} className="grid grid-cols-[1.25rem_2.75rem_minmax(0,1fr)_4.25rem] items-center gap-2 sm:gap-3">
                <span className="num text-[10px] text-muted">{rank + 1}</span>
                <span className="font-display text-xs font-semibold tracking-wide text-ink" title={s.name}>
                  {s.code}
                  <span className="sr-only">
                    {' '}
                    {s.name}, {signed(s.value)} across {s.pairs} pairs
                  </span>
                </span>
                <span className="relative h-2 rounded-full bg-ink/[0.06]" aria-hidden>
                  <span className="absolute inset-y-[-3px] left-1/2 w-px bg-gold/40" />
                  <span
                    className={`absolute inset-y-0 rounded-full transition-all duration-700 motion-reduce:transition-none ${
                      up ? 'left-1/2 bg-gradient-to-r from-gold-dark to-gold-hi' : 'right-1/2 bg-gradient-to-l from-ink/20 to-ink/60'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className={`num text-right text-[11px] ${up ? 'text-gold' : 'text-muted'}`} aria-hidden>
                  {signed(s.value)}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Sessions */}
        <div className="mt-6 border-t border-gold/15 pt-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Trading sessions (UTC, approx.)</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SESSIONS.map((s) => {
              const open = isOpen(hour, s);
              return (
                <li
                  key={s.name}
                  className={`rounded-lg border px-2.5 py-2 ${open ? 'border-gold/45 bg-gold/[0.07]' : 'border-ink/10'}`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
                    <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-gold-hi shadow-[0_0_8px_rgba(245,210,122,0.9)]' : 'bg-muted/50'}`} aria-hidden />
                    {s.name}
                  </span>
                  <span className="num mt-0.5 block text-[10px] text-muted">
                    {String(s.open).padStart(2, '0')}:00–{String(s.close).padStart(2, '0')}:00 · {open ? 'Open' : 'Closed'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Majors */}
      <div className="min-w-0">
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3" aria-label="Major currency pairs, indicative prices">
          {MAJORS.map((id) => {
            const i = byId[id];
            if (!i) return null;
            const ch = liveChange(i);
            const up = ch >= 0;
            return (
              <li key={id} className="glass min-w-0 rounded-xl p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-semibold tracking-wide text-ink">{shortSymbol(i)}</span>
                  <span className={`num text-[11px] ${up ? 'text-gold' : 'text-muted'}`}>
                    <span aria-hidden>{up ? '▲' : '▼'} </span>
                    {signed(ch)}
                  </span>
                </div>
                <Flash dir={moved[id]} seq={seq} className="num mt-1 block rounded font-display text-xl font-semibold text-ink">
                  {formatPrice(i)}
                </Flash>
                <Sparkline data={history[id]} className="mt-2 h-9 w-full" />
                <dl className="num mt-2 grid grid-cols-3 gap-1 text-[10px]">
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Spread</dt>
                    <dd className="text-ink/85">{i.spread.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">High</dt>
                    <dd className="text-ink/85">{formatPrice(i, i.high24h)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Low</dt>
                    <dd className="text-ink/85">{formatPrice(i, i.low24h)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
          <li className="glass flex min-w-0 flex-col justify-between gap-3 rounded-xl p-4">
            <div>
              <p className="font-display text-sm font-semibold tracking-wide text-ink">Trade the majors</p>
              <p className="mt-1 text-[11px] leading-snug text-muted">Open an account to access FX majors, crosses, metals and more.</p>
            </div>
            <button
              type="button"
              onClick={() => openAccount()}
              className="self-start rounded-full bg-gold px-4 py-2 text-xs font-semibold text-abyss transition-colors hover:bg-gold-hi"
            >
              Open account
            </button>
            <RiskNote />
          </li>
        </ul>
        <p className="mt-3 text-right text-[10px] uppercase tracking-[0.16em] text-muted/80">Indicative prices · simulated feed</p>
      </div>
    </div>
  );
}
