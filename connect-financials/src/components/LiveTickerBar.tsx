import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Instrument } from '../types';

interface Props {
  instruments: Instrument[];
  selectedInstrumentId: string;
  onSelectInstrument: (id: string) => void;
  flashingTicks: Record<string, 'up' | 'down'>;
}

export const LiveTickerBar: React.FC<Props> = ({
  instruments,
  selectedInstrumentId,
  onSelectInstrument,
  flashingTicks
}) => {
  return (
    /* Not sticky: the header below it is, and two elements pinned to top-0 sat
       on top of each other as soon as the page scrolled. The ticker scrolls
       away and the header takes the top edge. */
    <div id="live-ticker-bar" className="relative z-10 w-full bg-surface-1 border-b border-line text-xs overflow-x-auto no-scrollbar select-none">
      <div className="flex items-center min-w-max px-3 py-1.5 gap-2.5">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] uppercase tracking-wider whitespace-nowrap shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Equinix Live</span>
        </div>

        {instruments.map((inst) => {
          const isSelected = inst.id === selectedInstrumentId;
          const flash = flashingTicks[inst.id];
          const isPositive = inst.change24h >= 0;

          return (
            <button
              id={`ticker-${inst.id}`}
              key={inst.id}
              onClick={() => onSelectInstrument(inst.id)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0 ${
                isSelected
                  ? 'bg-amber-500/15 border border-amber-400/60 text-amber-200 shadow-sm shadow-amber-500/10'
                  : 'bg-navy-900/80 hover:bg-navy-850 hover:border-navy-600 text-slate-300 border border-navy-700/60'
              } ${
                flash === 'up'
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : flash === 'down'
                  ? 'bg-rose-500/20 border-rose-400/60 text-rose-300 shadow-sm shadow-rose-500/20'
                  : ''
              }`}
            >
              <span className="font-bold text-white tracking-wide">{inst.symbol}</span>
              <span className="font-mono text-[11px] font-semibold text-slate-200">
                {inst.bid.toFixed(inst.digits)}
              </span>
              <span
                className={`flex items-center text-[10px] font-medium font-mono ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5 inline" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5 mr-0.5 inline" />
                )}
                {isPositive ? '+' : ''}
                {inst.change24h.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
