import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  Eye,
  Zap,
  Crosshair,
  Sparkles,
  Maximize2,
  Minimize2,
  Target,
  ShieldCheck,
  Briefcase,
  Newspaper,
  History as HistoryIcon,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  ChevronRight,
  Layers,
  Award,
  Globe2,
  BarChart3
} from 'lucide-react';
import eagleEyeImg from '../assets/images/golden_eagle_eye_1789749610503.jpg';

interface Props {
  className?: string;
  onOpenAccount?: (type?: string) => void;
  onSwitchToRates?: () => void;
}

// Sample rich financial news
const marketNews = [
  {
    id: 'n1',
    titleEn: 'Fed Liquidity Easing: Gold (XAU/USD) Climbs to Record Highs',
    titleAr: 'تيسير السيولة الفيدرالية: الذهب يسجل قمم تاريخية جديدة',
    category: 'Commodities / Gold',
    time: '8m ago',
    impact: 'High',
    sentiment: 'Bullish',
    pips: '+180 Pips'
  },
  {
    id: 'n2',
    titleEn: 'ECB Monetary Policy Update: EUR/USD Tests 1.0850 Resistance',
    titleAr: 'تحديث المركزي الأوروبي: اليورو/دولار يختبر مقاومة 1.0850',
    category: 'Forex Major',
    time: '24m ago',
    impact: 'Medium',
    sentiment: 'Volatile',
    pips: '+45 Pips'
  },
  {
    id: 'n3',
    titleEn: 'Equinix NY4 Latency Report: Sub-8ms Execution Confirmed for Prime Flow',
    titleAr: 'تقرير زمن استجابة خوادم NY4: تنفيذ فائق بسرعة أقل من 8 ميلي ثانية',
    category: 'Technology',
    time: '1h ago',
    impact: 'Institutional',
    sentiment: 'Optimized',
    pips: '0.0 Slippage'
  }
];

// Sample trade execution history
const tradeHistory = [
  {
    id: 't101',
    pair: 'XAU/USD',
    type: 'BUY',
    lots: '2.50 Lots',
    entry: '2,651.40',
    exit: '2,668.80',
    pnl: '+$4,350.00',
    pips: '+174 Pips',
    latency: '7.2ms',
    time: 'Today 15:42:10',
    status: 'CLOSED'
  },
  {
    id: 't102',
    pair: 'EUR/USD',
    type: 'SELL',
    lots: '5.00 Lots',
    entry: '1.08720',
    exit: '1.08410',
    pnl: '+$1,550.00',
    pips: '+31 Pips',
    latency: '8.1ms',
    time: 'Today 14:19:04',
    status: 'CLOSED'
  },
  {
    id: 't103',
    pair: 'GBP/USD',
    type: 'BUY',
    lots: '3.00 Lots',
    entry: '1.31250',
    exit: '1.31880',
    pnl: '+$1,890.00',
    pips: '+63 Pips',
    latency: '7.8ms',
    time: 'Today 11:05:22',
    status: 'CLOSED'
  },
  {
    id: 't104',
    pair: 'US30 (Dow)',
    type: 'BUY',
    lots: '1.00 Lot',
    entry: '41,850',
    exit: '42,120',
    pnl: '+$2,700.00',
    pips: '+270 Pts',
    latency: '9.0ms',
    time: 'Today 09:30:15',
    status: 'CLOSED'
  }
];

// Trading Accounts options - All standardized to 1:500
const accountOptions = [
  {
    id: 'raw-ecn',
    nameEn: 'Raw Spread ECN',
    nameAr: 'حساب سبريد خام ECN',
    badge: 'Most Popular',
    spread: 'From 0.0 Pips',
    commission: '$3.50 / lot',
    minDeposit: '$500',
    leverage: '1:500',
    idealFor: 'Scalpers, EAs & High Frequency',
    color: 'from-amber-400 to-yellow-500'
  },
  {
    id: 'standard-stp',
    nameEn: 'Standard STP',
    nameAr: 'حساب قياسي بدون عمولة',
    badge: 'Zero Commission',
    spread: 'From 0.8 Pips',
    commission: '$0.00 (Zero)',
    minDeposit: '$100',
    leverage: '1:500',
    idealFor: 'Beginners & Swing Traders',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'vip-institutional',
    nameEn: 'VIP Institutional',
    nameAr: 'حساب المؤسسات VIP',
    badge: 'Prime Liquidity',
    spread: 'Raw 0.0 Pips',
    commission: '$1.50 / lot',
    minDeposit: '$10,000',
    leverage: '1:500',
    idealFor: 'Family Offices & Large Funds',
    color: 'from-amber-300 to-amber-600'
  }
];

