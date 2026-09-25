import { useMemo, useState } from 'react';
import { formatPrice, shortSymbol, useMarket } from '../../feed/market';
import { INITIAL_INSTRUMENTS } from '../../data/market';
import { Flash } from '../../ui/Flash';
import type { Instrument, InstrumentCategory } from '../../types';

type Tab = 'all' | InstrumentCategory;

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'forex_majors', label: 'FX Majors' },
  { id: 'forex_minors', label: 'FX Crosses' },
  { id: 'metals', label: 'Metals' },
  { id: 'indices', label: 'Indices' },
  { id: 'energies', label: 'Energies' },
  { id: 'crypto', label: 'Crypto' },
];

const SEED_BID: Record<string, number> = Object.fromEntries(INITIAL_INSTRUMENTS.map((i) => [i.id, i.bid]));

/** Seeded 24h change plus the drift the simulated feed has added since page load. */
function liveChange(i: Instrument) {
  const seed = SEED_BID[i.id] ?? i.bid;
  return i.change24h + ((i.bid - seed) / seed) * 100;
}

const normalise = (s: string) => s.toLowerCase().replace(/[\s/\-_().]/g, '');

export function MarketWatch({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { instruments, moved, seq } = useMarket();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = normalise(query);
    return instruments.filter((i) => {
      if (tab !== 'all' && i.category !== tab) return false;
      if (!q) return true;
      return normalise(i.symbol).includes(q) || normalise(i.name).includes(q) || i.id.toLowerCase().includes(q);
    });
  }, [instruments, tab, query]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-ink">Market Watch</h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted">Indicative · simulated feed</p>
        </div>
        <label htmlFor="mw-search" className="sr-only">
          Search instruments
        </label>
        <input
          id="mw-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search EUR/USD, gold…"
          autoComplete="off"
          className="w-full rounded-full border border-gold/25 bg-abyss/40 px-4 py-1.5 text-xs text-ink placeholder:text-muted/70 focus:border-gold/60 focus:outline-none sm:w-52"
        />
      </div>

      <div role="group" aria-label="Filter by market" className="mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:px-5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide transition-colors ${
                active ? 'border-gold bg-gold/15 text-gold-hi' : 'border-ink/10 text-muted hover:border-gold/40 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 max-h-[420px] min-h-0 flex-1 overflow-auto lg:max-h-none border-t border-gold/15">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <caption className="sr-only">
            Indicative simulated prices. Select an instrument to load it in the chart and order book.
          </caption>
          <thead className="sticky top-0 z-10 bg-navy/95 backdrop-blur">
            <tr className="text-[10px] uppercase tracking-[0.14em] text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium sm:pl-5">Instrument</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">Bid</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">Ask</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">Spread</th>
              <th scope="col" className="px-2 py-2.5 text-right font-medium">24h</th>
              <th scope="col" className="px-2 py-2.5 pr-4 text-right font-medium sm:pr-5">High / Low</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const isSel = i.id === selected;
              const ch = liveChange(i);
              const up = ch >= 0;
              return (
                <tr
                  key={i.id}
                  onClick={() => onSelect(i.id)}
                  className={`cursor-pointer border-b border-ink/5 transition-colors ${
                    isSel ? 'bg-gold/12 shadow-[inset_2px_0_0_var(--color-gold)]' : 'hover:bg-ink/[0.04]'
                  }`}
                >
                  <th scope="row" className="px-4 py-2 text-left font-normal sm:pl-5">
                    <button
                      type="button"
                      aria-pressed={isSel}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(i.id);
                      }}
                      className="block text-left"
                    >
                      <span className={`block font-display text-[12px] font-semibold tracking-wide ${isSel ? 'text-gold-hi' : 'text-ink'}`}>
                        {shortSymbol(i)}
                      </span>
                      <span className="block max-w-[170px] truncate text-[10px] text-muted">{i.name}</span>
                    </button>
                  </th>
                  <td className="num px-2 py-2 text-right text-ink">
                    <Flash dir={moved[i.id]} seq={seq} className="rounded px-1">
                      {formatPrice(i, i.bid)}
                    </Flash>
                  </td>
                  <td className="num px-2 py-2 text-right text-ink/85">
                    <Flash dir={moved[i.id]} seq={seq} className="rounded px-1">
                      {formatPrice(i, i.ask)}
                    </Flash>
                  </td>
                  <td className="num px-2 py-2 text-right text-muted">{i.spread.toFixed(1)}</td>
                  <td className={`num px-2 py-2 text-right ${up ? 'text-gold' : 'text-muted'}`}>
                    <span aria-hidden>{up ? '▲' : '▼'} </span>
                    {up ? '+' : '−'}
                    {Math.abs(ch).toFixed(2)}%
                  </td>
                  <td className="num px-2 py-2 pr-4 text-right text-[11px] leading-tight text-muted sm:pr-5">
                    <span className="block">{formatPrice(i, i.high24h)}</span>
                    <span className="block text-muted/70">{formatPrice(i, i.low24h)}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  No instruments match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
