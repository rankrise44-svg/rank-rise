import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Percent,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Info,
  Scale,
  Crosshair,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Instrument } from '../types';

interface Props {
  instruments: Instrument[];
  activeAccountBalance?: number;
  onApplyToTrade?: (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lots: number;
    price: number;
    stopLoss: number;
    takeProfit: number;
  }) => void;
}

export const CapitalRiskCalculator: React.FC<Props> = ({
  instruments,
  activeAccountBalance = 10000,
  onApplyToTrade
}) => {
  // Inputs
  const [capital, setCapital] = useState<number>(activeAccountBalance || 10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [stopLossPips, setStopLossPips] = useState<number>(25);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(2); // 1:2
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Selected Instrument
  const instrument = instruments.find((i) => i.id === selectedSymbol) || instruments[0];

  // Entry Price (live bid or ask based on direction)
  const currentEntryPrice = direction === 'BUY' ? instrument.ask : instrument.bid;
  const [customEntryPrice, setCustomEntryPrice] = useState<number>(currentEntryPrice);

  // Update entry price when instrument or direction changes
  useEffect(() => {
    setCustomEntryPrice(direction === 'BUY' ? instrument.ask : instrument.bid);
  }, [instrument.id, direction, instrument.bid, instrument.ask]);

  // Risk Math
  // Dollar amount to risk:
  const riskAmountUSD = (capital * (riskPercent / 100));

  // Pip value for 1 standard lot (100,000 units for FX, 100 oz for Gold, etc.)
  // For FX with USD quote (e.g. EUR/USD): 1 pip = 0.0001 * 100,000 = $10 USD per lot
  // For USD/JPY: 1 pip = (0.01 / 154.28) * 100,000 = ~$6.48 USD per lot
  // For XAU/USD (Gold): 1 pip = 0.1 * 100 = $10 USD per lot, or $1 movement = $100 per lot
  let pipValuePerLotUSD = 10;
  if (instrument.symbol.endsWith('/USD')) {
    pipValuePerLotUSD = instrument.pipSize * instrument.contractSize;
  } else if (instrument.symbol.startsWith('USD/')) {
    pipValuePerLotUSD = (instrument.pipSize / instrument.bid) * instrument.contractSize;
  } else {
    pipValuePerLotUSD = (instrument.pipSize * instrument.contractSize);
  }

  // Recommended Lot size
  // Formula: Lot Size = Risk USD / (SL Pips * Pip Value per 1 Lot)
  const rawLotSize = stopLossPips > 0 && pipValuePerLotUSD > 0
    ? riskAmountUSD / (stopLossPips * pipValuePerLotUSD)
    : 0.01;

  // Clamped and rounded to 2 decimal places (min 0.01, max 100)
  const recommendedLots = Math.max(0.01, Math.min(100, Math.round(rawLotSize * 100) / 100));

  // Calculated SL & TP Prices
  const slDistancePrice = stopLossPips * instrument.pipSize;
  const tpDistancePrice = (stopLossPips * riskRewardRatio) * instrument.pipSize;

  const calculatedStopLoss = direction === 'BUY'
    ? +(customEntryPrice - slDistancePrice).toFixed(instrument.digits)
    : +(customEntryPrice + slDistancePrice).toFixed(instrument.digits);

  const calculatedTakeProfit = direction === 'BUY'
    ? +(customEntryPrice + tpDistancePrice).toFixed(instrument.digits)
    : +(customEntryPrice - tpDistancePrice).toFixed(instrument.digits);

  const tpPips = stopLossPips * riskRewardRatio;
  const potentialProfitUSD = +(riskAmountUSD * riskRewardRatio).toFixed(2);

  // Margin required for this lot size (at 1:500 institutional leverage)
  const requiredMargin = +((recommendedLots * instrument.contractSize * customEntryPrice) / 500).toFixed(2);
  const marginPercentOfCapital = +((requiredMargin / capital) * 100).toFixed(1);

  // Risk Classification
  const riskStatus =
    riskPercent <= 1.0
      ? { label: 'Conservative & Institutional', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
      : riskPercent <= 2.5
      ? { label: 'Balanced Growth Standard', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30' }
      : { label: 'Aggressive / High Risk Drawdown', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };

  const handleApplyTrade = () => {
    if (onApplyToTrade) {
      onApplyToTrade({
        symbol: instrument.symbol,
        type: direction,
        lots: recommendedLots,
        price: customEntryPrice,
        stopLoss: calculatedStopLoss,
        takeProfit: calculatedTakeProfit
      });
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    }
  };

  return (
    <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Metallic Gold accent glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-navy-700/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Connect Financials Capital Risk Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            Position Sizing & Risk Management Calculator
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
            Input your capital and desired risk to automatically compute the optimal lot size, Stop Loss, and Take Profit target.
          </p>
        </div>

        {/* Risk Badge Indicator */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${riskStatus.bg} ${riskStatus.color}`}>
          {riskPercent <= 2.5 ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{riskStatus.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
        {/* Left Column: Input Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Capital / Account Balance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Your Trading Capital (Account Balance)</span>
              </label>
              <span className="text-[11px] text-amber-300 font-mono">
                USD Base Currency
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
              <input
                type="number"
                min="100"
                step="100"
                value={capital}
                onChange={(e) => setCapital(Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-8 pr-4 py-2.5 text-white font-mono font-bold text-base focus:outline-none focus:border-amber-400/80 transition-colors"
                placeholder="10000"
              />
            </div>

            {/* Quick Capital Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1000, 2500, 5000, 10000, 25000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCapital(amt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    capital === amt
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-navy-950 text-slate-300 hover:text-white border border-navy-700/80'
                  }`}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Risk Percentage per Trade */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Risk per Trade (% of Capital)</span>
              </label>
              <span className="text-xs font-mono font-extrabold text-amber-300">
                {riskPercent}% = ${riskAmountUSD.toFixed(2)} USD Risked
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-navy-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            {/* Preset Risk Buttons */}
            <div className="flex items-center gap-2 mt-2">
              {[0.5, 1.0, 1.5, 2.0, 3.0].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRiskPercent(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    riskPercent === p
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-navy-950 text-slate-300 border border-navy-700/80 hover:border-slate-500'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Asset & Order Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-1.5">
                3. Market Instrument
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              >
                {instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.symbol} - {inst.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-1.5">
                Order Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                    direction === 'BUY'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-navy-950 text-slate-400 border border-navy-700 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>BUY (Long)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                    direction === 'SELL'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-navy-950 text-slate-400 border border-navy-700 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>SELL (Short)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 4: Stop Loss (Pips) & Risk-to-Reward Ratio (TP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  4. Stop Loss Distance (Pips)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {slDistancePrice.toFixed(instrument.digits)} pts
                </span>
              </div>
              <input
                type="number"
                min="5"
                step="1"
                value={stopLossPips}
                onChange={(e) => setStopLossPips(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[15, 20, 25, 35, 50].map((pip) => (
                  <button
                    key={pip}
                    type="button"
                    onClick={() => setStopLossPips(pip)}
                    className={`flex-1 py-1 rounded text-[11px] font-mono ${
                      stopLossPips === pip
                        ? 'bg-navy-800 text-amber-300 font-bold border border-amber-400/40'
                        : 'bg-navy-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pip}p
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  5. Target Risk:Reward (TP)
                </label>
                <span className="text-[11px] text-amber-300 font-mono">
                  {tpPips} Pips Target
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.5, 2.0, 2.5, 3.0].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setRiskRewardRatio(ratio)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                      riskRewardRatio === ratio
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md'
                        : 'bg-navy-950 text-slate-400 border border-navy-700 hover:text-white'
                    }`}
                  >
                    1:{ratio}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                Entry Rate: <strong className="text-white">{customEntryPrice.toFixed(instrument.digits)}</strong>
              </div>
            </div>
          </div>

          {/* Real-time Capital Simulation & Outcomes - Fills empty gap */}
          <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-navy-800 pb-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Capital Balance Scenario Projection
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                1:{riskRewardRatio} Risk/Reward
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                <div className="text-[10px] uppercase font-bold text-emerald-400">
                  Account If Take Profit Hit
                </div>
                <div className="text-sm font-extrabold font-mono text-emerald-300 mt-0.5">
                  ${(capital + potentialProfitUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                  +{((potentialProfitUSD / capital) * 100).toFixed(1)}% ROI (+${potentialProfitUSD})
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                <div className="text-[10px] uppercase font-bold text-rose-400">
                  Account If Stop Loss Hit
                </div>
                <div className="text-sm font-extrabold font-mono text-rose-300 mt-0.5">
                  ${(capital - riskAmountUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-rose-400/80 font-mono mt-0.5">
                  -{riskPercent}% Maximum Risk (-${riskAmountUSD.toFixed(2)})
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Risk Management Model:</span>
              <span className="text-slate-200 font-medium">Fixed Fractional % Position Sizing</span>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Risk Management Output Card (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-navy-950 to-navy-850 border-2 border-gold-500/40 rounded-2xl p-6 shadow-2xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-navy-700">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              Calculated Position Sizing
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Safe Leverage 1:500
            </span>
          </div>

          {/* Recommended Lot Size Headline */}
          <div className="py-4 text-center bg-navy-900/80 rounded-xl my-3 border border-navy-700/80">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Recommended Position Size
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono text-gold-gradient my-1">
              {recommendedLots}{' '}
              <span className="text-base font-normal text-amber-300">Lots</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Contract: {(recommendedLots * instrument.contractSize).toLocaleString()} {instrument.baseCurrency}
            </div>
          </div>

          {/* SL & TP Execution Grid */}
          <div className="space-y-2 text-xs font-mono">
            {/* Risk (SL) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <div>
                <span className="text-[10px] text-rose-300 uppercase block font-bold">Stop Loss (SL)</span>
                <span className="text-base font-bold text-white">
                  {calculatedStopLoss.toFixed(instrument.digits)}
                </span>
                <span className="text-[10px] text-rose-300 ml-1.5">({stopLossPips} pips)</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Max Loss</span>
                <span className="font-extrabold text-rose-400 text-sm">
                  -${riskAmountUSD.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Target (TP) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div>
                <span className="text-[10px] text-emerald-300 uppercase block font-bold">Take Profit (TP)</span>
                <span className="text-base font-bold text-white">
                  {calculatedTakeProfit.toFixed(instrument.digits)}
                </span>
                <span className="text-[10px] text-emerald-300 ml-1.5">({tpPips} pips)</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Projected Profit (1:{riskRewardRatio})</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  +${potentialProfitUSD} USD
                </span>
              </div>
            </div>

            {/* Margin & Capital Health Breakdown */}
            <div className="p-3 rounded-xl bg-navy-950/90 border border-navy-700/80 space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Capital:</span>
                <span className="font-bold text-white">${capital.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Margin Collateral Needed:</span>
                <span className="text-amber-300 font-bold">${requiredMargin.toLocaleString()} USD ({marginPercentOfCapital}% of capital)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pip Movement Value:</span>
                <span className="text-white font-mono">${(pipValuePerLotUSD * recommendedLots).toFixed(2)} USD / pip</span>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="mt-4 pt-3 border-t border-navy-700">
            {appliedSuccess ? (
              <div className="py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Risk Sizing Configured & Sent to Terminal!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyTrade}
                className="w-full py-3.5 rounded-xl font-extrabold text-xs text-slate-950 bg-gold-metallic hover:bg-gold-metallic-hover shadow-gold transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Apply Sizing & Trade in Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Mathematical risk protection prevents over-leveraging and shields capital drawdowns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
