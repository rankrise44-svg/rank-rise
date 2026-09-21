import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Search,
  Zap,
  BarChart2,
  ArrowRight,
  Sparkles,
  Clock,
  Globe2,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  X
} from 'lucide-react';
import { Instrument } from '../types';

interface Props {
  instruments: Instrument[];
  onSelectInstrument: (id: string) => void;
  onTrade: (instrument: Instrument, type: 'BUY' | 'SELL') => void;
  onOpenConnectView?: (symbol?: string) => void;
  /** Set false when a page header above already carries the title. */
  showHeading?: boolean;
}

// Session definitions in UTC hours
interface MarketSession {
  id: string;
  name: string;
  city: string;
  openUtc: number; // 0-23
  closeUtc: number; // 0-23
  keyCurrencies: string[];
  volatility: 'High' | 'Very High' | 'Moderate' | 'Low';
}

const MARKET_SESSIONS: MarketSession[] = [
  {
    id: 'sydney',
    name: 'Sydney Session',
    city: 'Sydney, Australia',
    openUtc: 21,
    closeUtc: 6,
    keyCurrencies: ['AUD', 'NZD'],
    volatility: 'Moderate'
  },
  {
    id: 'tokyo',
    name: 'Tokyo / Asian Session',
    city: 'Tokyo, Japan',
    openUtc: 0,
    closeUtc: 9,
    keyCurrencies: ['JPY', 'AUD', 'SGD'],
    volatility: 'High'
  },
  {
    id: 'london',
    name: 'London / European Session',
    city: 'London, United Kingdom',
    openUtc: 7,
    closeUtc: 16,
    keyCurrencies: ['EUR', 'GBP', 'CHF'],
    volatility: 'Very High'
  },
  {
    id: 'newyork',
    name: 'New York / US Session',
    city: 'New York, USA',
    openUtc: 12,
    closeUtc: 21,
    keyCurrencies: ['USD', 'CAD', 'XAU'],
    volatility: 'Very High'
  }
];

