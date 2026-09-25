import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatPrice, shortSymbol, useMarket } from '../../feed/market';
import { INITIAL_INSTRUMENTS } from '../../data/market';
import type { Instrument, InstrumentCategory } from '../../types';

/* ------------------------------------------------------------------ */
/* Shared helpers (also used by CapitalRiskCalculator)                 */
/* ------------------------------------------------------------------ */

export const mid = (i: Instrument) => (i.bid + i.ask) / 2;

/**
 * USD value of one unit of `ccy`, from live simulated rates. Looks for a
 * CCYUSD pair first, then USDCCY. Returns null if neither is quoted.
 */
export function usdPerUnit(ccy: string, byId: Record<string, Instrument>): number | null {
  if (ccy === 'USD') return 1;
  const direct = byId[`${ccy}USD`];
  if (direct) return mid(direct);
  const inverse = byId[`USD${ccy}`];
  if (inverse) return 1 / mid(inverse);
  return null;
}

/** Contract maths for one instrument, all converted to USD. */
export function contractMaths(inst: Instrument, byId: Record<string, Instrument>) {
  const rate = usdPerUnit(inst.quoteCurrency, byId);
  const quoteToUsd = rate ?? 1;
  return {
    quoteToUsd,
    converted: rate !== null,
    /** USD value of a one-pip move on one standard lot. */
    pipValuePerLot: inst.pipSize * inst.contractSize * quoteToUsd,
    /** USD notional of one lot at the current mid price. */
    notionalPerLot: mid(inst) * inst.contractSize * quoteToUsd,
  };
}

export const CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  forex_majors: 'Forex majors',
  forex_minors: 'Forex minors & exotics',
  metals: 'Metals',
  indices: 'Indices',
  energies: 'Energies',
  crypto: 'Crypto',
};

export const LEVERAGE_OPTIONS = [1, 10, 30, 50, 100, 200, 300, 400, 500];

export const usd = (v: number, digits = 2) =>
  Number.isFinite(v)
    ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—';

export const fmt = (v: number, digits = 2) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';

/** Parse a user-typed number; empty or invalid → NaN. */
export const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

const fieldBase =
  'w-full rounded-lg border border-gold/25 bg-abyss/60 px-3 py-2.5 text-ink num placeholder:text-muted/60 transition-colors hover:border-gold/50 focus-visible:border-gold focus-visible:outline-offset-1';

export function InstrumentSelect({ id, value, onChange, label = 'Instrument' }: { id: string; value: string; onChange: (id: string) => void; label?: string }) {
  const groups = Object.keys(CATEGORY_LABELS) as InstrumentCategory[];
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldBase} cursor-pointer`}>
        {groups.map((g) => (
          <optgroup key={g} label={CATEGORY_LABELS[g]} className="bg-navy">
            {INITIAL_INSTRUMENTS.filter((i) => i.category === g).map((i) => (
              <option key={i.id} value={i.id} className="bg-navy">
                {i.symbol}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 'any',
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: number;
  step?: number | 'any';
  hint?: string;
}) {
  const n = num(value);
  const invalid = !Number.isFinite(n) || n < min;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={[invalid ? errId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
          className={`${fieldBase} ${suffix ? 'pr-14' : ''} ${invalid ? 'border-gold-hi/70' : ''}`}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{suffix}</span>}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[11px] text-muted">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errId} className="mt-1 text-[11px] text-gold-hi">
          Enter a number{min > 0 ? ` of at least ${min}` : ' of 0 or more'}.
        </p>
      )}
    </div>
  );
}

export function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldBase} cursor-pointer`}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-navy">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Result({ label, value, sub, big = false }: { label: string; value: string; sub?: ReactNode; big?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className={`num mt-1 break-words font-display font-semibold text-gold-hi ${big ? 'text-[clamp(1.9rem,6vw,3rem)] leading-none' : 'text-xl sm:text-2xl'}`}>{value}</dd>
      {sub && <dd className="mt-1 text-xs text-muted">{sub}</dd>}
    </div>
  );
}

