import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useMarket, formatPrice, shortSymbol } from '../feed/market';
import { Flash } from '../ui/Flash';
import { Sparkline } from '../ui/Sparkline';
import { RiskNote } from '../ui/RiskNote';
import { goTo } from '../lib/route';
import { COMPANY } from '../config/company';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_KYC } from '../data/market';
import type { ActivePortalView, ClosedTrade, Instrument, Position, TradingAccount, Transaction } from '../types';

/* ────────────────────────────────────────────────────────────────────────────
 * Trader Portal — a preview dashboard. Every figure is sample data, prices come
 * from the simulated feed, and nothing here talks to a server.
 * ──────────────────────────────────────────────────────────────────────────── */

type ById = Record<string, Instrument>;
type CloseReason = 'Manual' | 'Stop loss' | 'Take profit';
type Closed = ClosedTrade & { reason: CloseReason };
interface Book {
  positions: Position[];
  closed: Closed[];
}

const VIEWS: { id: ActivePortalView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trade', label: 'Trade' },
  { id: 'positions', label: 'Positions' },
  { id: 'funds', label: 'Funds' },
  { id: 'kyc', label: 'Verification' },
  { id: 'history', label: 'History' },
];

const FUND_METHODS = ['Bank wire', 'Card', 'USDT (TRC20)'] as const;

/* Raw Spread account: $3.50 per lot per side (ACCOUNT_TIERS), charged round-trip at open. */
const RAW_COMMISSION_PER_LOT_RT = 7;

/* ── helpers ─────────────────────────────────────────────────────────────── */

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedUsd = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + usd(Math.abs(n));
const plClass = (n: number) => (n > 0 ? 'text-gold-hi' : n < 0 ? 'text-ink/70' : 'text-muted');
const fmtTime = (t: number) => new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const leverageOf = (a: TradingAccount) => Number(a.leverage.split(':')[1]) || 1;
let uid = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(uid++).toString(36)}`;

/** Value of one unit of `ccy` in USD, using the live feed. null if no cross exists. */
function toUsd(ccy: string, byId: ById): number | null {
  if (ccy === 'USD') return 1;
  const direct = byId[`${ccy}USD`];
  if (direct) return direct.bid;
  const inverse = byId[`USD${ccy}`];
  if (inverse) return 1 / inverse.bid;
  return null;
}

/** Recompute live price, pips and P/L for a position. */
function mark(p: Position, byId: ById): Position {
  const inst = byId[p.symbol];
  if (!inst) return p;
  const current = p.type === 'BUY' ? inst.bid : inst.ask;
  const diff = p.type === 'BUY' ? current - p.openPrice : p.openPrice - current;
  const rate = toUsd(inst.quoteCurrency, byId) ?? 1;
  const gross = diff * p.lots * inst.contractSize * rate;
  return { ...p, currentPrice: current, pips: diff / inst.pipSize, profit: gross + p.commission + p.swap };
}

function marginFor(p: Position, byId: ById, lev: number) {
  const inst = byId[p.symbol];
  if (!inst) return 0;
  const rate = toUsd(inst.quoteCurrency, byId) ?? 1;
  return (p.lots * inst.contractSize * p.openPrice * rate) / lev;
}

interface Metrics {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number | null;
  floating: number;
  open: Position[];
}

function metricsFor(acc: TradingAccount, book: Book, byId: ById): Metrics {
  const lev = leverageOf(acc);
  const open = book.positions.filter((p) => p.accountId === acc.id).map((p) => mark(p, byId));
  const realised = book.closed.filter((c) => c.accountId === acc.id).reduce((s, c) => s + c.finalProfit, 0);
  const balance = acc.balance + realised;
  const floating = open.reduce((s, p) => s + p.profit, 0);
  const margin = open.reduce((s, p) => s + marginFor(p, byId, lev), 0);
  const equity = balance + floating;
  return { balance, equity, margin, freeMargin: equity - margin, marginLevel: margin > 0 ? (equity / margin) * 100 : null, floating, open };
}

/* Sample positions on the main live account. Open prices sit near the feed's seed prices. */
const HOUR = 3_600_000;
const SEED_TIME = Date.now();
const SEED_POSITIONS: Position[] = [
  { id: 'pos-seed-1', accountId: 'acc-live-01', symbol: 'EURUSD', type: 'BUY', lots: 1, openPrice: 1.0825, currentPrice: 1.0825, stopLoss: 1.078, takeProfit: 1.092, openTime: SEED_TIME - 26 * HOUR, profit: 0, pips: 0, commission: 0, swap: 0 },
  { id: 'pos-seed-2', accountId: 'acc-live-01', symbol: 'XAUUSD', type: 'BUY', lots: 0.5, openPrice: 2631.2, currentPrice: 2631.2, openTime: SEED_TIME - 7 * HOUR, profit: 0, pips: 0, commission: 0, swap: 0 },
  { id: 'pos-seed-3', accountId: 'acc-live-01', symbol: 'NAS100', type: 'SELL', lots: 2, openPrice: 20745, currentPrice: 20745, takeProfit: 20500, openTime: SEED_TIME - 3 * HOUR, profit: 0, pips: 0, commission: 0, swap: 0 },
  { id: 'pos-seed-4', accountId: 'acc-live-01', symbol: 'BTCUSD', type: 'SELL', lots: 0.1, openPrice: 67120, currentPrice: 67120, openTime: SEED_TIME - 50 * 60_000, profit: 0, pips: 0, commission: 0, swap: 0 },
];

/* ── shared UI bits ──────────────────────────────────────────────────────── */

function Panel({ title, children, className = '', action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} className={`glass min-w-0 rounded-2xl p-4 sm:p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id={id} className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-gold-hi">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-gold/15 bg-abyss/40 px-3 py-3">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className={`num mt-1 truncate text-lg font-semibold ${tone ?? 'text-ink'}`}>{value}</dd>
      {sub && <dd className="mt-0.5 truncate text-xs text-muted">{sub}</dd>}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-gold/20 px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-muted';
