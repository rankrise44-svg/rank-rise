import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ACCOUNT_TIERS } from '../data/market';
import { COMPANY } from '../config/company';

/**
 * Scripted support assistant. It answers only from ACCOUNT_TIERS and COMPANY,
 * never sends anything anywhere, and hands off to the support email for
 * anything it doesn't recognise.
 */

type Topic = 'accounts' | 'funding' | 'fees' | 'regulation' | 'person' | 'leverage' | 'hello' | 'fallback';
interface Msg {
  id: number;
  from: 'bot' | 'user';
  body: ReactNode;
}

const QUICK: { topic: Topic; label: string }[] = [
  { topic: 'accounts', label: 'Account types' },
  { topic: 'funding', label: 'Deposits & withdrawals' },
  { topic: 'fees', label: 'Spreads & fees' },
  { topic: 'regulation', label: 'Regulation' },
  { topic: 'person', label: 'Talk to a person' },
];

const link = 'font-semibold text-gold-hi underline underline-offset-2 hover:text-ink';
const tradingTiers = ACCOUNT_TIERS.filter((t) => t.id !== 'demo');
const demoTier = ACCOUNT_TIERS.find((t) => t.id === 'demo');
const leverages = [...new Set(ACCOUNT_TIERS.map((t) => t.leverage))];

function SupportEmail() {
  return (
    <a className={link} href={`mailto:${COMPANY.emails.support}`}>
      {COMPANY.emails.support}
    </a>
  );
}

