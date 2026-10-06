import { isPage } from '../config/pages';
import { VALGON } from './config';
import { FALLBACK, INTENTS } from './knowledge';
import type { BrainContext, ValgonReply, ValgonStep } from './types';

/**
 * Valgon's brain. Two layers:
 *  1. a remote service (your database or AI), when VITE_VALGON_ENDPOINT is set;
 *  2. the built-in knowledge (knowledge.ts), always available as the fallback.
 * Anything that answers with a ValgonReply can be plugged in here.
 */
export interface Brain {
  respond(message: string, ctx: BrainContext): Promise<ValgonReply | null>;
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

export const localBrain: Brain = {
  async respond(message, ctx) {
    const m = norm(message);
    let best: { score: number; i: number } | null = null;
    INTENTS.forEach((intent, i) => {
      const strong = intent.patterns.filter((re) => re.test(m)).length;
      if (!strong || (intent.when && !intent.when(message))) return;
      const weak = (intent.keywords ?? []).filter((k) => m.includes(k)).length;
      const score = strong * 3 + weak + (intent.priority ?? 0);
      if (!best || score > best.score) best = { score, i };
    });
    const hit = best as { score: number; i: number } | null;
    return hit ? INTENTS[hit.i].respond(message, ctx) : null;
  },
};

/** Only accept steps that point at pages that exist. */
function sanitize(r: unknown): ValgonReply | null {
  if (!r || typeof r !== 'object' || typeof (r as ValgonReply).say !== 'string') return null;
  const reply = r as ValgonReply;
  const steps = (reply.steps ?? []).filter((s: ValgonStep) => !('go' in s) || isPage(s.go));
  return { ...reply, steps };
}

export const remoteBrain: Brain = {
  async respond(message, ctx) {
    if (!VALGON.endpoint) return null;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), VALGON.endpointTimeout);
    try {
      const res = await fetch(VALGON.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page: ctx.page, history: ctx.history.slice(-12).map(({ who, text }) => ({ who, text })) }),
        signal: ctl.signal,
      });
      if (!res.ok) return null;
      return sanitize(await res.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};

/** Ask the remote brain first (when there is one), then the built-in knowledge. */
export async function think(message: string, ctx: BrainContext): Promise<ValgonReply> {
  return (await remoteBrain.respond(message, ctx)) ?? (await localBrain.respond(message, ctx)) ?? FALLBACK;
}
