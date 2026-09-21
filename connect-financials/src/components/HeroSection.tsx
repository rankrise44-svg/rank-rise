import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Award,
  ArrowRight,
  TrendingUp,
  Cpu,
  Lock,
  Sparkles,
  CheckCircle2,
  Calculator,
  Compass,
  Eye,
  BarChart3
} from 'lucide-react';
import { Instrument } from '../types';
import { EagleEyeMotionVisual } from './EagleEyeMotionVisual';

interface Props {
  onOpenAccount: (type?: string) => void;
  onLaunchTerminal: () => void;
  onOpenPortal: () => void;
  onOpenCalculator?: () => void;
  featuredInstruments: Instrument[];
}

export const HeroSection: React.FC<Props> = ({
  onOpenAccount,
  onLaunchTerminal,
  onOpenPortal,
  onOpenCalculator,
  featuredInstruments
}) => {
  const [rightPanelTab, setRightPanelTab] = useState<'eagleMotion' | 'rates'>('eagleMotion');

  return (
    <section id="hero-section" className="relative overflow-hidden pt-6 pb-8 lg:pt-8 lg:pb-12 border-b border-navy-700/80 bg-navy-950/60">
      {/* Subtle Fintech Matrix Grid Pattern */}
      <div className="absolute inset-0 fintech-grid-pattern opacity-40 pointer-events-none" />

      {/* Background ambient lighting in deep navy and warm metallic gold */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/10 via-blue-950/40 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Heading & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-900 border border-amber-500/30 text-xs font-medium text-slate-300 shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 font-bold tracking-wide">CONNECT FINANCIALS</span>
              <span className="text-navy-700">|</span>
              <span className="text-cyan-300 flex items-center gap-1 font-mono text-[11px]">
                <Eye className="w-3 h-3 text-cyan-400 inline" /> 3D PREDATOR EXECUTION
              </span>
            </div>

            {/* Requested exact copy with metallic gold accent */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.18]">
              WITH CONNECT:{' '}
              <span className="text-gold-gradient block sm:inline">
                TRADE SMARTER, MOVE FASTER, GO FURTHER.
              </span>
            </h1>

            {/* Requested copy starting from low spread, without any spread numbers */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Starting from low spread, deep institutional-grade liquidity, flexible leverage up to 1:500, and institutional capital risk calculators. Open your live or risk-free demo account in seconds.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              {/* Open Live Account Button - Metallic Gold */}
              <button
                id="hero-open-live-btn"
                onClick={() => onOpenAccount('plus')}
                className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-slate-950 bg-gold-metallic hover:bg-gold-metallic-hover shadow-gold hover:shadow-gold-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.99] flex items-center gap-2 cursor-pointer whitespace-nowrap glow-gold-hover"
              >
                <span>Open Live Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Free Demo Account Button */}
              <button
                id="hero-open-demo-btn"
                onClick={() => onOpenAccount('demo')}
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-amber-300 bg-navy-900 hover:bg-navy-850 border border-amber-400/40 hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.99] flex items-center gap-2 shadow-sm hover:shadow-amber-500/10 cursor-pointer whitespace-nowrap glow-gold-hover"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Try Free $50,000 Demo</span>
              </button>

              {/* Risk Management Calculator CTA */}
              <button
                id="hero-calculator-btn"
                onClick={onOpenCalculator}
                className="px-5 py-3.5 rounded-xl font-semibold text-sm text-slate-200 hover:text-white bg-navy-950/90 hover:bg-navy-900 border border-navy-700/80 hover:border-amber-400/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0.5 flex items-center gap-2 cursor-pointer whitespace-nowrap glow-gold-hover"
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Risk Calculator</span>
              </button>

              {/* Launch Web Terminal */}
              <button
                id="hero-launch-terminal-btn"
                onClick={onLaunchTerminal}
                className="px-4 py-3.5 rounded-xl font-semibold text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Cpu className="w-4 h-4 text-slate-400" />
                <span>Web Terminal</span>
              </button>
            </div>

            {/* Trust bullet list - Refined Fintech Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-navy-700/80">
              <div className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-xl bg-navy-900/40 border border-navy-700/60 hover:border-amber-400/40 hover:bg-navy-900/70 transition-all duration-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Low Spreads</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-xl bg-navy-900/40 border border-navy-700/60 hover:border-amber-400/40 hover:bg-navy-900/70 transition-all duration-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Segregated Funds</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-xl bg-navy-900/40 border border-navy-700/60 hover:border-amber-400/40 hover:bg-navy-900/70 transition-all duration-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Instant $0 Deposit</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-xl bg-navy-900/40 border border-navy-700/60 hover:border-amber-400/40 hover:bg-navy-900/70 transition-all duration-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Free $50k Practice</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Professional Golden Eagle, Eagle Eye Optics & Rates */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {/* View Switcher Tabs (Unified Eagle Eye & Motion FX + Live Direct Rates) */}
            <div className="w-full grid grid-cols-2 gap-2 bg-navy-900/90 p-1 rounded-2xl border border-navy-700/90 mb-3 text-xs font-semibold backdrop-blur-md">
              <button
                onClick={() => setRightPanelTab('eagleMotion')}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  rightPanelTab === 'eagleMotion'
                    ? 'bg-gold-metallic text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4 text-slate-950" />
                <span className="font-bold">Eagle Eye &bull; Motion FX</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] rounded bg-navy-950/80 text-amber-300 font-mono">
                  Interactive
                </span>
              </button>

              <button
                onClick={() => setRightPanelTab('rates')}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  rightPanelTab === 'rates'
                    ? 'bg-gold-metallic text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="font-bold">Live Rates (NY4)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            </div>

            {rightPanelTab === 'eagleMotion' ? (
              /* User-Requested Unified Eagle Eye + Motion FX (Click eye/cross to enter Motion FX, with Accounts, News, History) */
              <div className="w-full">
                <EagleEyeMotionVisual
                  onOpenAccount={onOpenAccount}
                  onSwitchToRates={() => setRightPanelTab('rates')}
                />
              </div>
            ) : (
              /* Live Mini rates preview */
              <div className="w-full bg-navy-900/95 rounded-2xl border border-navy-700/90 p-5 shadow-2xl backdrop-blur-xl relative">
                <div className="flex items-center justify-between pb-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      Equinix NY4 Direct Liquidity Feed
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    ⚡ 8.4 ms Fill
                  </span>
                </div>

                <div className="py-3 space-y-2.5">
                  {featuredInstruments.slice(0, 4).map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-navy-950/80 border border-navy-700/70 hover:border-amber-400/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{inst.symbol}</span>
                          <span className="text-[10px] text-amber-300/80 font-mono bg-navy-900 px-1.5 py-0.5 rounded border border-navy-700">
                            Direct Market
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{inst.name}</div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-slate-100">
                          {inst.bid.toFixed(inst.digits)}
                        </div>
                        <div
                          className={`text-[11px] font-mono font-semibold ${
                            inst.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {inst.change24h >= 0 ? '+' : ''}
                          {inst.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Execution Performance Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-700/80">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Avg Execution</div>
                    <div className="text-base font-extrabold text-amber-300 font-mono">11.4 ms</div>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-700/80">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Max Leverage</div>
                    <div className="text-base font-extrabold text-amber-400 font-mono">1:500</div>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-700/80">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Slippage Fill</div>
                    <div className="text-base font-extrabold text-amber-300 font-mono">99.98%</div>
                  </div>
                </div>

                {/* Demo banner */}
                <div className="mt-4 pt-3 border-t border-navy-700/80 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Want to test zero-risk practice first?</span>
                  <button
                    onClick={() => onOpenAccount('demo')}
                    className="font-extrabold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Free $50K Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
