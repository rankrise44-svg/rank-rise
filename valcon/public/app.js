/* VALCON — the page.
 * Listens for "Hey Valcon" (Chrome speech recognition), asks the server
 * (which asks Groq), speaks the reply (server → ElevenLabs, or the browser's
 * own voice as a fallback), and draws an audio-reactive orb.
 * No API keys live here: everything goes through /api on the local server. */
'use strict';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ───────────── settings ───────────── */
const GREETING = 'VALCON online. Systems fully operational, sir.';
const LANGS = { en: { code: 'en-US', label: 'EN' }, ar: { code: 'ar-SA', label: 'العربية' } };
const AWAKE_MS = 8000; // after "Hey Valcon" with nothing else, wait this long for the command
// The wake phrase (at the start of what was said), plus the names speech recognition tends to hear instead.
const WAKE = /^\s*(?:(?:um|uh|so|and)[\s,]+)?(?:(?:hey|hi|hello|ok|okay|yo|hay|a|يا|هاي|هلا|اهلا)[\s,]*)?(val[\s-]?con|val[\s-]?kon|val[\s-]?can|falcon|falkon|vulcan|volcan|volcon|valcone|balcon|walcon|فالكون|فلكون|ڤالكون|فولكان|فالكن|بالكون)(?=$|[\s,.!?،])/i;

/* ───────────── state ───────────── */
const S = {
  state: 'boot', // boot | standby | awake | thinking | speaking
  lang: localStorage.getItem('valcon.lang') === 'ar' ? 'ar' : 'en',
  muted: false,
  status: null,
  ttsOk: null, // null = untested, true / false after the first try
  started: performance.now(),
  awakeTimer: null,
  micLevel: 0,
  voiceLevel: 0,
};

/* ───────────── logs ───────────── */
const stamp = () => new Date().toTimeString().slice(0, 8);
function log(side, text, cls = '') {
  const box = side === 'R' ? $('logRight') : $('logLeft');
  if (!box) return;
  const d = document.createElement('div');
  d.innerHTML = `<span class="t">${stamp()}</span>`;
  const span = document.createElement('span');
  span.textContent = text;
  if (cls) span.className = cls;
  d.appendChild(span);
  box.appendChild(d);
  while (box.children.length > 60) box.firstChild.remove();
}
// Ambient system chatter so the panels feel alive.
const CHATTER = ['Core temperature nominal', 'Audio buffer flushed', 'Neural cache optimised', 'Heartbeat OK', 'Signal integrity 99.%', 'Spectral analysis idle', 'Memory sectors verified', 'Uplink stable', 'Noise floor recalibrated'];
setInterval(() => {
  if (S.state === 'boot') return;
  const msg = CHATTER[Math.floor(Math.random() * CHATTER.length)].replace('%', String(Math.floor(Math.random() * 10)));
  log(Math.random() < 0.5 ? 'L' : 'R', msg);
}, 4200);

