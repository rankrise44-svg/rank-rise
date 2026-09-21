import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Sparkles, Eye, Shield, Zap, Compass, RotateCw } from 'lucide-react';
import goldenEagleImg from '../assets/images/golden_eagle_3d_1789734294509.jpg';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
  className?: string;
}

export const GoldenEagle3D: React.FC<Props> = ({
  size = 'md',
  showControls = true,
  className = ''
}) => {
  const [motionMode, setMotionMode] = useState<'hover' | 'orbital' | 'predator'>('hover');
  const [isHovered, setIsHovered] = useState(false);
  const [eyePulseActive, setEyePulseActive] = useState(true);

  // Mouse tilt tracking for true 3D parallax
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-22, 22]), springConfig);
  const shineX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const shineY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
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

  const triggerPredatorFlare = () => {
    setMotionMode('predator');
    setEyePulseActive(false);
    setTimeout(() => setEyePulseActive(true), 100);
    setTimeout(() => setMotionMode('hover'), 3200);
  };

  // Dimensions based on size prop
  const containerClasses =
    size === 'sm'
      ? 'w-64 h-64'
      : size === 'lg'
      ? 'w-full max-w-lg h-[460px]'
      : 'w-full max-w-md h-[400px] sm:h-[440px]';

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Stage Container */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className={`relative ${containerClasses} flex items-center justify-center cursor-grab active:cursor-grabbing`}
        style={{ perspective: 1200 }}
      >
        {/* Animated 3D Floating & Tilting Master Object */}
        <motion.div
          animate={
            motionMode === 'predator'
              ? {
                  y: [-12, 12, -12],
                  scale: [1.02, 1.07, 1.02],
                  rotateZ: [-2, 2, -2]
                }
              : {
                  y: [-8, 8, -8],
                  rotateZ: [-1, 1, -1]
                }
          }
          transition={{
            repeat: Infinity,
            duration: motionMode === 'predator' ? 2.8 : 4.6,
            ease: 'easeInOut'
          }}
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d'
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* 1. Holographic Gyroscopic 3D Golden Orbit Rings */}
          <div
            className="absolute inset-2 sm:inset-4 rounded-full border border-amber-500/25 pointer-events-none animate-[spin_24s_linear_infinite]"
            style={{ transform: 'translateZ(-40px) rotateX(65deg)' }}
          />
          <div
            className="absolute inset-8 sm:inset-12 rounded-full border border-dashed border-amber-400/35 pointer-events-none animate-[spin_18s_linear_infinite_reverse]"
            style={{ transform: 'translateZ(-20px) rotateY(60deg)' }}
          />

          {/* Golden Ambient Backlight Halo */}
          <div
            className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-blue-600/30 blur-3xl pointer-events-none"
            style={{ transform: 'translateZ(-60px)' }}
          />

          {/* 2. Main 3D Sculpted Golden Eagle Artwork Frame */}
          <motion.div
            className="relative w-[86%] h-[86%] rounded-3xl overflow-hidden p-1.5 bg-gradient-to-b from-amber-400/80 via-yellow-600/50 to-navy-900 border-2 border-amber-400/70 shadow-2xl shadow-amber-500/25"
            style={{ transform: 'translateZ(20px)' }}
          >
            {/* Image Container */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-navy-950">
              <img
                src={goldenEagleImg}
                alt="3D Sculpted Metallic Golden Eagle with Sapphire Blue Eyes"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transform scale-105 transition-transform duration-700 hover:scale-110"
              />

              {/* Dynamic Metallic Specular Glint */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-amber-300/15 pointer-events-none"
                style={{
                  opacity: isHovered ? 0.85 : 0.4
                }}
              />

              {/* 3. Piercing Sapphire Blue Eyes Motion Glow */}
              {/* Left Eye Motion Flare */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: '37.5%',
                  left: '46.5%',
                  transform: 'translate(-50%, -50%) translateZ(45px)'
                }}
              >
                <div className="relative">
                  {/* Core Blue Neon Pupil */}
                  <span className="block w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_16px_#38bdf8] animate-pulse" />
                  {/* Expanding Laser Aura Wave */}
                  <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                  {/* Piercing Optical Beacon Ray */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent blur-[0.5px]" />
                </div>
              </div>

              {/* Right Eye Motion Flare */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: '38%',
                  left: '56%',
                  transform: 'translate(-50%, -50%) translateZ(45px)'
                }}
              >
                <div className="relative">
                  {/* Core Blue Neon Pupil */}
                  <span className="block w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_16px_#38bdf8] animate-pulse" />
                  {/* Expanding Laser Aura Wave */}
                  <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                  {/* Piercing Optical Beacon Ray */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent blur-[0.5px]" />
                </div>
              </div>

              {/* Tactical 3D HUD Coordinates Layer */}
              <div
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-md border border-amber-400/40 text-[10px] font-mono text-amber-300"
                style={{ transform: 'translateZ(30px)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>APEX EAGLE 3D</span>
              </div>

              <div
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-md border border-navy-700 text-[10px] font-mono text-slate-300"
                style={{ transform: 'translateZ(30px)' }}
              >
                <Eye className="w-3 h-3 text-cyan-400" />
                <span>SAPPHIRE VISION</span>
              </div>

              {/* Scanning Ray Line */}
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-[bounce_3s_ease-in-out_infinite] opacity-60 pointer-events-none" />
            </div>
          </motion.div>

          {/* 4. Floating 3D Badge Emblems on the Orbit */}
          <motion.div
            className="absolute -bottom-2 -left-2 sm:bottom-4 sm:left-2 p-2.5 rounded-xl bg-navy-900/90 border border-amber-400/50 backdrop-blur-md shadow-xl flex items-center gap-2"
            style={{ transform: 'translateZ(45px)' }}
          >
            <div className="w-6 h-6 rounded-lg bg-gold-metallic flex items-center justify-center text-slate-950 font-bold text-xs shadow-gold">
              ⚡
            </div>
            <div className="text-left font-mono">
              <div className="text-[10px] text-amber-300 font-bold">PREDATOR SPEED</div>
              <div className="text-[9px] text-slate-300">&lt; 10ms Fill Execution</div>
            </div>
          </motion.div>

          <motion.div
            className="absolute -top-2 -right-2 sm:top-4 sm:right-2 p-2.5 rounded-xl bg-navy-900/90 border border-cyan-400/50 backdrop-blur-md shadow-xl flex items-center gap-2"
            style={{ transform: 'translateZ(45px)' }}
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center text-xs">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-left font-mono">
              <div className="text-[10px] text-cyan-300 font-bold">BLUE EYE PRECISION</div>
              <div className="text-[9px] text-slate-300">Deep Multi-Bank Depth</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Interactive 3D Motion Controls */}
      {showControls && (
        <div className="mt-3 flex items-center justify-center gap-2 bg-navy-900/90 p-1.5 rounded-xl border border-navy-700/80 text-xs font-semibold backdrop-blur-md">
          <button
            onClick={() => setMotionMode('hover')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              motionMode === 'hover'
                ? 'bg-gold-metallic text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3D Float</span>
          </button>

          <button
            onClick={triggerPredatorFlare}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              motionMode === 'predator'
                ? 'bg-cyan-400 text-slate-950 font-extrabold shadow-[0_0_12px_#38bdf8]'
                : 'text-slate-300 hover:text-cyan-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Predator Eye Pulse</span>
          </button>

          <button
            onClick={() => {
              mouseX.set(0.3);
              mouseY.set(-0.3);
              setTimeout(() => {
                mouseX.set(-0.3);
                mouseY.set(0.3);
                setTimeout(() => {
                  mouseX.set(0);
                  mouseY.set(0);
                }, 600);
              }, 600);
            }}
            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-amber-300 transition-colors"
            title="Tilt 3D Perspective"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