/** Live price line under an instrument picker. */
export function LiveQuote({ inst, converted, quoteToUsd }: { inst: Instrument; converted: boolean; quoteToUsd: number }) {
  return (
    <p className="text-xs text-muted" aria-live="off">
      <span className="text-ink">{shortSymbol(inst)}</span> bid <span className="num text-ink">{formatPrice(inst)}</span> / ask{' '}
      <span className="num text-ink">{formatPrice(inst, inst.ask)}</span> · 1 lot = <span className="num">{inst.contractSize.toLocaleString('en-US')}</span>{' '}
      {inst.category.startsWith('forex') ? inst.baseCurrency : 'units'} · pip = <span className="num">{inst.pipSize}</span>
      {inst.quoteCurrency !== 'USD' && (
        <>
          {' '}
          · 1 {inst.quoteCurrency} ≈ <span className="num">{converted ? quoteToUsd.toFixed(quoteToUsd < 0.1 ? 6 : 4) : 'n/a'}</span> USD
        </>
      )}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Calculators                                                         */
/* ------------------------------------------------------------------ */

type Tab = 'pip' | 'margin' | 'size' | 'pl';
const TABS: { id: Tab; label: string }[] = [
  { id: 'pip', label: 'Pip value' },
  { id: 'margin', label: 'Margin' },
  { id: 'size', label: 'Position size' },
  { id: 'pl', label: 'Profit / loss' },
];

export function ForexCalculators() {
  const uid = useId().replace(/:/g, '');
  const [tab, setTab] = useState<Tab>('pip');
  const [instId, setInstId] = useState('EURUSD');
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ pip: null, margin: null, size: null, pl: null });

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const t = TABS[next].id;
    setTab(t);
    tabRefs.current[t]?.focus();
  };

  return (
    <div className="glass rounded-3xl p-4 sm:p-6 lg:p-8">
      <div role="tablist" aria-label="Forex calculators" className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:mx-0">
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              role="tab"
              type="button"
              id={`${uid}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={selected ? `${uid}-panel-${t.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKey}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                selected ? 'border-gold bg-gold/15 text-gold-hi' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="gold-line my-5 opacity-60" />
      <div role="tabpanel" id={`${uid}-panel-${tab}`} aria-labelledby={`${uid}-tab-${tab}`} tabIndex={0} className="rounded-xl focus-visible:outline-offset-4">
        {tab === 'pip' && <PipValue uid={uid} instId={instId} setInstId={setInstId} />}
        {tab === 'margin' && <Margin uid={uid} instId={instId} setInstId={setInstId} />}
        {tab === 'size' && <PositionSize uid={uid} instId={instId} setInstId={setInstId} />}
        {tab === 'pl' && <ProfitLoss uid={uid} instId={instId} setInstId={setInstId} />}
      </div>
      <p className="mt-6 border-t border-gold/15 pt-4 text-[11px] leading-relaxed text-muted">
        Calculations use indicative simulated prices that update about once a second, and assume a USD-denominated account. Amounts in other quote currencies are
        converted to USD at the live mid rate of the matching USD pair. Results are estimates for illustration only and exclude spread, commission and swap.
      </p>
    </div>
  );
}

type CalcProps = { uid: string; instId: string; setInstId: (id: string) => void };

function Layout({ inputs, results, quote }: { inputs: ReactNode; results: ReactNode; quote: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
      <div className="space-y-4">
        {inputs}
        {quote}
      </div>
      <dl className="grid content-start gap-5 rounded-2xl border border-gold/15 bg-abyss/40 p-5 sm:grid-cols-2">{results}</dl>
    </div>
  );
}

function useInstrument(instId: string) {
  const { byId } = useMarket();
  const inst = byId[instId] ?? INITIAL_INSTRUMENTS[0];
  return { inst, byId, ...contractMaths(inst, byId) };
}

function PipValue({ uid, instId, setInstId }: CalcProps) {
  const [lots, setLots] = useState('1');
  const { inst, pipValuePerLot, quoteToUsd, converted } = useInstrument(instId);
  const l = num(lots);
  const perPip = pipValuePerLot * l;
  return (
    <Layout
      inputs={
        <>
          <InstrumentSelect id={`${uid}-pip-inst`} value={instId} onChange={setInstId} />
          <NumberField id={`${uid}-pip-lots`} label="Position size" suffix="lots" value={lots} onChange={setLots} step={0.01} min={0.01} />
        </>
      }
      quote={<LiveQuote inst={inst} converted={converted} quoteToUsd={quoteToUsd} />}
      results={
        <>
          <div className="sm:col-span-2">
            <Result big label="Value per pip" value={usd(perPip)} sub={`${fmt(inst.pipSize * inst.contractSize * l, 2)} ${inst.quoteCurrency} per pip`} />
          </div>
          <Result label="10 pips" value={usd(perPip * 10)} />
          <Result label="Per pip, 1 lot" value={usd(pipValuePerLot)} />
        </>
      }
    />
  );
}

