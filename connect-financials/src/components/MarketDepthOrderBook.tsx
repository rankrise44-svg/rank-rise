import React, { useMemo } from 'react';
import { Layers, Shield, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { Instrument } from '../types';

interface Props {
  instrument: Instrument;
  onSelectPrice?: (price: number) => void;
}

export const MarketDepthOrderBook: React.FC<Props> = ({ instrument, onSelectPrice }) => {
  // Generate realistic Level II DOM levels around current bid and ask
  const { bids, asks, maxVolume } = useMemo(() => {
    const bidLevels: { price: number; size: number; total: number }[] = [];
    const askLevels: { price: number; size: number; total: number }[] = [];

    const pipStep = instrument.pipSize;
    let runningBidTotal = 0;
    let runningAskTotal = 0;
    let maxVol = 0;

    // Generate 6 ask levels (above current ask)
    for (let i = 5; i >= 0; i--) {
      const price = +(instrument.ask + (i + 1) * pipStep).toFixed(instrument.digits);
      const size = Math.floor(12 + Math.random() * 45 + (i === 1 ? 50 : 0));
      runningAskTotal += size;
      if (runningAskTotal > maxVol) maxVol = runningAskTotal;
      askLevels.push({ price, size, total: runningAskTotal });
    }

    // Generate 6 bid levels (below current bid)
    for (let i = 0; i < 6; i++) {
      const price = +(instrument.bid - i * pipStep).toFixed(instrument.digits);
      const size = Math.floor(15 + Math.random() * 42 + (i === 2 ? 45 : 0));
      runningBidTotal += size;
      if (runningBidTotal > maxVol) maxVol = runningBidTotal;
      bidLevels.push({ price, size, total: runningBidTotal });
    }

    return {
      bids: bidLevels,
      asks: askLevels.reverse(), // Top down
      maxVolume: Math.max(runningBidTotal, runningAskTotal, 100)
    };
  }, [instrument.bid, instrument.ask, instrument.digits, instrument.pipSize]);

  return (
    <div id="order-book-dom" className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm text-white">Level II Market Depth (DOM)</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Interbank ECN</span>
        </div>
      </div>

      {/* Columns Header */}
      <div className="grid grid-cols-3 text-[10px] font-mono uppercase text-slate-400 py-2 border-b border-slate-800/80">
        <div className="text-left">Price ({instrument.quoteCurrency})</div>
        <div className="text-center">Size (Lots)</div>
        <div className="text-right">Cumul. Vol</div>
      </div>

      {/* Asks (Sellers) - Red depth */}
      <div className="space-y-0.5 py-1">
        {asks.map((level, i) => {
          const depthPercent = Math.min(100, (level.total / maxVolume) * 100);
          return (
            <div
              key={`ask-${i}`}
              onClick={() => onSelectPrice?.(level.price)}
              className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 rounded hover:bg-slate-800 cursor-pointer overflow-hidden group"
            >
              {/* Depth bar visual */}
              <div
                className="absolute top-0 right-0 h-full bg-rose-500/15 group-hover:bg-rose-500/25 transition-all pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <div className="relative text-rose-400 font-bold">{level.price.toFixed(instrument.digits)}</div>
              <div className="relative text-center text-slate-300">{level.size.toFixed(1)}</div>
              <div className="relative text-right text-slate-400">{level.total.toFixed(0)}</div>
            </div>
          );
        })}
      </div>

      {/* Mid Spread Indicator */}
      <div className="my-2 py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Activity className="w-3.5 h-3.5" />
          <span>Spread</span>
        </div>
        <div className="text-white font-extrabold">{instrument.spread.toFixed(1)} Pips</div>
        <div className="text-[10px] text-slate-400">Zero Markup</div>
      </div>

      {/* Bids (Buyers) - Green depth */}
      <div className="space-y-0.5 py-1">
        {bids.map((level, i) => {
          const depthPercent = Math.min(100, (level.total / maxVolume) * 100);
          return (
            <div
              key={`bid-${i}`}
              onClick={() => onSelectPrice?.(level.price)}
              className="relative grid grid-cols-3 text-xs font-mono py-1 px-1 rounded hover:bg-slate-800 cursor-pointer overflow-hidden group"
            >
              {/* Depth bar visual */}
              <div
                className="absolute top-0 right-0 h-full bg-emerald-500/15 group-hover:bg-emerald-500/25 transition-all pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <div className="relative text-emerald-400 font-bold">{level.price.toFixed(instrument.digits)}</div>
              <div className="relative text-center text-slate-300">{level.size.toFixed(1)}</div>
              <div className="relative text-right text-slate-400">{level.total.toFixed(0)}</div>
            </div>
          );
        })}
      </div>

      {/* Footer liquidity provider status */}
      <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Tier-1 Liquidity Providers</span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <Shield className="w-3 h-3" /> Aggregated
        </span>
      </div>
    </div>
  );
};
