// Connect Financials server: serves the built website and gives Valgon his
// brain (Groq) and voice (ElevenLabs). The keys stay in .env on this machine;
// the page only ever calls /api/*.
import express from 'express';
import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_PROMPT } from './knowledge.js';
import { stepsFor } from './actions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8787;
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
const MODELS = [process.env.GROQ_MODEL, 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'].filter(Boolean);
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'nPczCjzI2devNBz1zQrb'; // "Brian", calm and deep
const TTS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => res.json({ brain: Boolean(GROQ_KEY), voice: ELEVEN_KEY.startsWith('sk_'), model: MODELS[0] }));

/** Valgon's brain: Groq, limited to Connect Financials. Returns a ValgonReply. */
app.post('/api/valgon', async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 1000);
  if (!message) return res.status(400).json({ error: 'Empty message' });
  if (!GROQ_KEY) return res.status(503).json({ error: 'GROQ_API_KEY missing' });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .filter((h) => h && typeof h.text === 'string' && h.text.trim())
      .map((h) => ({ role: h.who === 'me' ? 'user' : 'assistant', content: h.text.slice(0, 800) })),
    { role: 'user', content: `${message}\n\n(The visitor is on the "${String(req.body?.page || 'home').slice(0, 20)}" page.)` },
  ];
  let lastError = 'Unknown error';
  const queue = MODELS.map((model) => ({ model, retried: false }));
  for (let i = 0; i < queue.length; i++) {
    const { model } = queue[i];
    try {
      const body = { model, messages, temperature: 0.4, max_completion_tokens: 1400, response_format: { type: 'json_object' } };
      if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        lastError = data?.error?.message || `Groq HTTP ${r.status}`;
        if (r.status === 401) break;
        // Free-tier rate limit: wait as long as Groq asks (up to 4 s) and try this model once more.
        const wait = Number((lastError.match(/try again in ([\d.]+)s/) || [])[1]);
        if (r.status === 429 && wait && wait <= 4 && !queue[i].retried) {
          queue[i].retried = true;
          await new Promise((ok) => setTimeout(ok, wait * 1000 + 150));
          i--;
        }
        continue;
      }
      const out = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      if (typeof out.say !== 'string' || !out.say.trim()) {
        lastError = 'No answer in reply';
        continue;
      }
      return res.json({
        say: out.say.trim(),
        steps: stepsFor(out.action),
        suggestions: Array.isArray(out.suggestions) ? out.suggestions.filter((s) => typeof s === 'string').slice(0, 3) : undefined,
        model,
      });
    } catch (err) {
      lastError = err.name === 'TimeoutError' ? 'Groq timed out' : err.message;
    }
  }
  console.error('[valgon] brain failed:', lastError);
  res.status(502).json({ error: lastError });
});

/** Valgon's voice: ElevenLabs multilingual. The page falls back to the browser voice on any error. */
app.post('/api/tts', async (req, res) => {
  const text = String(req.body?.text || '').trim().slice(0, 2500);
  if (!text) return res.status(400).json({ error: 'Empty text' });
  if (!ELEVEN_KEY) return res.status(503).json({ error: 'ELEVENLABS_API_KEY missing' });
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: TTS_MODEL, voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true } }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      const msg = d?.detail?.message || `ElevenLabs HTTP ${r.status}`;
      console.error('[valgon] voice failed:', msg);
      return res.status(502).json({ error: msg });
    }
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// The built website (npm run build) and its hash routes.
app.use(express.static(path.join(root, 'dist'), { index: 'index.html' }));

app.listen(PORT, () => {
  console.log(`\n  Connect Financials at http://localhost:${PORT}`);
  console.log(`  Valgon brain: ${GROQ_KEY ? `Groq ${MODELS[0]}` : 'missing GROQ_API_KEY (built-in answers only)'}`);
  console.log(`  Valgon voice: ${ELEVEN_KEY.startsWith('sk_') ? `ElevenLabs ${TTS_MODEL}` : 'browser voice (no ElevenLabs sk_ key)'}\n`);
  // The start files ask for the browser to open by itself.
  if (process.env.OPEN_BROWSER) {
    const url = `http://localhost:${PORT}`;
    exec(process.platform === 'win32' ? `start "" ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`, () => {});
  }
});
