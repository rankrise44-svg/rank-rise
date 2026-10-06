/**
 * Valgon settings.
 *
 * To connect Valgon to your own database or AI service later, set
 * VITE_VALGON_ENDPOINT (in a .env file) to a URL that accepts
 *   POST { message, page, history: [{ who, text }] }
 * and returns a ValgonReply (see types.ts). Valgon then asks that service first
 * and falls back to his built-in knowledge (knowledge.ts) if it fails.
 */
export const VALGON = {
  name: 'Valgon',
  // The site's own server (server/index.js) answers here with Groq. The claude.ai
  // preview has no server, so there he uses his built-in knowledge.
  endpoint: (import.meta.env.VITE_VALGON_ENDPOINT as string | undefined) || (import.meta.env.MODE === 'artifact' ? null : '/api/valgon'),
  /** Natural voice (ElevenLabs via the server); the browser voice is the fallback */
  ttsEndpoint: (import.meta.env.VITE_VALGON_TTS as string | undefined) || (import.meta.env.MODE === 'artifact' ? null : '/api/tts'),
  /** Milliseconds to wait for the endpoint before answering locally */
  endpointTimeout: 20000,
  voice: { preferLang: 'en-GB', rate: 1, pitch: 0.82 },
  listenLang: 'en-US',
};
