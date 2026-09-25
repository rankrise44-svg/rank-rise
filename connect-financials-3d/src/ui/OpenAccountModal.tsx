import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ACCOUNT_TIERS } from '../data/market';
import { COMPANY, RISK_WARNING_FULL } from '../config/company';
import { RiskNote } from './RiskNote';
import { closeAccount, useOpenAccount } from './openAccount';

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

interface FormState {
  tier: string;
  mode: 'live' | 'demo';
  currency: 'USD' | 'EUR' | 'GBP';
  leverage: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  dob: string;
  experience: string;
  frequency: string;
  qLeverage: string;
  qCfd: string;
  income: string;
  savings: string;
  terms: boolean;
  riskRead: boolean;
  accurate: boolean;
}
type Errors = Partial<Record<keyof FormState, string>>;

const STEPS = ['Account', 'Personal details', 'Experience', 'Review'] as const;

const LEVERAGE = ['1:30', '1:100', '1:200', '1:500'];

const COUNTRIES = [
  'Australia', 'Bahrain', 'Botswana', 'Brazil', 'Egypt', 'France', 'Germany', 'Ghana', 'Hong Kong', 'India', 'Indonesia', 'Ireland', 'Italy', 'Jordan',
  'Kenya', 'Kuwait', 'Malaysia', 'Mauritius', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Oman', 'Philippines', 'Qatar', 'Saudi Arabia',
  'Seychelles', 'Singapore', 'South Africa', 'Spain', 'Sri Lanka', 'Tanzania', 'Thailand', 'Uganda', 'United Arab Emirates', 'United Kingdom', 'Vietnam',
  'Zambia', 'Other',
];

const EXPERIENCE = [
  { value: 'none', label: 'No experience' },
  { value: 'lt1', label: 'Less than 1 year' },
  { value: '1to3', label: '1 to 3 years' },
  { value: 'gt3', label: 'More than 3 years' },
];
const FREQUENCY = [
  { value: 'never', label: 'I have not traded yet' },
  { value: 'occasional', label: 'A few trades a year' },
  { value: 'monthly', label: 'Several trades a month' },
  { value: 'weekly', label: 'Several trades a week or more' },
];
const Q_LEVERAGE = [
  { value: 'magnify', label: 'It magnifies both potential profits and potential losses' },
  { value: 'limit', label: 'It limits my losses to a small part of my deposit' },
  { value: 'free', label: 'It is extra money I can keep' },
];
const Q_CFD = [
  { value: 'contract', label: 'A contract on the price movement of an asset, without owning it' },
  { value: 'own', label: 'Direct ownership of the underlying shares or currency' },
  { value: 'guaranteed', label: 'A product with a guaranteed return' },
];
const INCOME = [
  { value: 'lt25', label: 'Under $25,000' },
  { value: '25to50', label: '$25,000 – $50,000' },
  { value: '50to100', label: '$50,000 – $100,000' },
  { value: '100to250', label: '$100,000 – $250,000' },
  { value: 'gt250', label: 'Over $250,000' },
];
const SAVINGS = [
  { value: 'lt10', label: 'Under $10,000' },
  { value: '10to50', label: '$10,000 – $50,000' },
  { value: '50to250', label: '$50,000 – $250,000' },
  { value: 'gt250', label: 'Over $250,000' },
];

const labelOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? '—';

function ageFrom(dob: string) {
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function validate(step: number, f: FormState): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!f.tier) e.tier = 'Choose an account type.';
    if (!f.leverage) e.leverage = 'Choose a leverage.';
  }
  if (step === 1) {
    if (f.fullName.trim().split(/\s+/).filter(Boolean).length < 2) e.fullName = 'Enter your first and last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address, like name@example.com.';
    const digits = f.phone.replace(/\D/g, '');
    if (!/^\+?[\d\s()-]+$/.test(f.phone.trim()) || digits.length < 7 || digits.length > 15)
      e.phone = 'Enter a phone number with country code, 7 to 15 digits.';
    if (!f.country) e.country = 'Choose your country of residence.';
    const age = ageFrom(f.dob);
    if (!f.dob || Number.isNaN(age)) e.dob = 'Enter your date of birth.';
    else if (age < 18) e.dob = 'You must be at least 18 years old to open an account.';
    else if (age > 120) e.dob = 'Check the year of your date of birth.';
  }
  if (step === 2) {
    if (!f.experience) e.experience = 'Choose your trading experience.';
    if (!f.frequency) e.frequency = 'Choose how often you trade.';
    if (!f.qLeverage) e.qLeverage = 'Choose an answer.';
    if (!f.qCfd) e.qCfd = 'Choose an answer.';
    if (!f.income) e.income = 'Choose an income band.';
    if (!f.savings) e.savings = 'Choose a savings band.';
  }
  if (step === 3) {
    if (!f.terms) e.terms = 'You need to accept the terms to continue.';
    if (!f.riskRead) e.riskRead = 'Confirm you have read the risk warning.';
    if (!f.accurate) e.accurate = 'Confirm your information is accurate.';
  }
  return e;
}