function setState(st, hint) {
  S.state = st;
  const badge = $('stateBadge');
  if (badge) {
    badge.className = `state ${S.muted ? 'muted' : st}`;
    $('stateText').textContent = S.muted ? 'MIC MUTED' : { standby: 'STANDBY', awake: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING', boot: 'BOOT' }[st];
  }
  const h = $('hint');
  if (h) h.textContent = hint ?? (S.muted ? 'Microphone muted — press M' : st === 'awake' ? 'Listening, sir…' : st === 'thinking' ? 'Processing…' : st === 'speaking' ? '' : S.lang === 'ar' ? 'قل «هاي فالكون»' : 'Say “Hey Valcon”');
}

const isArabic = (t) => /[؀-ۿ]/.test(t);
function showText(id, text) {
  const el = $(id);
  el.textContent = text;
  el.dir = isArabic(text) ? 'rtl' : 'ltr';
}

/* ───────────── audio: context, mic level, TTS playback ───────────── */
let ctx, micAnalyser, voiceAnalyser, micData, voiceData;
async function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  voiceAnalyser = ctx.createAnalyser();
  voiceAnalyser.fftSize = 512;
  voiceAnalyser.connect(ctx.destination);
  voiceData = new Uint8Array(voiceAnalyser.frequencyBinCount);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const src = ctx.createMediaStreamSource(stream);
    micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 512;
    src.connect(micAnalyser);
    micData = new Uint8Array(micAnalyser.fftSize);
    return true;
  } catch (err) {
    return err.name || 'denied';
  }
}
function readLevels() {
  if (micAnalyser) {
    micAnalyser.getByteTimeDomainData(micData);
    let sum = 0;
    for (let i = 0; i < micData.length; i++) {
      const v = (micData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.min(1, Math.sqrt(sum / micData.length) * 4);
    S.micLevel += (rms - S.micLevel) * 0.3;
  }
  if (voiceAnalyser && S.state === 'speaking' && !S.fallbackVoice) {
    voiceAnalyser.getByteFrequencyData(voiceData);
    let sum = 0;
    for (let i = 2; i < 80; i++) sum += voiceData[i];
    const lvl = Math.min(1, sum / (78 * 160));
    S.voiceLevel += (lvl - S.voiceLevel) * 0.35;
  } else if (!S.fallbackVoice) S.voiceLevel *= 0.9;
  const meter = $('tMic');
  if (meter) meter.style.width = `${Math.round((S.muted ? 0 : S.micLevel) * 100)}%`;
}

/** Speak: ElevenLabs through the server, or the browser's own voice if that fails. */
async function speak(text) {
  pauseListening();
  setState('speaking');
  if (S.ttsOk !== false) {
    const t0 = performance.now();
    try {
      const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      const buf = await ctx.decodeAudioData(await r.arrayBuffer());
      if (S.ttsOk !== true) log('R', 'ElevenLabs voice online', 'ok');
      S.ttsOk = true;
      $('tVoice').textContent = 'ElevenLabs';
      log('R', `TTS ${Math.round(performance.now() - t0)} ms`);
      await new Promise((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(voiceAnalyser);
        src.onended = resolve;
        src.start();
      });
      return finishSpeaking();
    } catch (err) {
      S.ttsOk = false;
      log('R', `ElevenLabs unavailable: ${err.message}`, 'warn');
      log('R', 'Switching to browser voice', 'warn');
      $('tVoice').textContent = 'Browser (fallback)';
    }
  }
  await browserSpeak(text);
  finishSpeaking();
}

function browserSpeak(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const ar = isArabic(text);
    const voices = speechSynthesis.getVoices();
    u.voice = (ar ? voices.find((v) => /^ar/i.test(v.lang)) : voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|george|ryan|arthur/i.test(v.name)) || voices.find((v) => /^en/i.test(v.lang))) || null;
    u.lang = ar ? 'ar-SA' : 'en-GB';
    u.rate = 0.98;
    u.pitch = 0.8;
    S.fallbackVoice = true;
    const beat = setInterval(() => (S.voiceLevel = 0.35 + Math.random() * 0.5), 110);
    const done = () => {
      clearInterval(beat);
      S.fallbackVoice = false;
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setTimeout(done, Math.max(4000, text.length * 120));
  });
}

async function finishSpeaking() {
  S.voiceLevel = 0;
  await sleep(350); // let the room go quiet so VALCON doesn't hear its own tail
  setState('standby');
  resumeListening();
}

/* ───────────── brain ───────────── */
async function handle(command) {
  clearTimeout(S.awakeTimer);
  showText('youText', command);
  log('L', `Command: "${command}"`);
  setState('thinking');
  const t0 = performance.now();
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: command }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    const ms = Math.round(performance.now() - t0);
    $('tLatency').textContent = `${ms} ms`;
    log('R', `Groq ${data.model} · ${ms} ms`, 'ok');
    showText('valText', data.reply);
    await speak(data.reply);
  } catch (err) {
    log('R', `Brain error: ${err.message}`, 'bad');
    const msg = isArabic(command) ? 'عذراً سيدي، تعذّر الاتصال بالدماغ.' : 'My apologies, sir. I could not reach my brain just now.';
    showText('valText', msg);
    await speak(msg);
  }
}

/* ───────────── listening (Chrome Web Speech API) ───────────── */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let listening = false; // we want it running
let netErrors = 0;
// Repeated errors (no microphone, offline) are logged once and retried more slowly.
let lastError = '';
let retryDelay = 150;

