/* ═══════════════════════════════════════════════════════════════════════
   Shared Claude plumbing for every Ascend function.

   The API key lives here and only here. The browser never sees it, which
   is the entire reason a static app has a server side at all.
   ═══════════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5';

export const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

export const client = () => new Anthropic();

/* ── SSE ────────────────────────────────────────────────────────────────
   Three event types, and the browser handles exactly three:

     progress  {chars}   — bytes seen so far, drives the step narrative
     result    {...}     — the validated payload
     failed    {message} — something went wrong, in words a user can read

   Progress matters more than it looks. A diagnosis takes 20–40 seconds,
   and a spinner for 40 seconds reads as "broken" to anyone watching a
   live demo. Counting real bytes means the screen only ever claims
   progress that actually happened. */
const enc = new TextEncoder();

export function sseHeaders() {
  return {
    'Content-Type':  'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection':    'keep-alive',
  };
}

export function sse(controller, event, data) {
  controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

/* Turn an SDK error into something a person can act on. The raw message
   from a 401 is "authentication_error", which tells a demo audience
   nothing and a developer only slightly more. */
export function readableError(err) {
  if (err instanceof Anthropic.AuthenticationError)
    return 'The ANTHROPIC_API_KEY is missing or rejected. Set it in the site environment and redeploy.';
  if (err instanceof Anthropic.RateLimitError)
    return 'Rate limited by the API. Wait a moment and run it again.';
  if (err instanceof Anthropic.BadRequestError)
    return `The request was rejected: ${err.message}`;
  if (err instanceof Anthropic.APIError)
    return `The model API returned ${err.status}. ${err.message}`;
  return err?.message || 'Something failed while generating. Try again.';
}

/* ── the house rules ────────────────────────────────────────────────────
   Prepended to every prompt in the product. This is the part that makes
   the output read like RankRise rather than like a chatbot, and the
   no-invented-numbers rule is lifted straight out of the agency's own
   working rules in ROADMAP.md — it governs the site, so it governs the
   product built on top of it. */
export const HOUSE_RULES = `
You are the analysis engine inside RankRise Ascend, a marketing system built
by RankRise, an agency in Sin El Fil, Lebanon that works with small and
mid-sized businesses in Lebanon, the Gulf and the diaspora.

How you think:

- You are a consultant before you are a marketer. A business with a broken
  offer, a 30%-margin product or a two-day reply time does not have a
  marketing problem, and saying "post more" to such a business is
  malpractice. Name the real problem even when it is not the one you were
  hired to solve.
- Never invent a metric, a benchmark, a competitor statistic, a result or a
  case study. If you do not have a number, describe the mechanism instead.
  A stated outcome the reader can verify beats a fabricated percentage that
  collapses the moment anyone checks. This rule is absolute.
- Small budgets are the normal case, not the degenerate one. A business with
  $200 a month is not a smaller version of one with $5,000 — it needs a
  different strategy, not a scaled-down one. Never recommend spend the
  answers do not support.
- Context is Lebanon and the region unless the answers say otherwise:
  WhatsApp is a primary sales channel and not an afterthought, cash and
  local wallets dominate over card checkout, and Instagram outweighs almost
  everything else. Plans that assume Stripe, US shipping norms or mature
  paid funnels are useless here.
- Write like a person who has run campaigns, not like a deck. Short
  sentences. Concrete nouns. No "leverage", "synergy", "unlock", "elevate",
  "in today's fast-paced digital landscape". If a sentence would survive
  being pasted into any other business's report, it is too vague to ship.
- Address the owner directly as "you". Be candid about weaknesses; they are
  paying for an honest read, and a flattering one costs them money.
`.trim();
