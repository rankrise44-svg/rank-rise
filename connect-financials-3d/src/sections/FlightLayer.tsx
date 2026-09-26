import { ChartCard } from './ChartCard';

/**
 * Beat 4 (rotation / flight) and beat 5 (transformation) overlays.
 * Cards fly past in three depth layers; near ones are bigger and faster.
 */
const LAYERS = [
  { depth: 'far', cls: 'w-[34vw] max-w-[180px] opacity-60 blur-[1.5px]', cards: [['GBPUSD', '8%', 'London session'], ['XAGUSD', '70%', 'Metals'], ['GER40', '40%', 'Indices']] },
  { depth: 'mid', cls: 'w-[40vw] max-w-[220px] opacity-85', cards: [['USDJPY', '78%', 'Asia session'], ['ETHUSD', '12%', 'Crypto CFDs'], ['SPX500', '58%', 'US 500']] },
  { depth: 'near', cls: 'w-[46vw] max-w-[270px]', cards: [['XAUUSD', '4%', 'Spot gold'], ['WTI', '66%', 'Energies']] },
] as const;

export function FlightLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden" data-flight aria-hidden>
      {LAYERS.map((l) => (
        <div key={l.depth} data-fly={l.depth} className="invisible absolute inset-x-0 top-full h-[160vh]">
          {l.cards.map(([id, left, label], k) => (
            <ChartCard key={id} id={id} label={label} className={`absolute ${l.cls}`} style={{ left, top: `${k * 52}vh` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FlightWords() {
  return (
    <div data-flight-words className="invisible absolute inset-x-0 bottom-[12vh] flex flex-col items-center gap-1 px-6 text-center opacity-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">Connect Financials</p>
      <p className="font-display text-[clamp(1.8rem,4.2vw,4rem)] font-semibold uppercase leading-[0.95] text-ink">
        <span data-fw className="block">Trade smarter.</span>
        <span data-fw className="block text-gold-hi">Move faster.</span>
        <span data-fw className="block">Go further.</span>
      </p>
    </div>
  );
}

export function TransformWords() {
  return (
    <div data-transform-words className="invisible absolute bottom-[8vh] left-4 right-4 max-w-sm opacity-0 md:bottom-auto md:left-[6vw] md:right-auto md:top-[30vh]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">Vision</p>
      <p className="mt-3 font-display text-[clamp(1.6rem,3vw,2.8rem)] font-semibold uppercase leading-none text-ink">
        Eyes on <span className="text-gold-hi">every market</span>
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Forex, metals, indices, energies and crypto CFDs, priced from multi-bank liquidity and streamed to one account.
      </p>
    </div>
  );
}
