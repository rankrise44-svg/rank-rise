import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, Maximize2, Minimize2, Eye, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  className?: string;
  onSwitchToEagle?: () => void;
}

export const AnimatedHeroVisual: React.FC<Props> = ({
  className = '',
  onSwitchToEagle
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Outer Glow Halo */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/20 via-blue-600/20 to-amber-400/20 blur-xl opacity-75 pointer-events-none" />

      {/* Main Showcase Container */}
      <div className="relative w-full rounded-3xl p-1.5 bg-gradient-to-b from-amber-400/80 via-yellow-600/40 to-navy-900 border-2 border-amber-400/70 shadow-2xl shadow-amber-500/20 overflow-hidden backdrop-blur-xl">
        {/* Animated Visual Frame */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-navy-950 flex items-center justify-center min-h-[340px] sm:min-h-[380px]">
          {/* Fallback loader */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-950 text-slate-400 text-xs font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Loading Hero Motion Visual...
              </span>
            </div>
          )}

          {/* The User-Supplied Hero Animation */}
          <img
            src="/assets/hero_animated.webp"
            alt="Connect Financials Animated Hero"
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover object-center transform transition-all duration-700 ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          />

          {/* Subtle metallic reflection gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-navy-950/40 via-transparent to-amber-400/10 pointer-events-none" />

          {/* Top HUD Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-navy-950/85 backdrop-blur-md border border-amber-400/40 text-[11px] font-mono text-amber-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider">HERO MOTION DYNAMICS</span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 rounded-lg bg-navy-950/80 hover:bg-navy-900 backdrop-blur-md border border-navy-700 text-slate-300 hover:text-amber-300 text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title={isExpanded ? 'Shrink' : 'Expand preview'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
              <span className="text-[10px] font-mono hidden sm:inline">
                {isExpanded ? 'Close' : 'Zoom'}
              </span>
            </button>
          </div>

          {/* Bottom Floating Stats Bar */}
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-between p-2 rounded-xl bg-navy-950/85 backdrop-blur-md border border-navy-700/80 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-slate-300 font-semibold">Motion Graphics Active</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-amber-300 font-bold">Metallic Gold & Navy</span>
              {onSwitchToEagle && (
                <button
                  onClick={onSwitchToEagle}
                  className="text-cyan-300 hover:text-cyan-200 underline font-semibold cursor-pointer"
                >
                  View 3D Eagle &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Modal Preview if user clicks Zoom */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-navy-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-navy-900 rounded-3xl border-2 border-amber-400/80 p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-navy-700">
              <div className="flex items-center gap-2 font-mono text-sm text-amber-300 font-bold">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Full Animated Hero Motion View</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-200 text-xs font-mono cursor-pointer border border-navy-600"
              >
                Close (ESC)
              </button>
            </div>
            <div className="mt-4 rounded-2xl overflow-hidden bg-navy-950 border border-navy-800 flex items-center justify-center">
              <img
                src="/assets/hero_animated.webp"
                alt="Connect Financials Animated Hero Expanded"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
