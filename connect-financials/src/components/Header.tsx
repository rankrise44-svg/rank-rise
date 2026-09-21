import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Globe,
  User,
  ChevronDown,
  Menu,
  X,
  BarChart3,
  Layers,
  Calculator,
  Calendar,
  Lock,
  Sparkles,
  Compass,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Activity,
  Coins,
  Building2,
  FileText,
  ChevronRight
} from 'lucide-react';
import { TradingAccount } from '../types';
import goldenEagleImg from '../assets/images/golden_eagle_3d_1789734294509.jpg';

interface Props {
  currentView: 'website' | 'portal';
  setCurrentView: (view: 'website' | 'portal') => void;
  onOpenAccountModal: (type?: string) => void;
  activeAccount: TradingAccount;
  onNavigateSection: (sectionId: string) => void;
  onOpenIntro?: () => void;
  onOpenConnectView?: () => void;
}

export const Header: React.FC<Props> = ({
  currentView,
  setCurrentView,
  onOpenAccountModal,
  activeAccount,
  onNavigateSection,
  onOpenIntro,
  onOpenConnectView
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'trading' | 'tools' | 'company' | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (menu: 'trading' | 'tools' | 'company') => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  const handleNavClick = (sectionId: string) => {
    if (currentView !== 'website') {
      setCurrentView('website');
    }
    setTimeout(() => {
      onNavigateSection(sectionId);
    }, 50);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="main-header"
      className="w-full backdrop-blur-md bg-slate-950/80 border-b border-amber-500/20 sticky top-[33px] z-30 transition-all duration-300 select-none shadow-lg shadow-black/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 lg:gap-4">
          {/* ========================================================================= */}
          {/* LEFT: BRAND LOGO WITH GOLD METALLIC EMBLEM & SAPPHIRE EYE                */}
          {/* ========================================================================= */}
          <div className="flex items-center shrink-0">
            <button
              id="brand-logo-btn"
              onClick={() => {
                setCurrentView('website');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 flex items-center justify-center p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all overflow-hidden relative shrink-0">
                <div className="w-full h-full bg-navy-950 rounded-[10px] overflow-hidden relative">
                  <img
                    src={goldenEagleImg}
                    alt="Connect Financials Golden Eagle"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500"
                  />
                  {/* Piercing Sapphire Blue Eye Glint in Mascot */}
                  <span className="absolute top-[37%] left-[48%] w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="absolute top-[37%] left-[48%] w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#38bdf8]" />
                </div>
              </div>
              <div className="whitespace-nowrap">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-amber-300 transition-colors">
                    CONNECT
                  </span>
                  <span className="font-semibold text-base sm:text-lg tracking-wider text-gold-gradient">
                    FINANCIALS
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 tracking-wider uppercase font-medium mt-1">
                  <span>Forex Brokerage</span>
                  <span className="text-navy-700">•</span>
                  <span className="text-amber-400/90 flex items-center gap-0.5 font-mono text-[9px] sm:text-[10px]">
                    <ShieldCheck className="w-2.5 h-2.5 inline text-amber-400" /> Regulated
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* CENTER: DESKTOP NAVIGATION (GUARANTEED NO-WRAP WITH REFINED DROPDOWNS)    */}
          {/* ========================================================================= */}
          <nav
            ref={navContainerRef}
            className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs xl:text-sm font-medium text-slate-200"
          >
            {/* 1. Markets Direct Nav Item */}
            <button
              id="nav-markets"
              onClick={() => handleNavClick('market-watch-section')}
              className="px-2.5 xl:px-3 py-2 rounded-xl whitespace-nowrap hover:text-amber-300 hover:bg-slate-900/80 transition-all flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white glow-gold-hover"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Markets</span>
            </button>

            {/* 2. Currencies Nav Item */}
            <button
              id="nav-currencies"
              onClick={() => handleNavClick('currencies-section')}
              className="px-2.5 xl:px-3 py-2 rounded-xl whitespace-nowrap hover:text-amber-300 hover:bg-slate-900/80 transition-all flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white glow-gold-hover"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Currencies</span>
            </button>

            {/* 3. Accounts Consolidated Dropdown (6 Tiers) */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('trading')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-accounts-dropdown"
                onClick={() => setActiveDropdown(activeDropdown === 'trading' ? null : 'trading')}
                className={`px-2.5 xl:px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  activeDropdown === 'trading'
                    ? 'text-amber-300 bg-slate-900 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80 glow-gold-hover'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Accounts</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 opacity-70 ${
                    activeDropdown === 'trading' ? 'rotate-180 text-amber-300' : ''
                  }`}
                />
              </button>

              {/* Accounts Dropdown Menu */}
              {activeDropdown === 'trading' && (
                <div className="absolute top-full left-0 mt-1.5 w-80 p-2 bg-slate-950/98 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-2xl shadow-black/90 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-mono text-amber-300/80 uppercase tracking-wider font-semibold border-b border-slate-800">
                    Institutional Tier Catalog (1:500 Max Leverage)
                  </div>
                  <button
                    onClick={() => {
                      handleNavClick('accounts-section');
                      onOpenAccountModal('standard');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Standard Account
                      </div>
                      <div className="text-[10px] text-slate-400">From 1.0 Pip • $0 Commission • Min $100</div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">1:500</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('accounts-section');
                      onOpenAccountModal('plus');
                    }}
                    className="w-full text-left p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 transition-colors flex items-center gap-1.5">
                        <span>Plus Account</span>
                        <span className="text-[9px] bg-gold-metallic text-slate-950 font-black px-1.5 rounded-full">POPULAR</span>
                      </div>
                      <div className="text-[10px] text-slate-300">From 0.6 Pips • $0 Commission • Min $250</div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 font-bold">1:500</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('accounts-section');
                      onOpenAccountModal('raw');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Raw Spread ECN
                      </div>
                      <div className="text-[10px] text-slate-400">Raw 0.0 Pips • $3.50/side • Interbank Direct</div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">1:500</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('accounts-section');
                      onOpenAccountModal('vip');
                    }}
                    className="w-full text-left p-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/30 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                        <span>VIP Institutional</span>
                        <span className="text-[9px] bg-cyan-500 text-slate-950 font-black px-1.5 rounded-full">PRIME</span>
                      </div>
                      <div className="text-[10px] text-slate-400">0.0 Pips • $2.00/side • FIX API • Min $10k</div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 font-bold">1:500</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('accounts-section');
                      onOpenAccountModal('islamic');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Islamic Swap-Free
                      </div>
                      <div className="text-[10px] text-slate-400">100% Zero Overnight Rollover • Certified Halal</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">1:500</span>
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('accounts-section');
                      onOpenAccountModal('demo');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-between group cursor-pointer border-t border-slate-800"
                  >
                    <div>
                      <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                        Practice Demo Account
                      </div>
                      <div className="text-[10px] text-slate-400">$50,000 Virtual Capital • Risk-Free</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">FREE</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Tools Consolidated Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('tools')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-tools-dropdown"
                onClick={() => setActiveDropdown(activeDropdown === 'tools' ? null : 'tools')}
                className={`px-2.5 xl:px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  activeDropdown === 'tools'
                    ? 'text-amber-300 bg-slate-900 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80 glow-gold-hover'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Tools</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 opacity-70 ${
                    activeDropdown === 'tools' ? 'rotate-180 text-amber-300' : ''
                  }`}
                />
              </button>

              {/* Tools Dropdown Menu */}
              {activeDropdown === 'tools' && (
                <div className="absolute top-full left-0 mt-1.5 w-80 p-2 bg-slate-950/98 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-2xl shadow-black/90 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenConnectView) {
                        onOpenConnectView();
                      } else {
                        handleNavClick('connectview-section');
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-cyan-400/40 text-cyan-300 group-hover:border-cyan-400 transition-colors shadow-sm">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                        <span>ConnectView Studio</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold">
                          TRADINGVIEW
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Technical Analysis, Multi-Chart Layouts & Indicators
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('calculators-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-amber-400/30 text-amber-300 group-hover:border-amber-400 transition-colors">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                        Risk & Position Sizing Calculator
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Precision Capital Risk % and Stop-Loss Calculation
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('calculators-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-amber-400/30 text-amber-300 group-hover:border-amber-400 transition-colors">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                        Leverage & Margin Calculator (1:500)
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Instant required margin across 50+ currency pairs
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('calendar-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-purple-400/30 text-purple-300 group-hover:border-purple-400 transition-colors">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors whitespace-nowrap">
                        Economic Calendar
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Central bank decisions, NFP, CPI & high impact events
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Institutional Consolidated Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('company')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-company-dropdown"
                onClick={() => setActiveDropdown(activeDropdown === 'company' ? null : 'company')}
                className={`px-2.5 xl:px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  activeDropdown === 'company'
                    ? 'text-amber-300 bg-slate-900 border border-amber-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80 glow-gold-hover'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Institutional</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 opacity-70 ${
                    activeDropdown === 'company' ? 'rotate-180 text-amber-300' : ''
                  }`}
                />
              </button>

              {/* Company Dropdown Menu */}
              {activeDropdown === 'company' && (
                <div className="absolute top-full left-0 mt-1.5 w-72 p-2 bg-slate-950/98 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-2xl shadow-black/90 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => handleNavClick('about-us-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-cyan-400/30 text-cyan-300 group-hover:border-cyan-400 transition-colors">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                        About Connect Financials
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Brokerage Profile, Tier-1 Banks & Heritage
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('hero-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-amber-400/30 text-amber-300 group-hover:border-amber-400 transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                        Eagle Eye Optic Scanner
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Predator Target Reticle & Motion FX
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('accounts-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-emerald-400/30 text-emerald-300 group-hover:border-emerald-400 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                        Regulation & Security
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Segregated Tier-1 Bank Client Funds
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavClick('legal-terms-section')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 transition-all flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-amber-400/30 text-amber-300 group-hover:border-amber-400 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                        Terms & Conditions Hub
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Official Seychelles Address, Emails & Policies
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* ========================================================================= */}
          {/* RIGHT: POLISHED FINTECH CONTROLS & CALLS TO ACTION                        */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Client Portal Login - Cyan Wireframe with glow */}
            <button
              id="header-portal-login-btn"
              onClick={() => setCurrentView('portal')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border ${
                currentView === 'portal'
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'text-cyan-300 bg-slate-950/80 border-cyan-400/60 hover:bg-cyan-950/50 hover:border-cyan-300 glow-cyan-hover'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Portal Login</span>
              {currentView === 'portal' && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              )}
            </button>

            {/* Quick Demo CTA */}
            <button
              id="header-demo-account-btn"
              onClick={() => onOpenAccountModal('demo')}
              className="px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-amber-400/40 hover:border-amber-400 transition-all cursor-pointer hidden sm:flex items-center gap-1 whitespace-nowrap glow-gold-hover"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Demo ($50k)</span>
            </button>

            {/* Open Account CTA - Metallic Gold Button with pulse */}
            <button
              id="header-open-account-btn"
              onClick={() => onOpenAccountModal('plus')}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-gold-metallic hover:bg-gold-metallic-hover shadow-gold glow-gold-hover transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <span>Open Live</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            {/* Mobile / Tablet Menu Button (< lg) */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-navy-900 text-slate-300 border border-navy-700 hover:text-white cursor-pointer transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE / TABLET DRAWER (CLEAN CATEGORIES & NO TEXT WRAPPING)              */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-navy-700/80 bg-navy-950/98 backdrop-blur-2xl px-4 pt-4 pb-6 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* Mobile Portal / Brokerage Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-navy-900 rounded-xl border border-navy-700/80">
            <button
              onClick={() => {
                setCurrentView('website');
                setMobileMenuOpen(false);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                currentView === 'website'
                  ? 'bg-navy-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Brokerage View
            </button>
            <button
              onClick={() => {
                setCurrentView('portal');
                setMobileMenuOpen(false);
              }}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentView === 'portal'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-amber-300 hover:text-amber-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Trader Portal</span>
            </button>
          </div>

          {/* Category: Trading & Execution */}
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-amber-400 font-bold px-2 uppercase tracking-wider">
              Trading & Markets
            </div>
            <button
              onClick={() => handleNavClick('currencies-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Tradable Currencies & FX (50+ Pairs)</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleNavClick('accounts-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Trading Accounts (ECN / STP / VIP)</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleNavClick('chart-terminal-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Market Terminal & Level II DOM</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleNavClick('market-watch-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Quotes & Live Market Watch</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Category: Institutional & About Us */}
          <div className="space-y-1 pt-2 border-t border-navy-800">
            <div className="text-[11px] font-mono text-cyan-400 font-bold px-2 uppercase tracking-wider">
              Company & Institutional
            </div>
            <button
              onClick={() => handleNavClick('about-us-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-cyan-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>About Us (Profile & Tier-1 Liquidity)</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleNavClick('accounts-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-emerald-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Regulation & Segregated Funds</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleNavClick('legal-terms-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Terms & Conditions & Official Address</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Category: Tools & Intelligence */}
          <div className="space-y-1 pt-2 border-t border-navy-800">
            <div className="text-[11px] font-mono text-amber-400 font-bold px-2 uppercase tracking-wider">
              Fintech Tools
            </div>
            <button
              onClick={() => {
                if (onOpenConnectView) {
                  onOpenConnectView();
                } else {
                  handleNavClick('connectview-section');
                }
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-cyan-300 hover:text-cyan-200 bg-navy-900/60 border border-cyan-500/30 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">ConnectView Studio (TradingView-Style)</span>
              </span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/40">PRO</span>
            </button>
            <button
              onClick={() => handleNavClick('calculators-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Capital Risk & Margin Calculators</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              onClick={() => handleNavClick('calendar-section')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Macro Economic Calendar</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
            {onOpenIntro && (
              <button
                onClick={() => {
                  onOpenIntro();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-cyan-300 hover:text-cyan-200 hover:bg-navy-900 flex items-center justify-between text-xs sm:text-sm font-mono"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Cinematic Eagle Intro Experience</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-500" />
              </button>
            )}
          </div>

          {/* Bottom Action CTAs */}
          <div className="pt-3 border-t border-navy-800 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onOpenAccountModal('demo');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-amber-300 bg-navy-900 border border-amber-400/40 text-center cursor-pointer"
            >
              Free $50K Demo
            </button>
            <button
              onClick={() => {
                onOpenAccountModal('plus');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl font-extrabold text-xs text-slate-950 bg-gold-metallic text-center shadow-gold cursor-pointer"
            >
              Open Live Account
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
