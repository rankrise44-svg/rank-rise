/* ═══════════════════════════════════════════════════════════════════════
   POST /api/calendar

   Four weeks of slots, at the cadence the plan already committed to.

   Deliberately shallow: each slot carries a format and an angle, not a
   finished caption. Writing twelve full captions up front burns tokens on
   posts that will be rewritten, and buries the one thing the calendar is
   for — seeing the shape of a month at a glance. Full copy is generated
   per slot, on demand, by post.mjs.
   ═══════════════════════════════════════════════════════════════════════ */

import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { client, hasKey, MODEL, HOUSE_RULES, sse, sseHeaders, readableError, LANGUAGE_RULES } from './_claude.mjs';

const Slot = z.object({
  day:    z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  format: z.enum(['photo', 'carousel', 'reel', 'story', 'text'])
    .describe('Match this to what they actually have. Do not schedule reels for a business whose only assets are phone photos and no footage.'),
  pillar: z.string().describe('Which content pillar this belongs to. Must match one of the pillar names exactly.'),
  angle:  z.string().describe('The specific idea for this post, max 12 words. Not a topic — an angle. "Roast date on the bag, side by side with a supermarket date" beats "talk about freshness".'),
  serves: z.string().describe('The plan action or diagnosis finding this post advances. Name it in their words.'),
});

const Calendar = z.object({
  headline: z.string().describe('What this month of content is trying to do, max 12 words.'),
  pillars: z.array(z.object({
    name:  z.string().describe('2-3 words.'),
    share: z.string().describe('Percentage of posts, e.g. "40%". The shares must total 100%.'),
    what:  z.string().describe('One sentence: what goes in this pillar and why it earns its share for this business.'),
  })).min(3).max(4)
    .describe('Three or four repeatable shapes. The point of pillars is that the owner never faces a blank page — every slot is already a known kind of post.'),
  weeks: z.array(z.object({
    n:     z.number().int().min(1).max(4),
    theme: z.string().describe('What this week is building, max 8 words. Weeks should progress, not repeat.'),
    slots: z.array(Slot).min(1).max(7),
  })).min(4).max(4),
  stories: z.array(z.string()).min(4).max(7)
    .describe('Recurring story prompts they can shoot in under two minutes with a phone. These carry the cadence between posts.'),
});

function buildPrompt(intake, diagnosis, plan, language) {
  const posts   = plan?.cadence?.posts_per_week ?? 3;
  const stories = plan?.cadence?.stories_per_week ?? 5;

  return `Build four weeks of content for this business.

<business>
Name: ${intake.name}
Category: ${intake.category}
Sells: ${intake.sells}
Hero product: ${intake.hero}
Customer: ${intake.who}
What triggers a purchase: ${intake.trigger}
Market: ${intake.market}
Assets on hand: ${Array.isArray(intake.assets) ? intake.assets.join(', ') : intake.assets}
Channels: ${Array.isArray(intake.channels) ? intake.channels.join(', ') : intake.channels}
Hours per week available: ${intake.hours}
</business>

<diagnosis>
${diagnosis.headline}
Strengths to amplify: ${(diagnosis.findings ?? []).filter(f => f.severity === 'strength').map(f => f.title).join('; ') || 'none identified'}
Problems the content should help with: ${(diagnosis.findings ?? []).filter(f => f.severity !== 'strength').map(f => f.title).join('; ')}
</diagnosis>

<plan>
North star: ${plan?.north_star?.metric}
Phase 1: ${plan?.phases?.[0]?.name} — ${plan?.phases?.[0]?.goal}
Phase 2: ${plan?.phases?.[1]?.name} — ${plan?.phases?.[1]?.goal}
Cadence committed to: ${posts} posts and ${stories} stories per week
</plan>

Rules:

1. Exactly ${posts} slots per week. Not more. The cadence was sized to the
   hours they have, and a calendar that quietly exceeds it is the same
   broken promise as a plan that does.

2. Only formats their assets can actually produce. Check what they listed.
   Scheduling a reel for a business with no footage produces an empty slot
   and a week where the owner posts nothing.

3. Every slot names what it serves. Content that advances nothing in the
   plan should not be on the calendar.

4. Weeks progress. Week 4 should not be week 1 with different words.

5. Angles, not topics. An angle is something you could shoot tomorrow. A
   topic is something you still have to think about, which means it will
   not get shot.

${LANGUAGE_RULES[language] ?? LANGUAGE_RULES.en}

Angles and themes are written in English — this is the planning view the
owner and their advisor read. The captions themselves are written later, in
the content language, by a separate step.`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (!hasKey())
    return Response.json({ error:'no_key', message:'ANTHROPIC_API_KEY is not set on this deployment.' }, { status:503 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error:'bad_json' }, { status:400 }); }

  const { intake, diagnosis, plan, language = 'en' } = body ?? {};
  if (!intake?.name || !diagnosis?.score || !plan?.phases)
    return Response.json(
      { error:'bad_input', message:'The calendar needs the intake, the diagnosis and the plan.' },
      { status:400 });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = client().messages.stream({
          model:      MODEL,
          max_tokens: 16000,
          system:     HOUSE_RULES,
          output_config: { effort:'medium', format: zodOutputFormat(Calendar) },
          messages: [{ role:'user', content: buildPrompt(intake, diagnosis, plan, language) }],
        });

        let chars = 0;
        run.on('text', (d) => { chars += d.length; sse(controller, 'progress', { chars }); });

        const message = await run.finalMessage();
        if (message.stop_reason === 'refusal') {
          sse(controller, 'failed', { message:'The model declined this request.' });
        } else if (message.stop_reason === 'max_tokens') {
          sse(controller, 'failed', { message:'The calendar was cut off before it finished. Run it again.' });
        } else {
          const text = message.content.find((b) => b.type === 'text')?.text ?? '';
          const parsed = Calendar.safeParse(JSON.parse(text));
          parsed.success
            ? sse(controller, 'result', parsed.data)
            : sse(controller, 'failed', { message:'The calendar came back in an unexpected shape. Run it again.' });
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
