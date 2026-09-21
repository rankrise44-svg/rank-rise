import React from 'react';
import {
  ShieldCheck,
  Building2,
  Cpu,
  Globe,
  Award,
  Zap,
  Lock,
  Users,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Server,
  Scale
} from 'lucide-react';

interface Props {
  onOpenAccount: () => void;
  onExploreMarkets: () => void;
  /** Set false when a page header above already carries the title. */
  showHeading?: boolean;
}

export const AboutUsSection: React.FC<Props> = ({ onOpenAccount, onExploreMarkets, showHeading = true }) => {
  return (
    <section id="about-us-section" className="py-8 sm:py-10 border-b border-navy-700/80 bg-navy-950 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
        {/* Top Header */}
        {showHeading && (
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Connect Financials Institutional Profile</span>
              <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 font-mono font-bold border border-cyan-500/30">
                EST. 2018
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              About <span className="text-amber-400">Connect Financials</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Engineered for discerning professional traders, proprietary funds, and retail investors who demand pure direct market access, ultra-deep Tier-1 liquidity, and sub-millisecond execution without compromise.
            </p>
          </div>
        )}

        {/* Global Key Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 text-center space-y-1 hover:border-amber-400/40 transition-colors">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400">$14.2B+</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Daily Volume</div>
            <div className="text-[11px] text-slate-400">Aggregated interbank turnover</div>
          </div>

          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 text-center space-y-1 hover:border-cyan-400/40 transition-colors">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400">&lt;9.4ms</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Average Latency</div>
            <div className="text-[11px] text-slate-400">Equinix NY4 fiber cross-connect</div>
          </div>

          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 text-center space-y-1 hover:border-emerald-400/40 transition-colors">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">99.98%</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Fill Ratio</div>
            <div className="text-[11px] text-slate-400">Zero requotes, pure STP execution</div>
          </div>

          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 text-center space-y-1 hover:border-purple-400/40 transition-colors">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-purple-400">180+</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Countries</div>
            <div className="text-[11px] text-slate-400">Global institutional footprint</div>
          </div>
        </div>

        {/* Narrative & Institutional Infrastructure Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Our Institutional Heritage
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Built by Traders, Backed by Tier-1 Investment Banks
              </h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Connect Financials was founded with a singular objective: dismantle the barriers between retail traders and the institutional liquidity pools once reserved exclusively for multi-billion dollar hedge funds and prime brokerages.
            </p>

            <p className="text-sm text-slate-300 leading-relaxed">
              By deploying low-latency optical servers directly inside the Equinix NY4 data center in Secaucus, New Jersey and LD4 in London, we aggregate real-time price quotes from over 25 Tier-1 liquidity providers—including Barclays, JPMorgan Chase, Citi, UBS, and BNP Paribas. This guarantees true raw spreads from 0.0 pips and virtually eliminates slippage.
            </p>

            {/* Bullet points */}
            <div className="space-y-3 pt-2">
              {[
                'True No Dealing Desk (NDD) with 100% STP/ECN order routing',
                'All client funds segregated in Tier-1 AAA-rated custodian institutions',
                'Negative Balance Protection legally guaranteed for all account tiers',
                'Proprietary ConnectView Technical Analysis & WebTrader terminals'
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-slate-200 font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={onOpenAccount}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Open Live Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreMarkets}
                className="px-6 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 hover:border-cyan-400/50 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Explore 50+ Currency Pairs</span>
              </button>
            </div>
          </div>

          {/* Right Column: 4 Architecture Pillar Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-amber-400/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Equinix NY4 Co-Location</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sub-millisecond optical cross-connects directly to the world’s largest banking liquidity centers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-cyan-400/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Segregated Client Assets</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                All client equity is kept strictly isolated from operational accounts with Tier-1 custodian banks.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-emerald-400/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Zero Conflict STP Routing</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                We never trade against clients. All orders are matched directly into institutional interbank books.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-purple-400/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">24/5 Institutional Desk</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dedicated trading room support, senior market technicians, and multi-language client concierges.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Regulatory Compliance Seals */}
        <div className="p-6 rounded-2xl bg-navy-900/60 border border-navy-800 flex flex-wrap items-center justify-between gap-6 text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Tier-1 Bank Segregation</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <span>256-Bit SSL Military Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>ISO/IEC 27001 Infrastructure</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400 shrink-0" />
            <span>Multi-Regulated Standards</span>
          </div>
        </div>
      </div>
    </section>
  );
};
