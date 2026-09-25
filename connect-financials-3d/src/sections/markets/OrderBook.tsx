import { useMemo } from 'react';
import { formatPrice, shortSymbol, useMarket } from '../../feed/market';
import { INITIAL_INSTRUMENTS } from '../../data/market';
import type { Instrument, OrderBookData, OrderBookLevel } from '../../types';

const LEVELS = 10;

/** Small deterministic PRNG so sizes only reshuffle when the quote moves. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Unit label + size scale per asset class. */
function sizing(i: Instrument): { unit: string; base: number; dp: number } {
  switch (i.category) {
    case 'forex_majors':
    case 'forex_minors':
      return { unit: 'lots', base: 6, dp: 2 };
    case 'crypto':
      return { unit: 'coins', base: 3, dp: 3 };
    default:
      return { unit: 'contracts', base: 12, dp: 1 };
  }
}

function buildBook(i: Instrument): OrderBookData {
  const rand = mulberry32(hash(i.id) ^ Math.round(i.bid / i.pipSize) ^ (Math.round(i.ask / i.pipSize) << 7));
  const step = i.pipSize * (i.category.startsWith('forex') ? 0.5 : 1);
  const { base, dp } = sizing(i);
  const round = (v: number) => +v.toFixed(dp);
  const side = (from: number, dir: 1 | -1): OrderBookLevel[] => {
    let total = 0;
    return Array.from({ length: LEVELS }, (_, k) => {
      // Thinner at the touch, deeper further out, with noise.
      const size = round(base * (0.35 + k * 0.18) * (0.4 + rand() * 1.4));
      total = round(total + size);
      return { price: +(from + dir * k * step).toFixed(i.digits), size, total };
    });
  };
  return { asks: side(i.ask, 1), bids: side(i.bid, -1) };
}

export function OrderBook({ instrumentId }: { instrumentId: string }) {
  const { byId } = useMarket();
  const inst = byId[instrumentId] ?? INITIAL_INSTRUMENTS[0];
  const book = useMemo(() => buildBook(inst), [inst]);
  const { unit, dp } = sizing(inst);

  const maxTotal = Math.max(book.asks[LEVELS - 1].total, book.bids[LEVELS - 1].total);
  const bidTotal = book.bids[LEVELS - 1].total;
  const askTotal = book.asks[LEVELS - 1].total;
  const bidShare = (bidTotal / (bidTotal + askTotal)) * 100;
  const fmtSize = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

  const row = (l: OrderBookLevel, side: 'bid' | 'ask') => {
    const pct = (l.total / maxTotal) * 100;
    const color = side === 'bid' ? 'rgba(212,175,55,0.16)' : 'rgba(245,247,250,0.07)';
    return (
      <tr
        key={`${side}-${l.price}`}
        style={{ background: `linear-gradient(to left, ${color} ${pct}%, transparent ${pct}%)` }}
        className="transition-[background] duration-500 motion-reduce:transition-none"
      >
        <td className={`num py-[3px] pl-4 text-left sm:pl-5 ${side === 'bid' ? 'text-gold-hi' : 'text-ink/85'}`}>{formatPrice(inst, l.price)}</td>
        <td className="num px-2 py-[3px] text-right text-ink/75">{fmtSize(l.size)}</td>
        <td className="num py-[3px] pr-4 text-right text-muted sm:pr-5">{fmtSize(l.total)}</td>
      </tr>
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-col py-4">
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ink">Market Depth</h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted">{shortSymbol(inst)} · simulated depth</p>
        </div>
        <div className="w-28 text-right" aria-label={`Simulated book balance: ${bidShare.toFixed(0)}% bids`}>
          <div className="flex h-1 overflow-hidden rounded-full bg-ink/15" aria-hidden>
            <div className="h-full bg-gold transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${bidShare}%` }} />
          </div>
          <p className="num mt-1 text-[10px] text-muted">
            <span className="text-gold">{bidShare.toFixed(0)}% bid</span> / {(100 - bidShare).toFixed(0)}% ask
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-[11px]">
          <caption className="sr-only">
            Simulated order book for {inst.symbol}: {LEVELS} ask levels, the spread, then {LEVELS} bid levels. Sizes in {unit}. Not live market depth.
          </caption>
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-muted">
              <th scope="col" className="pb-1.5 pl-4 text-left font-medium sm:pl-5">Price</th>
              <th scope="col" className="px-2 pb-1.5 text-right font-medium">Size ({unit})</th>
              <th scope="col" className="pb-1.5 pr-4 text-right font-medium sm:pr-5">Total</th>
            </tr>
          </thead>
          <tbody aria-label="Asks">{[...book.asks].reverse().map((l) => row(l, 'ask'))}</tbody>
          <tbody>
            <tr className="border-y border-gold/25 bg-gold/[0.06]">
              <td colSpan={3} className="px-4 py-1.5 sm:px-5">
                <div className="num flex items-center justify-between text-[11px]">
                  <span className="font-display font-semibold text-gold-hi">{formatPrice(inst, (inst.bid + inst.ask) / 2)}</span>
                  <span className="text-muted">
                    Spread <span className="text-ink">{inst.spread.toFixed(1)}</span>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody aria-label="Bids">{book.bids.map((l) => row(l, 'bid'))}</tbody>
        </table>
      </div>
      <p className="mt-3 px-4 text-[10px] leading-snug text-muted/80 sm:px-5">Illustrative depth generated around the indicative quote. Not an executable order book.</p>
    </div>
  );
}
