import { useId, useState } from 'react';
import { ECONOMIC_EVENTS } from '../../data/market';
import type { EconomicEvent } from '../../types';

type Impact = EconomicEvent['impact'];
type Filter = 'all' | Impact;

const LEVEL: Record<Impact, number> = { low: 1, medium: 2, high: 3 };
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

function ImpactDots({ impact }: { impact: Impact }) {
  const n = LEVEL[impact];
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${impact[0].toUpperCase()}${impact.slice(1)} impact`}>
      {[1, 2, 3].map((k) => (
        <span
          key={k}
          aria-hidden
          className={`h-2 w-2 rounded-full ${k <= n ? 'bg-gold shadow-[0_0_6px_rgba(245,210,122,0.6)]' : 'border border-gold/35 bg-transparent'}`}
        />
      ))}
    </span>
  );
}

/** Sample economic calendar with an impact filter. */
export function EconomicCalendar() {
  const uid = useId().replace(/:/g, '');
  const [filter, setFilter] = useState<Filter>('all');
  const events = ECONOMIC_EVENTS.filter((e) => filter === 'all' || e.impact === filter);
  const countId = `${uid}-count`;

  return (
    <div className="glass rounded-3xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-gold/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold-hi">Sample schedule</span>
          <span id={countId} className="num text-xs text-muted" aria-live="polite">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>
        <fieldset className="min-w-0">
          <legend className="sr-only">Filter by impact</legend>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <label
                key={f.id}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-hi ${
                  filter === f.id ? 'border-gold bg-gold/15 text-gold-hi' : 'border-gold/20 text-muted hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`${uid}-impact`}
                  id={`${uid}-impact-${f.id}`}
                  value={f.id}
                  checked={filter === f.id}
                  onChange={() => setFilter(f.id)}
                  aria-controls={`${uid}-list`}
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="gold-line my-5 opacity-60" />

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table id={`${uid}-list`} className="w-full text-left text-sm" aria-describedby={countId}>
          <caption className="sr-only">Sample economic calendar{filter !== 'all' ? `, ${filter} impact only` : ''}</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <th scope="col" className="py-3 pr-4 font-normal">Time</th>
              <th scope="col" className="py-3 pr-4 font-normal">Currency</th>
              <th scope="col" className="py-3 pr-4 font-normal">Event</th>
              <th scope="col" className="py-3 pr-4 font-normal">Impact</th>
              <th scope="col" className="py-3 pr-4 text-right font-normal">Actual</th>
              <th scope="col" className="py-3 pr-4 text-right font-normal">Forecast</th>
              <th scope="col" className="py-3 text-right font-normal">Previous</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-gold/10 transition-colors hover:bg-gold/[0.04]">
                <td className="num whitespace-nowrap py-3.5 pr-4 text-muted">{e.time}</td>
                <td className="py-3.5 pr-4">
                  <span className="font-display font-semibold tracking-wide text-ink">{e.currency}</span>
                </td>
                <td className="py-3.5 pr-4 text-ink">{e.event}</td>
                <td className="py-3.5 pr-4">
                  <ImpactDots impact={e.impact} />
                </td>
                <td className={`num py-3.5 pr-4 text-right ${e.actual ? 'font-semibold text-gold-hi' : 'text-muted'}`}>{e.actual ?? '—'}</td>
                <td className="num py-3.5 pr-4 text-right text-ink">{e.forecast}</td>
                <td className="num py-3.5 text-right text-muted">{e.previous}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked list */}
      <ul className="space-y-3 md:hidden" aria-label="Sample economic calendar" aria-describedby={countId}>
        {events.map((e) => (
          <li key={e.id} className="rounded-2xl border border-gold/15 bg-abyss/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="num text-xs text-muted">{e.time}</span>
              <ImpactDots impact={e.impact} />
            </div>
            <p className="mt-1.5 text-sm text-ink">
              <span className="mr-2 font-display font-semibold tracking-wide">{e.currency}</span>
              {e.event}
            </p>
            <dl className="num mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted">Actual</dt>
                <dd className={e.actual ? 'font-semibold text-gold-hi' : 'text-muted'}>{e.actual ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Forecast</dt>
                <dd className="text-ink">{e.forecast}</dd>
              </div>
              <div>
                <dt className="text-muted">Previous</dt>
                <dd className="text-muted">{e.previous}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {events.length === 0 && <p className="py-8 text-center text-sm text-muted">No events at this impact level in the sample.</p>}

      <p className="mt-6 border-t border-gold/15 pt-4 text-[11px] leading-relaxed text-muted">
        Sample data for demonstration. Times, figures and events are illustrative and are not a live economic calendar.
      </p>
    </div>
  );
}
