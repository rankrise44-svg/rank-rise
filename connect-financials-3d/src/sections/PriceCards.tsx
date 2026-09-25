import { formatPrice, shortSymbol, useMarket } from '../feed/market';
import { Flash } from '../ui/Flash';
import { Sparkline } from '../ui/Sparkline';

/**
 * Beat 2. Four live price cards drift in around the opening eagle, each at its
 * own depth: nearer cards are larger, sharper and move faster.
 */
const CARDS = [
  { id: 'EURUSD', pos: 'left-[4%] top-[2%] md:left-[9%] md:top-[22%]', depth: 1 },
  { id: 'XAUUSD', pos: 'right-[4%] top-[12%] md:right-[11%] md:top-[17%]', depth: 0.7 },
  { id: 'BTCUSD', pos: 'left-[4%] bottom-[14%] md:left-[14%] md:bottom-[16%]', depth: 0.8 },
  { id: 'NAS100', pos: 'right-[4%] bottom-[4%] md:right-[8%] md:bottom-[22%]', depth: 1 },
];

export function PriceCards() {
  const { byId, moved, seq, history } = useMarket();
  return (
    <ul className="absolute inset-0" aria-label="Indicative prices">
      {CARDS.map(({ id, pos, depth }) => {
        const i = byId[id];
        const up = i.change24h >= 0;
        return (
          <li
            key={id}
            data-price-card
            data-depth={depth}
            className={`glass invisible absolute w-[40vw] max-w-[260px] rounded-2xl p-3 opacity-0 sm:p-4 ${pos}`}
            style={{ scale: String(0.8 + depth * 0.2), filter: depth < 0.8 ? 'blur(0.6px)' : undefined }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[13px] font-semibold tracking-wide text-ink sm:text-sm">{shortSymbol(i)}</span>
              <span className={`num text-[11px] ${up ? 'text-gold' : 'text-muted'}`}>
                {up ? '▲' : '▼'} {Math.abs(i.change24h).toFixed(2)}%
              </span>
            </div>
            <Flash dir={moved[id]} seq={seq} className="num mt-1 block rounded font-display text-[clamp(1.1rem,2vw,1.6rem)] font-semibold text-ink">
              {formatPrice(i)}
            </Flash>
            <Sparkline data={history[id]} className="mt-2 h-8 w-full sm:h-10" />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-muted">
              <span className="truncate">{i.name}</span>
              <span className="num shrink-0 pl-2">Spr {i.spread.toFixed(1)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
