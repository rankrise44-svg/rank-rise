import { useId } from 'react';

export function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  const id = useId();
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 30 - ((v - min) / (max - min || 1)) * 26 - 2]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,30 ${line} 100,30`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke="#F5D27A" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