export const CurrenciesSection: React.FC<Props> = ({
  instruments,
  onSelectInstrument,
  onTrade,
  onOpenConnectView,
  showHeading = true
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'majors' | 'minors' | 'metals'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentUtcHour, setCurrentUtcHour] = useState(new Date().getUTCHours());
  const [currentUtcTimeStr, setCurrentUtcTimeStr] = useState('');

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentUtcHour(now.getUTCHours());
      setCurrentUtcTimeStr(
        now.toISOString().substring(11, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to test if a session is currently open
  const isSessionOpen = (session: MarketSession) => {
    if (session.openUtc > session.closeUtc) {
      // Over midnight UTC (e.g. Sydney 21 to 6)
      return currentUtcHour >= session.openUtc || currentUtcHour < session.closeUtc;
    }
    return currentUtcHour >= session.openUtc && currentUtcHour < session.closeUtc;
  };

  // Associate each instrument with its primary market session
  const getPrimarySession = (inst: Instrument) => {
    const sym = inst.symbol.toUpperCase();
    if (sym.includes('JPY')) return { name: 'Tokyo / London', active: isSessionOpen(MARKET_SESSIONS[1]) || isSessionOpen(MARKET_SESSIONS[2]) };
    if (sym.includes('AUD') || sym.includes('NZD')) return { name: 'Sydney / Asian', active: isSessionOpen(MARKET_SESSIONS[0]) || isSessionOpen(MARKET_SESSIONS[1]) };
    if (sym.includes('EUR') || sym.includes('GBP') || sym.includes('CHF')) {
      return { name: 'London / New York', active: isSessionOpen(MARKET_SESSIONS[2]) || isSessionOpen(MARKET_SESSIONS[3]) };
    }
    if (sym.includes('XAU') || sym.includes('XAG')) return { name: 'Global Spot Metal', active: true };
    return { name: 'Global Interbank', active: true };
  };

  // Filter instruments based on tab & search
  const filteredCurrencies = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const cleanQ = searchQuery.toLowerCase().replace(/[\/\s\-_]/g, '').trim();

    // When searching, allow searching all instruments; otherwise focus on FX and metals
    const baseList = hasSearch
      ? instruments
      : instruments.filter((inst) => {
          return (
            inst.category === 'forex_majors' ||
            inst.category === 'forex_minors' ||
            inst.category === 'metals'
          );
        });

    return baseList.filter((inst) => {
      // Category filter only applies when NOT searching
      if (!hasSearch) {
        if (activeCategory === 'majors' && inst.category !== 'forex_majors') return false;
        if (activeCategory === 'minors' && inst.category !== 'forex_minors') return false;
        if (activeCategory === 'metals' && inst.category !== 'metals') return false;
      }

      // Search filter with alias and slash tolerance
      if (hasSearch) {
        const sym = inst.symbol.toLowerCase();
        const symClean = sym.replace(/[\/\s\-_]/g, '');
        const name = inst.name.toLowerCase();
        const base = inst.baseCurrency?.toLowerCase() || '';
        const quote = inst.quoteCurrency?.toLowerCase() || '';
        const rawQ = searchQuery.toLowerCase().trim();

        const matchesClean = symClean.includes(cleanQ);
        const matchesRaw = sym.includes(rawQ) || name.includes(rawQ) || base.includes(rawQ) || quote.includes(rawQ);
        const matchesAliases =
          (cleanQ.includes('gold') && (symClean.includes('xau') || name.includes('gold'))) ||
          (cleanQ.includes('silver') && (symClean.includes('xag') || name.includes('silver'))) ||
          (cleanQ.includes('oil') && (symClean.includes('brent') || symClean.includes('wti') || name.includes('oil'))) ||
          (cleanQ.includes('plat') && (symClean.includes('xpt') || name.includes('platinum'))) ||
          (cleanQ.includes('pound') && (symClean.includes('gbp') || name.includes('pound'))) ||
          (cleanQ.includes('yen') && (symClean.includes('jpy') || name.includes('yen'))) ||
          (cleanQ.includes('euro') && (symClean.includes('eur') || name.includes('euro'))) ||
          (cleanQ.includes('dollar') && (symClean.includes('usd') || name.includes('dollar'))) ||
          (cleanQ.includes('franc') && (symClean.includes('chf') || name.includes('franc'))) ||
          (cleanQ.includes('dax') && (symClean.includes('ger40') || name.includes('dax'))) ||
          (cleanQ.includes('dow') && (symClean.includes('us30') || name.includes('dow'))) ||
          (cleanQ.includes('nasdaq') && (symClean.includes('nas100') || name.includes('nasdaq')));

        return matchesClean || matchesRaw || matchesAliases;
      }
      return true;
    });
  }, [instruments, activeCategory, searchQuery]);

  return (
    <section id="currencies-section" className="py-8 sm:py-10 border-b border-navy-700/80 bg-navy-950/90 relative overflow-hidden">
      {/* Background radial highlights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Suppressed when the section sits under a page header that already
              states the same thing — see routes/MarketsPage. */}
          {showHeading ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Institutional Forex Liquidity</span>
                <span className="text-[10px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold border border-amber-500/30">
                  50+ FX PAIRS
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Tradable Currencies & Global FX
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Trade major, minor, and exotic foreign exchange pairs alongside spot gold with institutional raw spreads starting from <strong className="text-amber-300">0.0 pips</strong>, leverage up to <strong className="text-cyan-300">1:500</strong>, and direct STP market execution.
              </p>
            </div>
          ) : (
            <div />
          )}

          {/* Quick Stats Pills */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-navy-900/90 border border-navy-700 text-center">
              <div className="text-lg font-mono font-extrabold text-amber-400">0.0 Pips</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Min Spread</div>
            </div>
            <div className="p-3 rounded-xl bg-navy-900/90 border border-navy-700 text-center">
              <div className="text-lg font-mono font-extrabold text-cyan-400">1:500</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Max Leverage</div>
            </div>
            <div className="p-3 rounded-xl bg-navy-900/90 border border-navy-700 text-center">
              <div className="text-lg font-mono font-extrabold text-emerald-400">&lt;10ms</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">NY4 Speed</div>
            </div>
          </div>
        </div>

        {/* Global Trading Sessions Status Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-navy-900/95 border border-navy-700/80 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
            <div className="flex items-center gap-2.5">
              <Globe2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Global Forex Market Sessions
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-navy-950 text-amber-300 border border-navy-700">
                24/5 Non-Stop Interbank Trading
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-slate-200 font-semibold">{currentUtcTimeStr || 'UTC Live'}</span>
              </span>
              <span className="hidden sm:inline text-slate-600">|</span>
              <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Interbank Feed Live</span>
              </span>
            </div>
          </div>

          {/* 4 Major Sessions Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MARKET_SESSIONS.map((session) => {
              const active = isSessionOpen(session);
              return (
                <div
                  key={session.id}
                  className={`p-3 rounded-xl border transition-all ${
                    active
                      ? 'bg-navy-950/90 border-emerald-500/50 shadow-md shadow-emerald-500/5'
                      : 'bg-navy-950/40 border-navy-800/80 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{session.name.split(' ')[0]}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {active ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {session.openUtc.toString().padStart(2, '0')}:00 - {session.closeUtc.toString().padStart(2, '0')}:00 UTC
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-navy-800/80">
                    <span>Active: {session.keyCurrencies.join(', ')}</span>
                    <span className={active ? 'text-amber-300 font-medium' : 'text-slate-500'}>
                      {session.volatility}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Controls, Search & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2.5 rounded-2xl bg-navy-900/90 border border-navy-700/80 backdrop-blur-md">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1">
            {[
              { id: 'all', label: 'All Currencies (50+ Pairs)' },
              { id: 'majors', label: 'Forex Majors' },
              { id: 'minors', label: 'Minors & Crosses' },
              { id: 'metals', label: 'Spot Gold & Metals' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & View Mode Toggle */}
          <div className="flex items-center gap-3 p-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search EUR, GBP, USD, JPY, Gold..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-14 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                  title="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                  {filteredCurrencies.length}
                </span>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-navy-950 rounded-xl p-1 border border-navy-700 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Detailed Currency Table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Cards Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Currency Display: Table Mode (Default) or Grid Mode */}
        {filteredCurrencies.length === 0 ? (
          <div className="p-6 sm:p-8 text-center rounded-2xl bg-navy-900/80 border border-navy-700/80 space-y-4">
            <Coins className="w-8 h-8 text-amber-400 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-white">No currency pairs match "{searchQuery}"</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Try searching without slashes (e.g. <span className="text-amber-300 font-mono">EURUSD</span>, <span className="text-amber-300 font-mono">XAUUSD</span>) or click one of the popular pairs below:
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'BTC/USD'].map((pair) => (
                <button
                  key={pair}
                  onClick={() => setSearchQuery(pair)}
                  className="px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-700 hover:border-amber-400/60 text-xs font-mono text-amber-300 hover:text-white transition-colors cursor-pointer"
                >
                  {pair}
                </button>
              ))}
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors cursor-pointer active:scale-95"
              >
                Clear Search & Show All 40+ Instruments
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Institutional Currency Table with High, Low, Sessions & Spreads */
          <div className="rounded-2xl bg-navy-900/90 border border-navy-700/80 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-navy-700 bg-navy-950/80 text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Currency Pair</th>
                    <th className="py-3.5 px-3">Market Session</th>
                    <th className="py-3.5 px-3">Live Bid</th>
                    <th className="py-3.5 px-3">Live Ask</th>
                    <th className="py-3.5 px-3">Raw Spread</th>
                    <th className="py-3.5 px-4 min-w-[180px]">24h High / Low Range</th>
                    <th className="py-3.5 px-3">24h Change</th>
                    <th className="py-3.5 px-3 hidden md:table-cell">24h Volume</th>
                    <th className="py-3.5 px-4 text-right">Fast Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/80 font-sans">
                  {filteredCurrencies.map((currency) => {
                    const isPositive = currency.change24h >= 0;
                    const sessionInfo = getPrimarySession(currency);

                    // Calculate range bar percentage
                    const rangeSpan = currency.high24h - currency.low24h;
                    const rangePos = rangeSpan > 0
                      ? Math.min(100, Math.max(0, ((currency.bid - currency.low24h) / rangeSpan) * 100))
                      : 50;

                    return (
                      <tr
                        key={currency.id}
                        className="hover:bg-navy-800/50 transition-colors group cursor-pointer"
                        onClick={() => onSelectInstrument(currency.id)}
                      >
                        {/* Currency Pair */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-navy-950 border border-navy-700 flex items-center justify-center text-xs font-mono font-bold text-amber-300 group-hover:border-amber-400 transition-colors">
                              {currency.symbol.substring(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                                  {currency.symbol}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-slate-400 border border-navy-800 uppercase">
                                  {currency.category === 'forex_majors'
                                    ? 'Major'
                                    : currency.category === 'metals'
                                    ? 'Precious'
                                    : 'Cross'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                {currency.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Market Session */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                sessionInfo.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            <span className="text-slate-200 font-medium whitespace-nowrap text-xs">
                              {sessionInfo.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {sessionInfo.active ? 'Active Market' : 'Interbank STP'}
                          </div>
                        </td>

                        {/* Live Bid */}
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-200">
                          <span className="text-sm">{currency.bid.toFixed(currency.digits)}</span>
                        </td>

                        {/* Live Ask */}
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-200">
                          <span className="text-sm">{currency.ask.toFixed(currency.digits)}</span>
                        </td>

                        {/* Raw Spread */}
                        <td className="py-3.5 px-3">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                            <span>{currency.spread.toFixed(1)}</span>
                            <span className="text-[9px] text-amber-400 uppercase">pips</span>
                          </div>
                        </td>

                        {/* 24h High / Low with Visual Range Slider Bar */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400">
                                L: <strong className="text-slate-200">{currency.low24h.toFixed(currency.digits)}</strong>
                              </span>
                              <span className="text-slate-400">
                                H: <strong className="text-slate-200">{currency.high24h.toFixed(currency.digits)}</strong>
                              </span>
                            </div>
                            {/* Range Bar */}
                            <div className="w-full h-1.5 bg-navy-950 rounded-full overflow-hidden relative border border-navy-800">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-emerald-400 rounded-full"
                                style={{ width: `${rangePos}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 24h Change */}
                        <td className="py-3.5 px-3">
                          <div
                            className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            <span>{isPositive ? `+${currency.change24h}%` : `${currency.change24h}%`}</span>
                          </div>
                        </td>

                        {/* 24h Volume */}
                        <td className="py-3.5 px-3 hidden md:table-cell font-mono text-slate-300 text-xs">
                          {currency.dayVolume}
                        </td>

                        {/* Fast Execution Buttons */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onTrade(currency, 'SELL')}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                              title={`Sell ${currency.symbol} @ ${currency.bid}`}
                            >
                              SELL
                            </button>
                            <button
                              onClick={() => onTrade(currency, 'BUY')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                              title={`Buy ${currency.symbol} @ ${currency.ask}`}
                            >
                              BUY
                            </button>
                            <button
                              onClick={() => {
                                onSelectInstrument(currency.id);
                                if (onOpenConnectView) onOpenConnectView(currency.symbol);
                              }}
                              className="p-1.5 rounded-lg bg-navy-950 hover:bg-navy-800 text-slate-400 hover:text-amber-300 border border-navy-700 transition-colors cursor-pointer"
                              title="Inspect in ConnectView Studio"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCurrencies.map((currency) => {
              const isPositive = currency.change24h >= 0;
              const sessionInfo = getPrimarySession(currency);
              const rangeSpan = currency.high24h - currency.low24h;
              const rangePos = rangeSpan > 0
                ? Math.min(100, Math.max(0, ((currency.bid - currency.low24h) / rangeSpan) * 100))
                : 50;

              return (
                <div
                  key={currency.id}
                  className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-amber-400/50 transition-all hover:shadow-xl hover:shadow-black/50 group flex flex-col justify-between space-y-4 relative"
                >
                  {/* Top Row */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                          {currency.symbol}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-950 text-slate-400 border border-navy-700 uppercase">
                          {currency.category === 'forex_majors' ? 'Major' : currency.category === 'metals' ? 'Precious Metal' : 'Cross'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1">
                        {currency.name}
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isPositive ? `+${currency.change24h}%` : `${currency.change24h}%`}</span>
                    </div>
                  </div>

                  {/* Pricing and Spread */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-navy-950/80 border border-navy-800 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Bid</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        {currency.bid.toFixed(currency.digits)}
                      </div>
                    </div>
                    <div className="border-x border-navy-800">
                      <div className="text-[10px] text-amber-400 uppercase font-semibold">Raw Spread</div>
                      <div className="text-sm font-mono font-extrabold text-amber-300 mt-0.5">
                        {currency.spread.toFixed(1)} <span className="text-[9px]">pips</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Ask</div>
                      <div className="text-sm font-mono font-bold text-white mt-0.5">
                        {currency.ask.toFixed(currency.digits)}
                      </div>
                    </div>
                  </div>

                  {/* 24h High / Low Visual Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Low: <strong className="text-slate-200">{currency.low24h.toFixed(currency.digits)}</strong></span>
                      <span className="text-[9px] text-cyan-300 font-bold">{sessionInfo.name}</span>
                      <span>High: <strong className="text-slate-200">{currency.high24h.toFixed(currency.digits)}</strong></span>
                    </div>
                    <div className="w-full h-1.5 bg-navy-950 rounded-full overflow-hidden relative border border-navy-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-emerald-400 rounded-full"
                        style={{ width: `${rangePos}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-navy-800">
                    <button
                      onClick={() => onTrade(currency, 'SELL')}
                      className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-mono font-bold transition-all text-center cursor-pointer"
                    >
                      SELL
                    </button>
                    <button
                      onClick={() => onTrade(currency, 'BUY')}
                      className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-mono font-bold transition-all text-center cursor-pointer"
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => {
                        onSelectInstrument(currency.id);
                        if (onOpenConnectView) onOpenConnectView(currency.symbol);
                      }}
                      className="py-2 rounded-xl bg-navy-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Chart</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Feature Note */}
        <div className="p-4 rounded-2xl bg-navy-900/60 border border-navy-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              All currency quotes are aggregate institutional feeds with sub-10ms optical NY4 cross-connects.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-400">✓ Zero Re-quotes</span>
            <span className="text-cyan-400">✓ Micro-lot 0.01 Support</span>
            <span className="text-amber-400">✓ Sharia Swap-Free Eligible</span>
          </div>
        </div>
      </div>
    </section>
  );
};
