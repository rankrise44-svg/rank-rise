import { isPage } from '../config/pages';
import { VALGON } from './config';
import { FALLBACK, INTENTS } from './knowledge';
import type { BrainContext, ValgonReply, ValgonStep } from './types';
import { SYSTEM_PROMPT } from '../../server/knowledge.js';
import { stepsFor } from '../../server/actions.js';

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

/* The claude.ai preview has no server, so there Valgon thinks with Claude on the
   viewer's own account (the `sample` capability; the viewer allows it once). */
type Sample = { json: (input: { role: 'user' | 'assistant'; content: string }[], opts?: object) => Promise<unknown> };
type ClaudeRuntime = { use: (name: 'sample') => Promise<Sample | null> };
let claudeOff = false;

export const claudeBrain: Brain = {
  async respond(message, ctx) {
    const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
    if (VALGON.endpoint || claudeOff || !runtime?.use) return null;
    try {
      const sample = await runtime.use('sample');
      if (!sample) {
        claudeOff = true;
        return null;
      }
      const turns = [
        { role: 'user' as const, content: `${SYSTEM_PROMPT}\n\nReply with only the JSON object described above.` },
        ...ctx.history
          .slice(-12)
          .filter((l) => l.text.trim())
          .map((l) => ({ role: l.who === 'me' ? ('user' as const) : ('assistant' as const), content: l.text.slice(0, 800) })),
        { role: 'user' as const, content: `${message}\n\n(The visitor is on the "${ctx.page}" page.)` },
      ];
      const out = (await sample.json(turns, { modelTier: 'quick', cache: false })) as { say?: unknown; action?: unknown; suggestions?: unknown };
      if (typeof out?.say !== 'string' || !out.say.trim()) return null;
      return sanitize({
        say: out.say.trim(),
        steps: stepsFor(out.action),
        suggestions: Array.isArray(out.suggestions) ? out.suggestions.filter((x): x is string => typeof x === 'string').slice(0, 3) : undefined,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) claudeOff = true;
      return null;
    }
  },
};

/** Ask the AI first (the site server, or Claude in the preview), then the built-in knowledge. */
export async function think(message: string, ctx: BrainContext): Promise<ValgonReply> {
  return (await remoteBrain.respond(message, ctx)) ?? (await claudeBrain.respond(message, ctx)) ?? (await localBrain.respond(message, ctx)) ?? FALLBACK;
}
