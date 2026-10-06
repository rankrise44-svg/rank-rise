import { PAGES } from '../config/pages';
import { currentRoute, navigate, requestedOnOpen, waitFor } from '../lib/route';
import { openAccount } from '../ui/openAccount';
import { think } from './brain';
import { nextLineId, signal, valgon, type ValgonMode } from './store';
import type { ValgonLink, ValgonReply } from './types';
import { canListen, hush, listen, speak, stopListening } from './voice';

/**
 * Runs Valgon: takes a question, asks the brain, then speaks the answer while
 * the words type out, opens pages, and glides a pointer to what he talks about.
 * Each new question cancels whatever he was doing.
 */

let run = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const alive = (id: number) => id === run;

function mode(m: ValgonMode, status: string) {
  signal.mode = m;
  valgon.set({ mode: m, status });
}

function addLine(who: 'valgon' | 'me', text: string, links?: ValgonLink[]) {
  const line = { id: nextLineId(), who, text, links };
  valgon.set({ lines: [...valgon.get().lines, line].slice(-40) });
  return line.id;
}

function setLineText(id: number, text: string) {
  valgon.set({ lines: valgon.get().lines.map((l) => (l.id === id ? { ...l, text } : l)) });
}

/** Write the words out while saying them. */
async function say(text: string, id: number, links?: ValgonLink[]) {
  if (!alive(id)) return;
  mode('speak', 'Speaking');
  const lineId = addLine('valgon', '', links);
  const typing = (async () => {
    for (let i = 2; i <= text.length + 1; i += 2) {
      if (!alive(id)) return setLineText(lineId, text);
      setLineText(lineId, text.slice(0, i));
      await sleep(16);
    }
  })();
  await Promise.all([typing, speak(text)]);
}

/* ── pointing: a glowing pointer and a gold ring around the subject ── */
let pointer: HTMLDivElement | null = null;
let spotted: HTMLElement | null = null;
let unspotTimer: ReturnType<typeof setTimeout> | null = null;

function ensurePointer() {
  if (pointer) return pointer;
  pointer = document.createElement('div');
  pointer.className = 'vg-pointer';
  pointer.setAttribute('aria-hidden', 'true');
  pointer.hidden = true;
  document.body.appendChild(pointer);
  return pointer;
}

export function unspot() {
  if (unspotTimer) clearTimeout(unspotTimer);
  spotted?.classList.remove('vg-spot');
  spotted = null;
  if (pointer) pointer.hidden = true;
}

async function spot(selector: string, id: number) {
  const el = await waitFor(selector, 2500);
  if (!el || !alive(id)) return;
  unspot();
  const r0 = el.getBoundingClientRect();
  if (r0.top < 80 || r0.bottom > innerHeight) {
    el.scrollIntoView({ behavior: 'smooth', block: el.offsetHeight > innerHeight * 0.7 ? 'start' : 'center' });
    await sleep(700);
  }
  if (!alive(id)) return;
  el.classList.add('vg-spot');
  spotted = el;
  const p = ensurePointer();
  const r = el.getBoundingClientRect();
  const x = Math.min(innerWidth - 24, Math.max(24, r.left + Math.min(r.width / 2, 180)));
  const y = Math.min(innerHeight - 24, Math.max(110, r.top + Math.min(r.height / 2, 70)));
  p.hidden = false;
  p.style.transform = `translate(${x}px, ${y}px)`;
  p.classList.remove('tap');
  void p.offsetWidth;
  p.classList.add('tap');
  unspotTimer = setTimeout(unspot, 5000);
  await sleep(600);
}

async function go(page: Parameters<typeof navigate>[0], section: string | undefined, id: number) {
  const from = currentRoute().page;
  mode('work', `Opening ${section ? PAGES[page].sections.find((s) => s.id === section)?.label ?? PAGES[page].label : PAGES[page].label}`);
  // Leaving the Valgon page: the conversation carries on in the docked panel.
  if (from === 'valgon' && page !== 'valgon') valgon.set({ dockOpen: true });
  navigate(page, section);
  await waitFor(`[data-page="${page}"]`, 4000);
  if (section) {
    await waitFor(`#${CSS.escape(section)}`, 4000);
    await sleep(page === 'home' ? 1800 : 900);
  } else await sleep(500);
  return alive(id);
}