const td = 'whitespace-nowrap px-3 py-2.5';
const inputCls =
  'w-full rounded-lg border border-gold/25 bg-abyss/60 px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-gold-hi focus:outline-none focus-visible:outline-2 focus-visible:outline-gold-hi';
const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-muted';
const btnGold =
  'inline-flex items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-abyss transition hover:bg-gold-hi disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'inline-flex items-center justify-center rounded-full border border-gold/40 px-4 py-2 text-sm font-medium text-ink transition hover:border-gold-hi hover:text-gold-hi';

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-full border border-gold/20 bg-abyss/50 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
            value === o.id ? 'bg-gold text-abyss' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */

function Overview({ acc, m, eq, byId, onGo }: { acc: TradingAccount; m: Metrics; eq: number[]; byId: ById; onGo: (v: ActivePortalView) => void }) {
  const { moved, seq } = useMarket();
  const best = m.open.reduce<Position | null>((b, p) => (!b || p.profit > b.profit ? p : b), null);
  const worst = m.open.reduce<Position | null>((b, p) => (!b || p.profit < b.profit ? p : b), null);
  return (
    <div className="grid gap-5">
      <Panel title="Account summary">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Balance" value={usd(m.balance)} sub={acc.currency} />
          <Stat label="Equity" value={usd(m.equity)} sub={<span className={plClass(m.floating)}>{signedUsd(m.floating)} floating</span>} />
          <Stat label="Margin" value={usd(m.margin)} />
          <Stat label="Free margin" value={usd(m.freeMargin)} />
          <Stat label="Margin level" value={m.marginLevel === null ? '—' : `${m.marginLevel.toFixed(1)}%`} sub={m.marginLevel === null ? 'No margin in use' : undefined} />
          <Stat label="Leverage" value={acc.leverage} />
          <Stat label="Server" value={<span className="text-sm">{acc.server}</span>} />
          <Stat label="Account" value={<span className="text-sm">{acc.accountNumber}</span>} sub={`Opened ${acc.createdDate}`} />
        </dl>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title="Equity (this session)" className="lg:col-span-3">
          <p className="num text-2xl font-semibold text-ink">{usd(m.equity)}</p>
          <p className="mb-3 text-xs text-muted">Updates with each simulated price tick.</p>
          <div role="img" aria-label={`Equity trend over the last ${eq.length} ticks, currently ${usd(m.equity)}`}>
            {eq.length > 1 ? <Sparkline data={eq} className="h-28 w-full" /> : <div className="h-28" />}
          </div>
        </Panel>

        <Panel title="Open positions" className="lg:col-span-2" action={<button type="button" onClick={() => onGo('positions')} className="text-xs font-semibold text-gold hover:text-gold-hi">View all</button>}>
          {m.open.length === 0 ? (
            <Empty>No open positions on this account.</Empty>
          ) : (
            <>
              <dl className="mb-4 grid grid-cols-2 gap-3">
                <Stat label="Open" value={m.open.length} />
                <Stat label="Floating P/L" value={signedUsd(m.floating)} tone={plClass(m.floating)} />
              </dl>
              <ul className="divide-y divide-gold/10 text-sm">
                {m.open.map((p) => {
                  const inst = byId[p.symbol];
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{inst ? shortSymbol(inst) : p.symbol}</span>{' '}
                        <span className="text-xs text-muted">
                          {p.type} {p.lots.toFixed(2)}
                        </span>
                      </span>
                      <Flash dir={moved[p.symbol]} seq={seq} className={`num rounded px-1 ${plClass(p.profit)}`}>
                        {signedUsd(p.profit)}
                      </Flash>
                    </li>
                  );
                })}
              </ul>
              {best && worst && m.open.length > 1 && (
                <p className="mt-3 text-xs text-muted">
                  Best: {byId[best.symbol] ? shortSymbol(byId[best.symbol]) : best.symbol} ({signedUsd(best.profit)}) · Weakest: {byId[worst.symbol] ? shortSymbol(byId[worst.symbol]) : worst.symbol} (
                  {signedUsd(worst.profit)})
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ── Trade ticket ────────────────────────────────────────────────────────── */

function Trade({ acc, m, onPlace }: { acc: TradingAccount; m: Metrics; onPlace: (p: Position) => void }) {
  const { instruments, byId, moved, seq, history } = useMarket();
  const tradable = useMemo(() => instruments.filter((i) => toUsd(i.quoteCurrency, byId) !== null), [instruments, byId]);
  const [instId, setInstId] = useState('EURUSD');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState('0.10');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const inst = byId[instId] ?? tradable[0];
  const lev = leverageOf(acc);
  const rate = toUsd(inst.quoteCurrency, byId) ?? 1;
  const lotsN = Number(lots);
  const price = side === 'BUY' ? inst.ask : inst.bid;
  const estMargin = Number.isFinite(lotsN) ? (lotsN * inst.contractSize * price * rate) / lev : 0;
  const pipValue = Number.isFinite(lotsN) ? lotsN * inst.contractSize * inst.pipSize * rate : 0;
  const step = (1 / 10 ** inst.digits).toFixed(inst.digits);

  function submit(e: FormEvent) {
    e.preventDefault();
    setDone('');
    if (!Number.isFinite(lotsN) || lotsN < 0.01 || lotsN > 100) return setError('Enter a volume between 0.01 and 100 lots.');
    const slN = sl.trim() ? Number(sl) : undefined;
    const tpN = tp.trim() ? Number(tp) : undefined;
    if (slN !== undefined && (!Number.isFinite(slN) || slN <= 0)) return setError('Stop loss must be a positive price.');
    if (tpN !== undefined && (!Number.isFinite(tpN) || tpN <= 0)) return setError('Take profit must be a positive price.');
    if (side === 'BUY' && slN !== undefined && slN >= inst.bid) return setError('For a buy, the stop loss must be below the current bid.');
    if (side === 'BUY' && tpN !== undefined && tpN <= inst.bid) return setError('For a buy, the take profit must be above the current bid.');
    if (side === 'SELL' && slN !== undefined && slN <= inst.ask) return setError('For a sell, the stop loss must be above the current ask.');
    if (side === 'SELL' && tpN !== undefined && tpN >= inst.ask) return setError('For a sell, the take profit must be below the current ask.');
    if (estMargin > m.freeMargin) return setError(`Not enough free margin. This order needs about ${usd(estMargin)}; ${usd(m.freeMargin)} is free.`);
    setError('');
    const commission = acc.type === 'Raw' ? -RAW_COMMISSION_PER_LOT_RT * lotsN : 0;
    onPlace({
      id: newId('pos'),
      accountId: acc.id,
      symbol: inst.id,
      type: side,
      lots: Math.round(lotsN * 100) / 100,
      openPrice: price,
      currentPrice: price,
      stopLoss: slN,
      takeProfit: tpN,
      openTime: Date.now(),
      profit: commission,
      pips: 0,
      commission,
      swap: 0,
    });
    setDone(`Simulated ${side === 'BUY' ? 'buy' : 'sell'} of ${lotsN.toFixed(2)} ${shortSymbol(inst)} at ${formatPrice(inst, price)} added to Positions. No real order was sent.`);
    setSl('');
    setTp('');
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel title="Order ticket" className="lg:col-span-3">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <div>
            <label htmlFor="ticket-instrument" className={labelCls}>
              Instrument
            </label>
            <select id="ticket-instrument" value={inst.id} onChange={(e) => (setInstId(e.target.value), setError(''), setDone(''))} className={inputCls}>
              {tradable.map((i) => (
                <option key={i.id} value={i.id} className="bg-navy">
                  {i.symbol} — {i.name}
                </option>
              ))}
            </select>
          </div>

          <div role="group" aria-label="Order side" className="grid grid-cols-2 gap-3">
            {(['SELL', 'BUY'] as const).map((s) => {
              const on = side === s;
              const p = s === 'BUY' ? inst.ask : inst.bid;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSide(s)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${on ? 'border-gold bg-gold/15' : 'border-gold/20 bg-abyss/40 hover:border-gold/50'}`}
                >
                  <span className={`block text-xs font-semibold uppercase tracking-[0.16em] ${on ? 'text-gold-hi' : 'text-muted'}`}>{s === 'BUY' ? 'Buy at ask' : 'Sell at bid'}</span>
                  <Flash dir={moved[inst.id]} seq={seq} className="num mt-1 block rounded text-lg font-semibold text-ink sm:text-xl">
                    {formatPrice(inst, p)}
                  </Flash>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="ticket-lots" className={labelCls}>
                Volume (lots)
              </label>
              <input id="ticket-lots" type="number" inputMode="decimal" min="0.01" max="100" step="0.01" value={lots} onChange={(e) => setLots(e.target.value)} className={`${inputCls} num`} />
            </div>
            <div>
              <label htmlFor="ticket-sl" className={labelCls}>
                Stop loss <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input id="ticket-sl" type="number" inputMode="decimal" step={step} placeholder="None" value={sl} onChange={(e) => setSl(e.target.value)} className={`${inputCls} num`} />
            </div>
            <div>
              <label htmlFor="ticket-tp" className={labelCls}>
                Take profit <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input id="ticket-tp" type="number" inputMode="decimal" step={step} placeholder="None" value={tp} onChange={(e) => setTp(e.target.value)} className={`${inputCls} num`} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="Est. margin" value={usd(estMargin)} sub={`at ${acc.leverage}`} />
            <Stat label="Pip value" value={usd(pipValue)} sub="per pip, this volume" />
            <Stat label="Free margin" value={usd(m.freeMargin)} />
          </dl>

          <div aria-live="polite" className="min-h-[1.25rem] text-sm">
            {error && <p className="rounded-lg border border-ink/20 bg-ink/5 px-3 py-2 text-ink">{error}</p>}
            {done && <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-gold-hi">{done}</p>}
          </div>

          <button type="submit" className={`${btnGold} w-full sm:w-auto`}>
            Place simulated {side === 'BUY' ? 'buy' : 'sell'} · {formatPrice(inst, price)}
          </button>
        </form>
      </Panel>

      <Panel title={shortSymbol(inst)} className="lg:col-span-2">
        <p className="text-sm text-muted">{inst.name}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Bid</p>
            <Flash dir={moved[inst.id]} seq={seq} className="num block rounded text-xl font-semibold">
              {formatPrice(inst, inst.bid)}
            </Flash>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Ask</p>
            <Flash dir={moved[inst.id]} seq={seq} className="num block rounded text-xl font-semibold">
              {formatPrice(inst, inst.ask)}
            </Flash>
          </div>
        </div>
        <div className="mt-4" role="img" aria-label={`Recent ${shortSymbol(inst)} price trend`}>
          <Sparkline data={history[inst.id] ?? [inst.bid, inst.bid]} className="h-24 w-full" />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Spread</dt>
          <dd className="num text-right">{((inst.ask - inst.bid) / inst.pipSize).toFixed(1)} pips</dd>
          <dt className="text-muted">24h high</dt>
          <dd className="num text-right">{formatPrice(inst, inst.high24h)}</dd>
          <dt className="text-muted">24h low</dt>
          <dd className="num text-right">{formatPrice(inst, inst.low24h)}</dd>
          <dt className="text-muted">Contract size</dt>
          <dd className="num text-right">{inst.contractSize.toLocaleString('en-US')}</dd>
        </dl>
        <p className="mt-4 text-xs text-muted">Prices are simulated for this preview and are not live quotes.</p>
      </Panel>
    </div>
  );
}

/* ── Positions ───────────────────────────────────────────────────────────── */

function Positions({ m, byId, onClose, onGo }: { m: Metrics; byId: ById; onClose: (id: string) => void; onGo: (v: ActivePortalView) => void }) {
  const { moved, seq } = useMarket();
  return (
    <Panel title="Open positions" action={<span className={`num text-sm font-semibold ${plClass(m.floating)}`}>Floating {signedUsd(m.floating)}</span>}>
      {m.open.length === 0 ? (
        <Empty>
          No open positions.{' '}
          <button type="button" onClick={() => onGo('trade')} className="font-semibold text-gold underline-offset-4 hover:text-gold-hi hover:underline">
            Open a simulated trade
          </button>
        </Empty>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0" tabIndex={0} role="region" aria-label="Open positions table, scrolls sideways">
          <table className="num w-full min-w-[760px] text-sm">
            <caption className="sr-only">Open positions with live profit and loss</caption>
            <thead className="border-b border-gold/20">
              <tr>
                <th scope="col" className={th}>Symbol</th>
                <th scope="col" className={th}>Side</th>
                <th scope="col" className={`${th} text-right`}>Lots</th>
                <th scope="col" className={`${th} text-right`}>Open</th>
                <th scope="col" className={`${th} text-right`}>Current</th>
                <th scope="col" className={`${th} text-right`}>SL / TP</th>
                <th scope="col" className={`${th} text-right`}>Pips</th>
                <th scope="col" className={`${th} text-right`}>P/L</th>
                <th scope="col" className={th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {m.open.map((p) => {
                const inst = byId[p.symbol];
                const name = inst ? shortSymbol(inst) : p.symbol;
                const f = (v?: number) => (v === undefined ? '—' : inst ? formatPrice(inst, v) : String(v));
                return (
                  <tr key={p.id}>
                    <th scope="row" className={`${td} text-left font-semibold`}>
                      {name}
                      <span className="block text-[11px] font-normal text-muted">{fmtTime(p.openTime)}</span>
                    </th>
                    <td className={`${td} ${p.type === 'BUY' ? 'text-gold-hi' : 'text-ink/80'}`}>{p.type}</td>
                    <td className={`${td} text-right`}>{p.lots.toFixed(2)}</td>
                    <td className={`${td} text-right`}>{f(p.openPrice)}</td>
                    <td className={`${td} text-right`}>
                      <Flash dir={moved[p.symbol]} seq={seq} className="rounded px-1">
                        {f(p.currentPrice)}
                      </Flash>
                    </td>
                    <td className={`${td} text-right text-muted`}>
                      {f(p.stopLoss)} / {f(p.takeProfit)}
                    </td>
                    <td className={`${td} text-right ${plClass(p.pips)}`}>{p.pips.toFixed(1)}</td>
                    <td className={`${td} text-right font-semibold ${plClass(p.profit)}`}>{signedUsd(p.profit)}</td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => onClose(p.id)} className="rounded-full border border-gold/40 px-3 py-1 text-xs font-semibold text-ink hover:border-gold-hi hover:text-gold-hi" aria-label={`Close ${p.type.toLowerCase()} ${p.lots.toFixed(2)} ${name}`}>
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">P/L is marked to the simulated feed in USD and includes commission. Positions close automatically if a stop loss or take profit is reached.</p>
    </Panel>
  );
}

/* ── Funds ───────────────────────────────────────────────────────────────── */

type FundMode = 'deposit' | 'withdraw' | 'transfer';

function Funds({
  accounts,
  active,
  metrics,
  transactions,
  onRecord,
}: {
  accounts: TradingAccount[];
  active: TradingAccount;
  metrics: Record<string, Metrics>;
  transactions: Transaction[];
  onRecord: (t: Transaction) => void;
}) {
  const live = accounts.filter((a) => a.isLive);
  const [mode, setMode] = useState<FundMode>('deposit');
  const [accountId, setAccountId] = useState(active.isLive ? active.id : live[0].id);
  const [toId, setToId] = useState(live.find((a) => a.id !== accountId)?.id ?? live[0].id);
  const [method, setMethod] = useState<(typeof FUND_METHODS)[number]>('Bank wire');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const accNo = (id: string) => accounts.find((a) => a.id === id)?.accountNumber ?? id;
  const list = transactions.filter((t) => t.accountId === active.id);

  function submit(e: FormEvent) {
    e.preventDefault();
    setDone('');
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setError('Enter an amount greater than zero.');
    if (mode !== 'deposit' && n > metrics[accountId].freeMargin) return setError(`That is more than the free margin on ${accNo(accountId)} (${usd(metrics[accountId].freeMargin)}).`);
    if (mode === 'transfer' && toId === accountId) return setError('Choose two different accounts.');
    setError('');
    const now = fmtTime(Date.now());
    if (mode === 'transfer') {
      onRecord({ id: newId('tx'), accountId, type: 'Transfer', method: `To ${accNo(toId)} (demo)`, amount: -n, status: 'Pending', date: now });
      onRecord({ id: newId('tx'), accountId: toId, type: 'Transfer', method: `From ${accNo(accountId)} (demo)`, amount: n, status: 'Pending', date: now });
    } else {
      onRecord({ id: newId('tx'), accountId, type: mode === 'deposit' ? 'Deposit' : 'Withdrawal', method: `${method} (demo)`, amount: mode === 'deposit' ? n : -n, status: 'Pending', date: now });
    }
    const verb = mode === 'deposit' ? 'deposit' : mode === 'withdraw' ? 'withdrawal' : 'transfer';
    setDone(`Demo ${verb} of ${usd(n)} recorded in the list below. Nothing was actually moved — no money has been sent, charged or transferred, and balances are unchanged.`);
    setAmount('');
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel title="Move funds" className="lg:col-span-2">
        <Segmented<FundMode>
          label="Funding action"
          value={mode}
          onChange={(v) => (setMode(v), setError(''), setDone(''))}
          options={[
            { id: 'deposit', label: 'Deposit' },
            { id: 'withdraw', label: 'Withdraw' },
            { id: 'transfer', label: 'Transfer' },
          ]}
        />
        <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
          <div>
            <label htmlFor="funds-account" className={labelCls}>
              {mode === 'transfer' ? 'From account' : 'Account'}
            </label>
            <select id="funds-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
              {live.map((a) => (
                <option key={a.id} value={a.id} className="bg-navy">
                  {a.accountNumber} · {a.type} · {usd(metrics[a.id].balance)}
                </option>
              ))}
            </select>
          </div>

          {mode === 'transfer' ? (
            <div>
              <label htmlFor="funds-to" className={labelCls}>
                To account
              </label>
              <select id="funds-to" value={toId} onChange={(e) => setToId(e.target.value)} className={inputCls}>
                {live.map((a) => (
                  <option key={a.id} value={a.id} className="bg-navy">
                    {a.accountNumber} · {a.type}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <fieldset>
              <legend className={labelCls}>Method</legend>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {FUND_METHODS.map((mm) => {
                  const id = `funds-method-${mm.replace(/\W+/g, '-').toLowerCase()}`;
                  return (
                    <label key={mm} htmlFor={id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold-hi ${method === mm ? 'border-gold bg-gold/10 text-ink' : 'border-gold/20 text-muted hover:border-gold/50'}`}>
                      <input id={id} type="radio" name="funds-method" value={mm} checked={method === mm} onChange={() => setMethod(mm)} className="accent-[#D4AF37]" />
                      {mm}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="funds-amount" className={labelCls}>
              Amount (USD)
            </label>
            <input id="funds-amount" type="number" inputMode="decimal" min="1" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} num`} />
            {mode !== 'deposit' && <p className="mt-1 text-xs text-muted">Free margin: {usd(metrics[accountId].freeMargin)}</p>}
          </div>

          <div aria-live="polite" className="text-sm">
            {error && <p className="rounded-lg border border-ink/20 bg-ink/5 px-3 py-2 text-ink">{error}</p>}
            {done && <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-gold-hi">{done}</p>}
          </div>

          <button type="submit" className={btnGold}>
            {mode === 'deposit' ? 'Request demo deposit' : mode === 'withdraw' ? 'Request demo withdrawal' : 'Request demo transfer'}
          </button>
          <p className="text-xs text-muted">Preview only. This form does not connect to any payment provider and sends nothing.</p>
        </form>
      </Panel>

      <Panel title={`Transactions · ${active.accountNumber}`} className="lg:col-span-3">
        {list.length === 0 ? (
          <Empty>No transactions on this account yet.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0" tabIndex={0} role="region" aria-label="Transactions table, scrolls sideways">
            <table className="num w-full min-w-[560px] text-sm">
              <caption className="sr-only">Transactions for account {active.accountNumber}</caption>
              <thead className="border-b border-gold/20">
                <tr>
                  <th scope="col" className={th}>Date</th>
                  <th scope="col" className={th}>Type</th>
                  <th scope="col" className={th}>Method / reference</th>
                  <th scope="col" className={`${th} text-right`}>Amount</th>
                  <th scope="col" className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {[...list].reverse().map((t) => (
                  <tr key={t.id}>
                    <td className={`${td} text-muted`}>{t.date}</td>
                    <th scope="row" className={`${td} text-left font-medium`}>{t.type}</th>
                    <td className={td}>
                      {t.method ?? '—'}
                      {t.txHash && <span className="block text-[11px] text-muted">{t.txHash}</span>}
                    </td>
                    <td className={`${td} text-right font-semibold ${plClass(t.amount)}`}>{signedUsd(t.amount)}</td>
                    <td className={td}>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${t.status === 'Completed' ? 'border-gold/40 text-gold-hi' : 'border-ink/20 text-muted'}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ── KYC ─────────────────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: string }) {
  const tone = status === 'Verified' || status === 'On' ? 'border-gold/50 bg-gold/10 text-gold-hi' : status === 'Pending' ? 'border-ink/30 text-ink' : 'border-ink/15 text-muted';
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>;
}

function UploadSlot({ id, label, hint }: { id: string; label: string; hint: string }) {
  const [name, setName] = useState('');
  return (
    <div className="rounded-xl border border-dashed border-gold/30 bg-abyss/40 p-4">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
        {hint}
      </p>
      <input
        id={id}
        type="file"
        accept="image/*,application/pdf"
        aria-describedby={`${id}-hint ${id}-status`}
        onChange={(e) => setName(e.target.files?.[0]?.name ?? '')}
        className="mt-3 block w-full min-w-0 text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:text-abyss hover:file:bg-gold-hi"
      />
      <p id={`${id}-status`} aria-live="polite" className="mt-2 break-all text-xs text-gold-hi">
        {name ? `Selected: ${name} — kept on this device, not uploaded.` : ''}
      </p>
    </div>
  );
}

function Kyc() {
  const k = INITIAL_KYC;
  const rows: { label: string; status: string; note: string }[] = [
    { label: 'Identity verification', status: k.tier1Identity, note: 'Government-issued photo ID' },
    { label: 'Address verification', status: k.tier2Address, note: 'Recent utility bill or bank statement' },
    { label: 'Two-factor authentication', status: k.twoFactorEnabled ? 'On' : 'Off', note: 'Authenticator app sign-in' },
    { label: 'Phone number', status: k.phoneVerified ? 'Verified' : 'Not verified', note: 'Used for security alerts' },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Verification status">
        <ul className="divide-y divide-gold/10">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="block text-xs text-muted">{r.note}</span>
              </span>
              <StatusPill status={r.status} />
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-gold/15 pt-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Name</dt>
          <dd className="break-words">{k.fullName}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="break-all">{k.email}</dd>
          <dt className="text-muted">Nationality</dt>
          <dd>{k.nationality}</dd>
        </dl>
      </Panel>
      <Panel title="Documents">
        <p className="mb-4 text-sm text-muted">Choose a file to see how uploads will work. In this preview nothing leaves your device and no document is stored.</p>
        <div className="grid gap-4">
          <UploadSlot id="kyc-upload-identity" label="Proof of identity" hint="Passport, national ID card or driving licence. JPG, PNG or PDF." />
          <UploadSlot id="kyc-upload-address" label="Proof of address" hint="Utility bill or bank statement from the last 3 months. JPG, PNG or PDF." />
        </div>
        <p className="mt-4 text-xs text-muted">
          Questions about verification: <a className="text-gold underline-offset-4 hover:text-gold-hi hover:underline" href={`mailto:${COMPANY.emails.compliance}`}>{COMPANY.emails.compliance}</a>
        </p>
      </Panel>
    </div>
  );
}

/* ── History ─────────────────────────────────────────────────────────────── */

function History({ closed, byId, onGo }: { closed: Closed[]; byId: ById; onGo: (v: ActivePortalView) => void }) {
  const net = closed.reduce((s, c) => s + c.finalProfit, 0);
  const wins = closed.filter((c) => c.finalProfit > 0).length;
  const lots = closed.reduce((s, c) => s + c.lots, 0);
  return (
    <Panel title="Closed trades">
      {closed.length === 0 ? (
        <Empty>
          No closed trades yet. Close a position from{' '}
          <button type="button" onClick={() => onGo('positions')} className="font-semibold text-gold underline-offset-4 hover:text-gold-hi hover:underline">
            Positions
          </button>{' '}
          and it will appear here.
        </Empty>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Trades" value={closed.length} />
            <Stat label="Winning" value={`${wins} of ${closed.length}`} />
            <Stat label="Volume" value={`${lots.toFixed(2)} lots`} />
            <Stat label="Net P/L" value={signedUsd(net)} tone={plClass(net)} />
          </dl>
          <div className="-mx-4 overflow-x-auto sm:mx-0" tabIndex={0} role="region" aria-label="Closed trades table, scrolls sideways">
            <table className="num w-full min-w-[780px] text-sm">
              <caption className="sr-only">Closed trades for this account with totals</caption>
              <thead className="border-b border-gold/20">
                <tr>
                  <th scope="col" className={th}>Symbol</th>
                  <th scope="col" className={th}>Side</th>
                  <th scope="col" className={`${th} text-right`}>Lots</th>
                  <th scope="col" className={`${th} text-right`}>Open</th>
                  <th scope="col" className={`${th} text-right`}>Close</th>
                  <th scope="col" className={th}>Closed at</th>
                  <th scope="col" className={th}>Reason</th>
                  <th scope="col" className={`${th} text-right`}>P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {[...closed].reverse().map((c) => {
                  const inst = byId[c.symbol];
                  const f = (v: number) => (inst ? formatPrice(inst, v) : String(v));
                  return (
                    <tr key={c.id}>
                      <th scope="row" className={`${td} text-left font-semibold`}>{inst ? shortSymbol(inst) : c.symbol}</th>
                      <td className={td}>{c.type}</td>
                      <td className={`${td} text-right`}>{c.lots.toFixed(2)}</td>
                      <td className={`${td} text-right`}>{f(c.openPrice)}</td>
                      <td className={`${td} text-right`}>{f(c.closePrice)}</td>
                      <td className={`${td} text-muted`}>{fmtTime(c.closeTime)}</td>
                      <td className={`${td} text-muted`}>{c.reason}</td>
                      <td className={`${td} text-right font-semibold ${plClass(c.finalProfit)}`}>{signedUsd(c.finalProfit)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gold/30">
                <tr>
                  <th scope="row" colSpan={2} className={`${td} text-left text-xs uppercase tracking-[0.12em] text-muted`}>
                    Total ({closed.length})
                  </th>
                  <td className={`${td} text-right font-semibold`}>{lots.toFixed(2)}</td>
                  <td colSpan={4} />
                  <td className={`${td} text-right font-semibold ${plClass(net)}`}>{signedUsd(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

/* ── Portal shell ────────────────────────────────────────────────────────── */

export default function Portal() {
  const { byId, seq } = useMarket();
  const accounts = INITIAL_ACCOUNTS;
  const [view, setView] = useState<ActivePortalView>('overview');
  const [accountId, setAccountId] = useState(accounts[0].id);
  const [book, setBook] = useState<Book>({ positions: SEED_POSITIONS, closed: [] });
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [eqHist, setEqHist] = useState<Record<string, number[]>>({});
  const [notice, setNotice] = useState('');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const active = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const metrics = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, metricsFor(a, book, byId)])) as Record<string, Metrics>, [accounts, book, byId]);
  const m = metrics[active.id];

  useEffect(() => {
    document.title = 'Trader Portal · Connect Financials';
  }, []);

  function closeWith(b: Book, ids: Map<string, CloseReason>): Book {
    const now = Date.now();
    const closing = b.positions.filter((p) => ids.has(p.id)).map((p) => {
      const mk = mark(p, byId);
      return { ...mk, closePrice: mk.currentPrice, closeTime: now, finalProfit: mk.profit, reason: ids.get(p.id)! } satisfies Closed;
    });
    return { positions: b.positions.filter((p) => !ids.has(p.id)), closed: [...b.closed, ...closing] };
  }

  // Each tick: record equity for the sparkline and run stop loss / take profit.
  useEffect(() => {
    setEqHist((h) => {
      const next: Record<string, number[]> = {};
      for (const a of accounts) next[a.id] = [...(h[a.id] ?? []).slice(-59), metrics[a.id].equity];
      return next;
    });
    const hits = new Map<string, CloseReason>();
    for (const p of book.positions) {
      const inst = byId[p.symbol];
      if (!inst) continue;
      const px = p.type === 'BUY' ? inst.bid : inst.ask;
      if (p.stopLoss !== undefined && (p.type === 'BUY' ? px <= p.stopLoss : px >= p.stopLoss)) hits.set(p.id, 'Stop loss');
      else if (p.takeProfit !== undefined && (p.type === 'BUY' ? px >= p.takeProfit : px <= p.takeProfit)) hits.set(p.id, 'Take profit');
    }
    if (hits.size) {
      setBook((b) => closeWith(b, hits));
      setNotice(`${hits.size} position${hits.size > 1 ? 's' : ''} closed by stop loss or take profit. See History.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  const go = (v: ActivePortalView) => {
    setView(v);
    requestAnimationFrame(() => tabRefs.current[v]?.focus());
  };

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = VIEWS.length - 1;
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = i === 0 ? last : i - 1;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = last;
    if (n < 0) return;
    e.preventDefault();
    setView(VIEWS[n].id);
    tabRefs.current[VIEWS[n].id]?.focus();
  }

  const closedHere = book.closed.filter((c) => c.accountId === active.id);

  return (
    <div className="min-h-screen overflow-x-hidden bg-navy text-ink">
      <a href="#portal-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-abyss">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-gold/20 bg-abyss/90 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <p className="font-display text-sm font-bold tracking-[0.22em] text-ink sm:text-base">
            CONNECT <span className="text-gold">FINANCIALS</span>
          </p>
          <span className="hidden text-xs uppercase tracking-[0.2em] text-muted sm:inline">Trader Portal</span>
          <span className="rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-hi">Demo data — preview only</span>
          <button type="button" onClick={() => goTo('site')} className={`${btnGhost} ml-auto py-1.5`}>
            <span aria-hidden className="mr-1.5">←</span>Back to site
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-8">
        <nav aria-label="Portal" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div role="tablist" aria-label="Portal sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {VIEWS.map((v, i) => {
              const on = view === v.id;
              const count = v.id === 'positions' ? m.open.length : v.id === 'history' ? closedHere.length : 0;
              return (
                <button
                  key={v.id}
                  ref={(el) => {
                    tabRefs.current[v.id] = el;
                  }}
                  id={`portal-tab-${v.id}`}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  aria-controls="portal-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setView(v.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-medium transition lg:rounded-xl lg:py-2.5 ${
                    on ? 'bg-gold text-abyss' : 'text-muted hover:bg-navy-mid hover:text-ink'
                  }`}
                >
                  {v.label}
                  {count > 0 && <span className={`num rounded-full px-1.5 text-[11px] ${on ? 'bg-abyss/20' : 'bg-navy-mid text-gold-hi'}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        <main id="portal-main" className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{VIEWS.find((v) => v.id === view)?.label}</h1>
              <p className="text-sm text-muted">
                {active.accountNumber} · {active.type} · {active.isLive ? 'Live' : 'Demo'} · <span className="num">{usd(m.equity)}</span> equity
              </p>
            </div>
            <Segmented<string>
              label="Trading account"
              value={active.id}
              onChange={setAccountId}
              options={accounts.map((a) => ({
                id: a.id,
                label: (
                  <>
                    {a.isLive ? 'Live' : 'Demo'} {a.isLive ? a.type : ''}
                    <span className="sr-only"> account {a.accountNumber}</span>
                  </>
                ),
              }))}
            />
          </div>

          <div aria-live="polite">
            {notice && (
              <p className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm text-gold-hi">
                {notice}
                <button type="button" onClick={() => setNotice('')} className="shrink-0 text-xs font-semibold text-ink hover:text-gold-hi">
                  Dismiss
                </button>
              </p>
            )}
          </div>

          <div id="portal-panel" role="tabpanel" aria-labelledby={`portal-tab-${view}`} tabIndex={0} className="focus-visible:outline-offset-8">
            {view === 'overview' && <Overview acc={active} m={m} eq={eqHist[active.id] ?? []} byId={byId} onGo={go} />}
            {view === 'trade' && <Trade key={active.id} acc={active} m={m} onPlace={(p) => setBook((b) => ({ ...b, positions: [...b.positions, p] }))} />}
            {view === 'positions' && <Positions m={m} byId={byId} onGo={go} onClose={(id) => setBook((b) => closeWith(b, new Map([[id, 'Manual']])))} />}
            {view === 'funds' && <Funds key={active.id} accounts={accounts} active={active} metrics={metrics} transactions={transactions} onRecord={(t) => setTransactions((l) => [...l, t])} />}
            {view === 'kyc' && <Kyc />}
            {view === 'history' && <History closed={closedHere} byId={byId} onGo={go} />}
          </div>
        </main>
      </div>

      <footer className="border-t border-gold/15 bg-abyss/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 md:flex-row md:items-start md:justify-between" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          <RiskNote />
          <p className="max-w-md text-[11px] leading-snug text-muted">
            This portal is a design preview. Accounts, positions, transactions and verification details are sample data, prices are simulated, and no action here moves money or places a real order.
          </p>
        </div>
      </footer>
    </div>
  );
}
