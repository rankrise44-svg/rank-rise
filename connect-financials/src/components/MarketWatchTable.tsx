import React, { useState, useMemo } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Zap,
  X,
  Activity,
  Flame,
  Gauge,
  Sparkles
} from 'lucide-react';
import { Instrument, InstrumentCategory } from '../types';

interface Props {
  instruments: Instrument[];
  selectedInstrumentId: string;
  onSelectInstrument: (id: string) => void;
  onQuickTrade: (instrument: Instrument, type: 'BUY' | 'SELL') => void;
}

export const MarketWatchTable: React.FC<Props> = ({
  instruments,
  selectedInstrumentId,
  onSelectInstrument,
  onQuickTrade
}) => {
  const [activeCategory, setActiveCategory] = useState<InstrumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'gainers' | 'lowSpread' | 'volume'>('all');

  // Compute live market breadth metrics for telemetry bar
  const { topGainer, tightestSpread, highVolumeCount } = useMemo(() => {
    let top = instruments[0];
    let tightest = instruments[0];
    let highVol = 0;

    for (const inst of instruments) {
      if (inst.change24h > (top?.change24h ?? -Infinity)) {
        top = inst;
      }
      if (inst.spread < (tightest?.spread ?? Infinity)) {
        tightest = inst;
      }
      if (inst.dayVolume && !inst.dayVolume.includes('M')) {
        highVol++;
      }
    }
    return {
      topGainer: top || instruments[0],
      tightestSpread: tightest || instruments[0],
      highVolumeCount: highVol || 18
    };
  }, [instruments]);

  const filtered = useMemo(() => {
    return instruments.filter((inst) => {
      const hasSearch = searchQuery.trim().length > 0;
      const cleanQ = searchQuery.toLowerCase().replace(/[\/\s\-_]/g, '').trim();

      // Category filter
      if (!hasSearch && activeCategory !== 'all' && inst.category !== activeCategory) {
        return false;
      }

      // Quick filter modes
      if (filterMode === 'gainers' && inst.change24h <= 0) return false;
      if (filterMode === 'lowSpread' && inst.spread > 0.8) return false;

      if (!hasSearch) return true;

      const sym = inst.symbol.toLowerCase();
      const symClean = sym.replace(/[\/\s\-_]/g, '');
      const name = inst.name.toLowerCase();
      const rawQ = searchQuery.toLowerCase().trim();

      const matchesClean = symClean.includes(cleanQ);
      const matchesRaw = sym.includes(rawQ) || name.includes(rawQ);
      const matchesAliases =
        (cleanQ.includes('gold') && (symClean.includes('xau') || name.includes('gold'))) ||
        (cleanQ.includes('silver') && (symClean.includes('xag') || name.includes('silver'))) ||
        (cleanQ.includes('oil') && (symClean.includes('brent') || symClean.includes('wti') || name.includes('oil'))) ||
        (cleanQ.includes('plat') && (symClean.includes('xpt') || name.includes('platinum'))) ||
        (cleanQ.includes('dax') && (symClean.includes('ger40') || name.includes('dax'))) ||
        (cleanQ.includes('dow') && (symClean.includes('us30') || name.includes('dow'))) ||
        (cleanQ.includes('nasdaq') && (symClean.includes('nas100') || name.includes('nasdaq'))) ||
        (cleanQ.includes('crypto') && (symClean.includes('btc') || symClean.includes('eth') || symClean.includes('sol'))) ||
        (cleanQ.includes('pound') && (symClean.includes('gbp') || name.includes('pound'))) ||
        (cleanQ.includes('yen') && (symClean.includes('jpy') || name.includes('yen'))) ||
        (cleanQ.includes('euro') && (symClean.includes('eur') || name.includes('euro'))) ||
        (cleanQ.includes('dollar') && (symClean.includes('usd') || name.includes('dollar')));

      return matchesClean || matchesRaw || matchesAliases;
    });
  }, [instruments, activeCategory, searchQuery, filterMode]);

  return (
    <div id="market-watch-section" className="bg-[#071226] rounded-2xl border border-navy-700/90 p-4 sm:p-5 shadow-2xl relative">
      {/* 1. Header Toolbar with Integrated Live Telemetry - Eliminates Any Empty Void */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-navy-700/80">
        {/* Left: Institutional Title & Status */}
        <div className="shrink-0 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="tracking-wide">LIVE MULTI-BANK ECN FEED</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-400 font-mono">NY4 EQUINIX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Live Market Watch & Screener</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-bank quotes starting from 0.0 pips with sub-millisecond execution.
          </p>
        </div>

        {/* Center: Live Market Breadth Telemetry Cards (Fills Central Area) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 px-2.5 rounded-xl bg-navy-950/90 border border-navy-700/70 shrink-0">
          {/* Telemetry 1: Active Instruments */}
          <div className="px-2 py-1 text-left">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>PAIRS</span>
            </div>
            <div className="text-xs font-mono font-bold text-white mt-0.5">
              {instruments.length} Assets
            </div>
          </div>

          {/* Telemetry 2: Top Gainer */}
          <div className="px-2 py-1 text-left border-l border-navy-800/80">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Flame className="w-3 h-3 text-emerald-400" />
              <span>TOP MOVER</span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5 truncate">
              {topGainer.symbol} +{topGainer.change24h.toFixed(2)}%
            </div>
          </div>

          {/* Telemetry 3: Raw Spread */}
          <div className="px-2 py-1 text-left border-l border-navy-800/80">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>SPREAD</span>
            </div>
            <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
              From 0.0 Pips
            </div>
          </div>

          {/* Telemetry 4: Latency */}
          <div className="px-2 py-1 text-left border-l border-navy-800/80">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>EXECUTION</span>
            </div>
            <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5">
              &lt; 8.4ms
            </div>
          </div>
        </div>

        {/* Right: Search Input with Match Badge and Quick Clear */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search EUR, Gold, US30..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700/90 rounded-xl pl-9 pr-16 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors font-sans shadow-inner"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md bg-navy-850 hover:bg-navy-800 cursor-pointer"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-navy-900 border border-navy-800 px-1.5 py-0.5 rounded">
              {filtered.length} pairs
            </span>
          )}
        </div>
      </div>

      {/* 2. Category Filter Tabs & Quick Screen Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-navy-800/70">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
          {[
            { id: 'all', label: `All Pairs (${instruments.length})` },
            { id: 'forex_majors', label: 'Forex Majors' },
            { id: 'metals', label: 'Precious Metals' },
            { id: 'indices', label: 'Global Indices' },
            { id: 'energies', label: 'Energies / Oil' },
            { id: 'crypto', label: 'Crypto CFDs' },
            { id: 'forex_minors', label: 'Forex Minors' }
          ].map((tab) => (
            <button
              key={tab.id}
              id={`market-tab-${tab.id}`}
              onClick={() => {
                setActiveCategory(tab.id as any);
                setFilterMode('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer text-xs ${
                activeCategory === tab.id
                  ? 'bg-gold-metallic text-slate-950 font-extrabold shadow-md'
                  : 'bg-navy-950/80 hover:bg-navy-850 text-slate-300 border border-navy-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Filter Screen Modes (Gainers / Raw Spreads / All) */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
          <span className="text-[10px] text-slate-400 uppercase hidden md:inline">Quick Filter:</span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-navy-800 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-navy-950 border border-navy-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('gainers')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'gainers'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-navy-950 border border-navy-800'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Gainers</span>
          </button>
          <button
            onClick={() => setFilterMode('lowSpread')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'lowSpread'
                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-navy-950 border border-navy-800'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>0.0 Pip Raw</span>
          </button>
        </div>
      </div>

      {/* 3. Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-navy-700 text-slate-300 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3">Instrument</th>
              <th className="py-3 px-3">Bid</th>
              <th className="py-3 px-3">Ask</th>
              <th className="py-3 px-3">Spread Status</th>
              <th className="py-3 px-3">24h Change</th>
              <th className="py-3 px-3 hidden sm:table-cell">24h High / Low</th>
              <th className="py-3 px-3 hidden md:table-cell">Volume</th>
              <th className="py-3 px-3 text-right">Execution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-300">
                  <div className="max-w-md mx-auto space-y-2.5">
                    <p className="text-sm font-bold text-white">No instruments found matching "{searchQuery}"</p>
                    <p className="text-xs text-slate-400">
                      Try searching without punctuation like <span className="text-amber-300 font-mono">EURUSD</span>, <span className="text-amber-300 font-mono">XAUUSD</span>, or search by asset name (Gold, Oil, DAX, US30).
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors cursor-pointer active:scale-95"
                    >
                      Clear Search & View All
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((inst) => {
              const isSelected = inst.id === selectedInstrumentId;
              const isPositive = inst.change24h >= 0;

              return (
                <tr
                  key={inst.id}
                  id={`market-row-${inst.id}`}
                  className={`hover:bg-navy-800/40 transition-colors ${
                    isSelected ? 'bg-amber-500/10 border-l-2 border-amber-400' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => onSelectInstrument(inst.id)}
                      className="text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {inst.symbol}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300">{inst.name}</div>
                    </button>
                  </td>

                  <td className="py-3 px-3 font-mono text-white font-bold">
                    {inst.bid.toFixed(inst.digits)}
                  </td>

                  <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                    {inst.ask.toFixed(inst.digits)}
                  </td>

                  {/* Note: NO spread numbers shown here as requested */}
                  <td className="py-3 px-3 font-mono text-slate-300">
                    <span className="bg-navy-950 border border-amber-500/30 text-amber-300/90 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                      Low Spread
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono font-semibold">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {isPositive ? '+' : ''}
                      {inst.change24h.toFixed(2)}%
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-300 hidden sm:table-cell text-[11px]">
                    <div>H: {inst.high24h.toFixed(inst.digits)}</div>
                    <div>L: {inst.low24h.toFixed(inst.digits)}</div>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-300 hidden md:table-cell text-[11px]">
                    {inst.dayVolume}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectInstrument(inst.id)}
                        className="p-1.5 rounded-lg bg-navy-950 hover:bg-navy-800 text-slate-300 hover:text-amber-300 border border-navy-700 transition-colors"
                        title="Open Chart"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onQuickTrade(inst, 'SELL')}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-[11px] transition-all duration-150 cursor-pointer active:scale-95 shadow-sm hover:shadow-rose-600/20 whitespace-nowrap"
                      >
                        Sell
                      </button>

                      <button
                        onClick={() => onQuickTrade(inst, 'BUY')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all duration-150 cursor-pointer active:scale-95 shadow-sm hover:shadow-emerald-600/20 whitespace-nowrap"
                      >
                        Buy
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
