import "server-only";
import { query, queryOne } from "../db";
import { findIndicator } from "../repo/indicators";

export type ForecastEvent = "above_threshold" | "below_threshold" | "increase" | "decrease";

const EVENT_AR: Record<ForecastEvent, string> = { above_threshold: "أعلى من", below_threshold: "أدنى من", increase: "يرتفع", decrease: "ينخفض" };

/**
 * Records a well-defined forecast question. The statistical engine (analytics/ Python worker) computes
 * it; nothing here produces a probability. Identical open questions are de-duplicated.
 */
export async function requestForecast(p: { indicatorCode: string; country: string; event: ForecastEvent; threshold: number | null; horizonPeriods: number; via: string; sourceKey?: string }) {
  const ind = await findIndicator(p.indicatorCode, p.country, p.sourceKey);
  if (!ind) return { error: "indicator_not_found" as const, hint: "Use get_economic_indicators to find a valid code." };
  if ((p.event === "above_threshold" || p.event === "below_threshold") && p.threshold === null) return { error: "threshold_required" as const };
  if (!ind.latest_period) return { error: "no_observations" as const };
  const definition = { indicator_id: ind.id, code: ind.code, country: ind.country_code, event: p.event, threshold: p.threshold, horizon_periods: p.horizonPeriods, frequency: ind.frequency, last_observed_period: ind.latest_period };
  const name = ind.name_ar ?? ind.name_en;
  const question =
    p.event === "increase" || p.event === "decrease"
      ? `هل ${EVENT_AR[p.event]} «${name}» في ${p.horizonPeriods === 1 ? "الفترة التالية" : `خلال ${p.horizonPeriods} فترات`} مقارنةً بآخر قيمة (${ind.latest_label})؟`
      : `هل تكون قيمة «${name}» ${EVENT_AR[p.event]} ${p.threshold} ${ind.unit ?? ""} بعد ${p.horizonPeriods} فترة/فترات من ${ind.latest_label}؟`;
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM forecasts WHERE event_definition @> $1::jsonb AND status IN ('pending','running','complete','insufficient_data')
       AND data_cutoff > now() - interval '7 days' ORDER BY created_at DESC LIMIT 1`,
    [JSON.stringify(definition)],
  );
  const id =
    existing?.id ??
    (
      await queryOne<{ id: string }>(
        `INSERT INTO forecasts (question, event_definition, target_indicator_id, horizon_periods, data_cutoff, requested_via)
         VALUES ($1,$2,$3,$4, now(), $5) RETURNING id`,
        [question, JSON.stringify(definition), ind.id, p.horizonPeriods, p.via],
      )
    )!.id;
  const f = await queryOne<ForecastRow>(`${SELECT} WHERE f.id = $1`, [id]);
  return summarize(f!);
}

type ForecastRow = {
  id: string; question: string; status: string; probability: string | null; baseline_probability: string | null; probability_interval: unknown;
  model_name: string | null; model_version: string | null; data_cutoff: Date; training_start: string | null; training_end: string | null;
  backtest: Record<string, unknown>; limitations: string[]; scenario_analysis: string | null; created_at: Date; error_message: string | null;
  outcome: boolean | null; brier_score: string | null; resolved_at: Date | null; event_definition: Record<string, unknown>;
};

const SELECT = `SELECT f.id, f.question, f.status, f.probability, f.baseline_probability, f.probability_interval, f.model_name, f.model_version,
       f.data_cutoff, f.training_start::text, f.training_end::text, f.backtest, f.limitations, f.scenario_analysis, f.created_at, f.error_message,
       f.event_definition, o.outcome, o.brier_score, o.resolved_at
  FROM forecasts f LEFT JOIN forecast_outcomes o ON o.forecast_id = f.id`;

function summarize(f: ForecastRow) {
  return {
    id: f.id,
    question: f.question,
    status: f.status,
    probability: f.probability === null ? null : Number(f.probability),
    baseline_probability: f.baseline_probability === null ? null : Number(f.baseline_probability),
    interval: f.probability_interval,
    model: f.model_name ? `${f.model_name}@${f.model_version}` : null,
    data_cutoff: f.data_cutoff.toISOString(),
    training_period: f.training_start ? `${f.training_start}..${f.training_end}` : null,
    backtest: f.backtest,
    limitations: f.limitations,
    scenario_analysis: f.scenario_analysis,
    outcome: f.outcome,
    created_at: f.created_at,
    note:
      f.status === "pending"
        ? "Queued for the statistical engine (run `npm run analytics -- forecast`). No probability has been computed yet."
        : f.probability === null
          ? "No numeric probability: the model did not pass validation gates; see scenario_analysis/limitations."
          : undefined,
  };
}

export async function listForecasts(limit = 20) {
  const rows = await query<ForecastRow>(`${SELECT} WHERE NOT f.is_synthetic ORDER BY f.created_at DESC LIMIT $1`, [limit]);
  return rows.map(summarize);
}

export async function getForecast(id: string) {
  const f = await queryOne<ForecastRow>(`${SELECT} WHERE f.id = $1`, [id]);
  return f ? summarize(f) : null;
}