function makeRecognizer() {
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 3;
  r.lang = LANGS[S.lang].code;
  r.onresult = onResult;
  r.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      log('L', 'Microphone permission denied — allow it in Chrome and reload', 'bad');
      listening = false;
      setState(S.state, 'Microphone blocked — allow it in Chrome');
      return;
    }
    if (e.error === 'network') netErrors++;
    retryDelay = Math.min(10000, retryDelay * 2);
    if (e.error !== lastError) {
      const why = { 'audio-capture': 'no microphone found', network: 'offline (Chrome speech needs internet)' }[e.error] || e.error;
      log('L', `Speech recognition: ${why} — retrying`, 'warn');
      lastError = e.error;
    }
  };
  r.onaudiostart = () => {
    if (lastError) log('L', 'Speech recognition back online', 'ok');
    lastError = '';
    retryDelay = 150;
  };
  r.onend = () => {
    // Chrome stops every so often; start again unless we paused on purpose.
    if (listening && !S.muted && S.state !== 'speaking') setTimeout(startRec, retryDelay);
  };
  return r;
}
function startRec() {
  if (!SR || !listening || S.muted || S.state === 'speaking') return;
  try {
    rec = rec || makeRecognizer();
    rec.lang = LANGS[S.lang].code;
    rec.start();
  } catch {
    /* already running */
  }
}
function pauseListening() {
  listening = false;
  try {
    rec?.abort();
  } catch {
    /* not running */
  }
}
function resumeListening() {
  listening = true;
  startRec();
}

function onResult(e) {
  if (S.state === 'speaking' || S.state === 'thinking') return;
  netErrors = 0;
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const res = e.results[i];
    // try every alternative for the wake phrase (recognition often mishears the name)
    const alts = Array.from(res).map((a) => a.transcript.trim());
    const text = alts[0];
    if (!res.isFinal) {
      if (S.state === 'standby' && alts.some((t) => WAKE.test(t))) wake(false);
      continue;
    }
    log('L', `Heard: "${text}"`);
    if (S.state === 'awake') {
      const m = text.match(WAKE);
      const cmd = (m ? text.slice(m.index + m[0].length) : text).replace(/^[\s,.!?،]+/, '').trim();
      if (cmd) handle(cmd);
      continue;
    }
    // standby: only a sentence with the wake phrase counts
    const hit = alts.map((t) => ({ t, m: t.match(WAKE) })).find((x) => x.m);
    if (!hit) continue;
    const cmd = hit.t.slice(hit.m.index + hit.m[0].length).replace(/^[\s,.!?،]+/, '').trim();
    if (cmd.length > 1) handle(cmd);
    else wake(true);
  }
}

function wake(announce) {
  if (S.state !== 'awake') {
    setState('awake');
    log('L', 'Wake phrase detected', 'ok');
    chime();
  }
  clearTimeout(S.awakeTimer);
  S.awakeTimer = setTimeout(() => {
    if (S.state === 'awake') {
      setState('standby');
      log('L', 'No command — back to standby');
    }
  }, AWAKE_MS);
  if (announce) showText('valText', S.lang === 'ar' ? 'نعم سيدي؟' : 'Yes, sir?');
}

function chime() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.3);
}

/* ───────────── controls ───────────── */
function setLang(l) {
  S.lang = l;
  localStorage.setItem('valcon.lang', l);
  $('tLang').textContent = LANGS[l].label;
  log('L', `Recognition language: ${LANGS[l].code}`);
  if (rec) {
    try {
      rec.abort();
    } catch {
      /* restart picks up the new language */
    }
  }
  setState(S.state);
}
document.addEventListener('keydown', (e) => {
  if (S.state === 'boot' || e.target === $('typeInput')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (S.state === 'standby') wake(true);
  } else if (e.key === 'l' || e.key === 'L') setLang(S.lang === 'en' ? 'ar' : 'en');
  else if (e.key === 'm' || e.key === 'M') {
    S.muted = !S.muted;
    log('L', S.muted ? 'Microphone muted' : 'Microphone live', S.muted ? 'warn' : 'ok');
    if (S.muted) pauseListening();
    else resumeListening();
    setState(S.state);
  }
});
$('typeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('typeInput').value.trim();
  if (!v || S.state === 'thinking' || S.state === 'speaking') return;
  $('typeInput').value = '';
  handle(v);
});

