import { useSyncExternalStore } from 'react';
import type { ValgonLine } from './types';

export type ValgonMode = 'idle' | 'listen' | 'speak' | 'work' | 'hear';

interface State {
  mode: ValgonMode;
  status: string;
  lines: ValgonLine[];
  /** Words heard so far while the microphone is on */
  interim: string;
  suggestions: string[];
  dockOpen: boolean;
  muted: boolean;
  /** The browser allows speech only after the visitor has clicked or typed */
  voiceReady: boolean;
}

let state: State = {
  mode: 'idle',
  status: 'Online',
  lines: [],
  interim: '',
  suggestions: [],
  dockOpen: false,
  muted: false,
  voiceReady: false,
};
const listeners = new Set<() => void>();

export const valgon = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const useValgon = () => useSyncExternalStore(valgon.subscribe, valgon.get, valgon.get);

/**
 * Read every frame by the orb animation (no React re-render): the current mode
 * and a 0–1 voice level that rises with each spoken word. `awake` turns true
 * once Valgon has woken up on the first page (he starts each visit asleep).
 */
export const signal = { mode: 'idle' as ValgonMode, level: 0, target: 0, pulse: 0, awake: false };

let lineId = 0;
export const nextLineId = () => ++lineId;
