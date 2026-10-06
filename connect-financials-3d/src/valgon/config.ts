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
  endpoint: (import.meta.env.VITE_VALGON_ENDPOINT as string | undefined) || null,
  /** Milliseconds to wait for the endpoint before answering locally */
  endpointTimeout: 6000,
  voice: { preferLang: 'en-GB', rate: 1, pitch: 0.82 },
  listenLang: 'en-US',
};
