import { formatPrice, shortSymbol, useMarket } from '../feed/market';
import { Flash } from './Flash';

/** Live (simulated) prices across the very top of the page. */
export function TickerBar() {
  const { instruments, moved, seq } = useMarket();
  const row = (dup: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={dup || undefined}>
      {instruments.map((i) => (
        <li key={i.id} className="flex items-baseline gap-2 whitespace-nowrap text-[12px]">
          <span className="font-medium tracking-wide text-muted">{shortSymbol(i)}</span>
          <Flash dir={moved[i.id]} seq={seq} className="num rounded px-0.5 text-ink">
            {formatPrice(i)}
          </Flash>
          <span className={`num ${i.change24h >= 0 ? 'text-gold' : 'text-muted'}`}>
            {i.change24h >= 0 ? '▲' : '▼'} {Math.abs(i.change24h).toFixed(2)}%
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-8 items-center border-b border-gold/15 bg-abyss/85 backdrop-blur-md">
      <span className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-gold/20 bg-abyss px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-hi">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-hi" aria-hidden />
        Indicative
      </span>
      <div className="relative flex-1 overflow-hidden motion-reduce:overflow-x-auto" aria-label="Indicative prices, simulated for this preview" role="region">
        <div className="marquee flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
