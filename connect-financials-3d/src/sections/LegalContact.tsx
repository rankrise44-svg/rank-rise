import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { COMPANY, RISK_WARNING_FULL } from '../config/company';
import { RiskNote } from '../ui/RiskNote';

/* ------------------------------------------------------------------ */
/* Legal                                                               */
/* ------------------------------------------------------------------ */

const regulatorSentence = COMPANY.regulators.map((r) => `the ${r.name} (licence no. ${r.licence})`).join(' and ');

type Doc = { id: string; title: string; paras: string[] };

// Summaries derived from the previous app's policy text, with its latency,
// fill-rate, leverage and certification figures removed.
const DOCS: Doc[] = [
  {
    id: 'terms',
    title: 'Terms & Conditions',
    paras: [
      `${COMPANY.legalName} ("the Company") is authorised and regulated by ${regulatorSentence}. The Client Agreement governs all trading accounts, transactions and orders placed through Connect Financials platforms, including MetaTrader 5.`,
      'Available leverage depends on the account type and the asset class traded. Margin call and stop-out levels are set out in the Client Agreement for each account.',
      'Clients who require it may request an Islamic swap-free account, which removes overnight rollover charges, subject to the Company’s fair-usage terms.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    paras: [
      'Personal data is collected only to open and maintain your account, meet regulatory and audit obligations, and keep the platforms secure.',
      'Communications with our websites and trading interfaces are encrypted, and access to client records is restricted by role. We do not sell or rent client personal data to advertisers or other third parties.',
    ],
  },
  {
    id: 'risk',
    title: 'Risk Disclosure',
    paras: [
      RISK_WARNING_FULL,
      'Markets can move sharply on economic releases, central bank decisions, geopolitical events and gaps in liquidity. Orders placed in fast markets or outside normal session hours may be filled at a price different from the one requested (slippage), which can be in your favour or against you.',
      'Before you trade, consider whether leveraged derivatives suit your objectives, financial situation and experience, and seek independent advice if you are unsure.',
    ],
  },
  {
    id: 'aml',
    title: 'AML / KYC Policy',
    paras: [
      `${COMPANY.legalName} applies anti-money-laundering (AML) and counter-terrorist-financing controls in line with the requirements of its regulators and FATF recommendations. Every account must be verified before funds can be withdrawn.`,
      'Verification requires a valid government-issued photo ID (passport, national ID card or driving licence) and a recent proof of residential address, such as a utility bill or bank statement. Enhanced checks on source of funds may apply.',
      'Deposits and withdrawals must use accounts held in the same name as the trading account. Third-party payments are not accepted.',
    ],
  },
  {
    id: 'execution',
    title: 'Order Execution Policy',
    paras: [
      'The Company takes sufficient steps to obtain the best possible result for client orders, considering price, speed of execution, likelihood of fill and available liquidity at the time the order is received.',
      'Where the market moves between order submission and execution, the order may be filled at a better or worse price. Price improvements are passed on to the client.',
    ],
  },
];

