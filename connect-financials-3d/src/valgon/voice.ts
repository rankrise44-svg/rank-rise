import { VALGON } from './config';
import { signal, valgon } from './store';

/**
 * Valgon's voice (the browser's built-in speech, nothing is sent anywhere) and
 * his ears (the browser's speech recognition, where the browser has one).
 * Browsers only allow speech after the visitor has clicked or typed on the
 * page, so until then Valgon writes his words without saying them.
 */

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const vs = synth.getVoices();
  const en = vs.filter((v) => /^en/i.test(v.lang));
  return (
    en.find((v) => /en-GB/i.test(v.lang) && /daniel|george|arthur|male|ryan|thomas/i.test(v.name)) ||
    en.find((v) => /google uk english male/i.test(v.name)) ||
    en.find((v) => /en-GB/i.test(v.lang)) ||
    en.find((v) => /david|guy|mark|alex|male/i.test(v.name)) ||
    en[0] ||
    null
  );
}
if (synth) synth.onvoiceschanged = () => pickVoice();

/** Called on the first click or key press anywhere: from then on Valgon may speak. */
export function unlockVoice() {
  if (valgon.get().voiceReady) return;
  valgon.set({ voiceReady: true });
  try {
    // A silent utterance inside the gesture unlocks speech on iOS Safari.
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth?.speak(u);
  } catch {
    /* no speech in this browser */
  }
}

export const canSpeak = () => !!synth && valgon.get().voiceReady && !valgon.get().muted;

let speaking = false;
let wordTimer: ReturnType<typeof setInterval> | null = null;

/* ── natural voice from the site server (ElevenLabs), when it is running ── */
let audioCtx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;
let serverVoiceDown = false;

async function speakFromServer(text: string): Promise<boolean> {
  if (!VALGON.ttsEndpoint || serverVoiceDown || !canSpeak()) return false;
  try {
    const r = await fetch(VALGON.ttsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!r.ok) throw new Error(String(r.status));
    audioCtx = audioCtx ?? new AudioContext();
    await audioCtx.resume();
    const buf = await audioCtx.decodeAudioData(await r.arrayBuffer());
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(audioCtx.destination);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(analyser);
    current = src;
    signal.mode = 'speak';
    speaking = true;
    // the eye follows the real loudness of his voice
    const meter = setInterval(() => {
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      for (let i = 2; i < 60; i++) sum += bins[i];
      signal.pulse = Math.max(signal.pulse, Math.min(1, sum / (58 * 150)));
    }, 60);
    await new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start();
    });
    clearInterval(meter);
    speaking = false;
    current = null;
    return true;
  } catch {
    serverVoiceDown = true; // use the browser voice from now on
    return false;
  }
}

/** Speak (or, when speech isn't available, wait about as long as speaking would take). */
export async function speak(text: string): Promise<void> {
  if (await speakFromServer(text)) return;
  return speakWithBrowser(text);
}

function speakWithBrowser(text: string): Promise<void> {
  const estimate = Math.max(1300, text.length * 58);
  signal.mode = 'speak';
  // Words drive the orb: real word boundaries where the browser reports them, a steady beat otherwise.
  const startBeat = () => {
    stopBeat();
    wordTimer = setInterval(() => (signal.pulse = 1), 190);
  };
  if (!canSpeak()) {
    // Silent: just long enough for the words to type out and be read.
    startBeat();
    return sleep(Math.min(estimate, 900 + text.length * 22)).then(stopBeat);
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      speaking = false;
      stopBeat();
      resolve();
    };
    try {
      synth!.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || VALGON.voice.preferLang;
      u.rate = VALGON.voice.rate;
      u.pitch = VALGON.voice.pitch;
      let sawBoundary = false;
      u.onstart = () => {
        speaking = true;
        startBeat();
      };
      u.onboundary = () => {
        if (!sawBoundary) {
          sawBoundary = true;
          stopBeat();
        }
        signal.pulse = 1;
      };
      u.onend = finish;
      u.onerror = finish;
      synth!.speak(u);
    } catch {
      finish();
    }
    setTimeout(finish, estimate + 4000);
  });
}

function stopBeat() {
  if (wordTimer) clearInterval(wordTimer);
  wordTimer = null;
}

export function hush() {
  stopBeat();
  try {
    current?.stop();
  } catch {
    /* already stopped */
  }
  current = null;
  if (speaking || synth?.speaking) synth?.cancel();
  speaking = false;
}

/* ───────────────────────── listening ───────────────────────── */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const Ctor: (new () => Recognition) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)
    : undefined;

export const canListen = !!Ctor;
let active: Recognition | null = null;

/**
 * Listen for one question. Resolves with what was said ('' if nothing),
 * rejects with a reason when the microphone isn't allowed.
 */
export function listen(onInterim: (text: string) => void): Promise<string> {
  if (!Ctor) return Promise.reject(new Error('unsupported'));
  stopListening();
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    active = rec;
    rec.lang = VALGON.listenLang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      signal.pulse = 1;
      onInterim((finalText + ' ' + interim).trim());
    };
    rec.onerror = (e) => {
      active = null;
      if (e.error === 'no-speech' || e.error === 'aborted') resolve('');
      else reject(new Error(e.error));
    };
    rec.onend = () => {
      active = null;
      resolve(finalText.trim());
    };
    try {
      rec.start();
    } catch (err) {
      active = null;
      reject(err instanceof Error ? err : new Error('start-failed'));
    }
  });
}

export function stopListening() {
  try {
    active?.stop();
  } catch {
    /* already stopped */
  }
  active = null;
}
