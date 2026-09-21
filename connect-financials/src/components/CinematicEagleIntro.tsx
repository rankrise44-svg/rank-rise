import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart3,
  Globe2,
  Briefcase,
  Eye,
  Activity
} from 'lucide-react';
import goldenEagleImage from '../assets/images/golden_eagle_intro_hero_1789750913348.jpg';

interface Props {
  onEnterPlatform: (targetSection?: string) => void;
  onOpenAccountModal?: () => void;
}

// Interactive options when user clicks the navigation arrows
const platformHighlights = [
  {
    id: 'eagle-forex',
    tag: 'APEX SIGNATURE // 01',
    titleEn: 'Embedded Candlestick Feathers',
    titleAr: 'هندسة الشموع اليابانية المدمجة بالريش',
    descEn: 'Institutional-grade Forex motion engine where anatomical gold feathers reveal living candlestick structures and price waves.',
    descAr: 'محرك حركة مالي متطور يكشف عن هياكل الشموع اليابانية وحركة السيولة في ريش الصقر الذهبي.',
    statLabel: 'ALGO MATRIX',
    statValue: 'NY4 ULTRA-DIRECT',
    target: 'chart-terminal-section',
    icon: BarChart3
  },
  {
    id: 'eagle-eye',
    tag: 'FLAGSHIP OPTICS // 02',
    titleEn: 'Sapphire Eagle Eye & Dynamic Pupil',
    titleAr: 'عين الصقر الياقوتية وانعكاسات السوق',
    descEn: 'Electric sapphire blue eyes glowing intelligently with real-time candlestick charts reflected deep inside the optical cornea.',
    descAr: 'أعين ياقوتية زرقاء مشعة بذكاء مع انعكاسات حية لرسوم الشموع البيانية داخل البؤبؤ.',
    statLabel: 'OPTICAL CORNEA',
    statValue: '360° SENSOR ARRAY',
    target: 'hero-section',
    icon: Eye
  },
  {
    id: 'accounts',
    tag: 'TIER-1 LIQUIDITY // 03',
    titleEn: 'Institutional Trading Accounts',
    titleAr: 'حسابات التداول المؤسسية ECN/STP',
    descEn: 'Ultra-tight spreads starting from 0.0 pips, sub-millisecond execution via Equinix NY4 fiber cross-connects, and 1:500 leverage.',
    descAr: 'سبريد خام يبدأ من 0.0 نقطة وربط مباشر مع خوادم NY4 ورافعة مالية مرنة.',
    statLabel: 'RAW SPREAD',
    statValue: 'FROM 0.0 PIPS',
    target: 'accounts-section',
    icon: Briefcase
  },
  {
    id: 'macro',
    tag: 'GLOBAL WIRES // 04',
    titleEn: 'Live Global Macro Intelligence',
    titleAr: 'التقويم الاقتصادي ومؤشرات السيولة',
    descEn: 'Algorithmic real-time sentiment alerts on Gold, Major FX pairs, and Indices with instantaneous volatility radar.',
    descAr: 'تنبيهات فورية على حركة الذهب والعملات العالمية مع قياس دقيق لمستويات التذبذب.',
    statLabel: 'PRECISION STP',
    statValue: '99.98% FILL',
    target: 'calendar-section',
    icon: Globe2
  }
];

