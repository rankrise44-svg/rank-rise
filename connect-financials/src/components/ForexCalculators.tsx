import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, ArrowRight, RefreshCw, Layers, ShieldCheck, Scale, Zap, Activity, Sparkles } from 'lucide-react';
import { Instrument } from '../types';
import { CapitalRiskCalculator } from './CapitalRiskCalculator';

interface Props {
  instruments: Instrument[];
  activeAccountBalance?: number;
  /** Set false when a page header above already carries the title. */
  showHeading?: boolean;
  onApplyTrade?: (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lots: number;
    price: number;
    stopLoss: number;
    takeProfit: number;
  }) => void;
}

export const ForexCalculators: React.FC<Props> = ({
  instruments,
  activeAccountBalance = 14500,
  onApplyTrade,
  showHeading = true
}) => {
  const [activeCalc, setActiveCalc] = useState<'risk' | 'margin' | 'pip' | 'pnl'>('risk');

  // Margin Calculator State
  const [marginSymbol, setMarginSymbol] = useState(instruments[0]?.id || 'EURUSD');
  const [marginLots, setMarginLots] = useState(1);
  const [marginLeverage, setMarginLeverage] = useState(500);

  // Pip Calculator State
  const [pipSymbol, setPipSymbol] = useState(instruments[0]?.id || 'EURUSD');
  const [pipLots, setPipLots] = useState(1);

  // P&L Calculator State
  const [pnlSymbol, setPnlSymbol] = useState(instruments[0]?.id || 'EURUSD');
  const [pnlLots, setPnlLots] = useState(1);
  const [pnlDirection, setPnlDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [pnlOpenPrice, setPnlOpenPrice] = useState(instruments[0]?.bid || 1.0842);
  const [pnlClosePrice, setPnlClosePrice] = useState(+(instruments[0]?.bid * 1.003).toFixed(5) || 1.0874);

  // Computations
  const selectedMarginInst = instruments.find((i) => i.id === marginSymbol) || instruments[0];
  const requiredMargin = selectedMarginInst
    ? ((marginLots * selectedMarginInst.contractSize * selectedMarginInst.bid) / marginLeverage)
    : 0;

  const selectedPipInst = instruments.find((i) => i.id === pipSymbol) || instruments[0];
  const pipValueUSD = selectedPipInst
    ? (selectedPipInst.pipSize / selectedPipInst.bid) * (pipLots * selectedPipInst.contractSize) * selectedPipInst.bid
    : 10;

  const selectedPnlInst = instruments.find((i) => i.id === pnlSymbol) || instruments[0];
  const priceDiff = pnlDirection === 'BUY' ? pnlClosePrice - pnlOpenPrice : pnlOpenPrice - pnlClosePrice;
  const pnlUSD = selectedPnlInst ? priceDiff * (pnlLots * selectedPnlInst.contractSize) : 0;

  return (
    <section id="calculators-section" className="pt-8 sm:pt-10 pb-4 sm:pb-6 border-b border-navy-700/80 bg-navy-950/90 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
          {showHeading ? (
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Financials Mathematical Risk Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Capital & Risk Management Calculators
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Add your capital balance and calculate optimal lot sizes, Stop Loss, Take Profit, and margin before placing any order.
              </p>
            </div>
          ) : (
            <div />
          )}

          {/* Calculator Switcher */}
          <div className="flex flex-wrap items-center bg-navy-900 p-1 rounded-xl border border-navy-700 text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveCalc('risk')}
              className={`px-3.5 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 ${
                activeCalc === 'risk'
                  ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Capital Risk & Position Sizer</span>
            </button>
            <button
              onClick={() => setActiveCalc('margin')}
              className={`px-3.5 py-2 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-95 ${
                activeCalc === 'margin'
                  ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              Margin Required
            </button>
            <button
              onClick={() => setActiveCalc('pip')}
              className={`px-3.5 py-2 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-95 ${
                activeCalc === 'pip'
                  ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              Pip Value
            </button>
            <button
              onClick={() => setActiveCalc('pnl')}
              className={`px-3.5 py-2 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-95 ${
                activeCalc === 'pnl'
                  ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              Profit & Loss
            </button>
          </div>
        </div>

        {/* Display Active Calculator */}
        {activeCalc === 'risk' && (
          <CapitalRiskCalculator
            instruments={instruments}
            activeAccountBalance={activeAccountBalance}
            onApplyToTrade={onApplyTrade}
          />
        )}

        {activeCalc === 'margin' && (
          <div className="bg-navy-900 rounded-2xl border border-navy-700 p-6 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">Instrument</label>
                    <select
                      value={marginSymbol}
                      onChange={(e) => setMarginSymbol(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      {instruments.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.symbol} ({inst.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">Volume (Lots)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={marginLots}
                      onChange={(e) => setMarginLots(parseFloat(e.target.value) || 0.01)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">Account Leverage</label>
                    <select
                      value={marginLeverage}
                      onChange={(e) => setMarginLeverage(parseInt(e.target.value))}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      <option value={500}>1:500 (Standard Connect Financials)</option>
                      <option value={200}>1:200 (Flexible)</option>
                      <option value={100}>1:100 (Conservative)</option>
                      <option value={50}>1:50 (Restricted)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-navy-950 p-4 rounded-xl border border-navy-700/80 text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>Base Contract Value:</span>
                    <span className="font-mono text-white">
                      {(marginLots * (selectedMarginInst?.contractSize || 100000)).toLocaleString()}{' '}
                      {selectedMarginInst?.baseCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Rate:</span>
                    <span className="font-mono text-white">{selectedMarginInst?.bid.toFixed(selectedMarginInst?.digits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leverage Ratio:</span>
                    <span className="font-mono text-amber-300 font-bold">1:{marginLeverage}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-gradient-to-br from-navy-950 to-navy-900 border border-gold-500/40 p-6 rounded-2xl text-center shadow-xl">
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Required Margin Needed
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-gold-gradient font-mono my-2">
                  ${requiredMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs text-slate-400 font-normal ml-1.5">USD</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Collateral locked in your Connect Financials trading account to maintain a {marginLots} lot position.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeCalc === 'pip' && (
          <div className="bg-navy-900 rounded-2xl border border-navy-700 p-6 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">Select Pair</label>
                    <select
                      value={pipSymbol}
                      onChange={(e) => setPipSymbol(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      {instruments.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.symbol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">Trade Size (Lots)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={pipLots}
                      onChange={(e) => setPipLots(parseFloat(e.target.value) || 0.01)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-navy-950 p-4 rounded-xl border border-navy-700/80 text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Pip Increment:</span>
                    <span className="font-mono text-white">{selectedPipInst?.pipSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>10 Pips Movement:</span>
                    <span className="font-mono text-amber-300 font-bold">${(pipValueUSD * 10).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-gradient-to-br from-navy-950 to-navy-900 border border-gold-500/40 p-6 rounded-2xl text-center shadow-xl">
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Value per 1 Single Pip
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-gold-gradient font-mono my-2">
                  ${pipValueUSD.toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal ml-1.5">USD</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Each pip movement in your favor yields ±${pipValueUSD.toFixed(2)} USD profit or loss.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeCalc === 'pnl' && (
          <div className="bg-navy-900 rounded-2xl border border-navy-700 p-6 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Direction</label>
                    <select
                      value={pnlDirection}
                      onChange={(e) => setPnlDirection(e.target.value as 'BUY' | 'SELL')}
                      className={`w-full border rounded-xl p-2 text-xs font-bold font-mono focus:outline-none ${
                        pnlDirection === 'BUY'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-rose-950 border-rose-500 text-rose-300'
                      }`}
                    >
                      <option value="BUY">BUY (Long)</option>
                      <option value="SELL">SELL (Short)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Lots</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pnlLots}
                      onChange={(e) => setPnlLots(parseFloat(e.target.value) || 0.01)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Open Price</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={pnlOpenPrice}
                      onChange={(e) => setPnlOpenPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Close Price</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={pnlClosePrice}
                      onChange={(e) => setPnlClosePrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-gradient-to-br from-navy-950 to-navy-900 border border-gold-500/40 p-6 rounded-2xl text-center shadow-xl">
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Net Expected Profit / Loss
                </div>
                <div
                  className={`text-4xl sm:text-5xl font-extrabold font-mono my-2 ${
                    pnlUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {pnlUSD >= 0 ? '+' : ''}${pnlUSD.toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal ml-1.5">USD</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Calculated on {pnlLots} lot {pnlDirection} position on {pnlSymbol}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Institutional Execution & Risk Guard Strip - Eliminates any empty gap under calculators */}
        <div className="mt-6 pt-5 border-t border-navy-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-navy-900/70 border border-navy-700/60">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-white font-bold text-[11px]">Negative Balance Protection</div>
              <div className="text-[10px] text-slate-400">Automated capital drawdown safeguard</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-navy-900/70 border border-navy-700/60">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-white font-bold text-[11px]">Sub-10ms Execution Speed</div>
              <div className="text-[10px] text-slate-400">Equinix NY4 direct fiber cross-connect</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-navy-900/70 border border-navy-700/60">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-white font-bold text-[11px]">Standardized 1:500 Leverage</div>
              <div className="text-[10px] text-slate-400">Prime multi-bank liquidity margin</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-navy-900/70 border border-navy-700/60">
            <Sparkles className="w-4 h-4 text-gold-metallic shrink-0" />
            <div>
              <div className="text-white font-bold text-[11px]">Zero Re-quotes &amp; Raw 0.0 Pips</div>
              <div className="text-[10px] text-slate-400">True institutional STP order routing</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
