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

/* ── content language ───────────────────────────────────────────────────
   The reason a tool built here beats one built abroad.

   Every international generator produces Modern Standard Arabic that no
   one in a Beirut comment section has ever written — grammatically perfect
   and socially wrong, the written equivalent of a news anchor selling you
   a sandwich. Matching how the market actually writes is not a nice-to-
   have in this region; it is most of why local content outperforms.

   These rules are deliberately specific. "Write in Lebanese dialect" gets
   you Egyptian with a few swapped words. */
export const LANGUAGE_RULES = {
  en: `Write the captions in English. Plain, warm, and short. No emoji strings,
no "Dive into", no "Elevate your". Write like a person who runs the shop.`,

  ar: `Write the captions in Modern Standard Arabic (فصحى). Keep it simple and
contemporary — the Arabic of a well-written brand, not of a newspaper
editorial. Short sentences. No rhyming, no classical flourishes, no
ornamental introductions before the point.`,

  'ar-lb': `Write the captions in spoken Lebanese Arabic, in Arabic script.

This is the difference between a caption that gets engagement and one that
gets ignored, so be exact about it:

- Lebanese, not Egyptian and not Gulf. Use بدي / بدك (not عايز, not أبغى),
  هلق (not دلوقتي, not الحين), كتير (not أوي, not وايد), شو (not إيه),
  هيك, منيح, كمان, لهيك, بس, عم + verb for the present (عم نحمّص,
  عم نشتغل), رح for the future (رح نفتح), ما for negation (ما في, ما بيصير),
  مش before adjectives and nouns (مش غالي).
- Mixing English words in is normal and correct — Lebanese brands write
  "الـdelivery" and "الـorder" and everybody does. Do not sanitise it into
  pure Arabic. Use the Arabic definite article on them: الـcoffee, الـbags.
- Keep product names, prices and handles exactly as the business writes
  them. Never translate a brand name.
- Write short. Spoken Lebanese on Instagram runs in fragments, not in
  full sentences with complete clauses.
- Never write فصحى and call it Lebanese. If a sentence reads like the
  news, rewrite it the way someone would say it across a counter.`,

  mixed: `Write the captions the way most Lebanese brands actually post: Lebanese
Arabic in Arabic script for the human parts — the hook, the feeling, the
call to action — and English for product names, categories, prices and
anything technical. Follow the Lebanese dialect rules exactly (بدي, هلق,
كتير, شو, عم + verb, رح, مش) for the Arabic half, and let the English sit
inside the sentence naturally rather than in a separate block. This is a
register, not a translation: do not write the caption twice.`,
};

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
