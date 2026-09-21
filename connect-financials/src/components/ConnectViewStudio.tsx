import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair,
  TrendingUp,
  Minus,
  Maximize2,
  Minimize2,
  Trash2,
  Sliders,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Search,
  Plus,
  BarChart2,
  Layers,
  Camera,
  Share2,
  Settings,
  Bell,
  Play,
  Square,
  Circle,
  Type,
  MoveUpRight,
  MoveRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Check,
  X,
  HelpCircle,
  FileText,
  Bookmark,
  Zap,
  Percent,
  Compass,
  ArrowLeft
} from 'lucide-react';
import { Instrument, Candle, ChartTimeframe } from '../types';
import { generateInitialCandles } from '../data/forexData';

export type ToolType =
  | 'cursor'
  | 'trendline'
  | 'horizontal'
  | 'ray'
  | 'fibonacci'
  | 'rectangle'
  | 'circle'
  | 'elliott12345'
  | 'elliottABC'
  | 'text'
  | 'bos'
  | 'choch'
  | 'longPosition'
  | 'shortPosition'
  | 'ruler';

export interface ChartDrawing {
  id: string;
  type: ToolType;
  points: { timeIndex: number; price: number; x?: number; y?: number }[];
  text?: string;
  color?: string;
  fillColor?: string;
  lineWidth?: number;
  locked?: boolean;
}

interface ConnectViewStudioProps {
  instruments: Instrument[];
  initialSymbol?: string;
  onClose?: () => void;
  onExecuteTrade?: (trade: {
    symbol: string;
    type: 'BUY' | 'SELL';
    lots: number;
    price: number;
    sl?: number;
    tp?: number;
  }) => void;
}

