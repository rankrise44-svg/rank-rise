import React, { useEffect, useRef, useState } from 'react';
import earthPlanetImg from '../assets/images/earth_planet_space_fintech_1789815379245.jpg';

interface Props {
  className?: string;
  intensity?: 'subtle' | 'normal' | 'vibrant';
}

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBullish: boolean;
}

export const MotionChartBackground: React.FC<Props> = ({
  className = '',
  intensity = 'normal'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Subtle interactive parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouseOffset({ x: normX * 18, y: normY * 12 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // =========================================================================
    // Realistic Forex Candlestick Series Generation
    // =========================================================================
    // Sizing for tall, clearly visible institutional candles
    const getCandleDimensions = (w: number) => {
      const isMobile = w < 768;
      const candleWidth = isMobile ? 12 : 18;
      const candleSpacing = isMobile ? 22 : 32;
      return { candleWidth, candleSpacing };
    };

    let { candleWidth, candleSpacing } = getCandleDimensions(width);
    const visibleCount = Math.ceil(width / candleSpacing) + 20;

    const candles: CandleData[] = [];
    let currentPrice = 2740.0;
    let trendDirection = 1;
    let trendRemaining = 12;

    const createNextCandle = (prevClose: number): CandleData => {
      // Manage realistic market trend cycles (momentum runs, pullbacks, consolidations)
      trendRemaining--;
      if (trendRemaining <= 0) {
        trendDirection = Math.random() > 0.48 ? -trendDirection : trendDirection;
        trendRemaining = 8 + Math.floor(Math.random() * 14);
      }

      // Volatility and formation variation (Doji, Hammer, Marubozu, Range candle)
      const formationType = Math.random();
      const baseVolatility = 2.5 + Math.random() * 4.5;
      const trendBias = trendDirection * (1.2 + Math.random() * 2.8);
      const delta = (Math.random() - 0.46) * baseVolatility + trendBias;

      const open = prevClose;
      let close = open + delta;

      let high: number;
      let low: number;

      if (formationType < 0.12) {
        // Doji / Reversal Spin: very thin body, extended wicks on both sides
        close = open + (Math.random() - 0.5) * 0.6;
        const wick = 6.0 + Math.random() * 8.0;
        high = Math.max(open, close) + wick;
        low = Math.min(open, close) - wick * (0.8 + Math.random() * 0.4);
      } else if (formationType < 0.28) {
        // Pinbar / Hammer rejection: tiny body, huge lower or upper wick
        const isBullHammer = Math.random() > 0.4;
        const longWick = 9.0 + Math.random() * 14.0;
        const shortWick = 1.0 + Math.random() * 2.5;
        if (isBullHammer) {
          close = open + Math.abs(delta) * 0.4;
          high = Math.max(open, close) + shortWick;
          low = Math.min(open, close) - longWick;
        } else {
          close = open - Math.abs(delta) * 0.4;
          high = Math.max(open, close) + longWick;
          low = Math.min(open, close) - shortWick;
        }
      } else if (formationType > 0.8) {
        // Institutional Marubozu / Expansion impulse: massive tall body, minimal wicks
        const impulseDelta = (trendDirection * (6.0 + Math.random() * 9.0));
        close = open + impulseDelta;
        high = Math.max(open, close) + (0.5 + Math.random() * 1.5);
        low = Math.min(open, close) - (0.5 + Math.random() * 1.5);
      } else {
        // Standard healthy institutional candle
        const upperWick = 1.5 + Math.random() * 5.0;
        const lowerWick = 1.5 + Math.random() * 5.0;
        high = Math.max(open, close) + upperWick;
        low = Math.min(open, close) - lowerWick;
      }

      const volume = 35 + Math.random() * 65 + (Math.abs(close - open) > 4 ? 40 : 0);

      return {
        open,
        high,
        low,
        close,
        volume,
        isBullish: close >= open
      };
    };

    // Seed initial candle history
    let prev = currentPrice;
    for (let i = 0; i < visibleCount; i++) {
      const c = createNextCandle(prev);
      candles.push(c);
      prev = c.close;
    }

    // High precision horizontal scroll tracker
    let scrollOffset = 0;
    const scrollSpeed = 24.0; // Pixels per second (smooth, steady, controlled institutional pace)
    let lastTime = performance.now();

    // =========================================================================
    // 60FPS Continuous Animation Loop
    // =========================================================================
    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp delta time for stability
      lastTime = now;

      // Update responsive dimensions if window changed
      const dims = getCandleDimensions(width);
      candleWidth = dims.candleWidth;
      candleSpacing = dims.candleSpacing;

      // Smooth horizontal progress from right to left
      scrollOffset += scrollSpeed * dt;

      // Shift candles seamlessly when one full spacing interval passes
      if (scrollOffset >= candleSpacing) {
        scrollOffset -= candleSpacing;
        candles.shift();
        const lastCandle = candles[candles.length - 1];
        const newCandle = createNextCandle(lastCandle ? lastCandle.close : 2740);
        candles.push(newCandle);
      }

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Vertical price normalization across height
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < candles.length; i++) {
        if (candles[i].low < minVal) minVal = candles[i].low;
        if (candles[i].high > maxVal) maxVal = candles[i].high;
      }
      const range = Math.max(maxVal - minVal, 22.0);

      // Center the candlestick chart vertically in the middle/hero zone
      // TALLER chart span: 58% to 68% of viewport height
      const chartCenterY = height * 0.50;
      const chartSpan = Math.min(height * 0.65, 620);

      const priceToY = (price: number) => {
        const norm = (price - minVal) / range;
        return chartCenterY + chartSpan / 2 - norm * chartSpan;
      };

      // -----------------------------------------------------------------------
      // 1. Subtle Horizontal Institutional Price Benchmark Grids
      // -----------------------------------------------------------------------
      const gridLevels = 6;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';

      for (let g = 0; g <= gridLevels; g++) {
        const pLevel = minVal + (range / gridLevels) * g;
        const gy = priceToY(pLevel);

        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();

        // Benchmark Price Label on right edge
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(pLevel.toFixed(1), width - 16, gy - 4);
      }

      // -----------------------------------------------------------------------
      // 2. Exponential Moving Averages (Gold Fast EMA & Blue Slow EMA)
      // -----------------------------------------------------------------------
      const emaPointsGold: { x: number; y: number }[] = [];
      const emaPointsBlue: { x: number; y: number }[] = [];

      candles.forEach((c, idx) => {
        const cx = idx * candleSpacing - scrollOffset;
        const cy = priceToY(c.close);

        // Simulated EMA weights for smooth ribbons
        const goldY = cy + Math.sin(now * 0.0012 + idx * 0.12) * 5;
        const blueY = priceToY(c.open) + Math.cos(now * 0.0008 + idx * 0.08) * 12 + 10;

        emaPointsGold.push({ x: cx, y: goldY });
        emaPointsBlue.push({ x: cx, y: blueY });
      });

      // Render Slow Deep Electric Blue EMA ribbon
      if (emaPointsBlue.length > 1) {
        ctx.beginPath();
        ctx.moveTo(emaPointsBlue[0].x, emaPointsBlue[0].y);
        for (let i = 1; i < emaPointsBlue.length; i++) {
          ctx.lineTo(emaPointsBlue[i].x, emaPointsBlue[i].y);
        }
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = 'rgba(14, 165, 233, 0.4)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Render Fast Refined Metallic Gold EMA ribbon
      if (emaPointsGold.length > 1) {
        ctx.beginPath();
        ctx.moveTo(emaPointsGold[0].x, emaPointsGold[0].y);
        for (let i = 1; i < emaPointsGold.length; i++) {
          ctx.lineTo(emaPointsGold[i].x, emaPointsGold[i].y);
        }
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // -----------------------------------------------------------------------
      // 3. Tall, Realistic Professional Candlesticks
      // Palette: Only Deep Electric Blue (Bearish) and Refined Metallic Gold (Bullish)
      // -----------------------------------------------------------------------
      candles.forEach((c, idx) => {
        const cx = Math.round(idx * candleSpacing - scrollOffset);

        // Cull off-screen candles
        if (cx < -candleWidth - 10 || cx > width + candleWidth + 10) return;

        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);

        const isBull = c.isBullish;
        const topBody = Math.round(Math.min(openY, closeY));
        const bottomBody = Math.round(Math.max(openY, closeY));
        // Ensure candle bodies have strong, clear rectangular presence
        const bodyHeight = Math.max(bottomBody - topBody, 3.5);

        // Color definitions strictly: Refined Metallic Gold vs Deep Electric Blue
        const goldFill = 'rgba(245, 158, 11, 0.45)';
        const goldBorder = 'rgba(251, 191, 36, 0.9)';
        const goldWick = 'rgba(245, 158, 11, 0.85)';

        const blueFill = 'rgba(14, 165, 233, 0.42)';
        const blueBorder = 'rgba(56, 189, 248, 0.9)';
        const blueWick = 'rgba(14, 165, 233, 0.85)';

        const bodyFill = isBull ? goldFill : blueFill;
        const bodyBorder = isBull ? goldBorder : blueBorder;
        const wickColor = isBull ? goldWick : blueWick;

        // A. Upper Wick (From High down to Top of Body)
        ctx.beginPath();
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1.6;
        ctx.moveTo(cx, Math.round(highY));
        ctx.lineTo(cx, topBody);
        ctx.stroke();

        // B. Lower Wick (From Bottom of Body down to Low)
        ctx.beginPath();
        ctx.moveTo(cx, bottomBody);
        ctx.lineTo(cx, Math.round(lowY));
        ctx.stroke();

        // C. Rectangular Candle Body (Sharp, professional edges)
        const leftX = Math.round(cx - candleWidth / 2);

        // Body interior fill (translucent so Earth behind shines through with depth)
        ctx.fillStyle = bodyFill;
        ctx.fillRect(leftX, topBody, candleWidth, bodyHeight);

        // Body crisp outer border
        ctx.strokeStyle = bodyBorder;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(leftX, topBody, candleWidth, bodyHeight);

        // D. Bottom Volume Histogram Bar
        const volMaxHeight = 55;
        const volH = Math.round((c.volume / 100) * volMaxHeight);
        const volY = height - volH - 18;

        ctx.fillStyle = isBull ? 'rgba(245, 158, 11, 0.18)' : 'rgba(14, 165, 233, 0.16)';
        ctx.fillRect(leftX, volY, candleWidth, volH);
      });

      // -----------------------------------------------------------------------
      // 4. Live Leading Price Line & Pulsing Indicator
      // -----------------------------------------------------------------------
      if (candles.length > 0) {
        const lead = candles[candles.length - 1];
        const leadX = (candles.length - 1) * candleSpacing - scrollOffset;
        const leadY = priceToY(lead.close);

        // Dashed horizontal price level across entire screen
        ctx.beginPath();
        ctx.setLineDash([6, 5]);
        ctx.moveTo(0, leadY);
        ctx.lineTo(width - 95, leadY);
        ctx.strokeStyle = lead.isBullish ? 'rgba(245, 158, 11, 0.45)' : 'rgba(14, 165, 233, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Leading Pulsing Beacon Dot
        const pulse = (Math.sin(now * 0.005) + 1) / 2;
        ctx.beginPath();
        ctx.arc(leadX, leadY, 4.5 + pulse * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = lead.isBullish ? '#fbbf24' : '#38bdf8';
        ctx.shadowColor = lead.isBullish ? 'rgba(245, 158, 11, 0.9)' : 'rgba(14, 165, 233, 0.9)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Current Price Badge on Right Margin
        const badgeW = 86;
        const badgeH = 22;
        const badgeX = width - badgeW - 12;
        const badgeY = leadY - badgeH / 2;

        ctx.fillStyle = 'rgba(4, 9, 20, 0.9)';
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

        ctx.strokeStyle = lead.isBullish ? 'rgba(245, 158, 11, 0.85)' : 'rgba(14, 165, 233, 0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        ctx.fillStyle = lead.isBullish ? '#fef08a' : '#bae6fd';
        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`$${lead.close.toFixed(2)}`, badgeX + badgeW / 2, leadY);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      id="motion-chart-background"
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#030712] ${className}`}
    >
      {/* ------------------------------------------------------------------- */}
      {/* 1. CINEMATIC DEEP NAVY / BLACK BACKGROUND WITH CONTROLLED LIGHTING */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* Ambient Blue & Gold Glow Spheres */}
      <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] lg:w-[1250px] h-[700px] lg:h-[950px] bg-radial from-cyan-950/40 via-blue-950/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] lg:w-[850px] h-[400px] lg:h-[550px] bg-radial from-amber-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* ------------------------------------------------------------------- */}
      {/* 2. THE EARTH IN THE MIDDLE (LOWERED POSITION, HORIZONTALLY CENTERED) */}
      {/* ------------------------------------------------------------------- */}
      <div
        className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate(calc(-50% + ${mouseOffset.x}px), calc(-50% + ${mouseOffset.y}px))`
        }}
      >
        {/* Outer Atmospheric Aura (Gentle Cyan Corona) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] sm:w-[860px] md:w-[1020px] lg:w-[1200px] h-[680px] sm:h-[860px] md:h-[1020px] lg:h-[1200px] rounded-full bg-radial from-cyan-500/18 via-blue-900/12 to-transparent blur-3xl pointer-events-none animate-pulse duration-7000" />

        {/* Large Centered 3D Earth Globe Sphere - Positioned Lower in the Middle */}
        <div className="relative w-[480px] sm:w-[640px] md:w-[780px] lg:w-[920px] h-[480px] sm:h-[640px] md:h-[780px] lg:h-[920px] rounded-full overflow-hidden shadow-[0_0_130px_rgba(14,165,233,0.38),0_0_60px_rgba(2,132,199,0.28),inset_-40px_-40px_100px_rgba(2,6,23,0.95)] border border-cyan-500/30 opacity-80 mix-blend-screen">
          <img
            src={earthPlanetImg}
            alt="Global Forex Network Earth"
            className="w-full h-full object-cover animate-[spin_220s_linear_infinite] scale-110 select-none filter brightness-95 contrast-115"
          />

          {/* Spherical Shadow Mask to produce deep 3D globe curve */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#020617]/90 via-[#020617]/35 to-transparent pointer-events-none" />

          {/* Cyan Atmospheric Edge Glow */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_65px_rgba(56,189,248,0.55),inset_0_0_25px_rgba(245,158,11,0.25)] pointer-events-none" />
        </div>

        {/* Financial Network Orbit Rings & Light Trails around Globe */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] sm:w-[900px] md:w-[1100px] lg:w-[1300px] h-[240px] sm:h-[310px] md:h-[380px] lg:h-[460px] rounded-[50%] border border-cyan-400/20 pointer-events-none animate-[spin_110s_linear_infinite]"
          style={{ transform: 'translate(-50%, -50%) rotate(-23.5deg)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] sm:w-[1000px] md:w-[1220px] lg:w-[1420px] h-[270px] sm:h-[350px] md:h-[430px] lg:h-[510px] rounded-[50%] border border-amber-400/15 pointer-events-none animate-[spin_150s_linear_infinite_reverse]"
          style={{ transform: 'translate(-50%, -50%) rotate(16deg)' }}
        />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. TALL PROFESSIONAL CANDLESTICK CHART CANVAS (OVERLAPPING GLOBE)   */}
      {/* ------------------------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 opacity-90 transition-opacity duration-1000 pointer-events-none"
      />

      {/* ------------------------------------------------------------------- */}
      {/* 4. READABILITY VIGNETTES & TEXT PROTECTION MASKS                    */}
      {/* ------------------------------------------------------------------- */}
      {/* Ensures hero headlines and UI text remain 100% legible without glare */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/85 via-transparent to-[#020617]/95 pointer-events-none z-20" />
      <div className="absolute inset-0 bg-radial from-transparent via-[#020617]/40 to-[#020617]/90 pointer-events-none z-20" />
    </div>
  );
};
