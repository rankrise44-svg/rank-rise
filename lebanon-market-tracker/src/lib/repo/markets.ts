import "server-only";
import { query } from "../db";
import { getSettings } from "../settings";

export type InstrumentRow = {
  instrument: string;
  instrument_type: string;
  rate_type: string;
  provider: string;
  source_key: string;
  source_provenance: string;
  currency: string | null;
  unit: string | null;
  granularity: string;
  delay_minutes: number | null;
  source_url: string | null;
  latest_value: string;
  latest_at: Date;
  latest_collected: Date;
  prev_value: string | null;
  prev_at: Date | null;
  first_at: Date;
  n: string;
  is_synthetic: boolean;
};

export async function listInstruments(): Promise<InstrumentRow[]> {
  const s = await getSettings();
  return query<InstrumentRow>(
    `WITH g AS (
       SELECT m.source_id, m.instrument, m.rate_type, m.granularity, count(*) AS n, min(observed_at) AS first_at, bool_or(m.is_synthetic) AS is_synthetic
         FROM market_observations m WHERE (NOT m.is_synthetic OR $1) GROUP BY 1,2,3,4)
     SELECT g.instrument, l.instrument_type, g.rate_type, l.provider, s.key AS source_key, s.provenance AS source_provenance, l.currency, l.unit,
            g.granularity, l.delay_minutes, l.source_url, l.value AS latest_value, l.observed_at AS latest_at, l.collected_at AS latest_collected,
            pv.value AS prev_value, pv.observed_at AS prev_at, g.first_at, g.n, g.is_synthetic
       FROM g JOIN sources s ON s.id = g.source_id
       JOIN LATERAL (SELECT * FROM market_observations m WHERE m.source_id = g.source_id AND m.instrument = g.instrument AND m.rate_type = g.rate_type
                      AND m.granularity = g.granularity ORDER BY observed_at DESC LIMIT 1) l ON true
       LEFT JOIN LATERAL (SELECT value, observed_at FROM market_observations m WHERE m.source_id = g.source_id AND m.instrument = g.instrument
                      AND m.rate_type = g.rate_type AND m.granularity = g.granularity AND m.observed_at < l.observed_at
                      ORDER BY observed_at DESC LIMIT 1) pv ON true
      ORDER BY g.instrument, g.rate_type`,
    [s.demoMode],
  );
}

export async function getMarketSeries(instrument: string, sourceKey: string, rateType: string, fromDays = 365) {
  return query<{ observed_at: Date; value: string }>(
    `SELECT m.observed_at, m.value FROM market_observations m JOIN sources s ON s.id = m.source_id
      WHERE m.instrument = $1 AND s.key = $2 AND m.rate_type = $3 AND m.observed_at > now() - make_interval(days => $4)
      ORDER BY m.observed_at`,
    [instrument, sourceKey, rateType, fromDays],
  );
}
