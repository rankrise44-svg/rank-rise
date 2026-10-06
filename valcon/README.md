# VALCON

A local voice assistant with a sci-fi HUD: say **"Hey Valcon"**, ask anything in English or Arabic, and VALCON answers out loud.

- **Brain:** Groq (`openai/gpt-oss-20b`, falls back to `openai/gpt-oss-120b`)
- **Voice:** ElevenLabs (`eleven_multilingual_v2`, a calm deep male voice); if ElevenLabs is unavailable, the browser's own voice
- **Ears:** Chrome's built-in speech recognition
- Keys stay in `.env` on your laptop; the page only talks to the local server.

## Start

Needs Node.js 20.6 or newer and Google Chrome.

```bash
npm start
```

The first run installs what it needs. If there is no `.env` yet it creates one from `.env.example`; put your keys in it:

```
GROQ_API_KEY=gsk_...
ELEVENLABS_API_KEY=sk_...
```

Chrome opens at http://localhost:3000. Click **INITIALIZE** (Chrome asks for the microphone once), and VALCON boots and greets you.

## Using it

| | |
| --- | --- |
| **"Hey Valcon, …"** | Ask in one go, or say "Hey Valcon", wait for the chime, then ask |
| `Space` | Talk without the wake phrase |
| `L` | Switch the listening language: English / العربية |
| `M` | Mute / unmute the microphone |
| Text box | Type a command instead of speaking |

Recognition often mishears the name, so "Falcon", "Vulcan", "Valkon" and "Val con" also wake him (in Arabic: «هاي فالكون»). VALCON stops listening while he speaks, so he never answers himself.

## Options (in `.env`)

```
GROQ_MODEL=openai/gpt-oss-20b
ELEVENLABS_VOICE_ID=nPczCjzI2devNBz1zQrb   # "Brian"
ELEVENLABS_MODEL=eleven_multilingual_v2
PORT=3000
```
