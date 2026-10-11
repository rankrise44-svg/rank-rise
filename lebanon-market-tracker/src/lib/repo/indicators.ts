import "server-only";
import { query, queryOne } from "../db";
import { getSettings } from "../settings";

export type IndicatorRow = {
  id: string;
  code: string;
  country_code: string;
  name_en: string;
  name_ar: string | null;
  unit: string | null;
  unit_ar: string | null;
  frequency: string;
  category: string | null;
  sector_key: string | null;
  higher_is: string | null;
  methodology_url: string | null;
  metadata: Record<string, unknown>;
  source_key: string;
  source_name: string;
  source_name_ar: string | null;
  provenance: string;
  is_synthetic: boolean;
  latest_period: string | null;
  latest_label: string | null;
  latest_value: string | null;
  latest_collected: Date | null;
  latest_quality: string | null;
  prev_value: string | null;
  prev_label: string | null;
  source_url: string | null;
  obs_count: string;
};

const BASE = `
  SELECT i.id, i.code, i.country_code, i.name_en, i.name_ar, i.unit, i.unit_ar, i.frequency, i.category, i.sector_key, i.higher_is,
         i.methodology_url, i.metadata, s.key AS source_key, s.name AS source_name, s.name_ar AS source_name_ar, s.provenance, i.is_synthetic,
         l.period_date::text AS latest_period, l.period_label AS latest_label, l.value AS latest_value, l.collected_at AS latest_collected,
         l.quality_status AS latest_quality, l.source_url, pv.value AS prev_value, pv.period_label AS prev_label, cnt.n AS obs_count
    FROM economic_indicators i
    JOIN sources s ON s.id = i.source_id
    LEFT JOIN LATERAL (SELECT * FROM indicator_observations o WHERE o.indicator_id = i.id AND o.is_current AND NOT o.is_projection AND o.value IS NOT NULL
                        ORDER BY o.period_date DESC LIMIT 1) l ON true
    LEFT JOIN LATERAL (SELECT value, period_label FROM indicator_observations o WHERE o.indicator_id = i.id AND o.is_current AND NOT o.is_projection
                        AND o.value IS NOT NULL AND o.period_date < l.period_date ORDER BY o.period_date DESC LIMIT 1) pv ON true
    LEFT JOIN LATERAL (SELECT count(*) AS n FROM indicator_observations o WHERE o.indicator_id = i.id AND o.is_current) cnt ON true`;

export async function listIndicators(opts: { country?: string; category?: string; sourceKey?: string; codePrefix?: string; sector?: string } = {}) {
  const s = await getSettings();
  return query<IndicatorRow>(
    `${BASE}
      WHERE (NOT i.is_synthetic OR $1) AND ($2::text IS NULL OR i.country_code = $2) AND ($3::text IS NULL OR i.category = $3)
        AND ($4::text IS NULL OR s.key = $4) AND ($5::text IS NULL OR i.code LIKE $5 || '%') AND ($6::text IS NULL OR i.sector_key = $6)
      ORDER BY s.key, i.category NULLS LAST, i.code`,
    [s.demoMode, opts.country ?? null, opts.category ?? null, opts.sourceKey ?? null, opts.codePrefix ?? null, opts.sector ?? null],
  );
}

export async function getIndicator(id: string) {
  return queryOne<IndicatorRow>(`${BASE} WHERE i.id = $1`, [id]);
}

export async function findIndicator(code: string, country = "LBN", sourceKey?: string) {
  return queryOne<IndicatorRow>(
    `${BASE} WHERE i.code = $1 AND i.country_code = $2 AND ($3::text IS NULL OR s.key = $3) ORDER BY l.period_date DESC NULLS LAST LIMIT 1`,
    [code, country, sourceKey ?? null],
  );
}

export type ObservationRow = {
  period_date: string;
  period_label: string;
  value: string | null;
  is_projection: boolean;
  quality_status: string;
  collected_at: Date;
  source_url: string | null;
};

export async function getSeries(indicatorId: string, opts: { from?: string; to?: string; includeProjections?: boolean } = {}) {
  return query<ObservationRow>(
    `SELECT period_date::text, period_label, value, is_projection, quality_status, collected_at, source_url
       FROM indicator_observations
      WHERE indicator_id = $1 AND is_current AND ($2::date IS NULL OR period_date >= $2) AND ($3::date IS NULL OR period_date <= $3)
        AND ($4 OR NOT is_projection)
      ORDER BY period_date`,
    [indicatorId, opts.from ?? null, opts.to ?? null, opts.includeProjections ?? true],
  );
}

/** Revision history for one period (all vintages, oldest first). */
export async function getRevisions(indicatorId: string, periodDate: string) {
  return query<{ value: string | null; collected_at: Date; is_current: boolean; superseded_at: Date | null }>(
    "SELECT value, collected_at, is_current, superseded_at FROM indicator_observations WHERE indicator_id = $1 AND period_date = $2 ORDER BY collected_at",
    [indicatorId, periodDate],
  );
}

/** Same indicator code across countries (regional comparison). */
export async function compareCountries(code: string, sourceKey: string, from = "2005-01-01") {
  return query<{ country_code: string; period_label: string; value: string }>(
    `SELECT i.country_code, o.period_label, o.value FROM economic_indicators i
       JOIN sources s ON s.id = i.source_id
       JOIN indicator_observations o ON o.indicator_id = i.id AND o.is_current AND o.value IS NOT NULL
      WHERE i.code = $1 AND s.key = $2 AND o.period_date >= $3 AND NOT i.is_synthetic
      ORDER BY o.period_date`,
    [code, sourceKey, from],
  );
}

export async function cpiByRegion() {
  return query<{ region: string; area_key: string; code: string; period_label: string; value: string; quality_status: string; source_url: string; collected_at: Date }>(
    `SELECT DISTINCT ON (i.code) i.metadata->>'region' AS region, i.metadata->>'area_key' AS area_key, i.code, o.period_label, o.value,
            o.quality_status, o.source_url, o.collected_at
       FROM economic_indicators i JOIN indicator_observations o ON o.indicator_id = i.id AND o.is_current
      WHERE i.code LIKE 'CAS.CPI.MOM_PCT.%.TOTAL' AND NOT i.is_synthetic
      ORDER BY i.code, o.period_date DESC`,
  );
}