async function perform(reply: ValgonReply, id: number) {
  const steps = reply.steps ?? [];
  const moves = steps.some((s) => 'go' in s);
  valgon.set({ suggestions: reply.suggestions ?? PAGES[currentRoute().page].suggestions });
  // Say the answer first, unless it begins by opening a page: then open while speaking.
  if (steps[0] && 'go' in steps[0]) {
    const first = steps[0];
    await Promise.all([say(reply.say, id, reply.links), go(first.go, first.section, id)]);
  } else await say(reply.say, id, reply.links);
  for (const st of steps.slice(steps[0] && 'go' in steps[0] ? 1 : 0)) {
    if (!alive(id)) return;
    if ('go' in st) {
      if (!(await go(st.go, st.section, id))) return;
    } else if ('spot' in st) await spot(st.spot, id);
    else if ('say' in st) await say(st.say, id);
    else if ('openAccount' in st) openAccount(st.tier ?? null);
    else if ('instrument' in st) window.dispatchEvent(new CustomEvent('valgon:instrument', { detail: st.instrument }));
    else if ('wait' in st) await sleep(st.wait);
  }
  if (!alive(id)) return;
  mode('listen', 'Listening');
  // On a phone the panel covers the page: once there, fold Valgon back into his button.
  if (moves && window.matchMedia('(max-width: 639.98px)').matches) setTimeout(() => alive(id) && valgon.set({ dockOpen: false }), 1200);
}

/** Ask Valgon something (typed, spoken or a suggestion chip). */
export async function ask(text: string) {
  const q = text.trim();
  if (!q) return;
  const id = ++run;
  hush();
  stopListening();
  unspot();
  addLine('me', q);
  signal.awake = true;
  valgon.set({ interim: '' });
  mode('work', 'Thinking');
  const ctx = { page: currentRoute().page, history: valgon.get().lines };
  const [reply] = await Promise.all([think(q, ctx), sleep(350)]);
  if (!alive(id)) return;
  await perform(reply, id);
}

/** Valgon introduces himself (once per visit, unless asked again). */
let greeted = false;
export async function greet(force = false) {
  if (greeted && !force) return;
  greeted = true;
  const id = ++run;
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  // He starts each visit asleep; the eye wakes, then he speaks.
  mode('idle', 'Sleeping');
  await sleep(1000);
  if (!alive(id)) return;
  mode('work', 'Waking up');
  for (let i = 0; i < 30 && !signal.awake; i++) await sleep(100);
  signal.awake = true;
  if (!alive(id)) return;
  const back = requestedOnOpen;
  const backLabel = back ? (back.section && PAGES[back.page].sections.find((x) => x.id === back.section)?.label) || PAGES[back.page].label : null;
  valgon.set({ suggestions: backLabel ? [`Take me to ${backLabel}`, ...PAGES.valgon.suggestions.slice(0, 3)] : PAGES.valgon.suggestions });
  await say(
    `Good ${part}. I am Valgon, your guide to Connect Financials. ${backLabel ? `Shall I take you to ${backLabel}? Or tell me where you would like to go.` : 'Where would you like to go? You can ask me, or pick a destination below.'}`,
    id,
  );
  if (alive(id)) mode('listen', 'Listening');
}

/** Say the last thing again (used when voice becomes available after the greeting). */
export async function repeatLast() {
  const last = [...valgon.get().lines].reverse().find((l) => l.who === 'valgon');
  if (!last) return greet(true);
  const id = ++run;
  mode('speak', 'Speaking');
  await speak(last.text);
  if (alive(id)) mode('listen', 'Listening');
}

/** Why the microphone failed, in words the visitor can act on. */
function micProblem(reason: string): string {
  if (reason === 'not-allowed' || reason === 'service-not-allowed') {
    if (window.self !== window.top) return 'This preview does not allow the microphone. Run the website with npm start and open localhost:8787 in Chrome to talk to me.';
    if (!window.isSecureContext) return 'Browsers only allow the microphone on localhost or https. Open the site at localhost:8787.';
    return 'The microphone is blocked. Click the icon on the left of the address bar, allow the microphone, and try again.';
  }
  if (reason === 'audio-capture') return 'I cannot find a microphone. Check that one is connected and selected in your system settings.';
  if (reason === 'network') return 'Chrome could not reach its speech service. Check your internet connection and try again.';
  if (reason === 'language-not-supported') return 'This browser does not support English speech recognition. Please use Chrome.';
  return 'I could not hear you. Type your question instead.';
}

/** Microphone: listen, then ask what was heard. */
export async function talk() {
  if (!canListen) {
    addLine('valgon', 'Voice input is not available in this browser. Please use Chrome or Edge, or type your question and I will answer out loud.');
    return;
  }
  const id = ++run;
  hush();
  unspot();
  mode('hear', 'Listening to you');
  try {
    const heard = await listen((t) => valgon.set({ interim: t }));
    if (!alive(id)) return;
    valgon.set({ interim: '' });
    if (heard) await ask(heard);
    else mode('listen', 'Listening');
  } catch (err) {
    if (!alive(id)) return;
    valgon.set({ interim: '' });
    const reason = (err as Error).message;
    addLine('valgon', micProblem(reason));
    mode('listen', 'Listening');
  }
}

export function stopAll() {
  run++;
  hush();
  stopListening();
  unspot();
  mode('idle', 'Online');
}

export function toggleMute() {
  const muted = !valgon.get().muted;
  valgon.set({ muted });
  if (muted) hush();
}
