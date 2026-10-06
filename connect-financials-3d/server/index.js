// Connect Financials server: serves the built website and gives Valgon his
// brain (Groq) and voice (ElevenLabs). The keys stay in .env on this machine;
// the page only ever calls /api/*.
import express from 'express';
import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { health, valgon, tts, GROQ_KEY, ELEVEN_KEY, MODELS, TTS_MODEL } from './handlers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8787;

const app = express();
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', health);
app.post('/api/valgon', valgon);
app.post('/api/tts', tts);

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
