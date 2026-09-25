import { formatPrice, shortSymbol, useMarket } from '../feed/market';
import { Sparkline } from '../ui/Sparkline';

/** A small live market card used in the flying layers (beats 4 and 8). */
export function ChartCard({ id, label, className = '', style }: { id: string; label?: string; className?: string; style?: React.CSSProperties }) {
  const { byId, history } = useMarket();
  const i = byId[id];
  const up = i.change24h >= 0;
  return (
    <div className={`glass rounded-2xl p-4 ${className}`} style={style}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm font-semibold text-ink">{shortSymbol(i)}</span>
        <span className={`num text-[11px] ${up ? 'text-gold' : 'text-muted'}`}>
          {up ? '▲' : '▼'} {Math.abs(i.change24h).toFixed(2)}%
        </span>
      </div>
      <div className="num mt-1 font-display text-xl font-semibold text-ink">{formatPrice(i)}</div>
      <Sparkline data={history[id]} className="mt-2 h-10 w-full" />
      {label && <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted">{label}</div>}
    </div>
  );
}
