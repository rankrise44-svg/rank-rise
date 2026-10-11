import "server-only";
import { query } from "../db";
import { getSettings } from "../settings";

export type SignalRow = {
  id: string;
  signal_type: string;
  subject_type: string;
  subject_key: string;
  subject_label: string | null;
  window_start: Date;
  window_end: Date;
  baseline_value: string | null;
  current_value: string | null;
  change_pct: string | null;
  zscore: string | null;
  direction: string;
  significance: string;
  sample_size: number | null;
  method: string;
  details: Record<string, unknown>;
  computed_at: Date;
};

/** Latest signal per subject; indicator subjects are joined to their Arabic names. */
/**
 * recentOnly: drop indicator signals whose latest observation is old (annual data from years ago is not
 * "this week's" news even if its last change was large).
 */
export async function latestSignals(opts: { type?: string; minSignificance?: "low" | "medium" | "high"; limit?: number; recentOnly?: boolean } = {}) {
  const s = await getSettings();
  const levels = opts.minSignificance === "high" ? ["high"] : opts.minSignificance === "medium" ? ["medium", "high"] : ["low", "medium", "high"];
  return query<SignalRow>(
    `SELECT * FROM (
       SELECT DISTINCT ON (t.signal_type, t.subject_type, t.subject_key) t.*,
              CASE WHEN t.subject_type = 'indicator' THEN COALESCE(i.name_ar, i.name_en) || ' (' || i.country_code || ')' ELSE NULL END AS subject_label
         FROM trend_signals t LEFT JOIN economic_indicators i ON t.subject_type = 'indicator' AND i.id::text = t.subject_key
        WHERE (NOT t.is_synthetic OR $1) AND ($2::text IS NULL OR t.signal_type = $2)
        ORDER BY t.signal_type, t.subject_type, t.subject_key, t.window_end DESC) x
      WHERE significance = ANY($3) AND (NOT $5 OR window_end > now() - CASE WHEN signal_type = 'indicator_change' THEN interval '15 months' ELSE interval '21 days' END)
      ORDER BY CASE significance WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, abs(COALESCE(zscore,0)) DESC
      LIMIT $4`,
    [s.demoMode, opts.type ?? null, levels, opts.limit ?? 50, opts.recentOnly ?? false],
  );
}
