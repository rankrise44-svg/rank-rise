import { useId, useState } from 'react';
import { useMarket } from '../../feed/market';
import { INITIAL_INSTRUMENTS } from '../../data/market';
import { InstrumentSelect, LEVERAGE_OPTIONS, LiveQuote, NumberField, Result, SelectField, contractMaths, fmt, num, usd } from './ForexCalculators';

/**
 * Capital & risk planner: sizes a position from capital, risk % and stop,
 * then shows the margin it would tie up and an illustrative losing streak.
 */
export function CapitalRiskCalculator() {
  const uid = useId().replace(/:/g, '');
  const { byId } = useMarket();
  const [instId, setInstId] = useState('EURUSD');
  const [capital, setCapital] = useState('10000');
  const [risk, setRisk] = useState('2');
  const [stop, setStop] = useState('30');
  const [lev, setLev] = useState('100');
  const [streak, setStreak] = useState('10');

  const inst = byId[instId] ?? INITIAL_INSTRUMENTS[0];
  const { pipValuePerLot, notionalPerLot, quoteToUsd, converted } = contractMaths(inst, byId);

  const cap = num(capital);
  const r = num(risk) / 100;
  const stopPips = num(stop);
  const riskAmt = cap * r;
  const lots = Math.floor((riskAmt / (stopPips * pipValuePerLot)) * 100) / 100;
  const margin = (lots * notionalPerLot) / Number(lev);
  const marginPct = (margin / cap) * 100;
  const n = Math.min(50, Math.max(1, Math.round(num(streak)) || 1));

  // Each loss risks the same % of the *remaining* balance (fixed-fractional sizing).
  const curve: number[] = [cap];
  for (let k = 1; k <= n; k++) curve.push(curve[k - 1] * (1 - r));
  const valid = Number.isFinite(cap) && cap > 0 && r > 0 && r < 1 && stopPips > 0;
  const finalBal = curve[n];
  const drawdown = (1 - finalBal / cap) * 100;

  return (
    <div className="glass rounded-3xl p-4 sm:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        {/* Inputs */}
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Capital and risk inputs">
          <InstrumentSelect id={`${uid}-cr-inst`} value={instId} onChange={setInstId} />
          <NumberField id={`${uid}-cr-cap`} label="Trading capital" suffix="USD" value={capital} onChange={setCapital} min={1} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id={`${uid}-cr-risk`} label="Risk per trade" suffix="%" value={risk} onChange={setRisk} step={0.1} min={0.01} />
            <NumberField id={`${uid}-cr-stop`} label="Stop loss" suffix="pips" value={stop} onChange={setStop} step={1} min={0.1} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id={`${uid}-cr-lev`} label="Leverage" value={lev} onChange={setLev} options={LEVERAGE_OPTIONS.map((v) => ({ value: String(v), label: `1:${v}` }))} />
            <NumberField id={`${uid}-cr-streak`} label="Losing trades in a row" value={streak} onChange={setStreak} step={1} min={1} hint="Up to 50" />
          </div>
          <LiveQuote inst={inst} converted={converted} quoteToUsd={quoteToUsd} />
        </form>

        {/* Outputs */}
        <div className="min-w-0 space-y-6">
          <dl className="grid grid-cols-2 gap-5 rounded-2xl border border-gold/15 bg-abyss/40 p-5 sm:grid-cols-4">
            <div className="col-span-2">
              <Result big label="Lot size" value={valid && Number.isFinite(lots) ? fmt(lots, 2) : '—'} sub="Rounded down to 0.01" />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-5 sm:col-span-2">
              <Result label="Risk per trade" value={valid ? usd(riskAmt) : '—'} />
              <Result label="Margin used" value={valid ? usd(margin) : '—'} />
              <div className="col-span-2">
                <Result label="Margin as % of capital" value={valid && Number.isFinite(marginPct) ? `${fmt(marginPct, 1)}%` : '—'} />
              </div>
            </div>
          </dl>

          <figure className="rounded-2xl border border-gold/15 bg-abyss/40 p-4 sm:p-5">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink">
                Balance after <span className="num">{n}</span> consecutive losses
              </span>
              {valid && (
                <span className="num text-sm text-gold-hi">
                  {usd(finalBal, 0)} <span className="text-muted">(−{fmt(drawdown, 1)}%)</span>
                </span>
              )}
            </figcaption>
            {valid ? <DrawdownChart curve={curve} /> : <p className="py-10 text-center text-sm text-muted">Enter valid capital, risk and stop values to see the chart.</p>}
            <p className="mt-2 text-[11px] text-muted">Assumes each loss is the chosen percentage of the balance remaining at the time.</p>
          </figure>

          <div className="overflow-x-auto rounded-2xl border border-gold/15 bg-abyss/40">
            <table className="w-full min-w-[300px] text-left text-sm">
              <caption className="px-4 pt-4 text-left text-sm text-ink sm:px-5">Reward to risk, one trade at this size</caption>
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  <th scope="col" className="px-4 py-3 font-normal sm:px-5">Ratio</th>
                  <th scope="col" className="px-4 py-3 font-normal">Take profit</th>
                  <th scope="col" className="px-4 py-3 font-normal">Potential gain</th>
                  <th scope="col" className="px-4 py-3 font-normal sm:pr-5">Break-even win rate</th>
                </tr>
              </thead>
              <tbody className="num">
                {[1, 2, 3].map((k) => (
                  <tr key={k} className="border-t border-gold/10">
                    <th scope="row" className="px-4 py-3 font-display font-semibold text-ink sm:px-5">1:{k}</th>
                    <td className="px-4 py-3 text-ink">{valid ? `${fmt(stopPips * k, 1)} pips` : '—'}</td>
                    <td className="px-4 py-3 text-gold-hi">{valid ? usd(riskAmt * k) : '—'}</td>
                    <td className="px-4 py-3 text-ink sm:pr-5">{fmt(100 / (1 + k), 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-gold/15 pt-4 text-[11px] leading-relaxed text-muted">
        Illustrative only, not a forecast or advice. Uses indicative simulated prices and a USD account; excludes spread, commission, swap and slippage. Real losses
        can exceed a planned stop, for example when prices gap.
      </p>
    </div>
  );
}

function DrawdownChart({ curve }: { curve: number[] }) {
  const gid = useId();
  const W = 320;
  const H = 140;
  const padL = 4;
  const padR = 4;
  const padT = 10;
  const padB = 18;
  const start = curve[0];
  const n = curve.length - 1;
  const x = (i: number) => padL + (i / Math.max(1, n)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / start) * (H - padT - padB);
  const pts = curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const gridLines = [1, 0.75, 0.5, 0.25, 0];
  const pct = (1 - curve[n] / start) * 100;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 h-auto w-full"
      role="img"
      aria-label={`Line chart: balance falls from 100% to ${fmt(100 - pct, 1)}% of starting capital over ${n} losing trades.`}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D4AF37" stopOpacity="0.3" />
          <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={y(start * g)} y2={y(start * g)} stroke="#8A94A8" strokeOpacity={g === 1 ? 0.35 : 0.12} strokeDasharray={g === 1 ? undefined : '2 3'} />
          <text x={W - padR} y={y(start * g) - 2} textAnchor="end" fontSize="8" fill="#8A94A8">
            {g * 100}%
          </text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(n)},${y(0)}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke="#F5D27A" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {n <= 20 && curve.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="1.8" fill="#D4AF37" />)}
      <text x={padL} y={H - 4} fontSize="8" fill="#8A94A8">
        Start
      </text>
      <text x={W - padR} y={H - 4} textAnchor="end" fontSize="8" fill="#8A94A8">
        Loss {n}
      </text>
    </svg>
  );
}
