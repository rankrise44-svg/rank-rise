import React from 'react';
import { Calendar, Clock, AlertTriangle, ArrowUpRight, Filter } from 'lucide-react';
import { ECONOMIC_EVENTS } from '../data/forexData';

interface Props {
  /** Set false when a page header above already carries the title. */
  showHeading?: boolean;
}

export const EconomicCalendar: React.FC<Props> = ({ showHeading = true }) => {
  return (
    <section id="calendar-section" className="pt-4 sm:pt-6 pb-8 sm:pb-10 border-b border-navy-700/80 bg-navy-950/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          {showHeading ? (
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Macro Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Live Global Economic Calendar</h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Track major central bank decisions, inflation metrics, and GDP reports driving currency volatility.
              </p>
            </div>
          ) : (
            <h2 className="text-h2 font-bold text-text">Economic calendar</h2>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> High Impact
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-sm">
              Medium Impact
            </span>
          </div>
        </div>

        <div className="bg-navy-900 rounded-2xl border border-navy-700/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-navy-950 border-b border-navy-700 text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Currency</th>
                  <th className="py-3.5 px-4">Impact</th>
                  <th className="py-3.5 px-4">Economic Event</th>
                  <th className="py-3.5 px-4">Actual</th>
                  <th className="py-3.5 px-4">Forecast</th>
                  <th className="py-3.5 px-4">Previous</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/80 font-mono">
                {ECONOMIC_EVENTS.map((event) => {
                  const isHigh = event.impact === 'high';
                  const isMed = event.impact === 'medium';

                  return (
                    <tr key={event.id} className="hover:bg-navy-850/80 transition-colors duration-150">
                      <td className="py-3 px-4 text-slate-300 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.time}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="bg-navy-950 text-white border border-navy-700/80 font-bold px-2 py-0.5 rounded text-[11px]">
                          {event.currency}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isHigh
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isMed
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-navy-950 text-slate-400 border border-navy-700/60'
                          }`}
                        >
                          {event.impact}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans font-medium text-white text-xs">
                        {event.event}
                      </td>

                      <td className="py-3 px-4">
                        {event.actual ? (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                            {event.actual}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Pending</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-300">{event.forecast}</td>

                      <td className="py-3 px-4 text-slate-400">{event.previous}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
