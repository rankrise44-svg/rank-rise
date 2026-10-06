// VALCON server: serves the HUD and keeps the API keys on this machine.
// The page talks only to /api/*; the keys never reach the browser.
import express from 'express';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';

// Fast chat models on Groq, tried in order (override with GROQ_MODEL).
const MODELS = [process.env.GROQ_MODEL, 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'].filter(Boolean);
// "Brian": a calm, deep male voice. Multilingual model so Arabic works too.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'nPczCjzI2devNBz1zQrb';
const TTS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

const PERSONA = `You are VALCON, a calm, brief and polite personal voice assistant. Address the user as "sir" in every reply (in Arabic, "سيدي").
Rules:
- Reply in 1 to 3 short sentences. Your words are spoken aloud, so no lists, markdown, emoji or code.
- Always reply in the same language the user just spoke (English or Arabic).
- If you do not know something, say so briefly. Stay calm and composed.`;

// Conversation history (this server is for one person on one laptop).
let history = [];
const MAX_TURNS = 12;

/** The persona always says "sir"; if the model forgot, add it to the first sentence. */
function addressAsSir(reply) {
  if (/\bsir\b|سيدي/i.test(reply)) return reply;
  if (/[\u0600-\u06FF]/.test(reply)) return `سيدي، ${reply}`;
  const m = reply.match(/^(.*?)([.!?])(\s|$)/s);
  return m ? `${m[1]}, sir${m[2]}${reply.slice(m[1].length + 1)}` : `${reply}, sir.`;
}

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const mask = (k) => (k ? 'loaded' : 'missing');

app.get('/api/status', (_req, res) => {
  res.json({
    groq: Boolean(GROQ_KEY),
    tts: Boolean(ELEVEN_KEY) && ELEVEN_KEY.startsWith('sk_'),
    model: MODELS[0],
    voice: VOICE_ID,
    ttsModel: TTS_MODEL,
  });
});

app.post('/api/reset', (_req, res) => {
  history = [];
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 2000);
  if (!message) return res.status(400).json({ error: 'Empty message' });
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY is missing in .env' });

  const messages = [{ role: 'system', content: PERSONA }, ...history, { role: 'user', content: message }];
  let lastError = 'Unknown error';
  for (const model of MODELS) {
    try {
      const body = { model, messages, temperature: 0.6, max_completion_tokens: 600 };
      if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        lastError = data?.error?.message || `Groq HTTP ${r.status}`;
        // Model gone or rate-limited: try the next one. Bad key: stop.
        if (r.status === 401) break;
        continue;
      }
      let reply = (data.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (!reply) {
        lastError = 'Empty reply';
        continue;
      }
      reply = addressAsSir(reply);
      history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
      history = history.slice(-MAX_TURNS * 2);
      return res.json({ reply, model });
    } catch (err) {
      lastError = err.name === 'TimeoutError' ? 'Groq timed out' : err.message;
    }
  }
  console.error('[chat] failed:', lastError);
  res.status(502).json({ error: lastError });
});

app.post('/api/tts', async (req, res) => {
  const text = String(req.body?.text || '').trim().slice(0, 1200);
  if (!text) return res.status(400).json({ error: 'Empty text' });
  if (!ELEVEN_KEY) return res.status(503).json({ error: 'ELEVENLABS_API_KEY is missing in .env' });
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const msg = data?.detail?.message || data?.detail?.status || `ElevenLabs HTTP ${r.status}`;
      console.error('[tts] failed:', msg);
      return res.status(502).json({ error: msg });
    }
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error('[tts] failed:', err.message);
    res.status(502).json({ error: err.name === 'TimeoutError' ? 'ElevenLabs timed out' : err.message });
  }
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  VALCON online at ${url}`);
  console.log(`  Groq key: ${mask(GROQ_KEY)} · model ${MODELS[0]}`);
  console.log(`  ElevenLabs key: ${ELEVEN_KEY.startsWith('sk_') ? mask(ELEVEN_KEY) : ELEVEN_KEY ? 'set, but not an sk_ key (browser voice will be used)' : 'missing (browser voice will be used)'}\n`);
  if (process.env.VALCON_NO_OPEN) return;
  // Open it in Chrome (falls back to the default browser).
  const cmd =
    process.platform === 'darwin'
      ? `open -a "Google Chrome" ${url} || open ${url}`
      : process.platform === 'win32'
        ? `start chrome ${url} || start ${url}`
        : `google-chrome ${url} || xdg-open ${url}`;
  exec(cmd, () => {});
});
