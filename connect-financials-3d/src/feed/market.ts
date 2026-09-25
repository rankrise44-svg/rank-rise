import { useSyncExternalStore } from 'react';
import { INITIAL_INSTRUMENTS } from '../data/market';
import type { Instrument } from '../types';
import { createSimulatedFeed, type Direction, type PriceFeed } from './priceFeed';

export interface MarketState {
  instruments: Instrument[];
  byId: Record<string, Instrument>;
  moved: Record<string, Direction>;
  /** Increments every tick, so flash animations can key off it. */
  seq: number;
  /** Rolling bid history per instrument, for sparklines. */
  history: Record<string, number[]>;
}

const HISTORY = 48;

function createMarketStore(feed: PriceFeed, seed: Instrument[]) {
  const history: Record<string, number[]> = {};
  for (const i of seed) {
    // Pre-fill with a short walk so sparklines aren't flat on first paint.
    let p = i.bid;
    const h: number[] = [];
    for (let k = 0; k < HISTORY; k++) {
      p += i.pipSize * (Math.random() - 0.48) * 3;
      h.unshift(+p.toFixed(i.digits));
    }
    h[h.length - 1] = i.bid;
    history[i.id] = h;
  }

  let state: MarketState = {
    instruments: seed,
    byId: Object.fromEntries(seed.map((i) => [i.id, i])),
    moved: {},
    seq: 0,
    history,
  };
  const listeners = new Set<() => void>();
  let stop: (() => void) | null = null;

  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      if (!stop) {
        stop = feed.subscribe(({ instruments, moved }) => {
          const nextHistory = { ...state.history };
          for (const id of Object.keys(moved)) {
            const inst = instruments.find((x) => x.id === id);
            if (inst) nextHistory[id] = [...nextHistory[id].slice(1), inst.bid];
          }
          state = {
            instruments,
            byId: Object.fromEntries(instruments.map((i) => [i.id, i])),
            moved,
            seq: state.seq + 1,
            history: nextHistory,
          };
          listeners.forEach((l) => l());
        });
      }
      return () => {
        listeners.delete(fn);
        if (listeners.size === 0 && stop) {
          stop();
          stop = null;
        }
      };
    },
  };
}

// The one line to change when a real provider is wired in.
export const market = createMarketStore(createSimulatedFeed(INITIAL_INSTRUMENTS), INITIAL_INSTRUMENTS);

export const useMarket = () => useSyncExternalStore(market.subscribe, market.getSnapshot, market.getSnapshot);

export function formatPrice(i: Instrument, v = i.bid) {
  return v.toLocaleString('en-US', { minimumFractionDigits: i.digits, maximumFractionDigits: i.digits });
}

/** "NAS100 (US Tech)" → "NAS100" for tight spaces */
export const shortSymbol = (i: Instrument) => i.symbol.replace(/\s*\(.*\)$/, '');
