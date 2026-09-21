import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  BarChart2,
  Eye,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Check
} from 'lucide-react';
import { Instrument, Candle, ChartTimeframe, ChartType, IndicatorConfig } from '../types';

interface Props {
  instrument: Instrument;
  candles: Candle[];
  timeframe: ChartTimeframe;
  setTimeframe: (tf: ChartTimeframe) => void;
  onExecuteTrade: (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lots: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
}

export const MarketChartTerminal: React.FC<Props> = ({
  instrument,
  candles,
  timeframe,
  setTimeframe,
  onExecuteTrade
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    ma20: true,
    ma50: false,
    bollinger: false,
    rsi: true,
    volume: true
  });
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [tradeLots, setTradeLots] = useState(0.1);
  const [slPips, setSlPips] = useState(25);
  const [tpPips, setTpPips] = useState(50);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Mouse Crosshair State
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    candle?: Candle;
    price?: number;
  } | null>(null);

  // Compute Moving Averages
  const ma20Data = useMemo(() => {
    const period = 20;
    const result: (number | null)[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += candles[i - j].close;
        }
        result.push(sum / period);
      }
    }
    return result;
  }, [candles]);

  const ma50Data = useMemo(() => {
    const period = 50;
    const result: (number | null)[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += candles[i - j].close;
        }
        result.push(sum / period);
      }
    }
    return result;
  }, [candles]);

  // Compute Bollinger Bands (20, 2)
  const bollingerData = useMemo(() => {
    const period = 20;
    const result: { upper: number | null; middle: number | null; lower: number | null }[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        result.push({ upper: null, middle: null, lower: null });
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += candles[i - j].close;
        const mean = sum / period;
        let varianceSum = 0;
        for (let j = 0; j < period; j++) {
          varianceSum += Math.pow(candles[i - j].close - mean, 2);
        }
        const stdDev = Math.sqrt(varianceSum / period);
        result.push({
          upper: mean + stdDev * 2,
          middle: mean,
          lower: mean - stdDev * 2
        });
      }
    }
    return result;
  }, [candles]);

  // Compute RSI (14)
  const rsiData = useMemo(() => {
    const period = 14;
    const result: (number | null)[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        result.push(null);
        continue;
      }
      const change = candles[i].close - candles[i - 1].close;
      if (i <= period) {
        if (change > 0) gains += change;
        else losses += Math.abs(change);

        if (i === period) {
          const avgGain = gains / period;
          const avgLoss = losses / period;
          if (avgLoss === 0) result.push(100);
          else {
            const rs = avgGain / avgLoss;
            result.push(100 - (100 / (1 + rs)));
          }
        } else {
          result.push(null);
        }
      } else {
        const currentGain = change > 0 ? change : 0;
        const currentLoss = change < 0 ? Math.abs(change) : 0;
        gains = (gains * (period - 1) + currentGain) / period;
        losses = (losses * (period - 1) + currentLoss) / period;
        if (losses === 0) result.push(100);
        else {
          const rs = gains / losses;
          result.push(100 - (100 / (1 + rs)));
        }
      }
    }
    return result;
  }, [candles]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#090d16'; // deep navy/slate
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) return;

    // Sub-pane calculations
    const rsiPaneHeight = indicators.rsi ? 80 : 0;
    const pricePaneHeight = height - rsiPaneHeight - 24; // 24px time axis at bottom
    const rightMargin = 70; // price axis width
    const plotWidth = width - rightMargin;

    // Price Bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    // Expand margin by 5%
    const priceRange = maxPrice - minPrice || 0.001;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    const priceToY = (price: number) => {
      return pricePaneHeight - ((price - paddedMin) / paddedRange) * pricePaneHeight;
    };

    // Draw grid lines (horizontal price grid)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const p = paddedMin + (paddedRange / priceSteps) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();

      // Price label on right axis
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(instrument.digits), plotWidth + 8, y + 3);
    }

    const candleCount = candles.length;
    const candleSlotWidth = plotWidth / candleCount;
    const candleWidth = Math.max(2, candleSlotWidth * 0.7);

    // Draw Volume Bars
    if (indicators.volume && maxVolume > 0) {
      const volumeHeight = pricePaneHeight * 0.22;
      candles.forEach((c, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const vH = (c.volume / maxVolume) * volumeHeight;
        const y = pricePaneHeight - vH;
        ctx.fillStyle = c.close >= c.open ? 'rgba(16, 185, 129, 0.18)' : 'rgba(244, 63, 94, 0.18)';
        ctx.fillRect(x - candleWidth / 2, y, candleWidth, vH);
      });
    }

    // Draw Bollinger Bands
    if (indicators.bollinger) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let startedUpper = false;
      bollingerData.forEach((b, idx) => {
        if (b.upper !== null) {
          const x = idx * candleSlotWidth + candleSlotWidth / 2;
          const y = priceToY(b.upper);
          if (!startedUpper) {
            ctx.moveTo(x, y);
            startedUpper = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      ctx.beginPath();
      let startedLower = false;
      bollingerData.forEach((b, idx) => {
        if (b.lower !== null) {
          const x = idx * candleSlotWidth + candleSlotWidth / 2;
          const y = priceToY(b.lower);
          if (!startedLower) {
            ctx.moveTo(x, y);
            startedLower = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Draw Moving Average 20
    if (indicators.ma20) {
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      ma20Data.forEach((val, idx) => {
        if (val !== null) {
          const x = idx * candleSlotWidth + candleSlotWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Draw Moving Average 50
    if (indicators.ma50) {
      ctx.strokeStyle = '#818cf8'; // Indigo
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      ma50Data.forEach((val, idx) => {
        if (val !== null) {
          const x = idx * candleSlotWidth + candleSlotWidth / 2;
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Draw Main Chart (Candlestick or Line or Mountain)
    if (chartType === 'candlestick') {
      candles.forEach((c, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);
        const isGreen = c.close >= c.open;

        const color = isGreen ? '#10b981' : '#f43f5e';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // Wick
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });
    } else if (chartType === 'line' || chartType === 'mountain') {
      // Area or Line
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = priceToY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      if (chartType === 'mountain') {
        const lastX = (candles.length - 1) * candleSlotWidth + candleSlotWidth / 2;
        ctx.lineTo(lastX, pricePaneHeight);
        ctx.lineTo(candleSlotWidth / 2, pricePaneHeight);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, pricePaneHeight);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      candles.forEach((c, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = priceToY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Current Price Indicator Line
    const currentPriceY = priceToY(instrument.bid);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, currentPriceY);
    ctx.lineTo(plotWidth, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current Price Badge on Right Axis
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(plotWidth, currentPriceY - 9, rightMargin, 18);
    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(instrument.bid.toFixed(instrument.digits), plotWidth + 6, currentPriceY + 3.5);

    // Draw RSI Subpane if enabled
    if (indicators.rsi) {
      const rsiTop = pricePaneHeight;
      // Divider
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rsiTop);
      ctx.lineTo(width, rsiTop);
      ctx.stroke();

      // RSI Boundaries: 70 (overbought) & 30 (oversold)
      const rsiToY = (val: number) => {
        return rsiTop + rsiPaneHeight - (val / 100) * rsiPaneHeight;
      };

      const y70 = rsiToY(70);
      const y30 = rsiToY(30);

      ctx.fillStyle = 'rgba(244, 63, 94, 0.05)';
      ctx.fillRect(0, rsiTop, plotWidth, y70 - rsiTop);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.fillRect(0, y30, plotWidth, rsiTop + rsiPaneHeight - y30);

      // 70 Line
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(plotWidth, y70);
      ctx.stroke();

      // 30 Line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, y30);
      ctx.lineTo(plotWidth, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      // RSI Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('RSI (14)', 8, rsiTop + 14);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('70', plotWidth + 8, y70 + 3);
      ctx.fillText('30', plotWidth + 8, y30 + 3);

      // Plot RSI Line
      ctx.strokeStyle = '#c084fc'; // Purple
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let startedRsi = false;
      rsiData.forEach((val, idx) => {
        if (val !== null) {
          const x = idx * candleSlotWidth + candleSlotWidth / 2;
          const y = rsiToY(val);
          if (!startedRsi) {
            ctx.moveTo(x, y);
            startedRsi = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Time axis at bottom
    const bottomY = height - 6;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const timeStep = Math.max(1, Math.floor(candleCount / 5));
    for (let i = 0; i < candleCount; i += timeStep) {
      const c = candles[i];
      const x = i * candleSlotWidth + candleSlotWidth / 2;
      const date = new Date(c.time);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillText(timeStr, x, bottomY);
    }

    // Crosshair rendering
    if (hoverData) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverData.x, 0);
      ctx.lineTo(hoverData.x, height - 20);
      ctx.stroke();

      // Horizontal line on price pane
      if (hoverData.y < pricePaneHeight) {
        ctx.beginPath();
        ctx.moveTo(0, hoverData.y);
        ctx.lineTo(plotWidth, hoverData.y);
        ctx.stroke();

        // Price tooltip badge
        if (hoverData.price) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(plotWidth, hoverData.y - 9, rightMargin, 18);
          ctx.fillStyle = '#f8fafc';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(hoverData.price.toFixed(instrument.digits), plotWidth + 6, hoverData.y + 3.5);
        }
      }
      ctx.setLineDash([]);
    }
  }, [candles, instrument, chartType, indicators, timeframe, hoverData, ma20Data, ma50Data, bollingerData, rsiData]);

  // Handle Mouse movement on canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rsiPaneHeight = indicators.rsi ? 80 : 0;
    const pricePaneHeight = rect.height - rsiPaneHeight - 24;
    const rightMargin = 70;
    const plotWidth = rect.width - rightMargin;

    if (x < 0 || x > plotWidth) {
      setHoverData(null);
      return;
    }

    const candleSlotWidth = plotWidth / candles.length;
    const candleIdx = Math.floor(x / candleSlotWidth);
    const candle = candles[candleIdx] || candles[candles.length - 1];

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });
    const priceRange = maxPrice - minPrice || 0.001;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    const price = paddedMax - (y / pricePaneHeight) * paddedRange;

    setHoverData({
      x,
      y,
      candle,
      price: y < pricePaneHeight ? price : undefined
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Trade Execution Handlers
  const handleQuickOrder = (type: 'BUY' | 'SELL') => {
    const execPrice = type === 'BUY' ? instrument.ask : instrument.bid;
    const pipMultiplier = instrument.pipSize;
    const sl = slPips > 0 ? (type === 'BUY' ? execPrice - slPips * pipMultiplier : execPrice + slPips * pipMultiplier) : undefined;
    const tp = tpPips > 0 ? (type === 'BUY' ? execPrice + tpPips * pipMultiplier : execPrice - tpPips * pipMultiplier) : undefined;

    onExecuteTrade({
      symbol: instrument.symbol,
      type,
      lots: tradeLots,
      price: execPrice,
      stopLoss: sl,
      takeProfit: tp
    });

    setExecutionMessage(`Filled: ${type} ${tradeLots} lots ${instrument.symbol} @ ${execPrice.toFixed(instrument.digits)}`);
    setTimeout(() => setExecutionMessage(null), 4000);
  };

  return (
    <div id="market-terminal-container" ref={containerRef} className="bg-navy-900 rounded-2xl border border-navy-700/90 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Terminal Bar */}
      <div className="bg-navy-950 border-b border-navy-700/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Instrument Title & Live Quote */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">{instrument.symbol}</span>
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">{instrument.name}</span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-sm pl-2.5 border-l border-navy-700/80">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">Bid</span>
              <span className="text-white font-bold">{instrument.bid.toFixed(instrument.digits)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">Ask</span>
              <span className="text-amber-300 font-bold">{instrument.ask.toFixed(instrument.digits)}</span>
            </div>
            <span className="text-[11px] bg-navy-900 text-amber-300/90 px-2 py-0.5 rounded font-mono border border-navy-700/80">
              Low Spread
            </span>
          </div>
        </div>

        {/* Timeframe & Indicator Controls */}
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-navy-950 p-0.5 rounded-lg border border-navy-700/80 text-xs font-semibold">
            {(['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                id={`tf-${tf}`}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded transition-all duration-150 cursor-pointer ${
                  timeframe === tf
                    ? 'bg-gold-metallic text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-navy-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style */}
          <div className="flex items-center bg-navy-950 p-0.5 rounded-lg border border-navy-700/80 text-xs">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2 py-1 rounded transition-all duration-150 cursor-pointer ${
                chartType === 'candlestick' ? 'bg-navy-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Candlestick Chart"
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-1 rounded transition-all duration-150 cursor-pointer ${
                chartType === 'line' ? 'bg-navy-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Line Chart"
            >
              Line
            </button>
            <button
              onClick={() => setChartType('mountain')}
              className={`px-2 py-1 rounded transition-all duration-150 cursor-pointer ${
                chartType === 'mountain' ? 'bg-navy-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mountain Chart"
            >
              Area
            </button>
          </div>

          {/* Indicator toggles dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className="px-2.5 py-1.5 rounded-lg bg-navy-950 hover:bg-navy-850 border border-navy-700/80 text-xs text-slate-300 flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Indicators</span>
            </button>

            {showIndicatorMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-navy-950 border border-navy-700/90 rounded-xl p-2 shadow-2xl z-40 text-xs space-y-1 backdrop-blur-md">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Overlays</div>
                <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-navy-900 cursor-pointer text-slate-200">
                  <span>MA 20 (Trend)</span>
                  <input
                    type="checkbox"
                    checked={indicators.ma20}
                    onChange={(e) => setIndicators({ ...indicators, ma20: e.target.checked })}
                    className="accent-amber-400 rounded"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-navy-900 cursor-pointer text-slate-200">
                  <span>MA 50 (Macro)</span>
                  <input
                    type="checkbox"
                    checked={indicators.ma50}
                    onChange={(e) => setIndicators({ ...indicators, ma50: e.target.checked })}
                    className="accent-amber-500 rounded"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-navy-900 cursor-pointer text-slate-200">
                  <span>Bollinger Bands (20,2)</span>
                  <input
                    type="checkbox"
                    checked={indicators.bollinger}
                    onChange={(e) => setIndicators({ ...indicators, bollinger: e.target.checked })}
                    className="accent-cyan-400 rounded"
                  />
                </label>
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 pt-2 border-t border-navy-800">
                  Sub-Panes
                </div>
                <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-navy-900 cursor-pointer text-slate-200">
                  <span>RSI (14) Oscillator</span>
                  <input
                    type="checkbox"
                    checked={indicators.rsi}
                    onChange={(e) => setIndicators({ ...indicators, rsi: e.target.checked })}
                    className="accent-purple-400 rounded"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-navy-900 cursor-pointer text-slate-200">
                  <span>Volume Bars</span>
                  <input
                    type="checkbox"
                    checked={indicators.volume}
                    onChange={(e) => setIndicators({ ...indicators, volume: e.target.checked })}
                    className="accent-emerald-400 rounded"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Confirmation Toast */}
      {executionMessage && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">{executionMessage}</span>
        </div>
      )}

      {/* Candlestick Canvas & Crosshair HUD */}
      <div className="relative w-full h-[420px] sm:h-[480px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Floating Top HUD for Candle Details */}
        {hoverData?.candle && (
          <div className="absolute top-3 left-3 bg-navy-950/90 backdrop-blur-md border border-navy-700/80 px-3 py-1.5 rounded-lg text-[11px] font-mono flex flex-wrap items-center gap-3 text-slate-300 pointer-events-none shadow-lg">
            <div>
              <span className="text-slate-400">O:</span> {hoverData.candle.open.toFixed(instrument.digits)}
            </div>
            <div>
              <span className="text-slate-400">H:</span> {hoverData.candle.high.toFixed(instrument.digits)}
            </div>
            <div>
              <span className="text-slate-400">L:</span> {hoverData.candle.low.toFixed(instrument.digits)}
            </div>
            <div>
              <span className="text-slate-400">C:</span>{' '}
              <span className={hoverData.candle.close >= hoverData.candle.open ? 'text-emerald-400' : 'text-rose-400'}>
                {hoverData.candle.close.toFixed(instrument.digits)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Vol:</span> {hoverData.candle.volume}
            </div>
          </div>
        )}
      </div>

      {/* Direct Quick Execution Trade Ribbon */}
      <div className="bg-navy-950 border-t border-navy-700/90 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Sell Button */}
          <div className="md:col-span-4">
            <button
              id="terminal-quick-sell-btn"
              onClick={() => handleQuickOrder('SELL')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold transition-all duration-150 shadow-lg shadow-rose-950/40 hover:shadow-rose-600/20 flex items-center justify-between group cursor-pointer active:scale-[0.99]"
            >
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider font-extrabold text-rose-200">SELL MARKET</div>
                <div className="text-[11px] text-rose-300/80">Bid Liquidity</div>
              </div>
              <div className="text-right font-mono">
                <div className="text-lg font-extrabold">{instrument.bid.toFixed(instrument.digits)}</div>
                <div className="text-[10px] text-rose-200">Execute Instant</div>
              </div>
            </button>
          </div>

          {/* Lot Size & Risk Parameters */}
          <div className="md:col-span-4 flex items-center justify-center gap-3">
            <div className="text-center w-full">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                Volume / Lots
              </label>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={() => setTradeLots(Math.max(0.01, +(tradeLots - 0.05).toFixed(2)))}
                  className="px-2.5 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-navy-700/60 active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="50"
                  value={tradeLots}
                  onChange={(e) => setTradeLots(parseFloat(e.target.value) || 0.01)}
                  className="w-20 bg-navy-900 border border-navy-700 rounded-lg py-1.5 text-center font-mono font-bold text-sm text-white focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={() => setTradeLots(+(tradeLots + 0.05).toFixed(2))}
                  className="px-2.5 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-navy-700/60 active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Contract: {(tradeLots * instrument.contractSize).toLocaleString()} {instrument.baseCurrency}
              </div>
            </div>

            <div className="text-center w-full">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                SL / TP (Pips)
              </label>
              <div className="flex items-center gap-1 justify-center">
                <div className="text-left">
                  <span className="text-[9px] text-rose-400 block font-bold">SL</span>
                  <input
                    type="number"
                    value={slPips}
                    onChange={(e) => setSlPips(parseInt(e.target.value) || 0)}
                    className="w-14 bg-navy-900 border border-navy-700 rounded py-1 px-1 text-center font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-emerald-400 block font-bold">TP</span>
                  <input
                    type="number"
                    value={tpPips}
                    onChange={(e) => setTpPips(parseInt(e.target.value) || 0)}
                    className="w-14 bg-navy-900 border border-navy-700 rounded py-1 px-1 text-center font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buy Button */}
          <div className="md:col-span-4">
            <button
              id="terminal-quick-buy-btn"
              onClick={() => handleQuickOrder('BUY')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold transition-all duration-150 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-600/20 flex items-center justify-between group cursor-pointer active:scale-[0.99]"
            >
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-200">BUY MARKET</div>
                <div className="text-[11px] text-emerald-300/80">Ask Liquidity</div>
              </div>
              <div className="text-right font-mono">
                <div className="text-lg font-extrabold">{instrument.ask.toFixed(instrument.digits)}</div>
                <div className="text-[10px] text-emerald-200">Execute Instant</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
