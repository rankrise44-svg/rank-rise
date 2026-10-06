# Valgon

Valgon is the site's guide. He is the first page visitors see (`#/`), and a
docked panel on every other page (the orb button bottom-right, or **Valgon** in
the header). He answers questions, speaks, and takes people anywhere on the site.

## Files

| File | What it does |
| --- | --- |
| `config.ts` | Name, voice, listening language, and the optional remote endpoint |
| `types.ts` | `ValgonReply` (what he says and does) and `Intent` |
| `knowledge.ts` | Everything he knows today, built from the site's own data |
| `brain.ts` | Picks the answer: remote service first (if set), then `knowledge.ts` |
| `engine.ts` | Runs an answer: speaks, types, opens pages, points at things |
| `voice.ts` | Browser speech (his voice) and speech recognition (the mic) |
| `store.ts` | Conversation state, and the `signal` the orb animates from |
| `ui/Orb.tsx` | His body: the animated holographic orb. Replace it with the final design |
| `ui/Landing.tsx` | The first page |
| `ui/Dock.tsx` | The panel on every other page |
| `ui/Parts.tsx` | Transcript, input + mic, suggestion chips, voice toggle |

## Teach him something new

Add an entry to `INTENTS` in `knowledge.ts`:

```ts
{
  id: 'bonus',
  patterns: [/bonus|promotion|offer/i],
  respond: () => ({
    say: 'Current promotions are listed on the accounts section.',
    steps: [{ go: 'home', section: 'accounts' }, { spot: '#accounts ul' }],
  }),
}
```

Steps he can take: `{ go: page, section? }`, `{ spot: cssSelector }`, `{ say }`,
`{ openAccount: true, tier? }`, `{ instrument: 'XAUUSD' }`, `{ wait: ms }`.
A new page goes in `src/config/pages.ts`; he can go there at once.

## His brain and voice (the site server)

`server/index.js` runs the website with Valgon's AI:

- **Brain:** Groq (`openai/gpt-oss-20b`). A general assistant specialised in trading,
  finance and markets, English only, using `server/knowledge.js` for every
  Connect Financials fact. His only actions are on this website; he cannot reach
  the internet or any other system, and he gives no buy or sell advice.
- **Voice:** ElevenLabs (`eleven_multilingual_v2`, voice "Brian"); the browser voice if it fails.

```bash
# .env (never commit it)
GROQ_API_KEY=gsk_...
ELEVENLABS_API_KEY=sk_...
PORT=8787

npm start        # builds the site and serves it at http://localhost:8787
```

`POST /api/valgon { message, page, history }` returns a `ValgonReply`
(`say`, `steps`, `suggestions`). Without the server (for example the claude.ai
preview) he answers from `knowledge.ts`, and he does the same if Groq fails.
To use another service instead, point `VITE_VALGON_ENDPOINT` at it.

## Voice

- Speaking uses the browser's built-in voice; nothing is sent anywhere. Browsers
  allow speech only after the visitor's first click or key press, so before that
  he writes without speaking ("Tap to hear me" on the first page).
- The microphone uses the browser's speech recognition (Chrome, Edge, Safari).
  Where it is missing or blocked, he says so and the visitor types instead.