/* ───────────── the orb ───────────── */
function startOrb() {
  const cv = $('orb');
  const g = cv.getContext('2d');
  let W = 0;
  const resize = () => {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width;
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize);
  resize();
  const N = 420;
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
  const BARS = 128;
  const seed = Array.from({ length: BARS }, () => Math.random());
  let t = 0;
  let level = 0;
  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readLevels();
    const st = S.state;
    // what drives the orb: the voice while speaking, the mic while listening, a calm breath at rest
    const target = st === 'speaking' ? 0.15 + S.voiceLevel * 1.1 : st === 'awake' ? 0.25 + S.micLevel * 1.2 + 0.15 * Math.abs(Math.sin(t * 5)) : st === 'thinking' ? 0.35 + 0.15 * Math.sin(t * 10) : 0.06 + S.micLevel * 0.25 + 0.04 * Math.sin(t * 1.3);
    level += (target - level) * Math.min(1, dt * 12);
    const spin = st === 'thinking' ? 3.2 : st === 'speaking' ? 1.6 : st === 'awake' ? 1.3 : 0.6;
    t += dt * spin;
    const c = W / 2;
    const R = W / 2;
    g.clearRect(0, 0, W, W);

    const glow = g.createRadialGradient(c, c, R * 0.05, c, c, R);
    glow.addColorStop(0, `rgba(0,229,255,${0.28 + level * 0.3})`);
    glow.addColorStop(0.5, `rgba(0,140,200,${0.08 + level * 0.1})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, W);

    g.lineCap = 'round';
    // HUD rings
    for (let i = 0; i < 6; i++) {
      const a = t * 0.4 + (i * Math.PI) / 3;
      g.beginPath();
      g.arc(c, c, R * 0.9, a, a + 0.75);
      g.strokeStyle = 'rgba(0,229,255,0.55)';
      g.lineWidth = 2;
      g.stroke();
    }
    g.save();
    g.translate(c, c);
    g.rotate(-t * 0.2);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const long = i % 10 === 0;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97);
      g.lineTo(Math.cos(a) * R * (long ? 0.93 : 0.95), Math.sin(a) * R * (long ? 0.93 : 0.95));
      g.strokeStyle = `rgba(0,229,255,${long ? 0.8 : 0.3})`;
      g.lineWidth = long ? 1.6 : 1;
      g.stroke();
    }
    g.restore();
    g.setLineDash([3, 8]);
    g.beginPath();
    g.arc(c, c, R * 0.76, -t * 0.6, -t * 0.6 + Math.PI * 2);
    g.strokeStyle = 'rgba(0,229,255,0.4)';
    g.lineWidth = 1;
    g.stroke();
    g.setLineDash([]);

    // listening ripples
    if (st === 'awake') {
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.5 + k / 3) % 1;
        g.beginPath();
        g.arc(c, c, R * (0.85 - p * 0.45), 0, Math.PI * 2);
        g.strokeStyle = `rgba(89,255,176,${(1 - p) * 0.45})`;
        g.lineWidth = 1.4;
        g.stroke();
      }
    }

    // voice waveform ring
    const r0 = R * 0.33 * (1 + level * 0.1);
    const base = R * 0.5;
    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
      const wob = Math.abs(Math.sin(t * 7 + i * 0.6 + seed[i] * 6) * Math.sin(t * 2.1 + i * 0.25));
      const len = R * (0.01 + level * 0.2 * (0.3 + 0.7 * wob) * (0.6 + seed[i] * 0.4));
      g.beginPath();
      g.moveTo(c + Math.cos(a) * base, c + Math.sin(a) * base);
      g.lineTo(c + Math.cos(a) * (base + len), c + Math.sin(a) * (base + len));
      g.strokeStyle = `rgba(${st === 'awake' ? '89,255,176' : '0,229,255'},${0.4 + level * 0.5})`;
      g.lineWidth = 2;
      g.stroke();
    }

    // core
    const core = g.createRadialGradient(c - r0 * 0.3, c - r0 * 0.35, r0 * 0.05, c, c, r0);
    core.addColorStop(0, 'rgba(230,255,255,0.95)');
    core.addColorStop(0.3, 'rgba(0,229,255,0.9)');
    core.addColorStop(0.75, 'rgba(0,80,120,0.9)');
    core.addColorStop(1, 'rgba(0,20,35,0.85)');
    g.beginPath();
    g.arc(c, c, r0, 0, Math.PI * 2);
    g.fillStyle = core;
    g.shadowColor = 'rgba(0,229,255,1)';
    g.shadowBlur = R * (0.15 + level * 0.25);
    g.fill();
    g.shadowBlur = 0;

    // particle shell
    const ry = t * 0.7;
    const rx = 0.5 + Math.sin(t * 0.3) * 0.3;
    const sr = r0 * (1.35 + level * 0.25);
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    for (const [px, py, pz] of pts) {
      const x1 = px * cy + pz * sy;
      const z1 = -px * sy + pz * cy;
      const y2 = py * cx - z1 * sx;
      const z2 = py * sx + z1 * cx;
      const d = (z2 + 1) / 2;
      const j = 1 + level * 0.12 * Math.sin(t * 9 + px * 11);
      g.beginPath();
      g.arc(c + x1 * sr * j, c + y2 * sr * j, 1.6 * (0.4 + d), 0, Math.PI * 2);
      g.fillStyle = `rgba(160,250,255,${0.1 + d * 0.75})`;
      g.fill();
    }
  };
  requestAnimationFrame(frame);
}

/* ───────────── boot ───────────── */
async function typeLine(text, cls = '') {
  const box = $('bootLines');
  const span = document.createElement('span');
  if (cls) span.className = cls;
  box.appendChild(span);
  for (let i = 0; i <= text.length; i++) {
    span.textContent = text.slice(0, i);
    await sleep(12);
  }
  box.appendChild(document.createTextNode('\n'));
}
function progress(p) {
  $('barFill').style.width = `${p}%`;
  $('barPct').textContent = `${Math.round(p)}%`;
}

async function boot() {
  $('initBtn').hidden = true;
  $('bootHint').hidden = true;
  $('bootRun').hidden = false;
  progress(4);
  await typeLine('> VALCON CORE v1.0 — cold start');
  progress(14);
  await typeLine('> Initialising audio subsystem…');
  const mic = await initAudio();
  progress(30);
  await typeLine(mic === true ? '  microphone ............ ONLINE' : `  microphone ............ ${mic}`, mic === true ? 'ok' : 'bad');
  await typeLine(SR ? '  speech recognition .... CHROME WEB SPEECH' : '  speech recognition .... NOT AVAILABLE (use Chrome)', SR ? 'ok' : 'bad');
  progress(48);
  await typeLine('> Linking to cognitive core…');
  try {
    S.status = await (await fetch('/api/status')).json();
  } catch {
    S.status = { groq: false, tts: false };
  }
  progress(66);
  await typeLine(S.status.groq ? `  groq ................... ${S.status.model}` : '  groq ................... KEY MISSING', S.status.groq ? 'ok' : 'bad');
  await typeLine(S.status.tts ? '  voice .................. ELEVENLABS · MULTILINGUAL' : '  voice .................. BROWSER FALLBACK (ElevenLabs key not set)', S.status.tts ? 'ok' : 'warn');
  if (!S.status.tts) S.ttsOk = false;
  progress(84);
  await typeLine('> Calibrating holographic interface…');
  for (let p = 84; p <= 100; p += 2) {
    progress(p);
    await sleep(40);
  }
  await typeLine('> ALL SYSTEMS NOMINAL', 'ok');
  $('bootTitle').classList.add('on');
  await sleep(1200);

  $('boot').hidden = true;
  $('hud').hidden = false;
  $('tModel').textContent = S.status.model || 'offline';
  $('tVoice').textContent = S.status.tts ? 'ElevenLabs' : 'Browser (fallback)';
  $('tLang').textContent = LANGS[S.lang].label;
  setInterval(() => {
    $('clock').textContent = new Date().toTimeString().slice(0, 8);
    const s = Math.floor((performance.now() - S.started) / 1000);
    $('tUptime').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
  startOrb();
  log('L', 'VALCON online', 'ok');
  log('R', `Brain: Groq ${S.status.model || '—'}`);
  log('R', S.status.tts ? `Voice: ElevenLabs ${S.status.ttsModel}` : 'Voice: browser fallback', S.status.tts ? '' : 'warn');
  if (!SR) log('L', 'Speech recognition needs Google Chrome', 'bad');

  // Greet once, out loud, then start listening for the wake phrase.
  showText('valText', GREETING);
  await speak(GREETING);
}

let booted = false;
const startBoot = () => {
  if (booted) return;
  booted = true;
  boot();
};
$('initBtn').addEventListener('click', startBoot);
document.addEventListener('keydown', (e) => {
  if (!booted && e.key !== 'Tab') startBoot();
});
