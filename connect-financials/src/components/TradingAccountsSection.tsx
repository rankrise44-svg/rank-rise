import React, { useState } from 'react';
import {
  CheckCircle2,
  Zap,
  Shield,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
  Server,
  Compass
} from 'lucide-react';
import { ACCOUNT_TIERS } from '../data/forexData';

interface Props {
  onOpenAccount: (tierId: string) => void;
  /** Set false when a page header above already carries the title. */
  showHeading?: boolean;
}

export const TradingAccountsSection: React.FC<Props> = ({ onOpenAccount, showHeading = true }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'comparison'>('cards');

  return (
    <section id="accounts-section" className="py-8 sm:py-10 border-b border-navy-700/80 bg-navy-950/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-6 sm:mb-8">
          {showHeading && (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Financials Account Types & Spread Schedule</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Tailored Trading Accounts for Every Strategy
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Choose from our institutional account structures with transparent spreads, deep multi-bank liquidity, flexible leverage up to 1:500, or practice risk-free on a demo account.
              </p>
            </>
          )}

          {/* Toggle View */}
          <div className="inline-flex items-center bg-navy-900 p-1 rounded-xl border border-navy-700 text-xs font-semibold mt-4">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'cards'
                  ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Account Tier Cards
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'comparison'
                  ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Specifications Matrix
            </button>
          </div>
        </div>

        {/* Card View */}
        {activeTab === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {ACCOUNT_TIERS.map((tier) => {
              const isDemo = tier.id === 'demo';
              const isPopular = tier.popular;
              const isVip = tier.id === 'vip';

              return (
                <div
                  key={tier.id}
                  id={`account-card-${tier.id}`}
                  className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-out flex flex-col justify-between relative transform hover:-translate-y-1.5 glow-gold-box cursor-default ${
                    isPopular
                      ? 'bg-gradient-to-b from-navy-900 to-navy-850 border-2 border-gold-500 shadow-xl shadow-amber-500/10 hover:shadow-2xl hover:shadow-amber-500/20 hover:border-gold-300'
                      : isVip
                      ? 'bg-gradient-to-b from-slate-950 to-navy-900 border-2 border-cyan-500/40 hover:border-cyan-400 shadow-xl hover:shadow-cyan-500/20'
                      : isDemo
                      ? 'bg-navy-900/90 border-2 border-amber-400/40 hover:border-amber-400 shadow-lg hover:shadow-amber-500/15'
                      : 'bg-navy-900/70 border border-navy-700/80 hover:border-amber-400/40 hover:bg-navy-900/90 hover:shadow-xl hover:shadow-black/40'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-metallic text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}

                  {isVip && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-950 border border-cyan-400 text-cyan-300 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                      Institutional
                    </div>
                  )}

                  {isDemo && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy-950 border border-amber-400 text-amber-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                      Free Practice
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                        {tier.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white mt-1.5">{tier.name}</h3>

                    {/* Price & Deposit */}
                    <div className="mt-3 pb-3 border-b border-navy-700">
                      <div className="text-[11px] text-slate-400">Minimum Deposit</div>
                      <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                        ${tier.minDeposit.toLocaleString()}
                        <span className="text-xs font-normal text-slate-400 ml-1">USD</span>
                      </div>
                    </div>

                    {/* Highlights - SPREADS ARE EXPLICITLY SHOWN HERE */}
                    <div className="py-3 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Spread:</span>
                        <span className="text-amber-300 font-bold">{tier.spread}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Commission:</span>
                        <span className="text-white font-bold text-[11px]">{tier.commission}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Leverage:</span>
                        <span className="text-amber-300 font-bold">{tier.leverage}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Execution:</span>
                        <span className="text-slate-200 font-semibold text-[11px]">{tier.execution}</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="pt-2 pb-5 space-y-1.5 border-t border-navy-700/80 text-[11px]">
                      {tier.features.slice(0, 4).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    id={`open-btn-${tier.id}`}
                    onClick={() => onOpenAccount(tier.id)}
                    className={`w-full px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight glow-gold-hover ${
                      isPopular
                        ? 'bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-extrabold shadow-gold hover:shadow-gold-lg'
                        : isVip
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-md'
                        : isDemo
                        ? 'bg-navy-950 hover:bg-navy-800 text-amber-300 border border-amber-400/60 hover:border-amber-400'
                        : 'bg-navy-950 hover:bg-navy-800 text-white border border-navy-700 hover:border-slate-500'
                    }`}
                  >
                    <span>{isDemo ? 'Open Free Demo' : `Select ${tier.name}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Full Comparison Matrix */
          <div className="bg-navy-900 rounded-2xl border border-navy-700 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-navy-950 border-b border-navy-700 text-slate-300">
                    <th className="py-4 px-4 font-bold text-sm">Specification</th>
                    <th className="py-4 px-4 font-bold text-sm">Standard Account</th>
                    <th className="py-4 px-4 font-bold text-sm text-amber-300 bg-amber-500/10">Plus Account</th>
                    <th className="py-4 px-4 font-bold text-sm">Raw Spread</th>
                    <th className="py-4 px-4 font-bold text-sm text-cyan-300">VIP Institutional</th>
                    <th className="py-4 px-4 font-bold text-sm">Islamic Swap-Free</th>
                    <th className="py-4 px-4 font-bold text-sm text-emerald-400">Practice Demo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/80 font-mono">
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Minimum Deposit</td>
                    <td className="py-3.5 px-4 text-white">$100 USD</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold bg-amber-500/5">$250 USD</td>
                    <td className="py-3.5 px-4 text-white">$500 USD</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold">$10,000 USD</td>
                    <td className="py-3.5 px-4 text-white">$100 USD</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$0 (Free)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Spreads From</td>
                    <td className="py-3.5 px-4 text-white">1.0 Pip</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold bg-amber-500/5">0.6 Pips</td>
                    <td className="py-3.5 px-4 text-white">0.0 Pips (Raw)</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold">0.0 Pips (Raw)</td>
                    <td className="py-3.5 px-4 text-white">1.0 Pip</td>
                    <td className="py-3.5 px-4 text-emerald-400">Live Market Spreads</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Commission</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$0.00</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold bg-amber-500/5">$0.00</td>
                    <td className="py-3.5 px-4 text-slate-300">$3.50 / lot / side</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold">$2.00 / lot / side</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$0.00</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$0.00</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Leverage</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">Up to 1:500</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold bg-amber-500/5">Up to 1:500</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">Up to 1:500</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">Up to 1:500</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">Up to 1:500</td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">Up to 1:500</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Overnight Rollover / Swap</td>
                    <td className="py-3.5 px-4 text-slate-300">Standard Swap</td>
                    <td className="py-3.5 px-4 text-slate-300 bg-amber-500/5">Discounted Swap</td>
                    <td className="py-3.5 px-4 text-slate-300">Standard Swap</td>
                    <td className="py-3.5 px-4 text-cyan-300">Zero on Major Crosses</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">100% Zero Swap (Halal)</td>
                    <td className="py-3.5 px-4 text-slate-300">Simulated</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Order Execution</td>
                    <td className="py-3.5 px-4 text-white">STP Straight Through</td>
                    <td className="py-3.5 px-4 text-amber-300 bg-amber-500/5">Direct Market Access</td>
                    <td className="py-3.5 px-4 text-white">ECN Interbank Direct</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold">Prime Brokerage / FIX API</td>
                    <td className="py-3.5 px-4 text-white">STP Straight Through</td>
                    <td className="py-3.5 px-4 text-white">Equinix Simulation</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-300">Scalping & EA Trading</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">Allowed</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold bg-amber-500/5">Allowed</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">Unrestricted</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">Unrestricted & Co-located</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">Allowed</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">Allowed</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-sans font-semibold text-slate-300">Action</td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onOpenAccount('standard')}
                        className="px-3 py-1.5 rounded-lg bg-navy-950 hover:bg-navy-800 text-white font-sans font-bold text-xs border border-navy-700 glow-gold-hover cursor-pointer"
                      >
                        Open Standard
                      </button>
                    </td>
                    <td className="py-4 px-4 bg-amber-500/5">
                      <button
                        onClick={() => onOpenAccount('plus')}
                        className="px-3 py-1.5 rounded-lg bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-sans font-extrabold text-xs shadow-gold glow-gold-hover cursor-pointer"
                      >
                        Open Plus
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onOpenAccount('raw')}
                        className="px-3 py-1.5 rounded-lg bg-navy-950 hover:bg-navy-800 text-white font-sans font-bold text-xs border border-navy-700 glow-gold-hover cursor-pointer"
                      >
                        Open Raw
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onOpenAccount('vip')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-extrabold text-xs shadow-md glow-cyan-hover cursor-pointer"
                      >
                        Open VIP
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onOpenAccount('islamic')}
                        className="px-3 py-1.5 rounded-lg bg-navy-950 hover:bg-navy-800 text-white font-sans font-bold text-xs border border-navy-700 glow-gold-hover cursor-pointer"
                      >
                        Open Islamic
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => onOpenAccount('demo')}
                        className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-amber-300 font-sans font-bold text-xs border border-amber-400/50 glow-gold-hover cursor-pointer"
                      >
                        Try Demo
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
