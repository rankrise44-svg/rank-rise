/* ═══════════════════════════════════════════════════════════════════════
   POST /api/post

   Expands one calendar slot into a finished post: hook, caption in the
   chosen content language, hashtags, a shot list, and alt text.

   This is the "one click" the product promises. Small, fast, and cheap on
   purpose — the owner clicks a slot, watches a real Lebanese caption
   arrive in a few seconds, and edits it or shoots it. Generating all
   twelve up front would be slower, more expensive, and would produce
   eleven posts nobody asked for.
   ═══════════════════════════════════════════════════════════════════════ */

import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { client, hasKey, MODEL, HOUSE_RULES, sse, sseHeaders, readableError, LANGUAGE_RULES } from './_claude.mjs';

const Post = z.object({
  hook:    z.string().describe('The first line, which is all most people read. Max 10 words. It must work with the sound off and the caption collapsed.'),
  caption: z.string().describe('The full caption in the content language, ready to paste. Line breaks where they belong. No hashtags in here — they have their own field.'),
  cta:     z.string().describe('What you want them to do, in the content language, in one short line. Match it to how this business actually takes orders.'),
  hashtags: z.array(z.string()).min(4).max(12)
    .describe('Mixed reach: a few that describe the product, a few local to their city, a couple branded. No thirty-tag blocks, and nothing irrelevant for reach.'),
  visual: z.object({
    direction: z.string().describe('2 sentences on what this should look and feel like, grounded in what they can actually shoot.'),
    shots:     z.array(z.string()).min(1).max(5).describe('A shot list a person with a phone can follow. One line each.'),
  }),
  alt_text: z.string().describe('Alt text in English, describing the image for someone who cannot see it. Accessibility is not optional.'),
  note:     z.string().describe('One line to the owner: the judgement call you made writing this, or what to swap if it does not fit. Be useful, not decorative.'),
});

function buildPrompt(slot, intake, plan, language) {
  return `Write one finished post for this business.

<business>
Name: ${intake.name}
Category: ${intake.category}
Sells: ${intake.sells}
Hero product: ${intake.hero}
Customer: ${intake.who}
What triggers a purchase: ${intake.trigger}
City / market: ${intake.market}
How orders reach them: ${Array.isArray(intake.orders) ? intake.orders.join(', ') : intake.orders}
Assets on hand: ${Array.isArray(intake.assets) ? intake.assets.join(', ') : intake.assets}
What makes them different: ${intake.why_you || 'not stated — do not invent one'}
</business>

<slot>
Day: ${slot.day}
Format: ${slot.format}
Pillar: ${slot.pillar}
Angle: ${slot.angle}
This post serves: ${slot.serves}
</slot>

<plan>
North star: ${plan?.north_star?.metric ?? 'not set'}
</plan>

Rules:

1. Write the caption the owner could paste today, not a template with
   brackets to fill in. If you need a detail you do not have, write around
   it rather than leaving a placeholder.

2. Never invent a claim. No percentages, no "voted best", no awards, no
   customer quotes that were not given to you. If the business did not say
   it, it does not go in the caption. This matters more here than anywhere
   else in the product, because this is the text that gets published.

3. The shot list has to be shootable with what they listed under assets.
   If they only have phone photos, direct a phone photo well rather than
   describing a studio setup they cannot produce.

4. Match the call to action to how orders actually reach them. Sending
   people to a website when they take orders on WhatsApp loses the sale.

${LANGUAGE_RULES[language] ?? LANGUAGE_RULES.en}

The hook, caption and CTA are in the content language. The visual
direction, shot list, alt text and your note to the owner stay in English —
those are working notes, not published copy.`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (!hasKey())
    return Response.json({ error:'no_key', message:'ANTHROPIC_API_KEY is not set on this deployment.' }, { status:503 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error:'bad_json' }, { status:400 }); }

  const { slot, intake, plan, language = 'en' } = body ?? {};
  if (!slot?.angle || !intake?.name)
    return Response.json({ error:'bad_input', message:'A post needs a calendar slot and the business.' }, { status:400 });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Low effort and a small ceiling: one post is a bounded writing
        // task, and this call has to feel instant when someone taps a slot
        // in front of an audience.
        const run = client().messages.stream({
          model:      MODEL,
          max_tokens: 4000,
          system:     HOUSE_RULES,
          output_config: { effort:'low', format: zodOutputFormat(Post) },
          messages: [{ role:'user', content: buildPrompt(slot, intake, plan, language) }],
        });

        let chars = 0;
        run.on('text', (d) => { chars += d.length; sse(controller, 'progress', { chars }); });

        const message = await run.finalMessage();
        if (message.stop_reason === 'refusal') {
          sse(controller, 'failed', { message:'The model declined to write this one.' });
        } else if (message.stop_reason === 'max_tokens') {
          sse(controller, 'failed', { message:'The post was cut off. Try again.' });
        } else {
          const text = message.content.find((b) => b.type === 'text')?.text ?? '';
          const parsed = Post.safeParse(JSON.parse(text));
          parsed.success
            ? sse(controller, 'result', parsed.data)
            : sse(controller, 'failed', { message:'The post came back in an unexpected shape. Try again.' });
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