const lowExperience = (f: FormState) =>
  f.experience === 'none' ||
  f.experience === 'lt1' ||
  f.frequency === 'never' ||
  (f.qLeverage !== '' && f.qLeverage !== 'magnify') ||
  (f.qCfd !== '' && f.qCfd !== 'contract');

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

/** Global Open Account dialog. Mount once near the app root. */
export function OpenAccountModal() {
  const { open, tierId } = useOpenAccount();
  if (!open) return null;
  return <Dialog initialTier={tierId} />;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Dialog({ initialTier }: { initialTier: string | null }) {
  const uid = useId().replace(/:/g, '');
  const id = (s: string) => `oa-${s}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [returnTo] = useState(() => document.activeElement as HTMLElement | null);

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [f, setF] = useState<FormState>(() => ({
    tier: ACCOUNT_TIERS.some((t) => t.id === initialTier) ? (initialTier as string) : (ACCOUNT_TIERS.find((t) => t.popular)?.id ?? ACCOUNT_TIERS[0].id),
    mode: 'live',
    currency: 'USD',
    leverage: '1:100',
    fullName: '',
    email: '',
    phone: '',
    country: '',
    dob: '',
    experience: '',
    frequency: '',
    qLeverage: '',
    qCfd: '',
    income: '',
    savings: '',
    terms: false,
    riskRead: false,
    accurate: false,
  }));
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const errors = attempted[step] ? validate(step, f) : {};

  // Scroll lock, Esc to close, focus trap, focus return.
  useEffect(() => {
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    html.classList.add('lenis-stopped');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAccount();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
      html.classList.remove('lenis-stopped');
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [returnTo]);

  // Move focus to the step heading whenever the step (or success state) changes.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    panelRef.current?.querySelector('[data-scroll]')?.scrollTo({ top: 0 });
  }, [step, done]);

  const focusFirstError = (errs: Errors) => {
    const key = Object.keys(errs)[0];
    if (!key) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(id(key)) ?? document.querySelector<HTMLElement>(`[name="${id(key)}"]`);
      el?.focus();
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(step, f);
    setAttempted((a) => ({ ...a, [step]: true }));
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else setDone(true); // Preview only: nothing is sent anywhere.
  };

  const tier = ACCOUNT_TIERS.find((t) => t.id === f.tier);
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-6"
      data-lenis-prevent
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeAccount();
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-abyss/80 backdrop-blur-sm motion-safe:animate-[oa-fade_200ms_ease-out]" />
      <style>{`@keyframes oa-fade{from{opacity:0}to{opacity:1}}@keyframes oa-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-gold/30 bg-gradient-to-b from-navy to-abyss shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] motion-safe:animate-[oa-rise_260ms_ease-out] sm:h-auto sm:max-h-[min(92dvh,900px)] sm:max-w-2xl sm:rounded-3xl sm:border"
      >
        <div aria-hidden className="gold-line absolute inset-x-0 top-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{COMPANY.brand}</p>
            <h2 id={titleId} className="mt-1 font-display text-xl font-semibold text-ink sm:text-2xl">
              Open an account
            </h2>
            <p id={descId} className="mt-1 text-xs text-muted">
              Website preview: this form is not connected and nothing you enter is sent.
            </p>
          </div>
          <button
            type="button"
            onClick={closeAccount}
            aria-label="Close"
            className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/30 text-ink transition-colors hover:border-gold hover:text-gold-hi"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4">
              <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!done && (
          <ol className="grid grid-cols-4 gap-2 px-5 sm:px-8" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined} className="min-w-0">
                <div className={`h-[3px] rounded-full ${i <= step ? 'bg-gradient-to-r from-gold to-gold-hi' : 'bg-ink/10'}`} />
                <p className={`mt-2 truncate text-[10px] uppercase tracking-[0.14em] sm:text-[11px] ${i === step ? 'text-gold-hi' : i < step ? 'text-ink/80' : 'text-muted'}`}>
                  <span className="num">{i + 1}</span>
                  <span className="hidden sm:inline">. {s}</span>
                  <span className="sr-only sm:hidden"> {s}</span>
                  {i < step && <span className="sr-only"> (completed)</span>}
                </p>
              </li>
            ))}
          </ol>
        )}

        {done ? (
          <div data-scroll className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-md text-center">
              <div aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50 text-gold-hi">
                <svg viewBox="0 0 24 24" className="h-6 w-6">
                  <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 ref={headingRef} tabIndex={-1} className="mt-5 font-display text-2xl font-semibold text-ink">
                Preview complete
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted" role="status">
                This is a website preview. Your details were <strong className="text-ink">not sent</strong> anywhere, and no {f.mode === 'demo' ? 'demo' : 'live'} account
                has been created. When the site goes live, this step will hand over to the secure account application.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-gold/15 bg-abyss/40 p-4 text-left text-sm">
                <dt className="text-muted">Account</dt>
                <dd className="text-right text-ink">{tier?.name}</dd>
                <dt className="text-muted">Type</dt>
                <dd className="text-right text-ink">{f.mode === 'demo' ? 'Demo' : 'Live'}</dd>
              </dl>
              <button
                type="button"
                onClick={closeAccount}
                className="mt-8 w-full rounded-full bg-gradient-to-r from-gold to-gold-hi px-6 py-3 text-sm font-semibold text-abyss sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div data-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-6 sm:px-8">
              <h3 ref={headingRef} tabIndex={-1} className="font-display text-lg font-semibold text-ink">
                <span className="sr-only">
                  Step {step + 1} of {STEPS.length}:{' '}
                </span>
                {STEPS[step]}
              </h3>

              {step === 0 && (
                <div className="mt-5 space-y-6">
                  <RadioCards
                    name={id('tier')}
                    legend="Account type"
                    value={f.tier}
                    onChange={(v) => set('tier', v)}
                    error={errors.tier}
                    options={ACCOUNT_TIERS.map((t) => ({
                      value: t.id,
                      label: t.name,
                      detail: `From $${t.minDeposit.toLocaleString('en-US')} · ${t.spread}`,
                      tag: t.popular ? 'Most popular' : undefined,
                    }))}
                    cols="sm:grid-cols-2"
                  />
                  <RadioCards
                    name={id('mode')}
                    legend="Live or demo"
                    value={f.mode}
                    onChange={(v) => set('mode', v as FormState['mode'])}
                    options={[
                      { value: 'live', label: 'Live account', detail: 'Trade with real funds' },
                      { value: 'demo', label: 'Demo account', detail: 'Practise with virtual funds' },
                    ]}
                    cols="grid-cols-2"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RadioCards
                      name={id('currency')}
                      legend="Base currency"
                      value={f.currency}
                      onChange={(v) => set('currency', v as FormState['currency'])}
                      options={(['USD', 'EUR', 'GBP'] as const).map((c) => ({ value: c, label: c }))}
                      cols="grid-cols-3"
                      compact
                    />
                    <Select
                      id={id('leverage')}
                      label="Leverage"
                      value={f.leverage}
                      onChange={(v) => set('leverage', v)}
                      error={errors.leverage}
                      options={LEVERAGE.map((l) => ({ value: l, label: l }))}
                      hint="Higher leverage increases risk."
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Text id={id('fullName')} label="Full name" autoComplete="name" value={f.fullName} onChange={(v) => set('fullName', v)} error={errors.fullName} hint="As shown on your ID" />
                  </div>
                  <Text id={id('email')} label="Email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(v) => set('email', v)} error={errors.email} />
                  <Text id={id('phone')} label="Phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={(v) => set('phone', v)} error={errors.phone} hint="Include country code, e.g. +44" />
                  <Select
                    id={id('country')}
                    label="Country of residence"
                    value={f.country}
                    onChange={(v) => set('country', v)}
                    error={errors.country}
                    placeholder="Select a country"
                    options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                    hint="Availability depends on where you live."
                  />
                  <Text
                    id={id('dob')}
                    label="Date of birth"
                    type="date"
                    autoComplete="bday"
                    value={f.dob}
                    onChange={(v) => set('dob', v)}
                    error={errors.dob}
                    max={new Date().toISOString().slice(0, 10)}
                    hint="You must be 18 or over."
                  />
                </div>
              )}

              {step === 2 && (
                <div className="mt-5 space-y-6">
                  <p className="text-sm text-muted">
                    We ask these questions to judge whether CFD trading is appropriate for you. Your answers do not stop you continuing.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select id={id('experience')} label="Trading experience with forex or CFDs" value={f.experience} onChange={(v) => set('experience', v)} error={errors.experience} placeholder="Select" options={EXPERIENCE} />
                    <Select id={id('frequency')} label="How often do you trade?" value={f.frequency} onChange={(v) => set('frequency', v)} error={errors.frequency} placeholder="Select" options={FREQUENCY} />
                  </div>
                  <RadioList name={id('qLeverage')} legend="What does leverage do to a trade?" value={f.qLeverage} onChange={(v) => set('qLeverage', v)} error={errors.qLeverage} options={Q_LEVERAGE} />
                  <RadioList name={id('qCfd')} legend="Which best describes a CFD?" value={f.qCfd} onChange={(v) => set('qCfd', v)} error={errors.qCfd} options={Q_CFD} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select id={id('income')} label="Annual income" value={f.income} onChange={(v) => set('income', v)} error={errors.income} placeholder="Select a band" options={INCOME} />
                    <Select id={id('savings')} label="Savings and investments" value={f.savings} onChange={(v) => set('savings', v)} error={errors.savings} placeholder="Select a band" options={SAVINGS} />
                  </div>
                  {lowExperience(f) && (
                    <div role="status" className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-sm leading-relaxed text-ink">
                      <p className="font-semibold text-gold-hi">Appropriateness warning</p>
                      <p className="mt-1">
                        Based on your answers, CFD trading may not be appropriate for you. CFDs are complex and leveraged: losses are magnified and can happen
                        quickly. You can still continue, but consider starting with a demo account and lower leverage.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="mt-5 space-y-6">
                  <div className="grid gap-x-6 gap-y-5 rounded-2xl border border-gold/15 bg-abyss/40 p-5 text-sm sm:grid-cols-2">
                    <Summary title="Account" onEdit={() => setStep(0)}>
                      <Row k="Type" v={tier?.name ?? '—'} />
                      <Row k="Live or demo" v={f.mode === 'demo' ? 'Demo' : 'Live'} />
                      <Row k="Base currency" v={f.currency} />
                      <Row k="Leverage" v={f.leverage} />
                    </Summary>
                    <Summary title="Personal details" onEdit={() => setStep(1)}>
                      <Row k="Name" v={f.fullName} />
                      <Row k="Email" v={f.email} />
                      <Row k="Phone" v={f.phone} />
                      <Row k="Country" v={f.country} />
                      <Row k="Date of birth" v={f.dob} />
                    </Summary>
                    <Summary
                      title="Experience"
                      onEdit={() => setStep(2)}
                      wide
                      note={lowExperience(f) ? 'An appropriateness warning applies to your answers.' : undefined}
                    >
                      <Row k="Experience" v={labelOf(EXPERIENCE, f.experience)} />
                      <Row k="Frequency" v={labelOf(FREQUENCY, f.frequency)} />
                      <Row k="Income" v={labelOf(INCOME, f.income)} />
                      <Row k="Savings" v={labelOf(SAVINGS, f.savings)} />
                    </Summary>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-[0.16em] text-muted" id={`${uid}-risk-h`}>
                      Risk warning
                    </h4>
                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby={`${uid}-risk-h`}
                      className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-gold/20 bg-abyss/50 p-4 text-sm leading-relaxed text-ink/90"
                    >
                      {RISK_WARNING_FULL}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Check id={id('riskRead')} checked={f.riskRead} onChange={(v) => set('riskRead', v)} error={errors.riskRead}>
                      I have read and understood the risk warning above.
                    </Check>
                    <Check id={id('terms')} checked={f.terms} onChange={(v) => set('terms', v)} error={errors.terms}>
                      I accept the client agreement, terms and conditions and privacy policy.
                    </Check>
                    <Check id={id('accurate')} checked={f.accurate} onChange={(v) => set('accurate', v)} error={errors.accurate}>
                      I confirm the information I have given is true and complete.
                    </Check>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gold/15 bg-abyss/60 px-5 py-4 sm:px-8">
              {attempted[step] && Object.keys(errors).length > 0 && (
                <p role="alert" className="mb-3 text-xs text-gold-hi">
                  Please fix {Object.keys(errors).length === 1 ? 'the highlighted field' : `the ${Object.keys(errors).length} highlighted fields`} to continue.
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                {step > 0 ? (
                  <button type="button" onClick={() => setStep(step - 1)} className="rounded-full border border-gold/30 px-5 py-2.5 text-sm text-ink transition-colors hover:border-gold">
                    Back
                  </button>
                ) : (
                  <button type="button" onClick={closeAccount} className="rounded-full px-3 py-2.5 text-sm text-muted transition-colors hover:text-ink">
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-gold to-gold-hi px-6 py-2.5 text-sm font-semibold text-abyss transition-[filter] hover:brightness-110"
                >
                  {step === STEPS.length - 1 ? 'Submit application' : 'Continue'}
                </button>
              </div>
              <RiskNote className="mt-3 max-w-none" />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field primitives                                                    */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full rounded-lg border bg-abyss/60 px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 transition-colors hover:border-gold/50 focus-visible:border-gold focus-visible:outline-offset-1 [color-scheme:dark]';
const labelCls = 'mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted';

function ErrorText({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-gold-hi">
      <span aria-hidden>!</span>
      {children}
    </p>
  );
}

function describedBy(...ids: (string | false | undefined)[]) {
  const s = ids.filter(Boolean).join(' ');
  return s || undefined;
}

function Text({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  autoComplete,
  inputMode,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: 'email' | 'tel' | 'text';
  max?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        max={max}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint && `${id}-hint`, error && `${id}-error`)}
        required
        className={`${inputCls} ${error ? 'border-gold-hi' : 'border-gold/25'}`}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-muted">
          {hint}
        </p>
      )}
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint && `${id}-hint`, error && `${id}-error`)}
        required
        className={`${inputCls} cursor-pointer ${error ? 'border-gold-hi' : 'border-gold/25'} ${value ? '' : 'text-muted'}`}
      >
        {placeholder && (
          <option value="" disabled className="bg-navy">
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-navy text-ink">
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-muted">
          {hint}
        </p>
      )}
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

function RadioCards({
  name,
  legend,
  value,
  onChange,
  options,
  error,
  cols,
  compact = false,
}: {
  name: string;
  legend: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; detail?: string; tag?: string }[];
  error?: string;
  cols: string;
  compact?: boolean;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className={labelCls}>{legend}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`relative flex cursor-pointer flex-col rounded-xl border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-hi ${
                compact ? 'items-center px-3 py-2.5' : 'px-4 py-3'
              } ${checked ? 'border-gold bg-gold/10' : 'border-gold/20 hover:border-gold/50'}`}
            >
              <input type="radio" name={name} id={`${name}-${o.value}`} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm ${checked ? 'text-gold-hi' : 'text-ink'} ${compact ? 'num font-semibold' : ''}`}>{o.label}</span>
                {o.tag && <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-abyss">{o.tag}</span>}
              </span>
              {o.detail && <span className="mt-0.5 text-xs text-muted">{o.detail}</span>}
            </label>
          );
        })}
      </div>
      <ErrorText id={`${name}-error`}>{error}</ErrorText>
    </fieldset>
  );
}

function RadioList({
  name,
  legend,
  value,
  onChange,
  options,
  error,
}: {
  name: string;
  legend: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-2 text-sm text-ink">{legend}</legend>
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
              value === o.value ? 'border-gold bg-gold/10 text-ink' : 'border-gold/20 text-ink/85 hover:border-gold/50'
            }`}
          >
            <input
              type="radio"
              name={name}
              id={`${name}-${o.value}`}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <ErrorText id={`${name}-error`}>{error}</ErrorText>
    </fieldset>
  );
}

function Check({ id, checked, onChange, error, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink/90">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
        />
        <span>{children}</span>
      </label>
      <div className="pl-7">
        <ErrorText id={`${id}-error`}>{error}</ErrorText>
      </div>
    </div>
  );
}

function Summary({ title, onEdit, children, wide = false, note }: { title: string; onEdit: () => void; children: ReactNode; wide?: boolean; note?: string }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.16em] text-gold">{title}</span>
        <button type="button" onClick={onEdit} className="text-xs text-muted underline-offset-2 hover:text-gold-hi hover:underline">
          Edit<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      <dl className="space-y-1">{children}</dl>
      {note && <p className="mt-2 text-xs text-gold-hi">{note}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 break-words text-right text-ink">{v || '—'}</dd>
    </div>
  );
}