export const CinematicEagleIntro: React.FC<Props> = ({
  onEnterPlatform,
  onOpenAccountModal
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [chartIntensity, setChartIntensity] = useState<'ultra' | 'clean'>('ultra');
  
  // Animation timeline state (smooth background loop)
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle mouse parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 15;
    setMousePos({ x, y });
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % platformHighlights.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + platformHighlights.length) % platformHighlights.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNextSlide();
      if (e.key === 'ArrowLeft') handlePrevSlide();
      if (e.key === 'Enter') onEnterPlatform();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Continuous smooth motion loop for cinematic camera & live market flow
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 0.04;
        if (next >= 12.0) {
          return 0;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const time = elapsedTime;

  // Camera push-in calculation:
  // Starts steady, smoothly pushes into the eagle with gentle float
  const cameraScale = useMemo(() => {
    const progress = (Math.sin((time / 12) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    return 1.0 + progress * 0.08;
  }, [time]);

  // Subtle floating camera movement
  const cameraFloatX = Math.sin(time * 0.8) * 3;
  const cameraFloatY = Math.cos(time * 0.6) * 2;

  // Breathing effect (subtle natural feather expansion)
  const breathing = Math.sin(time * 1.5) * 0.007;

  // Signature wing extension (peaks periodically at midpoint)
  const signatureIntensity = useMemo(() => {
    const modT = time % 6.0;
    const dist = Math.abs(modT - 3.0);
    if (dist > 1.2) return 0;
    return Math.cos((dist / 1.2) * (Math.PI / 2));
  }, [time]);

  const wingExtensionScaleX = 1 + signatureIntensity * 0.025;
  const wingExtensionScaleY = 1 + signatureIntensity * 0.012;

  // -------------------------------------------------------------------------
  // CANVAS ENGINE: FULL-SCREEN PROFESSIONAL 3D HOLOGRAPHIC FOREX CHART
  // Based on the user's reference image:
  // 1. Transparent canvas so the golden eagle and blue eyes clearly appear behind it
  // 2. 3D perspective floor grid receding into the cyan horizon
  // 3. Right vertical perspective wall with vertical laser pillar & candle arrays
  // 4. Floating field of luminous white & electric-cyan candlesticks across all of screen
  // 5. Digital price labels, tickers, volume bars, and matrix coordinates
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Precomputed Candlestick Matrix Columns spanning the screen
    interface CandleDef {
      xRatio: number;
      baseYRatio: number;
      bodyH: number;
      wickTop: number;
      wickBottom: number;
      isBull: boolean;
      opacity: number;
      hasLabel?: string;
      speed: number;
      phase: number;
      isWhite?: boolean;
    }

    // Dense clusters across screen (left, center-high, right perspective wall)
    const candles: CandleDef[] = [];
    
    // Left cluster (active market downtrend / recovery)
    for (let i = 0; i < 28; i++) {
      const xr = 0.02 + i * 0.015;
      const trend = Math.sin(i * 0.3) * 0.08 + Math.cos(i * 0.5) * 0.05;
      candles.push({
        xRatio: xr,
        baseYRatio: 0.28 + trend + (i > 14 ? 0.06 : 0),
        bodyH: 10 + ((i * 7) % 24),
        wickTop: 6 + ((i * 5) % 18),
        wickBottom: 6 + ((i * 3) % 16),
        isBull: (i % 3 !== 0),
        opacity: 0.55 + ((i % 5) * 0.09),
        speed: 0.8 + (i % 4) * 0.3,
        phase: i * 0.4,
        isWhite: i % 4 === 0,
        hasLabel: i === 6 ? '1.0842' : i === 18 ? '+1.24%' : i === 24 ? 'BID 1.089' : undefined
      });
    }

    // Upper center-left wave
    for (let i = 0; i < 22; i++) {
      const xr = 0.24 + i * 0.016;
      const trend = -Math.cos(i * 0.4) * 0.07;
      candles.push({
        xRatio: xr,
        baseYRatio: 0.22 + trend,
        bodyH: 12 + ((i * 9) % 30),
        wickTop: 8 + ((i * 4) % 18),
        wickBottom: 7 + ((i * 6) % 16),
        isBull: i % 2 === 0,
        opacity: 0.6 + ((i % 4) * 0.1),
        speed: 1.1 + (i % 3) * 0.2,
        phase: i * 0.5,
        isWhite: i % 3 === 0,
        hasLabel: i === 5 ? 'NY4 1.0865' : i === 16 ? '+0.45%' : undefined
      });
    }

    // Center-Right dynamic market peak
    for (let i = 0; i < 26; i++) {
      const xr = 0.48 + i * 0.015;
      const trend = Math.sin(i * 0.35) * 0.09;
      candles.push({
        xRatio: xr,
        baseYRatio: 0.26 + trend,
        bodyH: 14 + ((i * 11) % 32),
        wickTop: 10 + ((i * 5) % 20),
        wickBottom: 8 + ((i * 7) % 20),
        isBull: (i % 3 === 0 || i % 4 === 0),
        opacity: 0.65 + ((i % 5) * 0.08),
        speed: 0.9 + (i % 4) * 0.25,
        phase: i * 0.6,
        isWhite: i % 2 === 0,
        hasLabel: i === 4 ? '2,418.50' : i === 14 ? 'HIGH 2,422.0' : i === 22 ? '+2.89%' : undefined
      });
    }

    // Right-hand 3D perspective wall clusters (as shown in reference image)
    for (let i = 0; i < 35; i++) {
      const xr = 0.72 + i * 0.008;
      const trend = -Math.sin(i * 0.25) * 0.12 + (i * 0.003);
      candles.push({
        xRatio: Math.min(0.99, xr),
        baseYRatio: 0.18 + trend + (i > 18 ? 0.08 : 0),
        bodyH: 12 + ((i * 13) % 36),
        wickTop: 10 + ((i * 6) % 22),
        wickBottom: 10 + ((i * 4) % 22),
        isBull: i % 2 !== 0,
        opacity: 0.7 + ((i % 3) * 0.1),
        speed: 1.2 + (i % 3) * 0.4,
        phase: i * 0.3,
        isWhite: i % 3 === 0,
        hasLabel: i === 8 ? 'STP 99.9%' : i === 20 ? 'VOL 84.6K' : i === 30 ? '148.90' : undefined
      });
    }

    // Floor data tickers & coordinates
    const floorTickers = [
      { text: '[04:22:18 UTC] EQUINIX NY4 FIBER', x: 0.12, d: 0.72 },
      { text: 'EUR/USD BID: 1.08420 ASK: 1.08422', x: 0.35, d: 0.82 },
      { text: 'XAU/USD HIGH: 2,424.10 (+1.84%)', x: 0.65, d: 0.76 },
      { text: 'ORDER ROUTE: DIRECT PRIME STP', x: 0.25, d: 0.88 },
      { text: 'TICK VOL: 1,482,900 / SEC', x: 0.52, d: 0.92 },
      { text: 'LATENCY < 7.8 MS // SECURE NY4', x: 0.78, d: 0.85 }
    ];

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const t = elapsedTime;

      // CLEAR CANVAS: Always completely transparent so golden eagle & blue eyes appear behind!
      ctx.clearRect(0, 0, width, height);

      // ---------------------------------------------------------------------
      // 1. 3D CYBERNETIC PERSPECTIVE FLOOR GRID (Lower Screen)
      // ---------------------------------------------------------------------
      const horizonY = height * 0.64;
      const vanishingX = width * 0.58;

      ctx.save();
      // Horizon laser beam (Brilliant cyan flare across the horizon)
      const horizonGrad = ctx.createLinearGradient(0, horizonY, width, horizonY);
      horizonGrad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
      horizonGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.45)');
      horizonGrad.addColorStop(0.58, 'rgba(255, 255, 255, 0.95)');
      horizonGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.5)');
      horizonGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

      ctx.strokeStyle = horizonGrad;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();

      // Optical flare bloom at the vanishing point
      const bloomGrad = ctx.createRadialGradient(
        vanishingX,
        horizonY,
        0,
        vanishingX,
        horizonY,
        width * 0.35
      );
      bloomGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      bloomGrad.addColorStop(0.2, 'rgba(56, 189, 248, 0.15)');
      bloomGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, horizonY - 60, width, 120);

      // Perspective Depth Lines (Converging towards vanishing point on horizon)
      ctx.lineWidth = 1;
      const floorLinesCount = 28;
      for (let i = 0; i <= floorLinesCount; i++) {
        const bottomX = (width * 1.4 * (i / floorLinesCount)) - (width * 0.2);
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(56, 189, 248, 0.12)';
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }

      // Horizontal Floor Rings (Quadratic perspective spacing from horizon to bottom)
      const rings = 12;
      for (let r = 1; r <= rings; r++) {
        const prog = r / rings;
        const y = horizonY + (height - horizonY) * (prog * prog);
        ctx.strokeStyle = r === rings - 2 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = r % 3 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Floating Floor Data Tickers (Green / Cyan matrix data across floor)
      ctx.font = '10px monospace';
      floorTickers.forEach((item, idx) => {
        const fy = horizonY + (height - horizonY) * Math.pow((item.d - 0.6) / 0.4, 1.8);
        const fx = width * item.x + Math.sin(t * 0.5 + idx) * 10;
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(234, 179, 8, 0.65)';
        ctx.fillText(item.text, fx, fy);

        // Underline marker
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.moveTo(fx, fy + 3);
        ctx.lineTo(fx + 110, fy + 3);
        ctx.stroke();
      });
      ctx.restore();

      // ---------------------------------------------------------------------
      // 2. RIGHT-SIDE 3D PERSPECTIVE WALL & VERTICAL LASER PILLAR
      // (As highlighted in the user's reference image with luminous cyan beam)
      // ---------------------------------------------------------------------
      ctx.save();
      const wallX = width * 0.83;

      // Vertical Laser Line & Intense Pillar of Light
      const laserGrad = ctx.createLinearGradient(wallX, 0, wallX, height);
      laserGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
      laserGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      laserGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.95)');
      laserGrad.addColorStop(1, 'rgba(56, 189, 248, 0.3)');

      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(wallX, 0);
      ctx.lineTo(wallX, height);
      ctx.stroke();

      // Vertical Glow Ribbon
      const wallGlow = ctx.createLinearGradient(wallX - 30, 0, wallX + 60, 0);
      wallGlow.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
      wallGlow.addColorStop(0.4, 'rgba(56, 189, 248, 0.25)');
      wallGlow.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = wallGlow;
      ctx.fillRect(wallX - 30, 0, 90, height);

      // Angled perspective grid lines on the right wall
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      for (let y = 30; y < height; y += 45) {
        ctx.beginPath();
        ctx.moveTo(wallX, y);
        ctx.lineTo(width, y - 35);
        ctx.stroke();
      }
      ctx.restore();

      // ---------------------------------------------------------------------
      // 3. BACKGROUND FINANCIAL MATRIX GRID (Upper Screen)
      // ---------------------------------------------------------------------
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      const upperGrid = 44;
      for (let x = 0; x < width; x += upperGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, horizonY);
        ctx.stroke();
      }
      for (let y = 0; y < horizonY; y += upperGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // ---------------------------------------------------------------------
      // 4. ANIMATED TREND LINES (Electric Cyan & Metallic Gold Splines)
      // ---------------------------------------------------------------------
      ctx.save();
      // Wave 1: Cyan Institutional Liquidity Curve
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      for (let x = 0; x <= width; x += 15) {
        const ratio = x / width;
        const y =
          height * 0.32 +
          Math.sin(ratio * 7 + t * 1.5) * 28 +
          Math.cos(ratio * 12 - t * 0.8) * 16;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Wave 2: Metallic Gold Alpha Flow Curve
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 8;
      for (let x = 0; x <= width; x += 15) {
        const ratio = x / width;
        const y =
          height * 0.38 +
          Math.cos(ratio * 6 - t * 1.2) * 32 -
          Math.sin(ratio * 9 + t) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // ---------------------------------------------------------------------
      // 5. ALL-SCREEN TRANSPARENT CANDLESTICKS (Luminous White & Electric Cyan)
      // Exactly matching the look of the uploaded image!
      // ---------------------------------------------------------------------
      ctx.save();
      candles.forEach((c) => {
        const cx = width * c.xRatio;
        // Subtle vertical breathing with market wave
        const cy =
          height * c.baseYRatio +
          Math.sin(t * c.speed + c.phase) * 6;

        const bodyH = c.bodyH;
        const wickTop = c.wickTop;
        const wickBottom = c.wickBottom;

        // Colors: High-contrast white, radiant cyan, with subtle gold accents
        const isWhite = c.isWhite;
        const strokeColor = isWhite
          ? `rgba(255, 255, 255, ${c.opacity * 0.95})`
          : c.isBull
          ? `rgba(56, 189, 248, ${c.opacity * 0.9})`
          : `rgba(234, 179, 8, ${c.opacity * 0.85})`;

        const fillColor = isWhite
          ? `rgba(255, 255, 255, ${c.opacity * 0.75})`
          : c.isBull
          ? `rgba(56, 189, 248, ${c.opacity * 0.65})`
          : `rgba(2, 6, 23, 0.45)`;

        // Wick
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.3;
        ctx.shadowColor = isWhite ? '#ffffff' : '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy - bodyH / 2 - wickTop);
        ctx.lineTo(cx, cy + bodyH / 2 + wickBottom);
        ctx.stroke();

        // Body
        const bodyW = 7;
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.4;
        ctx.fillRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);
        ctx.strokeRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH);

        // Numerical Price / Percentage Tags hovering next to key candlesticks
        if (c.hasLabel) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = isWhite ? 'rgba(255, 255, 255, 0.85)' : 'rgba(56, 189, 248, 0.85)';
          ctx.fillText(c.hasLabel, cx + 8, cy - 4);

          // Micro bracket indicator
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(cx + 4, cy - 8);
          ctx.lineTo(cx + 6, cy - 8);
          ctx.lineTo(cx + 6, cy + 2);
          ctx.stroke();
        }
      });
      ctx.restore();

      // ---------------------------------------------------------------------
      // 6. VOLUME PILLARS / BARS ACROSS BOTTOM OF WALL
      // ---------------------------------------------------------------------
      ctx.save();
      const volCount = 36;
      for (let i = 0; i < volCount; i++) {
        const vx = width * (0.05 + (i / volCount) * 0.9);
        const vh = 10 + Math.abs(Math.sin(i * 0.7 + t)) * 40;
        const vy = horizonY - 2;

        ctx.fillStyle = i % 3 === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(vx, vy - vh, 4, vh);
      }
      ctx.restore();

      // ---------------------------------------------------------------------
      // 7. FLOATING 3D DATA PARTICLES & LIGHT DUST
      // ---------------------------------------------------------------------
      ctx.save();
      for (let i = 0; i < 40; i++) {
        const px = ((i * 47 + t * 25) % width);
        const py = ((i * 31 - t * 20 + height) % (height * 0.75));
        ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [elapsedTime]);

  const activeHighlight = platformHighlights[currentSlide];
  const IconComponent = activeHighlight.icon;

  return (
    <div
      id="cinematic-eagle-intro-container"
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-[#02050b] text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* ========================================================================= */}
      {/* 1. CINEMATIC BACKGROUND STAGE: GOLDEN EAGLE WITH SAPPHIRE BLUE EYES       */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Subtle Ambient Vignette & Deep Navy Aura */}
        <div className="absolute inset-0 bg-radial from-amber-500/10 via-[#030814] to-[#010307] opacity-80" />

        {/* The Golden Eagle Composition with Camera Push-In, Subtle Breathing & Parallax */}
        <div
          style={{
            transform: `translate3d(${mousePos.x * -0.6 + cameraFloatX}px, ${
              mousePos.y * -0.6 + cameraFloatY
            }px, 0) scale(${cameraScale + breathing})`,
            transition: 'transform 0.08s ease-out'
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
        >
          {/* Eagle Image with Feather & Wing Extension Signature Scaling */}
          <div
            style={{
              transform: `scale(${wingExtensionScaleX}, ${wingExtensionScaleY})`,
              transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            className="w-full h-full flex items-center justify-center relative will-change-transform"
          >
            <img
              src={goldenEagleImage}
              alt="Apex Institutional Golden Eagle with Sapphire Eyes"
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoaded(true)}
              className={`w-full h-full object-cover object-center transition-opacity duration-1000 filter brightness-95 contrast-110 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Specular Light Ray Sweep across the metallic gold body */}
            <div
              style={{
                transform: `translateX(${(time * 35 - 50) % 200}%) rotate(25deg)`,
                opacity: 0.12 + Math.sin(time * 1.5) * 0.06
              }}
              className="absolute inset-0 w-48 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent blur-xl pointer-events-none"
            />
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 2. SAPPHIRE BLUE EYES GLOW & EMBEDDED CANDLESTICK REFLECTION            */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: '50%',
            top: '41%',
            transform: `translate(calc(-50% + ${mousePos.x * 0.4 + cameraFloatX * 0.4}px), calc(-50% + ${
              mousePos.y * 0.4 + cameraFloatY * 0.4
            }px)) scale(${cameraScale})`
          }}
        >
          {/* Dual Sapphire Eyes */}
          <div className="relative flex items-center gap-11 sm:gap-14">
            {/* Left Eye */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-2 h-3.5 flex items-center justify-center opacity-85 z-30 pointer-events-none overflow-hidden">
                <div className="w-[1px] h-3 bg-cyan-200" />
                <div className="absolute w-1 h-1.5 bg-cyan-300 rounded-[1px] animate-pulse" />
              </div>
              <span
                style={{
                  boxShadow: '0 0 28px #38bdf8, 0 0 55px #0284c7'
                }}
                className="w-3.5 h-3.5 rounded-full bg-cyan-200"
              />
              <span className="absolute w-7 h-7 rounded-full border border-cyan-400/50 animate-ping" />
            </div>

            {/* Right Eye */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-2 h-3.5 flex items-center justify-center opacity-85 z-30 pointer-events-none overflow-hidden">
                <div className="w-[1px] h-3 bg-cyan-200" />
                <div className="absolute w-1 h-1.5 bg-cyan-300 rounded-[1px] animate-pulse" />
              </div>
              <span
                style={{
                  boxShadow: '0 0 28px #38bdf8, 0 0 55px #0284c7'
                }}
                className="w-3.5 h-3.5 rounded-full bg-cyan-200"
              />
              <span className="absolute w-7 h-7 rounded-full border border-cyan-400/50 animate-ping" />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* 3. FOREGROUND TRANSPARENT 3D PROFESSIONAL FINANCIAL CHART               */}
        {/* COVERS ALL OF SCREEN IN FRONT OF EAGLE SO EAGLE APPEARS BEHIND IT!      */}
        {/* ----------------------------------------------------------------------- */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen"
        />

        {/* Ambient Dark Gradient Vignette for bottom text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#02050b] via-transparent to-[#02050b]/40 pointer-events-none z-20" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP BAR (ORIGINAL RECOGNIZABLE LAYOUT PRESERVED)                      */}
      {/* ========================================================================= */}
      <header className="relative z-30 px-6 py-5 sm:px-10 sm:py-6 flex items-center justify-between">
        {/* Left: Brand Logo Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/40">
            <span className="text-black font-extrabold text-xl tracking-tighter">CF</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-white font-extrabold text-sm tracking-wider uppercase">
              CONNECT FINANCIALS
            </div>
            <div className="text-[10px] text-amber-400/90 font-mono flex items-center gap-1.5">
              <span>INSTITUTIONAL PRIME BROKER</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-cyan-400 font-bold">EQUINIX NY4</span>
            </div>
          </div>
        </div>

        {/* Right: Signature Motion Status & Enter Action */}
        <div className="flex items-center gap-3">
          {/* Holographic 3D Chart Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 border border-cyan-500/50 text-[11px] font-mono backdrop-blur-md shadow-lg shadow-cyan-950/40">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-300">3D HOLOGRAPHIC CHART:</span>
            <span className="text-cyan-300 font-bold">TRANSPARENT ACTIVE</span>
          </div>

          <button
            id="intro-enter-btn"
            onClick={() => onEnterPlatform()}
            className="px-5 py-2.5 rounded-full bg-white text-black font-extrabold text-xs sm:text-sm tracking-wide uppercase hover:bg-amber-400 hover:text-black transition-all transform hover:scale-105 shadow-xl shadow-white/10 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>JOIN THE FLEET &bull; ENTER</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. CENTER / BOTTOM MAIN STAGE: TYPOGRAPHY & CAROUSEL                      */}
      {/* (TIMELINE ON THE LEFT DOWN HAS BEEN COMPLETELY REMOVED AS REQUESTED)      */}
      {/* ========================================================================= */}
      <div className="relative z-30 px-6 sm:px-12 pb-6 sm:pb-8 flex flex-col justify-end">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          {/* Left Column: Bold Display Typography (Timeline removed!) */}
          <div className="lg:col-span-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>APEX INSTITUTIONAL DOMINANCE</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300">3D FOREX MATRIX</span>
            </div>

            {/* "Relentless. Sovereign. Unyielding." */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05] drop-shadow-2xl font-serif">
              Relentless. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
                Sovereign.
              </span>{' '}
              <br />
              Unyielding.
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-lg leading-relaxed pt-1 font-light">
              Connect Financials merges predatory institutional execution with the sovereign power of Tier-1 NY4 Equinix liquidity and a live 3D cybernetic candlestick trading environment.
            </p>
          </div>

          {/* Right Column: INTERACTIVE HIGHLIGHT CARD DRIVEN BY ARROWS */}
          <div className="lg:col-span-6 flex flex-col items-start lg:items-end space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHighlight.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                onClick={() => onEnterPlatform(activeHighlight.target)}
                className="w-full max-w-md p-4 sm:p-5 rounded-2xl bg-black/75 backdrop-blur-xl border-2 border-amber-400/60 shadow-2xl shadow-cyan-950/50 cursor-pointer hover:border-cyan-400 transition-all group"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-navy-900 border border-amber-400/40 text-amber-300 group-hover:text-cyan-300 transition-colors">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-400 tracking-wider">
                      {activeHighlight.tag}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    {currentSlide + 1} / {platformHighlights.length}
                  </span>
                </div>

                {/* Card Titles */}
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  {activeHighlight.titleEn}
                </h3>
                <div className="text-xs text-slate-400 font-sans mt-0.5">
                  {activeHighlight.titleAr}
                </div>

                {/* Card Description */}
                <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                  {activeHighlight.descEn}
                </p>

                {/* Bottom Card CTA */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="text-slate-400">
                    {activeHighlight.statLabel}:{' '}
                    <strong className="text-cyan-300">{activeHighlight.statValue}</strong>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Explore Platform</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* THE INTERACTIVE ARROW CONTROLS */}
            <div className="flex items-center gap-3 w-full max-w-md justify-between">
              {/* Slide dots */}
              <div className="flex items-center gap-1.5">
                {platformHighlights.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentSlide === idx ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next Arrows + Direct Enter Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevSlide}
                  className="p-3 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black border border-slate-700 hover:border-amber-400 text-white transition-all cursor-pointer backdrop-blur-md active:scale-95"
                  title="Previous Option (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNextSlide}
                  className="p-3 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black border border-slate-700 hover:border-amber-400 text-white transition-all cursor-pointer backdrop-blur-md active:scale-95"
                  title="Next Option (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEnterPlatform(activeHighlight.target)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-extrabold text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 cursor-pointer active:scale-95"
                >
                  <span>ENTER PLATFORM</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. FOOTER HUD METRICS (Exact Layout Preserved) */}
        <div className="mt-6 pt-3.5 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-6 sm:gap-10">
            <div>
              <span className="text-white font-bold text-sm">360&deg;</span>{' '}
              <span className="text-[10px] text-amber-400 uppercase">SENSOR ARRAY</span>
            </div>
            <div>
              <span className="text-white font-bold text-sm">&lt; 7.8 MS</span>{' '}
              <span className="text-[10px] text-cyan-400 uppercase">EQUINIX NY4</span>
            </div>
            <div>
              <span className="text-white font-bold text-sm">99.98%</span>{' '}
              <span className="text-[10px] text-emerald-400 uppercase">PRECISION STP</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-cyan-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              3D Holographic Forex Chart Matrix
            </span>
            <button
              onClick={() => onEnterPlatform()}
              className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
            >
              Skip Intro &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
