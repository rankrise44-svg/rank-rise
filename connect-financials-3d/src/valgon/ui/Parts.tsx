import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ask, repeatLast, talk, toggleMute } from '../engine';
import { useValgon } from '../store';
import { canListen, unlockVoice } from '../voice';

/** The conversation so far. `last` limits it to the most recent lines. */
export function Transcript({ last, className = '' }: { last?: number; className?: string }) {
  const { lines, interim } = useValgon();
  const box = useRef<HTMLDivElement>(null);
  const shown = last ? lines.slice(-last) : lines;
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, interim]);
  return (
    <div ref={box} className={`grid content-start gap-3 overflow-y-auto [scrollbar-width:thin] ${className}`} aria-live="polite">
      {shown.map((l) => (
        <div key={l.id} className={`vg-line grid gap-1 ${l.who === 'me' ? 'justify-items-end text-right' : ''}`}>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${l.who === 'me' ? 'text-muted' : 'text-gold'}`}>{l.who === 'me' ? 'You' : 'Valgon'}</span>
          <span className={l.who === 'me' ? 'max-w-[88%] rounded-2xl rounded-br-md border border-gold/25 bg-navy-mid/70 px-3.5 py-2 text-[14px] text-ink' : 'text-[15px] leading-relaxed text-ink/95'}>
            {l.text}
          </span>
          {l.links && l.links.length > 0 && (
            <span className="flex flex-wrap gap-2 pt-1">
              {l.links.map((k) => (
                <a key={k.href} href={k.href} target={k.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="rounded-full border border-gold/40 px-3 py-1 text-[12px] text-gold-hi hover:border-gold-hi">
                  {k.label}
                </a>
              ))}
            </span>
          )}
        </div>
      ))}
      {interim && (
        <div className="grid justify-items-end gap-1 text-right opacity-70">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">You</span>
          <span className="text-[14px] italic text-ink">{interim}…</span>
        </div>
      )}
    </div>
  );
}

/** Typing box with the microphone and send buttons. */
export function Composer({ autoFocus = false, big = false }: { autoFocus?: boolean; big?: boolean }) {
  const { mode } = useValgon();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus && window.matchMedia('(pointer: fine)').matches) input.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    unlockVoice();
    const q = text;
    setText('');
    ask(q);
  };
  const hearing = mode === 'hear';
  return (
    <form onSubmit={submit} className={`flex items-center gap-2 rounded-full border border-gold/30 bg-abyss/70 p-1.5 backdrop-blur-md transition focus-within:border-gold-hi focus-within:shadow-[0_0_0_4px_rgba(212,175,55,0.12)] ${big ? 'pl-1.5' : ''}`} autoComplete="off">
      <button
        type="button"
        onClick={() => (unlockVoice(), talk())}
        aria-label={canListen ? 'Talk to Valgon' : 'Voice input is not available in this browser'}
        title={canListen ? 'Talk to Valgon' : 'Voice input is not available in this browser'}
        className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5B8CFF] to-[#12244D] text-ink shadow-[0_0_18px_rgba(91,140,255,0.45)] transition hover:brightness-110 ${big ? 'h-11 w-11' : 'h-9 w-9'} ${hearing ? 'vg-mic-on' : ''} ${canListen ? '' : 'opacity-50'}`}
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
        </svg>
      </button>
      <input
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Ask Valgon"
        placeholder={hearing ? 'Listening…' : 'Ask Valgon, or say where to go…'}
        className={`min-w-0 flex-1 bg-transparent px-2 text-ink placeholder:text-muted/80 focus:outline-none ${big ? 'h-11 text-[16px]' : 'h-9 text-[14px]'}`}
      />
      <button type="submit" className={`shrink-0 rounded-full bg-gradient-to-b from-gold-hi to-gold font-semibold uppercase tracking-[0.14em] text-abyss transition hover:brightness-110 ${big ? 'h-11 px-6 text-[13px]' : 'h-9 px-4 text-[12px]'}`}>
        Send
      </button>
    </form>
  );
}

/** Suggested questions. */
export function Chips({ className = '', wrap = false }: { className?: string; wrap?: boolean }) {
  const { suggestions } = useValgon();
  if (!suggestions.length) return null;
  return (
    <div className={`flex gap-2 ${wrap ? 'flex-wrap' : 'overflow-x-auto [scrollbar-width:none]'} ${className}`}>
      {suggestions.map((s) => (
        <button key={s} type="button" onClick={() => (unlockVoice(), ask(s))} className="shrink-0 rounded-full border border-gold/25 bg-navy/60 px-3.5 py-1.5 text-[12.5px] text-ink/85 transition hover:-translate-y-px hover:border-gold-hi hover:text-gold-hi">
          {s}
        </button>
      ))}
    </div>
  );
}

/** Mute / voice controls. */
export function VoiceToggle({ className = '' }: { className?: string }) {
  const { muted, voiceReady } = useValgon();
  if (!voiceReady)
    return (
      <button type="button" onClick={() => (unlockVoice(), repeatLast())} className={`rounded-full border border-gold/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-hi hover:border-gold-hi ${className}`}>
        ▶ Hear Valgon
      </button>
    );
  return (
    <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Turn Valgon’s voice on' : 'Mute Valgon'} title={muted ? 'Voice off' : 'Voice on'} className={`grid h-8 w-8 place-items-center rounded-full border border-gold/25 text-[14px] text-ink/85 hover:border-gold-hi ${className}`}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