function reply(topic: Topic): ReactNode {
  switch (topic) {
    case 'hello':
      return <p>Hello. Pick a topic below or type a question, and I will share what I can from our published account details.</p>;
    case 'accounts':
      return (
        <>
          <p>{COMPANY.brand} offers these accounts:</p>
          <ul className="mt-2 space-y-1.5">
            {ACCOUNT_TIERS.map((t) => (
              <li key={t.id}>
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="block text-muted">
                  {t.minDeposit > 0 ? `Min. deposit $${t.minDeposit.toLocaleString('en-US')}` : 'No deposit'} · {t.spread} · {t.execution}
                </span>
              </li>
            ))}
          </ul>
        </>
      );
    case 'funding':
      return (
        <>
          <p>Minimum first deposits by account:</p>
          <ul className="mt-2 space-y-1">
            {tradingTiers.map((t) => (
              <li key={t.id}>
                {t.name}: <span className="num font-semibold text-ink">${t.minDeposit.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            The Trader Portal lists bank wire, card and USDT (TRC20) as funding methods. For processing times, limits and withdrawal questions, email <SupportEmail />.
          </p>
        </>
      );
    case 'fees':
      return (
        <>
          <p>Spreads and commission by account:</p>
          <ul className="mt-2 space-y-1.5">
            {tradingTiers.map((t) => (
              <li key={t.id}>
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="block text-muted">
                  {t.spread} · {t.commission}
                </span>
              </li>
            ))}
          </ul>
          {demoTier && <p className="mt-2">{demoTier.name}: {demoTier.spread.toLowerCase()}, {demoTier.commission.toLowerCase()}.</p>}
        </>
      );
    case 'leverage':
      return (
        <p>
          Leverage: {leverages.join(' / ')} across our account types. Leverage magnifies losses as well as gains.
        </p>
      );
    case 'regulation':
      return (
        <>
          <p>{COMPANY.legalName} is licensed by:</p>
          <ul className="mt-2 space-y-1">
            {COMPANY.regulators.map((r) => (
              <li key={r.licence}>
                {r.name} — licence <span className="num font-semibold text-ink">{r.licence}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted">Registered address: {COMPANY.address}</p>
          <p className="mt-2">
            For compliance questions: <a className={link} href={`mailto:${COMPANY.emails.compliance}`}>{COMPANY.emails.compliance}</a>
          </p>
        </>
      );
    case 'person':
      return (
        <>
          <p>Our team can help directly:</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              Email: <SupportEmail />
            </li>
            <li>
              Telegram:{' '}
              <a className={link} href={COMPANY.social.telegram} target="_blank" rel="noopener noreferrer">
                {COMPANY.social.telegram.replace(/^https?:\/\//, '')}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              WhatsApp:{' '}
              <a className={link} href={COMPANY.social.whatsapp} target="_blank" rel="noopener noreferrer">
                {COMPANY.social.whatsapp.replace(/^https?:\/\//, '')}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </>
      );
    default:
      return (
        <p>
          I can only answer a few common questions here. For anything else, email <SupportEmail /> and the team will get back to you.
        </p>
      );
  }
}

const KEYWORDS: [Topic, RegExp][] = [
  ['person', /\b(human|person|agent|someone|talk|speak|call|contact|support|email|telegram|whatsapp|help ?desk)\b/],
  ['regulation', /(regulat|licen[cs]|authori[sz]|fsa|sfsa|cfsa|safe|legit|trust|address|where are you)/],
  ['funding', /(deposit|withdraw|fund|payment|pay in|pay out|usdt|trc ?20|crypto transfer|card|wire|bank|minimum)/],
  ['fees', /(spread|fee|commission|cost|charge|pip|price)/],
  ['leverage', /(leverage|margin|1:\d+)/],
  ['accounts', /(account|tier|standard|plus|raw|vip|islamic|swap[- ]?free|demo|open)/],
  ['hello', /^(hi|hello|hey|good (morning|afternoon|evening))\b/],
];

function classify(text: string): Topic {
  const t = text.toLowerCase().trim();
  return KEYWORDS.find(([, re]) => re.test(t))?.[0] ?? 'fallback';
}

export function LiveSupportChat() {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      id: 0,
      from: 'bot',
      body: <p>Welcome to {COMPANY.brand}. I am an automated assistant and can answer common questions about accounts, funding, fees and regulation. I cannot see your account or give financial advice.</p>,
    },
  ]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const wasOpen = useRef(false);

  // Focus in on open; back to the launcher on close.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) btnRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, open]);

  function ask(userText: string, topic: Topic) {
    setMsgs((m) => [...m, { id: nextId.current++, from: 'user', body: <p>{userText}</p> }]);
    setTyping(true);
    const delay = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 250 : 650 + Math.random() * 500;
    timers.current.push(
      window.setTimeout(() => {
        setTyping(false);
        setMsgs((m) => [...m, { id: nextId.current++, from: 'bot', body: reply(topic) }]);
      }, delay),
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;
    setDraft('');
    ask(text, classify(text));
  }

  function onPanelKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {!open && (
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={false}
          className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-abyss shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)] transition hover:bg-gold-hi sm:h-14 sm:w-auto sm:gap-2 sm:px-5"
          style={{ right: 'calc(env(safe-area-inset-right) + 16px)', bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
          </svg>
          <span className="sr-only sm:not-sr-only sm:text-sm sm:font-semibold">Help</span>
          <span className="sr-only"> — open automated support assistant</span>
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onKeyDown={onPanelKey}
          className="glass fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl sm:inset-x-auto sm:bottom-[calc(env(safe-area-inset-bottom)+16px)] sm:right-[calc(env(safe-area-inset-right)+16px)] sm:w-[380px] sm:max-h-[min(640px,80vh)] sm:rounded-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-gold/20 px-4 py-3">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-ink">
                {COMPANY.brand} support
              </h2>
              <p id={descId} className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-hi">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
                Automated assistant
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-muted transition hover:bg-navy-mid hover:text-ink"
              aria-label="Close support chat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
            {msgs.map((m) => (
              <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={m.from === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-gold px-3.5 py-2 text-abyss' : 'max-w-[92%] rounded-2xl rounded-bl-sm border border-gold/20 bg-abyss/60 px-3.5 py-2.5 text-ink/90'}>
                  <span className="sr-only">{m.from === 'user' ? 'You: ' : 'Assistant: '}</span>
                  {m.body}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-gold/20 bg-abyss/60 px-3.5 py-3">
                  <span className="sr-only">Assistant is typing</span>
                  {[0, 150, 300].map((d) => (
                    <span key={d} aria-hidden className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-hi motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gold/20 px-4 pb-3 pt-3">
            <div role="group" aria-label="Suggested topics" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
              {QUICK.map((q) => (
                <button
                  key={q.topic}
                  type="button"
                  aria-disabled={typing}
                  onClick={() => !typing && ask(q.label, q.topic)}
                  className="shrink-0 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-gold-hi hover:text-gold-hi aria-disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <label htmlFor="support-chat-input" className="sr-only">
                Type your question
              </label>
              <input
                ref={inputRef}
                id="support-chat-input"
                type="text"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question…"
                maxLength={300}
                className="min-w-0 flex-1 rounded-full border border-gold/25 bg-abyss/60 px-4 py-2 text-base text-ink placeholder:text-muted/70 focus:border-gold-hi focus:outline-none focus-visible:outline-2 focus-visible:outline-gold-hi sm:text-sm"
              />
              <button type="submit" aria-disabled={!draft.trim() || typing} className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-abyss transition hover:bg-gold-hi aria-disabled:opacity-50">
                Send
              </button>
            </form>
            <p className="mt-2 text-[10px] leading-snug text-muted">Automated answers from published account information. Not financial advice. Nothing you type is sent anywhere.</p>
          </div>
        </div>
      )}
    </>
  );
}