function AccordionItem({ doc, open, onToggle }: { doc: Doc; open: boolean; onToggle: () => void }) {
  const base = useId();
  const btnId = `${base}-btn`;
  const panelId = `${base}-panel`;
  return (
    <li className="border-b border-gold/15 last:border-b-0">
      <h3>
        <button
          id={btnId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gold/5 sm:px-6"
        >
          <span className={`font-display text-sm font-semibold uppercase tracking-[0.14em] sm:text-base ${open ? 'text-gold-hi' : 'text-ink'}`}>
            {doc.title}
          </span>
          <span
            aria-hidden="true"
            className={`relative h-3 w-3 shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
          >
            <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-gold" />
            <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-gold" />
          </span>
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={btnId} hidden={!open} className="space-y-3 px-4 pb-5 text-[13px] leading-relaxed text-muted sm:px-6 sm:text-sm">
        {doc.paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </li>
  );
}

export function Legal() {
  const [openId, setOpenId] = useState<string | null>(DOCS[0].id);
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <ul className="glass overflow-hidden rounded-xl">
          {DOCS.map((d) => (
            <AccordionItem key={d.id} doc={d} open={openId === d.id} onToggle={() => setOpenId(openId === d.id ? null : d.id)} />
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-snug text-muted">
          These are summaries. The full legal documents are available on request from{' '}
          <a href={`mailto:${COMPANY.emails.compliance}`} className="text-gold hover:text-gold-hi">
            {COMPANY.emails.compliance}
          </a>
          .
        </p>
      </div>

      <aside aria-labelledby="legal-regulators" className="glass h-fit rounded-xl p-5 sm:p-6">
        <h3 id="legal-regulators" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
          Regulation
        </h3>
        <ul className="mt-4 space-y-4">
          {COMPANY.regulators.map((r) => (
            <li key={r.licence} className="border-l border-gold/40 pl-4">
              <p className="text-sm font-semibold text-ink">{r.name}</p>
              <p className="mt-1 text-[12px] text-muted">
                Licence no. <span className="num text-gold-hi">{r.licence}</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="gold-line mt-5 opacity-60" aria-hidden="true" />
        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          {COMPANY.legalName} · {COMPANY.address}
        </p>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

const EMAILS = [
  { key: 'info', label: 'General enquiries', address: COMPANY.emails.info },
  { key: 'support', label: 'Accounts & trading support', address: COMPANY.emails.support },
  { key: 'compliance', label: 'Compliance & legal', address: COMPANY.emails.compliance },
] as const;

const TOPICS = [
  { value: 'general', label: 'General enquiry', email: COMPANY.emails.info },
  { value: 'account', label: 'Opening an account', email: COMPANY.emails.support },
  { value: 'support', label: 'Trading or platform support', email: COMPANY.emails.support },
  { value: 'funding', label: 'Deposits & withdrawals', email: COMPANY.emails.support },
  { value: 'compliance', label: 'Compliance, KYC or complaints', email: COMPANY.emails.compliance },
] as const;

type Fields = { name: string; email: string; topic: string; message: string };
type Errors = Partial<Record<keyof Fields, string>>;

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Please enter a valid email address.';
  if (!f.topic) e.topic = 'Please choose a topic.';
  if (f.message.trim().length < 10) e.message = 'Please write a message of at least 10 characters.';
  return e;
}

const inputCls =
  'mt-1.5 block w-full rounded-lg border bg-abyss/60 px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-gold aria-[invalid=true]:border-gold-hi';

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-[12px] text-gold-hi">
          {error}
        </p>
      )}
    </div>
  );
}

function ContactForm() {
  const base = useId();
  const [fields, setFields] = useState<Fields>({ name: '', email: '', topic: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (k: keyof Fields) => (ev: { target: { value: string } }) => {
    setFields((f) => ({ ...f, [k]: ev.target.value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const e = validate(fields);
    setErrors(e);
    const first = (Object.keys(e) as (keyof Fields)[])[0];
    if (first) {
      setSentTo(null);
      document.getElementById(`${base}-${first}`)?.focus();
      return;
    }
    setSentTo(TOPICS.find((t) => t.value === fields.topic)?.email ?? COMPANY.emails.info);
  };

  const a11y = (k: keyof Fields) => ({
    id: `${base}-${k}`,
    name: k,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `${base}-${k}-err` : undefined,
  });
  const border = (k: keyof Fields) => (errors[k] ? 'border-gold-hi' : 'border-gold/25');

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={`${base}-title`} className="glass rounded-xl p-5 sm:p-6">
      <h3 id={`${base}-title`} className="font-display text-base font-semibold uppercase tracking-[0.14em] text-ink">
        Send a message
      </h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id={`${base}-name`} label="Name" error={errors.name}>
          <input {...a11y('name')} type="text" autoComplete="name" value={fields.name} onChange={set('name')} className={`${inputCls} ${border('name')}`} />
        </Field>
        <Field id={`${base}-email`} label="Email" error={errors.email}>
          <input {...a11y('email')} type="email" autoComplete="email" inputMode="email" value={fields.email} onChange={set('email')} className={`${inputCls} ${border('email')}`} />
        </Field>
        <div className="sm:col-span-2">
          <Field id={`${base}-topic`} label="Topic" error={errors.topic}>
            <select {...a11y('topic')} value={fields.topic} onChange={set('topic')} className={`${inputCls} ${border('topic')} appearance-none`}>
              <option value="" disabled>
                Choose a topic
              </option>
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value} className="bg-navy">
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id={`${base}-message`} label="Message" error={errors.message}>
            <textarea {...a11y('message')} rows={5} value={fields.message} onChange={set('message')} className={`${inputCls} ${border('message')} resize-y`} />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="shrink-0 rounded-full bg-gold px-6 py-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-abyss transition-colors hover:bg-gold-hi"
        >
          Send message
        </button>
        <RiskNote className="sm:text-right" />
      </div>

      <div role="status" aria-live="polite" className="mt-4">
        {sentTo && (
          <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-[13px] leading-snug text-ink">
            This preview doesn’t send messages yet — email us at{' '}
            <a href={`mailto:${sentTo}`} className="font-semibold text-gold-hi underline underline-offset-2">
              {sentTo}
            </a>
            .
          </p>
        )}
      </div>
    </form>
  );
}

export function Contact() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="grid content-start gap-4">
        <div className="glass rounded-xl p-5 sm:p-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Registered office</h3>
          <p className="mt-3 text-sm font-semibold text-ink">{COMPANY.legalName}</p>
          <address className="mt-1 text-sm not-italic leading-relaxed text-muted">{COMPANY.address}</address>
        </div>

        <div className="glass rounded-xl p-5 sm:p-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Email</h3>
          <ul className="mt-3 space-y-3">
            {EMAILS.map((e) => (
              <li key={e.key}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{e.label}</p>
                <a href={`mailto:${e.address}`} className="break-all text-sm text-ink transition-colors hover:text-gold-hi">
                  {e.address}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-xl p-5 sm:p-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Messaging</h3>
          <ul className="mt-3 flex flex-wrap gap-3">
            {[
              { label: 'Telegram', href: COMPANY.social.telegram },
              { label: 'WhatsApp', href: COMPANY.social.whatsapp },
            ].map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-gold-hi"
                >
                  {s.label}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ContactForm />
    </div>
  );
}
