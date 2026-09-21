/* ═══════════════════════════════════════════════════════════════════════
   POST /api/diagnose

   Takes the completed intake, returns a Marketing Readiness verdict: one
   score, six pillars, and a ranked set of findings each carrying its own
   fix.

   The score is the product's hook — it is the one thing a viewer
   remembers — so it has to be defensible. The scoring rubric lives in the
   prompt rather than in JavaScript on purpose: it is judgment, not
   arithmetic, and a weighted sum of dropdown indices would produce a
   number that looks precise and means nothing.
   ═══════════════════════════════════════════════════════════════════════ */

import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { client, hasKey, MODEL, HOUSE_RULES, sse, sseHeaders, readableError } from './_claude.mjs';

/* ── the shape ──────────────────────────────────────────────────────────
   Six pillars, fixed. A variable set would make the UI un-designable and
   make two runs incomparable — and comparability is the whole point of
   re-running the diagnosis in 90 days. */
const PILLARS = ['offer', 'brand', 'channels', 'conversion', 'measurement', 'ads'];

const Pillar = z.object({
  id:    z.enum(PILLARS),
  name:  z.string().describe('Display name, 1-3 words.'),
  score: z.number().int().min(0).max(100),
  note:  z.string().describe('One sentence, max 22 words, saying what drove this score. Specific to their answers.'),
});

const Finding = z.object({
  severity: z.enum(['blocker', 'watch', 'strength'])
    .describe('blocker = costs them money right now and must be fixed before spend. watch = real but not urgent. strength = something genuinely working, to build on.'),
  title:  z.string().describe('The finding as a statement, max 9 words. Not a category label.'),
  detail: z.string().describe('2-3 sentences: what is happening and what it costs them. Quote their own answers where it lands harder.'),
  fix:    z.string().describe('The specific first action. Something they could start this week, not a principle.'),
  effort: z.enum(['quick', 'medium', 'heavy'])
    .describe('quick = under an hour. medium = a few days. heavy = weeks or outside help.'),
});

const Diagnosis = z.object({
  headline: z.string().describe('The single most important sentence about this business, max 14 words. This is the first thing the owner reads.'),
  summary:  z.string().describe('3-4 sentences. The honest state of play: what is working, what is not, and what happens if nothing changes.'),
  score:    z.number().int().min(0).max(100).describe('Marketing readiness, 0-100. Your holistic judgement, informed by the pillars but not a mechanical average of them.'),
  band:     z.enum(['Not ready', 'Patchy', 'Getting there', 'Ready', 'Strong']),
  pillars:  z.array(Pillar).min(6).max(6),
  findings: z.array(Finding).min(4).max(7)
    .describe('Ranked, most costly first. At least one strength — a report with no strength in it gets dismissed as generic.'),
  ad_viability: z.object({
    verdict:   z.enum(['not yet', 'small test', 'go']),
    reasoning: z.string().describe('2 sentences grounded in their margin, ticket size and budget. If the maths does not work, say the maths does not work.'),
  }),
  before_you_spend: z.array(z.string()).min(2).max(5)
    .describe('The ordered short list that must be true before a dollar goes to the platforms. Each item concrete and checkable.'),
});

/* ── the rubric ─────────────────────────────────────────────────────── */
const RUBRIC = `
Score each pillar 0-100 on evidence in the answers, not on optimism.

  offer        Is there one clear thing being sold, at a price and margin
               that can carry acquisition cost? Unknown margin is itself a
               low score — you cannot plan spend blind.
  brand        Would a stranger recognise two of their posts as the same
               business? Consistency and usable assets, not taste.
  channels     Are they present and posting where their buyers actually
               are? A dormant account scores below no account: it signals
               a dead business to anyone who checks.
  conversion   From "how much?" to money received. Reply speed, the order
               path, and the close rate live here. This is where most
               small businesses silently lose the majority of their
               marketing spend.
  measurement  Do they know where a customer came from? Without this,
               every optimisation after month one is guesswork.
  ads          Readiness to spend — margin, ticket size, budget, tracking
               and creative on hand, together. High only when all of them
               hold.

Calibration, so the number means something across businesses:
  0-29   Not ready      — a structural problem makes spend wasteful now.
  30-49  Patchy         — real activity, no system; results will not compound.
  50-69  Getting there  — foundations hold, specific gaps cap the ceiling.
  70-84  Ready          — spend will compound; it is an optimisation problem.
  85-100 Strong         — rare. Reserve it. Most healthy businesses sit 60-75.

Be willing to score low. A generous score that leads someone to spend money
they will not get back is the most expensive thing this product can do. If
the answers are thin, score on what is actually there and say in the
summary that the read is limited by what they told you.
`.trim();

function buildPrompt(intake, language) {
  const lines = Object.entries(intake)
    .filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  return `Here is the completed consultation intake for a business.

<intake>
${lines}
</intake>

Produce the Marketing Readiness diagnosis.

${RUBRIC}

Write the diagnosis itself in ${language === 'en' ? 'English' : 'English'} — the
report is read by the owner and by whoever advises them, and English is the
working language of the report regardless of what language their published
content will be in. (Content language is handled separately, downstream.)

Ground every finding in something they actually said. A finding that could
apply to any business in their category is a wasted finding — and the owner
will notice, which costs you the rest of the report.`;
}

/* ─────────────────────────────────────────────────────────────────────── */
export default async (req) => {
  if (req.method !== 'POST')
    return new Response('POST only', { status: 405 });

  if (!hasKey())
    return Response.json(
      { error: 'no_key', message: 'ANTHROPIC_API_KEY is not set on this deployment.' },
      { status: 503 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'bad_json' }, { status: 400 }); }

  const intake   = body?.intake;
  const language = body?.language ?? 'en';
  if (!intake || typeof intake !== 'object' || !intake.name)
    return Response.json({ error: 'bad_intake', message: 'The intake is empty.' }, { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = client().messages.stream({
          model:      MODEL,
          max_tokens: 16000,
          system:     HOUSE_RULES,
          // medium, not high: the analysis is a bounded judgement call, and
          // Netlify cuts a synchronous function off at 26 seconds. Depth
          // that arrives after the timeout is worth nothing.
          output_config: { effort: 'medium', format: zodOutputFormat(Diagnosis) },
          messages: [{ role: 'user', content: buildPrompt(intake, language) }],
        });

        let chars = 0;
        run.on('text', (delta) => {
          chars += delta.length;
          sse(controller, 'progress', { chars });
        });

        const message = await run.finalMessage();

        if (message.stop_reason === 'refusal') {
          sse(controller, 'failed', { message: 'The model declined this request. Check the intake for anything that reads as off-limits.' });
        } else if (message.stop_reason === 'max_tokens') {
          sse(controller, 'failed', { message: 'The diagnosis was cut off before it finished. Run it again.' });
        } else {
          const text = message.content.find((b) => b.type === 'text')?.text ?? '';
          // Structured outputs guarantee the shape, but a truncated or
          // empty body still has to fail loudly rather than reach the UI
          // as a half-drawn score.
          const parsed = Diagnosis.safeParse(JSON.parse(text));
          if (!parsed.success) {
            sse(controller, 'failed', { message: 'The diagnosis came back in an unexpected shape. Run it again.' });
          } else {
            sse(controller, 'result', parsed.data);
          }
        }
      } catch (err) {
        sse(controller, 'failed', { message: readableError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
};