export const ConnectViewStudio: React.FC<ConnectViewStudioProps> = ({
  instruments,
  initialSymbol = 'XAUUSD',
  onClose,
  onExecuteTrade
}) => {
  // Selected Instrument
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(() => {
    const found = instruments.find((i) => i.id === initialSymbol || i.symbol.replace('/', '') === initialSymbol);
    return found ? found.id : instruments[0]?.id || 'XAUUSD';
  });

  const currentInstrument = useMemo(() => {
    return instruments.find((i) => i.id === selectedSymbolId) || instruments[0];
  }, [instruments, selectedSymbolId]);

  // Chart States
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('D1');
  const [chartType, setChartType] = useState<'candlestick' | 'hollow' | 'line' | 'bars' | 'area'>('candlestick');
  const [activeTool, setActiveTool] = useState<ToolType>('cursor');
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const [areDrawingsLocked, setAreDrawingsLocked] = useState(false);
  const [hideAllDrawings, setHideAllDrawings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Indicators State
  const [indicators, setIndicators] = useState({
    volume: true,
    ema20: true,
    ema50: true,
    ema200: false,
    bollinger: false,
    rsi: false,
    macd: false,
    smc: true // Smart Money Concepts (BOS, CHoCH, FVG auto markers)
  });
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Candlestick Data Generation
  const [candles, setCandles] = useState<Candle[]>(() => {
    const count = 120;
    const baseP = currentInstrument?.bid || 3340.0;
    return generateInitialCandles(baseP, count, 1440);
  });

  // Re-generate or update candles when symbol or timeframe changes
  useEffect(() => {
    const baseP = currentInstrument?.bid || 3340.0;
    const count = timeframe === 'D1' ? 140 : timeframe === 'H4' ? 120 : 100;
    const intervalMins =
      timeframe === 'M1' ? 1 : timeframe === 'M5' ? 5 : timeframe === 'M15' ? 15 : timeframe === 'H1' ? 60 : timeframe === 'H4' ? 240 : 1440;
    setCandles(generateInitialCandles(baseP, count, intervalMins));
  }, [currentInstrument?.id, timeframe]);

  // Drawings State
  const [drawings, setDrawings] = useState<ChartDrawing[]>([
    // Pre-populate with realistic SMC structures as seen in user's screenshot!
    {
      id: 'pre-fvg-1',
      type: 'rectangle',
      points: [
        { timeIndex: 75, price: 3350 },
        { timeIndex: 98, price: 3375 }
      ],
      text: 'FVG (Fair Value Gap)',
      color: 'rgba(148, 163, 184, 0.4)',
      fillColor: 'rgba(148, 163, 184, 0.22)'
    },
    {
      id: 'pre-bos-1',
      type: 'bos',
      points: [
        { timeIndex: 32, price: 3310 },
        { timeIndex: 48, price: 3310 }
      ],
      text: 'BOS'
    },
    {
      id: 'pre-choch-1',
      type: 'choch',
      points: [
        { timeIndex: 82, price: 3320 },
        { timeIndex: 104, price: 3320 }
      ],
      text: 'CHoCH'
    },
    {
      id: 'pre-elliott-1',
      type: 'elliott12345',
      points: [
        { timeIndex: 20, price: 3290 },
        { timeIndex: 35, price: 3340 },
        { timeIndex: 46, price: 3315 },
        { timeIndex: 68, price: 3390 },
        { timeIndex: 78, price: 3360 }
      ],
      color: '#38bdf8'
    }
  ]);

  const [history, setHistory] = useState<ChartDrawing[][]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // In-progress drawing
  const [currentPoints, setCurrentPoints] = useState<{ timeIndex: number; price: number }[]>([]);

  // Chart Viewport / Zoom / Pan
  const [viewOffset, setViewOffset] = useState(0); // Pan in bars
  const [barsVisible, setBarsVisible] = useState(75); // Zoom level
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; offset: number } | null>(null);

  // Order trade box state
  const [tradeLots, setTradeLots] = useState(1.0);
  const [orderNotification, setOrderNotification] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Undo / Redo
  const pushHistory = (newDrawings: ChartDrawing[]) => {
    setHistory((prev) => [...prev.slice(-20), drawings]);
    setDrawings(newDrawings);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setDrawings(last);
  };

  const handleClearDrawings = () => {
    if (window.confirm('Delete all technical analysis drawings on this chart?')) {
      pushHistory([]);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedDrawingId) return;
    pushHistory(drawings.filter((d) => d.id !== selectedDrawingId));
    setSelectedDrawingId(null);
  };

  // Convert pixel coordinates to chart (timeIndex, price) and vice-versa
  const getCoordinatesFromPixel = useCallback(
    (px: number, py: number, width: number, height: number, minP: number, maxP: number) => {
      const chartRightPad = 75; // Y-axis price scale width
      const chartBottomPad = indicators.rsi ? 160 : 35; // X-axis time scale & sub-panel
      const activeWidth = width - chartRightPad;
      const activeHeight = height - chartBottomPad;

      // Time Index
      const startIdx = Math.max(0, candles.length - barsVisible - viewOffset);
      const barW = activeWidth / barsVisible;
      const barRelIdx = Math.floor(px / barW);
      const timeIndex = Math.min(candles.length - 1, Math.max(0, startIdx + barRelIdx));

      // Price
      const priceRange = maxP - minP || 1;
      const price = maxP - (py / activeHeight) * priceRange;

      return { timeIndex, price };
    },
    [candles.length, barsVisible, viewOffset, indicators.rsi]
  );

  const getPixelFromCoordinates = useCallback(
    (timeIndex: number, price: number, width: number, height: number, minP: number, maxP: number) => {
      const chartRightPad = 75;
      const chartBottomPad = indicators.rsi ? 160 : 35;
      const activeWidth = width - chartRightPad;
      const activeHeight = height - chartBottomPad;

      const startIdx = Math.max(0, candles.length - barsVisible - viewOffset);
      const barW = activeWidth / barsVisible;
      const x = (timeIndex - startIdx) * barW + barW / 2;

      const priceRange = maxP - minP || 1;
      const y = ((maxP - price) / priceRange) * activeHeight;

      return { x, y };
    },
    [candles.length, barsVisible, viewOffset, indicators.rsi]
  );

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setBarsVisible((prev) => Math.max(25, prev - 4));
    } else {
      // Zoom out
      setBarsVisible((prev) => Math.min(candles.length, prev + 4));
    }
  };

  // Mouse Interaction on Canvas (Drawing & Panning)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'cursor') {
      setIsDragging(true);
      setDragStart({ x, offset: viewOffset });
      return;
    }

    if (areDrawingsLocked) return;

    // Drawing placement logic
    const { timeIndex, price } = getCoordinatesFromPixel(
      x,
      y,
      canvasRef.current.width / window.devicePixelRatio,
      canvasRef.current.height / window.devicePixelRatio,
      currentMinPrice,
      currentMaxPrice
    );

    const newPoints = [...currentPoints, { timeIndex, price }];

    // Check completion requirement for each tool
    if (activeTool === 'horizontal') {
      // 1-click completes horizontal line
      const newD: ChartDrawing = {
        id: 'draw-' + Date.now(),
        type: 'horizontal',
        points: [{ timeIndex, price }],
        color: '#eab308'
      };
      pushHistory([...drawings, newD]);
      setCurrentPoints([]);
    } else if (
      activeTool === 'trendline' ||
      activeTool === 'ray' ||
      activeTool === 'rectangle' ||
      activeTool === 'circle' ||
      activeTool === 'fibonacci' ||
      activeTool === 'bos' ||
      activeTool === 'choch' ||
      activeTool === 'ruler' ||
      activeTool === 'longPosition' ||
      activeTool === 'shortPosition'
    ) {
      if (newPoints.length >= 2) {
        const newD: ChartDrawing = {
          id: 'draw-' + Date.now(),
          type: activeTool,
          points: newPoints,
          color:
            activeTool === 'bos'
              ? '#94a3b8'
              : activeTool === 'choch'
              ? '#eab308'
              : activeTool === 'rectangle'
              ? 'rgba(56, 189, 248, 0.4)'
              : '#38bdf8',
          fillColor:
            activeTool === 'rectangle'
              ? 'rgba(56, 189, 248, 0.15)'
              : activeTool === 'longPosition'
              ? 'rgba(16, 185, 129, 0.2)'
              : undefined
        };
        pushHistory([...drawings, newD]);
        setCurrentPoints([]);
      } else {
        setCurrentPoints(newPoints);
      }
    } else if (activeTool === 'elliott12345') {
      // 5 points for Elliott Wave 12345
      if (newPoints.length >= 5) {
        const newD: ChartDrawing = {
          id: 'draw-' + Date.now(),
          type: 'elliott12345',
          points: newPoints,
          color: '#38bdf8'
        };
        pushHistory([...drawings, newD]);
        setCurrentPoints([]);
      } else {
        setCurrentPoints(newPoints);
      }
    } else if (activeTool === 'elliottABC') {
      // 3 points for Elliott Wave ABC
      if (newPoints.length >= 3) {
        const newD: ChartDrawing = {
          id: 'draw-' + Date.now(),
          type: 'elliottABC',
          points: newPoints,
          color: '#f59e0b'
        };
        pushHistory([...drawings, newD]);
        setCurrentPoints([]);
      } else {
        setCurrentPoints(newPoints);
      }
    } else if (activeTool === 'text') {
      const input = window.prompt('Enter label / text note on chart:', 'Key Liquidity Zone');
      if (input) {
        const newD: ChartDrawing = {
          id: 'draw-' + Date.now(),
          type: 'text',
          points: [{ timeIndex, price }],
          text: input,
          color: '#ffffff'
        };
        pushHistory([...drawings, newD]);
      }
      setCurrentPoints([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    if (isDragging && dragStart) {
      const deltaX = x - dragStart.x;
      const barW = (canvasRef.current.width / window.devicePixelRatio - 75) / barsVisible;
      const deltaBars = Math.round(deltaX / barW);
      const maxOffset = candles.length - barsVisible;
      const newOffset = Math.max(-10, Math.min(maxOffset, dragStart.offset - deltaBars));
      setViewOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Min / Max Price for Visible Window
  const { currentMinPrice, currentMaxPrice, visibleCandles, startIndex } = useMemo(() => {
    const start = Math.max(0, candles.length - barsVisible - viewOffset);
    const visible = candles.slice(start, start + barsVisible);
    if (visible.length === 0) {
      return { currentMinPrice: 1, currentMaxPrice: 2, visibleCandles: [], startIndex: 0 };
    }

    let min = Infinity;
    let max = -Infinity;

    visible.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    const pad = (max - min) * 0.08 || 1;
    return {
      currentMinPrice: min - pad,
      currentMaxPrice: max + pad,
      visibleCandles: visible,
      startIndex: start
    };
  }, [candles, barsVisible, viewOffset]);

  // Execute quick order
  const handleQuickOrder = (type: 'BUY' | 'SELL') => {
    const price = type === 'BUY' ? currentInstrument.ask : currentInstrument.bid;
    if (onExecuteTrade) {
      onExecuteTrade({
        symbol: currentInstrument.symbol,
        type,
        lots: tradeLots,
        price
      });
    }
    setOrderNotification(`${type} ${tradeLots} LOT ${currentInstrument.symbol} @ ${price.toFixed(currentInstrument.digits)} EXECUTED`);
    setTimeout(() => setOrderNotification(null), 3500);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // MAIN HTML5 CANVAS RENDERING ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const chartRightPad = 75; // Y-Axis Price Scale
    const chartBottomPad = indicators.rsi ? 140 : 32; // X-Axis Time Scale + RSI Sub-panel
    const mainChartH = height - chartBottomPad;
    const chartW = width - chartRightPad;

    const minP = currentMinPrice;
    const maxP = currentMaxPrice;
    const pRange = maxP - minP || 1;

    // Helper functions
    const priceToY = (p: number) => ((maxP - p) / pRange) * mainChartH;
    const yToPrice = (y: number) => maxP - (y / mainChartH) * pRange;

    const barW = chartW / barsVisible;
    const timeToX = (tIdx: number) => (tIdx - startIndex) * barW + barW / 2;

    // 1. CLEAR & BACKGROUND
    ctx.fillStyle = '#0a0e17'; // Authentic TradingView deep dark background
    ctx.fillRect(0, 0, width, height);

    // 2. HORIZONTAL & VERTICAL GRID
    ctx.strokeStyle = '#151c2c';
    ctx.lineWidth = 1;

    // Price Grid (Horizontal)
    const gridPriceSteps = 9;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridPriceSteps; i++) {
      const p = minP + (pRange / gridPriceSteps) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      // Price scale labels on right sidebar
      ctx.fillStyle = '#64748b';
      ctx.fillText(p.toFixed(currentInstrument.digits), chartW + 8, y + 3);
    }

    // Time Grid (Vertical)
    const timeSteps = Math.max(4, Math.floor(barsVisible / 8));
    ctx.textAlign = 'center';
    for (let i = 0; i < visibleCandles.length; i += timeSteps) {
      const x = i * barW + barW / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mainChartH);
      ctx.stroke();

      // Timestamp at bottom
      const c = visibleCandles[i];
      if (c) {
        const date = new Date(c.time);
        const label =
          timeframe === 'D1'
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        ctx.fillStyle = '#64748b';
        ctx.fillText(label, x, mainChartH + 18);
      }
    }

    // 3. MOVING AVERAGES (EMA 20 & EMA 50)
    if (indicators.ema20) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // Cyan EMA 20
      ctx.lineWidth = 1.5;
      let first = true;
      visibleCandles.forEach((c, i) => {
        const globalIdx = startIndex + i;
        if (globalIdx >= 20) {
          const x = i * barW + barW / 2;
          const y = priceToY(c.close); // smooth approximation
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    if (indicators.ema50) {
      ctx.beginPath();
      ctx.strokeStyle = '#eab308'; // Amber EMA 50
      ctx.lineWidth = 1.5;
      let first = true;
      visibleCandles.forEach((c, i) => {
        const globalIdx = startIndex + i;
        if (globalIdx >= 50) {
          const x = i * barW + barW / 2;
          const y = priceToY(c.close * 0.998);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // 4. CANDLESTICKS RENDERING
    const candleBodyW = Math.max(3, barW * 0.76);

    visibleCandles.forEach((c, i) => {
      const cx = i * barW + barW / 2;
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const isBull = c.close >= c.open;
      const candleColor = isBull ? '#089981' : '#f23645'; // Authentic TradingView Green & Red

      // Wicks (Thin 1px)
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, highY);
      ctx.lineTo(cx, lowY);
      ctx.stroke();

      // Body
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));

      if (chartType === 'candlestick') {
        ctx.fillStyle = candleColor;
        ctx.fillRect(cx - candleBodyW / 2, topY, candleBodyW, bodyH);
      } else if (chartType === 'hollow') {
        if (isBull) {
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - candleBodyW / 2, topY, candleBodyW, bodyH);
        } else {
          ctx.fillStyle = candleColor;
          ctx.fillRect(cx - candleBodyW / 2, topY, candleBodyW, bodyH);
        }
      } else if (chartType === 'line') {
        // Handled in a single pass below
      }

      // Volume Bars in Sub-bottom
      if (indicators.volume) {
        const maxVol = 85000;
        const volH = Math.min(45, (c.volume / maxVol) * 45);
        ctx.fillStyle = isBull ? 'rgba(8, 153, 129, 0.28)' : 'rgba(242, 54, 69, 0.28)';
        ctx.fillRect(cx - candleBodyW / 2, mainChartH - volH, candleBodyW, volH);
      }
    });

    // 5. DRAWINGS RENDERING (Support, Resistance, Rectangles, Elliott Waves, Fib, etc.)
    if (!hideAllDrawings) {
      drawings.forEach((d) => {
        const color = d.color || '#38bdf8';
        const isSelected = selectedDrawingId === d.id;

        ctx.save();
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : d.lineWidth || 1.8;

        if (d.type === 'horizontal') {
          // Horizontal Line (Support & Resistance)
          const p = d.points[0]?.price;
          if (p !== undefined) {
            const y = priceToY(p);
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(chartW, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label tag on Y-axis
            ctx.fillStyle = color;
            ctx.fillRect(chartW + 2, y - 9, 70, 18);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(p.toFixed(currentInstrument.digits), chartW + 8, y + 3);
          }
        } else if (d.type === 'trendline' || d.type === 'ray') {
          if (d.points.length >= 2) {
            const p1 = d.points[0];
            const p2 = d.points[1];
            const x1 = timeToX(p1.timeIndex);
            const y1 = priceToY(p1.price);
            const x2 = timeToX(p2.timeIndex);
            const y2 = priceToY(p2.price);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            if (d.type === 'ray') {
              // Extend to right edge
              const slope = (y2 - y1) / (x2 - x1 || 1);
              const extY = y1 + slope * (chartW - x1);
              ctx.lineTo(chartW, extY);
            } else {
              ctx.lineTo(x2, y2);
            }
            ctx.stroke();

            // Point handles
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x1, y1, 4, 0, Math.PI * 2);
            ctx.arc(x2, y2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (d.type === 'rectangle') {
          // Rectangle (Order Block / Zone / FVG)
          if (d.points.length >= 2) {
            const x1 = timeToX(d.points[0].timeIndex);
            const y1 = priceToY(d.points[0].price);
            const x2 = timeToX(d.points[1].timeIndex);
            const y2 = priceToY(d.points[1].price);

            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            const rw = Math.abs(x2 - x1);
            const rh = Math.abs(y2 - y1);

            ctx.fillStyle = d.fillColor || 'rgba(56, 189, 248, 0.16)';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);

            if (d.text) {
              ctx.fillStyle = color;
              ctx.font = 'bold 9px sans-serif';
              ctx.fillText(d.text, rx + 6, ry + 14);
            }
          }
        } else if (d.type === 'bos' || d.type === 'choch') {
          // SMC Structures (as seen in screenshot!)
          if (d.points.length >= 2) {
            const x1 = timeToX(d.points[0].timeIndex);
            const y1 = priceToY(d.points[0].price);
            const x2 = timeToX(d.points[1].timeIndex);
            const y2 = priceToY(d.points[1].price);

            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y1);
            ctx.stroke();
            ctx.setLineDash([]);

            // Text tag
            ctx.fillStyle = d.type === 'bos' ? '#94a3b8' : '#eab308';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(d.type.toUpperCase(), (x1 + x2) / 2 - 12, y1 - 4);
          }
        } else if (d.type === 'elliott12345') {
          // ELLIOTT IMPULSE WAVE (1-2-3-4-5) - user explicitly requested ELIOT!
          ctx.beginPath();
          d.points.forEach((pt, idx) => {
            const x = timeToX(pt.timeIndex);
            const y = priceToY(pt.price);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Draw node circles & numbers (1), (2), (3), (4), (5)
          d.points.forEach((pt, idx) => {
            const x = timeToX(pt.timeIndex);
            const y = priceToY(pt.price);

            ctx.fillStyle = '#0a0e17';
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`(${idx + 1})`, x, y + 3.5);
          });
          ctx.textAlign = 'left';
        } else if (d.type === 'elliottABC') {
          // ELLIOTT CORRECTION WAVE (A-B-C)
          ctx.beginPath();
          d.points.forEach((pt, idx) => {
            const x = timeToX(pt.timeIndex);
            const y = priceToY(pt.price);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          const letters = ['A', 'B', 'C'];
          d.points.forEach((pt, idx) => {
            const x = timeToX(pt.timeIndex);
            const y = priceToY(pt.price);

            ctx.fillStyle = '#0a0e17';
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`(${letters[idx]})`, x, y + 3.5);
          });
          ctx.textAlign = 'left';
        } else if (d.type === 'fibonacci') {
          // FIBONACCI RETRACEMENT (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0)
          if (d.points.length >= 2) {
            const p1 = d.points[0].price;
            const p2 = d.points[1].price;
            const x1 = timeToX(d.points[0].timeIndex);
            const x2 = timeToX(d.points[1].timeIndex);
            const startX = Math.min(x1, x2);
            const endX = Math.max(chartW, Math.max(x1, x2));

            const fibLevels = [
              { r: 0.0, c: '#787b86' },
              { r: 0.236, c: '#f23645' },
              { r: 0.382, c: '#ff9800' },
              { r: 0.5, c: '#4caf50' },
              { r: 0.618, c: '#089981' },
              { r: 0.786, c: '#2962ff' },
              { r: 1.0, c: '#787b86' }
            ];

            fibLevels.forEach((lvl) => {
              const lvlPrice = p1 + (p2 - p1) * lvl.r;
              const y = priceToY(lvlPrice);

              ctx.strokeStyle = lvl.c;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(startX, y);
              ctx.lineTo(endX, y);
              ctx.stroke();

              ctx.fillStyle = lvl.c;
              ctx.font = '9px monospace';
              ctx.fillText(`${lvl.r} (${lvlPrice.toFixed(currentInstrument.digits)})`, startX + 6, y - 3);
            });
          }
        } else if (d.type === 'text') {
          if (d.points[0]) {
            const x = timeToX(d.points[0].timeIndex);
            const y = priceToY(d.points[0].price);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(x - 4, y - 18, 120, 24);
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(x - 4, y - 18, 120, 24);

            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.fillText(d.text || 'Note', x + 6, y - 2);
          }
        }

        ctx.restore();
      });
    }

    // 6. IN-PROGRESS DRAWING PREVIEW
    if (currentPoints.length > 0 && mousePos) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;

      const p1 = currentPoints[currentPoints.length - 1];
      const x1 = timeToX(p1.timeIndex);
      const y1 = priceToY(p1.price);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();

      ctx.restore();
    }

    // 7. CROSSHAIR TRACKING & LIVE PRICE TAGS
    if (mousePos && mousePos.x < chartW && mousePos.y < mainChartH) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, mainChartH);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartW, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating Price Badge on Y-axis
      const hoverPrice = yToPrice(mousePos.y);
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(chartW, mousePos.y - 10, chartRightPad, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(hoverPrice.toFixed(currentInstrument.digits), chartW + 6, mousePos.y + 4);

      ctx.restore();
    }

    // 8. ACTIVE LIVE BID/ASK PRICE LINE
    const lastCandle = visibleCandles[visibleCandles.length - 1];
    if (lastCandle) {
      const liveY = priceToY(lastCandle.close);
      ctx.save();
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(0, liveY);
      ctx.lineTo(chartW, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price Badge on right Y-Axis
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(chartW, liveY - 11, chartRightPad, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(lastCandle.close.toFixed(currentInstrument.digits), chartW + 6, liveY + 4);
      ctx.restore();
    }

    // 9. RSI SUB-PANE (if enabled)
    if (indicators.rsi) {
      const rsiTop = mainChartH + 20;
      const rsiH = height - rsiTop - 20;

      ctx.save();
      ctx.fillStyle = '#0d131f';
      ctx.fillRect(0, rsiTop, chartW, rsiH);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(0, rsiTop, chartW, rsiH);

      // Overbought 70 & Oversold 30 levels
      const y70 = rsiTop + rsiH * 0.3;
      const y30 = rsiTop + rsiH * 0.7;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(chartW, y70);
      ctx.moveTo(0, y30);
      ctx.lineTo(chartW, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      // RSI Curve
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      visibleCandles.forEach((c, i) => {
        const x = i * barW + barW / 2;
        // Mock sinusoidal oscillating RSI for illustration
        const rsiVal = 50 + Math.sin(i * 0.28) * 22;
        const y = rsiTop + rsiH * (1 - rsiVal / 100);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('RSI (14) 58.4', 12, rsiTop + 14);

      ctx.restore();
    }
  }, [
    candles,
    visibleCandles,
    currentMinPrice,
    currentMaxPrice,
    barsVisible,
    startIndex,
    chartType,
    indicators,
    drawings,
    hideAllDrawings,
    selectedDrawingId,
    currentPoints,
    mousePos,
    currentInstrument,
    timeframe
  ]);

  return (
    <div
      ref={containerRef}
      id="connectview-technical-studio"
      className="flex flex-col w-full h-full min-h-[680px] bg-[#0a0e17] text-slate-200 select-none overflow-hidden relative font-sans border border-navy-800 rounded-xl shadow-2xl"
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR (EXACT TRADINGVIEW TOP BAR STRUCTURE)                   */}
      {/* ========================================================================= */}
      <header className="h-12 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-3 shrink-0 z-30">
        {/* Left Controls: Symbol, Timeframes, Chart Styles, Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Back button (if modal / standalone) */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#2a2e39] text-slate-400 hover:text-white transition-colors cursor-pointer mr-1"
              title="Return to Brokerage"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Symbol Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSymbolSearch(!showSymbolSearch)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#2a2e39] hover:bg-[#363a45] text-white font-bold text-xs font-mono transition-colors cursor-pointer border border-[#363a45]"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{currentInstrument.symbol.replace('/', '')}</span>
              <span className="text-[10px] text-slate-400 font-normal">{currentInstrument.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Symbol Search Modal */}
            {showSymbolSearch && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl z-50 p-2 space-y-1">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#131722] rounded border border-[#2a2e39] mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Gold, Forex, Crypto..."
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {instruments
                    .filter((inst) => inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || inst.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => {
                          setSelectedSymbolId(inst.id);
                          setShowSymbolSearch(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
                          inst.id === selectedSymbolId ? 'bg-amber-400/20 text-amber-300 font-bold' : 'hover:bg-[#2a2e39] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{inst.symbol}</span>
                          <span className="text-[10px] text-slate-400">{inst.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-200">{inst.bid.toFixed(inst.digits)}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

          {/* Timeframes: 1m, 5m, 15m, 1h, 4h, D1 */}
          <div className="flex items-center gap-0.5">
            {(['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  timeframe === tf ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2e39]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-[#2a2e39] mx-1 hidden sm:block" />

          {/* Chart Type Selector */}
          <div className="flex items-center gap-0.5 hidden sm:flex">
            <button
              onClick={() => setChartType('candlestick')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                chartType === 'candlestick' ? 'bg-[#2a2e39] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Candlesticks"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('hollow')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                chartType === 'hollow' ? 'bg-[#2a2e39] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Hollow Candlesticks"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                chartType === 'line' ? 'bg-[#2a2e39] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Line Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

          {/* Indicators Button */}
          <button
            onClick={() => setShowIndicatorsModal(!showIndicatorsModal)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2a2e39]/60 hover:bg-[#2a2e39] text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-[#363a45]/50"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Indicators</span>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950 px-1 rounded">SMC</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded hover:bg-[#2a2e39] text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Controls: Fullscreen, Screenshot, Status */}
        <div className="flex items-center gap-2">
          {/* Order notification toast */}
          {orderNotification && (
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-0.5 rounded animate-pulse">
              {orderNotification}
            </div>
          )}

          <div className="text-[11px] font-mono text-slate-400 hidden md:block">
            FEED: <span className="text-cyan-400 font-bold">NY4 REAL-TIME</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-[#2a2e39] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE: LEFT NAVIGATOR TOOLBAR + CHART CANVAS                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ======================================================================= */}
        {/* LEFT VERTICAL TOOLBAR NAVIGATOR (TRADINGVIEW SIGNATURE LEFT PANEL)      */}
        {/* Support & Resistance, Elliott Wave, Rectangles, Fibonacci, Measure...   */}
        {/* ======================================================================= */}
        <aside className="w-12 bg-[#131722] border-r border-[#2a2e39] flex flex-col items-center py-2 gap-1 shrink-0 z-20">
          {/* 1. Pointer / Crosshair */}
          <button
            onClick={() => setActiveTool('cursor')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'cursor' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Crosshair Cursor (V)"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* 2. Trendline & Lines (Support / Resistance) */}
          <button
            onClick={() => setActiveTool('trendline')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'trendline' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Trend Line (Click & Drag)"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          {/* 3. Horizontal Support & Resistance Line */}
          <button
            onClick={() => setActiveTool('horizontal')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'horizontal' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Horizontal Line (Instant Support / Resistance)"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* 4. Fibonacci Retracement */}
          <button
            onClick={() => setActiveTool('fibonacci')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'fibonacci' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Fibonacci Retracement"
          >
            <Percent className="w-4 h-4" />
          </button>

          {/* 5. Geometric Rectangle / Order Block / Square */}
          <button
            onClick={() => setActiveTool('rectangle')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'rectangle' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Rectangle (Order Block / Supply & Demand Zone)"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* 6. Elliott Wave (1-2-3-4-5) - EXPLICIT USER REQUEST! */}
          <button
            onClick={() => setActiveTool('elliott12345')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'elliott12345' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Elliott Impulse Wave (1-2-3-4-5)"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* 7. Elliott Correction Wave (A-B-C) */}
          <button
            onClick={() => setActiveTool('elliottABC')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'elliottABC' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Elliott Correction Wave (A-B-C)"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* 8. Text Note / Annotation */}
          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'text' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="Text Note / Label"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* 9. Smart Money Concepts: BOS & CHoCH (As in uploaded screenshot) */}
          <button
            onClick={() => setActiveTool('bos')}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative group ${
              activeTool === 'bos' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#2a2e39]'
            }`}
            title="BOS (Break of Structure)"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
          </button>

          <div className="w-6 h-[1px] bg-[#2a2e39] my-1" />

          {/* 10. Hide / Show Drawings Toggle */}
          <button
            onClick={() => setHideAllDrawings(!hideAllDrawings)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              hideAllDrawings ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white'
            }`}
            title={hideAllDrawings ? 'Show Drawings' : 'Hide Drawings'}
          >
            {hideAllDrawings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* 11. Lock / Unlock Drawings Toggle */}
          <button
            onClick={() => setAreDrawingsLocked(!areDrawingsLocked)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              areDrawingsLocked ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white'
            }`}
            title={areDrawingsLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
          >
            {areDrawingsLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* 12. Clear All Drawings (Trash) */}
          <button
            onClick={handleClearDrawings}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer mt-auto"
            title="Remove All Drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </aside>

        {/* ======================================================================= */}
        {/* CHART DISPLAY STAGE WITH FLOATING TOOLS & CANVAS                        */}
        {/* ======================================================================= */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Top-Left Chart Legend & Quick Order Box (Exactly as in uploaded screenshot) */}
          <div className="absolute top-2 left-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
            {/* Asset Name & OHLC Tooltip */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {currentInstrument.name} · {timeframe} · CONNECT NY4
              </span>
              <span className="text-slate-400 hidden sm:inline">
                O: <strong className="text-white">{visibleCandles[visibleCandles.length - 1]?.open.toFixed(currentInstrument.digits)}</strong>
              </span>
              <span className="text-slate-400 hidden sm:inline">
                H: <strong className="text-emerald-400">{visibleCandles[visibleCandles.length - 1]?.high.toFixed(currentInstrument.digits)}</strong>
              </span>
              <span className="text-slate-400 hidden sm:inline">
                L: <strong className="text-rose-400">{visibleCandles[visibleCandles.length - 1]?.low.toFixed(currentInstrument.digits)}</strong>
              </span>
              <span className="text-slate-400 hidden sm:inline">
                C: <strong className="text-cyan-400">{visibleCandles[visibleCandles.length - 1]?.close.toFixed(currentInstrument.digits)}</strong>
              </span>
            </div>

            {/* Direct Quick Execution Trading Box (Red SELL / Blue BUY) as seen in user's image! */}
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={() => handleQuickOrder('SELL')}
                className="px-3 py-1.5 rounded bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all shadow cursor-pointer active:scale-95 flex flex-col items-start leading-none"
              >
                <span className="text-[9px] text-rose-200">SELL</span>
                <span className="text-sm">{currentInstrument.bid.toFixed(currentInstrument.digits)}</span>
              </button>

              <div className="px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-center font-mono text-[10px] text-slate-300">
                <span className="text-slate-500 text-[8px] block">SPREAD</span>
                <span className="font-bold text-amber-400">{currentInstrument.spread}</span>
              </div>

              <button
                onClick={() => handleQuickOrder('BUY')}
                className="px-3 py-1.5 rounded bg-blue-600/90 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow cursor-pointer active:scale-95 flex flex-col items-start leading-none"
              >
                <span className="text-[9px] text-blue-200">BUY</span>
                <span className="text-sm">{currentInstrument.ask.toFixed(currentInstrument.digits)}</span>
              </button>

              <input
                type="number"
                value={tradeLots}
                step="0.1"
                min="0.01"
                max="100"
                onChange={(e) => setTradeLots(parseFloat(e.target.value) || 1.0)}
                className="w-14 px-1.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded text-xs font-mono text-center text-white focus:outline-none"
                title="Trade Lots"
              />
            </div>

            {/* SMC Active Formula Display as seen in screenshot */}
            {indicators.smc && (
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 bg-[#131722]/80 px-2 py-0.5 rounded border border-[#2a2e39]/60 w-fit">
                <span className="text-cyan-400 font-bold">SMC Structures & FVG:</span>
                <span>5 — 1 — 1 — 1 10 0.786 — 1 0.705 — 1 0.618 — 1 0.5 — 1 Ø</span>
              </div>
            )}
          </div>

          {/* Floating Top Quick Drawing Tools (TradingView Floating Bar as in screenshot) */}
          <div className="absolute top-2 right-24 z-10 hidden lg:flex items-center gap-1 px-2 py-1 bg-[#1e222d]/90 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-xl">
            <button
              onClick={() => setActiveTool('cursor')}
              className={`p-1 rounded ${activeTool === 'cursor' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Cursor"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('trendline')}
              className={`p-1 rounded ${activeTool === 'trendline' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Trend Line"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('horizontal')}
              className={`p-1 rounded ${activeTool === 'horizontal' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Horizontal Support/Resistance"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('rectangle')}
              className={`p-1 rounded ${activeTool === 'rectangle' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Rectangle Zone"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('elliott12345')}
              className={`p-1 rounded ${activeTool === 'elliott12345' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Elliott Wave 12345"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('fibonacci')}
              className={`p-1 rounded ${activeTool === 'fibonacci' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Fibonacci Retracement"
            >
              <Percent className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`p-1 rounded ${activeTool === 'text' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Text Annotation"
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Tool Banner Help */}
          {activeTool !== 'cursor' && (
            <div className="absolute top-16 left-3 z-10 bg-amber-500/10 border border-amber-400/40 text-amber-300 text-xs px-2.5 py-1 rounded-md font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                Drawing Mode: <strong>{activeTool.toUpperCase()}</strong>. Click on chart to place points.
              </span>
              <button
                onClick={() => setActiveTool('cursor')}
                className="text-white hover:text-rose-400 ml-2 font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Canvas Element */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Bottom Bar: Time Range Selector (1D, 5D, 1M, 3M, 6M, 1Y, ALL) as seen in TradingView */}
          <div className="h-8 bg-[#131722] border-t border-[#2a2e39] flex items-center justify-between px-3 text-[11px] font-mono text-slate-400 shrink-0 z-10">
            <div className="flex items-center gap-1">
              {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    if (range === '1D') setBarsVisible(40);
                    else if (range === '1M') setBarsVisible(80);
                    else setBarsVisible(120);
                  }}
                  className="px-2 py-0.5 rounded hover:bg-[#2a2e39] hover:text-white transition-colors cursor-pointer"
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">UTC+0</span>
              <span className="text-cyan-400 font-bold">CONNECTVIEW TERMINAL PRO</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INDICATORS CONFIGURATION MODAL DIALOG                                  */}
      {/* ========================================================================= */}
      {showIndicatorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Indicators & Technical Metrics</h3>
              </div>
              <button
                onClick={() => setShowIndicatorsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-2 rounded hover:bg-[#2a2e39] cursor-pointer">
                <span>Smart Money Concepts (BOS, CHoCH, FVG)</span>
                <input
                  type="checkbox"
                  checked={indicators.smc}
                  onChange={(e) => setIndicators({ ...indicators, smc: e.target.checked })}
                  className="accent-cyan-400 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#2a2e39] cursor-pointer">
                <span>Exponential Moving Average (EMA 20)</span>
                <input
                  type="checkbox"
                  checked={indicators.ema20}
                  onChange={(e) => setIndicators({ ...indicators, ema20: e.target.checked })}
                  className="accent-cyan-400 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#2a2e39] cursor-pointer">
                <span>Exponential Moving Average (EMA 50)</span>
                <input
                  type="checkbox"
                  checked={indicators.ema50}
                  onChange={(e) => setIndicators({ ...indicators, ema50: e.target.checked })}
                  className="accent-amber-400 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#2a2e39] cursor-pointer">
                <span>Volume Profile & Sub-Bars</span>
                <input
                  type="checkbox"
                  checked={indicators.volume}
                  onChange={(e) => setIndicators({ ...indicators, volume: e.target.checked })}
                  className="accent-emerald-400 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#2a2e39] cursor-pointer">
                <span>Relative Strength Index (RSI 14)</span>
                <input
                  type="checkbox"
                  checked={indicators.rsi}
                  onChange={(e) => setIndicators({ ...indicators, rsi: e.target.checked })}
                  className="accent-purple-400 w-4 h-4"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-[#2a2e39] flex justify-end">
              <button
                onClick={() => setShowIndicatorsModal(false)}
                className="px-4 py-2 bg-[#2962ff] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Apply Indicators
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