function Margin({ uid, instId, setInstId }: CalcProps) {
  const [lots, setLots] = useState('1');
  const [lev, setLev] = useState('100');
  const { inst, notionalPerLot, quoteToUsd, converted } = useInstrument(instId);
  const l = num(lots);
  const notional = notionalPerLot * l;
  const margin = notional / Number(lev);
  return (
    <Layout
      inputs={
        <>
          <InstrumentSelect id={`${uid}-mg-inst`} value={instId} onChange={setInstId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id={`${uid}-mg-lots`} label="Position size" suffix="lots" value={lots} onChange={setLots} step={0.01} min={0.01} />
            <SelectField id={`${uid}-mg-lev`} label="Leverage" value={lev} onChange={setLev} options={LEVERAGE_OPTIONS.map((v) => ({ value: String(v), label: `1:${v}` }))} />
          </div>
        </>
      }
      quote={<LiveQuote inst={inst} converted={converted} quoteToUsd={quoteToUsd} />}
      results={
        <>
          <div className="sm:col-span-2">
            <Result big label="Margin required" value={usd(margin)} sub={`at 1:${lev} leverage`} />
          </div>
          <Result label="Position notional" value={usd(notional, 0)} />
          <Result label="Margin rate" value={`${fmt(100 / Number(lev), 2)}%`} />
        </>
      }
    />
  );
}

function PositionSize({ uid, instId, setInstId }: CalcProps) {
  const [balance, setBalance] = useState('10000');
  const [risk, setRisk] = useState('1');
  const [stop, setStop] = useState('25');
  const { inst, pipValuePerLot, quoteToUsd, converted } = useInstrument(instId);
  const riskAmt = (num(balance) * num(risk)) / 100;
  const lotsRaw = riskAmt / (num(stop) * pipValuePerLot);
  const lots = Math.floor(lotsRaw * 100) / 100; // round down to 0.01
  return (
    <Layout
      inputs={
        <>
          <InstrumentSelect id={`${uid}-ps-inst`} value={instId} onChange={setInstId} />
          <NumberField id={`${uid}-ps-bal`} label="Account balance" suffix="USD" value={balance} onChange={setBalance} min={1} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id={`${uid}-ps-risk`} label="Risk per trade" suffix="%" value={risk} onChange={setRisk} step={0.1} min={0.01} />
            <NumberField id={`${uid}-ps-stop`} label="Stop loss" suffix="pips" value={stop} onChange={setStop} step={1} min={0.1} />
          </div>
        </>
      }
      quote={<LiveQuote inst={inst} converted={converted} quoteToUsd={quoteToUsd} />}
      results={
        <>
          <div className="sm:col-span-2">
            <Result big label="Position size" value={Number.isFinite(lots) ? `${fmt(lots, 2)} lots` : '—'} sub="Rounded down to 0.01 lots" />
          </div>
          <Result label="Amount at risk" value={usd(riskAmt)} />
          <Result label="Units" value={Number.isFinite(lots) ? fmt(lots * inst.contractSize, 0) : '—'} />
        </>
      }
    />
  );
}

function ProfitLoss({ uid, instId, setInstId }: CalcProps) {
  const { inst, quoteToUsd, converted } = useInstrument(instId);
  const [dir, setDir] = useState<'buy' | 'sell'>('buy');
  const [lots, setLots] = useState('1');
  // Seed entry/exit from the live price when the instrument changes.
  const [seedFor, setSeedFor] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  if (seedFor !== inst.id) {
    setSeedFor(inst.id);
    setEntry(inst.ask.toFixed(inst.digits));
    setExit((inst.ask + inst.pipSize * 20).toFixed(inst.digits));
  }
  const diff = (num(exit) - num(entry)) * (dir === 'buy' ? 1 : -1);
  const pips = diff / inst.pipSize;
  const pl = diff * inst.contractSize * num(lots) * quoteToUsd;
  const sign = pl > 0 ? '+' : pl < 0 ? '−' : '';
  return (
    <Layout
      inputs={
        <>
          <InstrumentSelect id={`${uid}-pl-inst`} value={instId} onChange={setInstId} />
          <fieldset>
            <legend className="mb-1.5 text-xs uppercase tracking-[0.14em] text-muted">Direction</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['buy', 'sell'] as const).map((d) => (
                <label
                  key={d}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm capitalize transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold-hi ${
                    dir === d ? 'border-gold bg-gold/15 text-gold-hi' : 'border-gold/25 text-muted hover:text-ink'
                  }`}
                >
                  <input type="radio" name={`${uid}-pl-dir`} id={`${uid}-pl-dir-${d}`} value={d} checked={dir === d} onChange={() => setDir(d)} className="sr-only" />
                  {d === 'buy' ? 'Buy (long)' : 'Sell (short)'}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id={`${uid}-pl-entry`} label="Entry" value={entry} onChange={setEntry} step={inst.pipSize} />
            <NumberField id={`${uid}-pl-exit`} label="Exit" value={exit} onChange={setExit} step={inst.pipSize} />
            <NumberField id={`${uid}-pl-lots`} label="Lots" value={lots} onChange={setLots} step={0.01} min={0.01} />
          </div>
        </>
      }
      quote={<LiveQuote inst={inst} converted={converted} quoteToUsd={quoteToUsd} />}
      results={
        <>
          <div className="sm:col-span-2">
            <Result big label={pl < 0 ? 'Estimated loss' : 'Estimated profit'} value={Number.isFinite(pl) ? `${sign}${usd(Math.abs(pl))}` : '—'} />
          </div>
          <Result label="Pips" value={Number.isFinite(pips) ? `${pips > 0 ? '+' : pips < 0 ? '−' : ''}${fmt(Math.abs(pips), 1)}` : '—'} />
          <Result label={`In ${inst.quoteCurrency}`} value={Number.isFinite(diff) ? fmt(diff * inst.contractSize * num(lots), 2) : '—'} />
        </>
      }
    />
  );
}
