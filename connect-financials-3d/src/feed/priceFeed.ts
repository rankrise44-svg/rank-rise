import type { Instrument } from '../types';

/**
 * The seam between the site and wherever prices come from. Today the only
 * implementation is simulated; a real provider implements the same
 * `PriceFeed` contract and is swapped in `feed/market.ts`.
 *
 * Contract (unchanged from the original app):
 *  - every tick carries the complete, already-updated instruments array;
 *  - it lists which instruments moved and in which direction;
 *  - `subscribe` returns a function that stops delivery.
 */
export type Direction = 'up' | 'down';

export interface Tick {
  instruments: Instrument[];
  moved: Record<string, Direction>;
}

export interface PriceFeed {
  subscribe(onTick: (tick: Tick) => void): () => void;
}

/** Random walk. Produces plausible movement, not real prices. */
export function createSimulatedFeed(seed: Instrument[], intervalMs = 900, perTick = 3): PriceFeed {
  return {
    subscribe(onTick) {
      let current = seed;
      const timer = window.setInterval(() => {
        const picks = new Set<number>();
        const n = 1 + Math.floor(Math.random() * perTick);
        while (picks.size < Math.min(n, current.length)) picks.add(Math.floor(Math.random() * current.length));

        const moved: Record<string, Direction> = {};
        current = current.map((inst, i) => {
          if (!picks.has(i)) return inst;
          const up = Math.random() > 0.48;
          const step = inst.pipSize * (0.5 + Math.random() * 1.5) * (up ? 1 : -1);
          const bid = +(inst.bid + step).toFixed(inst.digits);
          const spread = Math.max(0.1, +(inst.spread + (Math.random() * 0.2 - 0.1)).toFixed(1));
          const ask = +(bid + spread * inst.pipSize).toFixed(inst.digits);
          moved[inst.id] = up ? 'up' : 'down';
          return { ...inst, bid, ask, spread, high24h: Math.max(inst.high24h, bid), low24h: Math.min(inst.low24h, bid) };
        });
        onTick({ instruments: current, moved });
      }, intervalMs);
      return () => window.clearInterval(timer);
    },
  };
}