export const EagleEyeMotionVisual: React.FC<Props> = ({
  className = '',
  onOpenAccount,
  onSwitchToRates
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Main Mode: 'eagleEye' OR 'motionFx'
  const [activeMode, setActiveMode] = useState<'eagleEye' | 'motionFx'>('eagleEye');

  // Motion FX Sub-Tabs: 'accounts' | 'news' | 'history'
  const [fxSubTab, setFxSubTab] = useState<'accounts' | 'news' | 'history'>('accounts');

  // Selected account in the accounts tab
  const [selectedAccount, setSelectedAccount] = useState<string>('raw-ecn');

  // Hover & mouse physics for 3D tilt in eagle eye view
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 22, stiffness: 160 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-16, 16]), springConfig);

  // Dynamic pupil offset tracking the mouse
  const pupilOffsetX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), { damping: 15, stiffness: 120 });
  const pupilOffsetY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-5, 5]), { damping: 15, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || activeMode !== 'eagleEye') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // Trigger entering into Motion FX when clicking on the eye or crosshair
  const handleEnterMotionFx = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveMode('motionFx');
      setIsTransitioning(false);
    }, 350);
  };

  const handleBackToEagleEye = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveMode('eagleEye');
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className={`relative flex flex-col items-center select-none w-full ${className}`}>
      {/* Ambient Pulsing Aura */}
      <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-amber-500/25 to-blue-600/25 blur-2xl opacity-80 pointer-events-none" />

      {/* Main Unified Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: 1200 }}
        className="relative w-full rounded-3xl p-1.5 bg-gradient-to-b from-amber-400/90 via-yellow-600/40 to-slate-950 border-2 border-amber-400/70 shadow-2xl shadow-cyan-950/50 overflow-hidden backdrop-blur-xl"
      >
        <motion.div
          style={{
            rotateX: activeMode === 'eagleEye' ? rotateX : 0,
            rotateY: activeMode === 'eagleEye' ? rotateY : 0,
            transformStyle: 'preserve-3d'
          }}
          className="relative w-full rounded-2xl overflow-hidden bg-slate-950 min-h-[420px] sm:min-h-[440px] flex flex-col justify-between"
        >
          {/* Transition Flash overlay */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-gradient-to-r from-cyan-400 via-white to-amber-400 mix-blend-screen pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* MODE 1: EAGLE EYE SCANNER WITH THREE.JS WEBGL & CLICKABLE RETICLE         */}
          {/* ========================================================================= */}
          {activeMode === 'eagleEye' && (
            <div className="relative w-full h-full flex-1 flex flex-col justify-between">
              {/* Background Eagle Eye High-Res Image */}
              <div className="absolute inset-0 z-0">
                {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-xs font-mono">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      Calibrating Sapphire Eagle Eye Optics...
                    </span>
                  </div>
                )}
                <img
                  src={eagleEyeImg}
                  alt="Apex Golden Eagle Eye"
                  referrerPolicy="no-referrer"
                  onLoad={() => setIsLoaded(true)}
                  className={`w-full h-full object-cover object-center transform transition-all duration-700 ${
                    isTransitioning ? 'scale-125 brightness-125' : isHovered ? 'scale-105' : 'scale-100'
                  } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
                {/* Specular glare */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-amber-300/15 pointer-events-none" />
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* THE CROSSHAIR RETICLE & EYE CLICK HOTSPOT (54.9% X, 52.3% Y)      */}
              {/* ----------------------------------------------------------------- */}
              <motion.div
                className="absolute z-20"
                style={{
                  left: '54.9%',
                  top: '52.3%',
                  x: pupilOffsetX,
                  y: pupilOffsetY,
                  transform: 'translate(-50%, -50%) translateZ(40px)'
                }}
              >
                <div
                  onClick={handleEnterMotionFx}
                  className="relative group cursor-pointer flex items-center justify-center p-8 -m-8"
                  title="Click Crosshair to Enter Motion FX"
                >
                  {/* Central Sapphire Pupil Indicator */}
                  <span className="block w-4 h-4 rounded-full bg-cyan-300 shadow-[0_0_20px_#38bdf8,0_0_40px_#0284c7] group-hover:scale-130 transition-transform duration-300 group-hover:bg-white" />

                  {/* HIGH-PRECISION RETICLE CROSSHAIR LINES (+) */}
                  {/* Horizontal Line */}
                  <div className="absolute w-36 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#38bdf8] pointer-events-none" />
                  {/* Vertical Line */}
                  <div className="absolute h-36 w-[2px] bg-gradient-to-b from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#38bdf8] pointer-events-none" />

                  {/* Corner Target Markers */}
                  <div className="absolute -top-6 -left-6 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
                  <div className="absolute -top-6 -right-6 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
                  <div className="absolute -bottom-6 -left-6 w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
                  <div className="absolute -bottom-6 -right-6 w-3 h-3 border-b-2 border-r-2 border-cyan-300" />

                  {/* Floating Action Badge directly attached to Crosshair */}
                  <div className="absolute -bottom-11 whitespace-nowrap px-3 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-amber-400 shadow-lg text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all">
                    <Zap className="w-3 h-3 text-cyan-400 group-hover:text-slate-950 animate-bounce" />
                    <span className="sr-only">Enter Motion FX</span>
                  </div>
                </div>
              </motion.div>

              {/* Top HUD Bar */}
              <div className="relative z-20 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-amber-400/40 text-[11px] font-mono text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-bold tracking-wider">EAGLE EYE // OPTIC SCANNER</span>
                </div>

                {/* Direct quick button to switch to Motion FX */}
                <button
                  onClick={handleEnterMotionFx}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-all hover:scale-105"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950" />
                  <span>Enter Motion FX &rarr;</span>
                </button>
              </div>

              {/* Bottom Interactive HUD Bar */}
              <div className="relative z-20 p-3">
                <div className="w-full p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <span>Click the eye to enter Motion FX</span>
                  </div>
                  <button
                    onClick={handleEnterMotionFx}
                    className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                  >
                    Open Motion FX
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: MOTION FX WITH TRADING ACCOUNTS, NEWS & HISTORY OPTIONS           */}
          {/* ========================================================================= */}
          {activeMode === 'motionFx' && (
            <div className="relative w-full h-full flex-1 flex flex-col justify-between">
              {/* Background Animated Hero WebP from User Link */}
              <div className="absolute inset-0 z-0">
                <img
                  src="/assets/hero_animated.webp"
                  alt="Motion FX Background"
                  className="w-full h-full object-cover opacity-30 mix-blend-screen pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/85 to-slate-950/95 pointer-events-none" />
              </div>

              {/* 1. Header Toolbar inside Motion FX */}
              <div className="relative z-10 p-3 pb-1 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    MOTION FX // INSTITUTIONAL PORTAL
                  </span>
                </div>

                {/* Back to Eagle Eye Button */}
                <button
                  onClick={handleBackToEagleEye}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-400/50 text-amber-300 hover:text-amber-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                  title="Return to Eagle Eye"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>&larr; Back to Eagle Eye</span>
                </button>
              </div>

              {/* 2. THE 3 REQUESTED NAVIGATION OPTIONS: TRADING ACCOUNTS, NEWS, HISTORY */}
              <div className="relative z-10 px-3 pt-2">
                <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
                  {/* Tab 1: Trading Accounts */}
                  <button
                    onClick={() => setFxSubTab('accounts')}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      fxSubTab === 'accounts'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="truncate">Accounts</span>
                  </button>

                  {/* Tab 2: News */}
                  <button
                    onClick={() => setFxSubTab('news')}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      fxSubTab === 'news'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Newspaper className="w-3.5 h-3.5" />
                    <span className="truncate">News</span>
                  </button>

                  {/* Tab 3: History */}
                  <button
                    onClick={() => setFxSubTab('history')}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      fxSubTab === 'history'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span className="truncate">History</span>
                  </button>
                </div>
              </div>

              {/* 3. SUB-TAB CONTENT PANELS */}
              <div className="relative z-10 px-3 py-2 flex-1 flex flex-col justify-center">
                {/* ---------------- TAB 1: TRADING ACCOUNTS ---------------- */}
                {fxSubTab === 'accounts' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>SELECT INSTITUTIONAL ACCOUNT TYPE:</span>
                      <span className="text-amber-400 font-bold">1:500 Direct STP</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {accountOptions.map((acc) => {
                        const isSelected = selectedAccount === acc.id;
                        return (
                          <div
                            key={acc.id}
                            onClick={() => setSelectedAccount(acc.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-slate-900 border-amber-400 shadow-lg shadow-amber-500/10'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                                {acc.badge}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </div>

                            <div className="text-xs font-bold text-white mb-1 truncate">
                              {acc.nameEn}
                            </div>

                            <div className="text-[10px] font-mono space-y-0.5 text-slate-300">
                              <div>Spread: <strong className="text-emerald-400">{acc.spread}</strong></div>
                              <div>Min Deposit: <strong className="text-amber-300">{acc.minDeposit}</strong></div>
                              <div>Leverage: <strong className="text-cyan-400">{acc.leverage}</strong></div>
                              <div>Commission: <strong className="text-slate-200">{acc.commission}</strong></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom CTA for chosen account */}
                    <div className="pt-1 flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[11px] font-mono">
                        <span className="text-slate-400">Chosen: </span>
                        <strong className="text-amber-300 uppercase">
                          {accountOptions.find((a) => a.id === selectedAccount)?.nameEn}
                        </strong>
                      </div>
                      <button
                        onClick={() => onOpenAccount && onOpenAccount(selectedAccount)}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-mono font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open This Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ---------------- TAB 2: BREAKING NEWS ---------------- */}
                {fxSubTab === 'news' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE MARKET WIRES
                      </span>
                      <span>Updated 1m ago</span>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {marketNews.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-amber-400 font-bold">{item.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{item.time}</span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                                {item.sentiment}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                            {item.titleEn}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                            {item.titleAr}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ---------------- TAB 3: TRADE EXECUTION HISTORY ---------------- */}
                {fxSubTab === 'history' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>AUDITED ORDER EXECUTION HISTORY</span>
                      <span className="text-cyan-400">NY4 Direct STP</span>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {tradeHistory.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                tr.type === 'BUY'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {tr.type}
                            </span>
                            <div>
                              <div className="font-bold text-white">{tr.pair}</div>
                              <div className="text-[10px] text-slate-400">{tr.lots} &bull; {tr.time}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-emerald-400">{tr.pnl}</div>
                            <div className="text-[10px] text-slate-400">
                              {tr.pips} &bull; <span className="text-cyan-300">{tr.latency}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Bottom Footer of Motion FX */}
              <div className="relative z-10 p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                <button
                  onClick={handleBackToEagleEye}
                  className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Back to Eagle Eye</span>
                </button>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="text-amber-300 font-bold">Ultra-Low 0.0 Pips</span>
                  {onSwitchToRates && (
                    <button
                      onClick={onSwitchToRates}
                      className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                    >
                      View Rates &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Sub-label helper guide */}
      <div className="mt-2.5 flex items-center justify-between w-full px-2 text-xs text-slate-400 font-mono">
        {/* In eagle-eye mode the HUD inside the panel already says how to enter
            Motion FX, so this row has nothing to add — render nothing rather
            than an icon beside an empty string. */}
        {activeMode === 'eagleEye' ? (
          <span />
        ) : (
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Choose between Trading Accounts, News, or History</span>
          </span>
        )}
        <button
          onClick={() => setActiveMode(activeMode === 'eagleEye' ? 'motionFx' : 'eagleEye')}
          className="text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
        >
          {activeMode === 'eagleEye' ? 'Quick Motion FX' : 'Back to Eye'}
        </button>
      </div>
    </div>
  );
};
