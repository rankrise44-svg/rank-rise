/* ═══════════════════════════════════════════════════════════════════════
   POST /api/plan

   Turns the diagnosis into a 90-day plan.

   The plan takes the finished diagnosis as input, not just the intake.
   That is the whole point: a plan that visibly answers the blockers the
   previous screen named is the moment the product stops looking like a
   content generator. A plan that reads as generic advice — however good —
   throws that away.

   Two constraints the model is held to, because breaking either is how
   marketing plans die in week three:

     · Sized to the hours they actually said they have.
     · Spending only the budget band they actually chose.
   ═══════════════════════════════════════════════════════════════════════ */

import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { client, hasKey, MODEL, HOUSE_RULES, sse, sseHeaders, readableError } from './_claude.mjs';

const Action = z.object({
  week:   z.number().int().min(1).max(13).describe('Which week of the 90 days this starts in.'),
  title:  z.string().describe('The action as an instruction, max 10 words. A verb first.'),
  detail: z.string().describe('2 sentences: exactly what to do, and what it changes. Concrete enough to act on without asking a follow-up question.'),
  owner:  z.enum(['you', 'your team', 'an agency', 'a freelancer'])
    .describe('Who realistically does this given what they told you about their team.'),
  hours:  z.number().min(0.25).max(40).describe('Honest hours this costs, in total, not per week.'),
  ties_to: z.string().describe('The diagnosis finding or pillar this repairs. Name it in their words.'),
});

const Phase = z.object({
  n:     z.number().int().min(1).max(3),
  name:  z.string().describe('2-3 words, specific to this business. Not "Phase One".'),
  days:  z.string().describe('e.g. "Days 1-30".'),
  goal:  z.string().describe('The single outcome this phase delivers, in one sentence.'),
  why:   z.string().describe('Why this comes before the next phase. 1-2 sentences. If the ordering does not matter, the phasing is wrong.'),
  actions: z.array(Action).min(3).max(6),
});

const Plan = z.object({
  headline:   z.string().describe('What this plan does, max 12 words.'),
  north_star: z.object({
    metric: z.string().describe('The one number that decides whether the 90 days worked.'),
    why:    z.string().describe('One sentence on why this metric and not a vanity one.'),
    check:  z.string().describe('How they will actually measure it with the tools they have. If they have none, the first week of the plan must create one.'),
  }),
  phases: z.array(Phase).min(3).max(3),
  budget: z.object({
    monthly: z.string().describe('Restate their stated budget band verbatim. Never a number they did not give you.'),
    splits:  z.array(z.object({
      channel:   z.string(),
      share:     z.string().describe('A percentage of their stated budget, e.g. "60%".'),
      rationale: z.string().describe('One sentence. Why this channel gets this share for this business.'),
    })).min(1).max(4),
    note: z.string().describe('The honest caveat. If the budget is too small to split, say to put it all in one place and say which.'),
  }),
  cadence: z.object({
    posts_per_week:   z.number().int().min(0).max(21),
    stories_per_week: z.number().int().min(0).max(35),
    rationale:        z.string().describe('Tie this to the hours they said they have. An unachievable cadence is worse than a modest one.'),
  }),
  week_one: z.array(z.string()).min(3).max(6)
    .describe('What to do in the first seven days. Each item finishable by a busy owner. This is the list they will actually act on.'),
  risks: z.array(z.object({
    risk:       z.string(),
    mitigation: z.string(),
  })).min(2).max(4).describe('What realistically derails this plan, drawn from what they told you about their capacity.'),
});

function buildPrompt(intake, diagnosis) {
  const answers = Object.entries(intake)
    .filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const blockers = (diagnosis.findings ?? [])
    .filter((f) => f.severity !== 'strength')
    .map((f) => `- [${f.severity}] ${f.title} — ${f.detail} Fix: ${f.fix}`)
    .join('\n');

  const strengths = (diagnosis.findings ?? [])
    .filter((f) => f.severity === 'strength')
    .map((f) => `- ${f.title} — ${f.detail}`)
    .join('\n');

  return `Build the 90-day plan for this business.

<intake>
${answers}
</intake>

<diagnosis>
Readiness: ${diagnosis.score}/100 (${diagnosis.band})
Headline: ${diagnosis.headline}
Summary: ${diagnosis.summary}

Problems found:
${blockers}

Strengths to build on:
${strengths}

Ad spend verdict: ${diagnosis.ad_viability?.verdict} — ${diagnosis.ad_viability?.reasoning}

Must be true before spending:
${(diagnosis.before_you_spend ?? []).map((s) => `- ${s}`).join('\n')}
</diagnosis>

Rules this plan is held to:

1. Every blocker in the diagnosis is answered by an action, and each action
   names which finding it repairs in the "ties_to" field. A plan that
   ignores a blocker the previous screen just called out is worthless, and
   the owner reading both screens will see it immediately.

2. Total hours across all three phases must fit the hours per week they
   said they have, with room to spare. They told you: "${intake.hours ?? 'unknown'}"
   per week. A plan that needs more time than they have is not a plan, it is
   a wish, and it will be abandoned in week three.

3. Spend only the band they gave: "${intake.budget ?? 'unknown'}". If the ad
   verdict was "not yet", the first phase spends nothing on media and the
   budget section says so plainly.

4. Build on the strengths. The fastest wins come from amplifying something
   already working, not from starting something new.

5. Phase one fixes what leaks. Phase two builds the engine. Phase three
   pushes volume through it. If the diagnosis found no leaks, say so and
   start building in phase one — but check honestly first.

Write in English. Concrete, specific, and sized to this business.`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });

  if (!hasKey())
    return Response.json(
      { error: 'no_key', message: 'ANTHROPIC_API_KEY is not set on this deployment.' },
      { status: 503 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'bad_json' }, { status: 400 }); }

  const { intake, diagnosis } = body ?? {};
  if (!intake?.name || !diagnosis?.score)
    return Response.json(
      { error: 'bad_input', message: 'The plan needs both the intake and a finished diagnosis.' },
      { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = client().messages.stream({
          model:      MODEL,
          max_tokens: 16000,
          system:     HOUSE_RULES,
          output_config: { effort: 'medium', format: zodOutputFormat(Plan) },
          messages: [{ role: 'user', content: buildPrompt(intake, diagnosis) }],
        });

        let chars = 0;
        run.on('text', (d) => { chars += d.length; sse(controller, 'progress', { chars }); });

        const message = await run.finalMessage();

        if (message.stop_reason === 'refusal') {
          sse(controller, 'failed', { message: 'The model declined this request.' });
        } else if (message.stop_reason === 'max_tokens') {
          sse(controller, 'failed', { message: 'The plan was cut off before it finished. Run it again.' });
        } else {
          const text = message.content.find((b) => b.type === 'text')?.text ?? '';
          const parsed = Plan.safeParse(JSON.parse(text));
          parsed.success
            ? sse(controller, 'result', parsed.data)
            : sse(controller, 'failed', { message: 'The plan came back in an unexpected shape. Run it again.' });
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
