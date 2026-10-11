import "server-only";
import { query } from "../db";

export async function listCommodities() {
  return query<{ commodity: string; category: string | null; unit: string; n: string; last: string }>(
    `SELECT commodity, max(category) AS category, mode() WITHIN GROUP (ORDER BY unit) AS unit, count(*) AS n, max(observed_date)::text AS last
       FROM price_observations WHERE NOT is_synthetic AND commodity NOT ILIKE 'exchange rate%' AND currency = 'LBP'
      GROUP BY commodity HAVING max(observed_date) > now() - interval '18 months' ORDER BY count(*) DESC`,
  );
}

/** Latest observation per market for one commodity (for map markers). Coordinates come from the source. */
export async function latestPricesByMarket(commodity: string) {
  return query<{ market: string; admin1: string | null; area_key: string | null; latitude: number | null; longitude: number | null; price: string; usd_price: string | null; unit: string; currency: string; observed_date: string; price_flag: string | null }>(
    `SELECT DISTINCT ON (market_id) market, admin1, area_key, latitude, longitude, price, usd_price, unit, currency, observed_date::text, price_flag
       FROM price_observations WHERE commodity = $1 AND currency = 'LBP' AND NOT is_synthetic
      ORDER BY market_id, observed_date DESC`,
    [commodity],
  );
}

/** National monthly median (across monitored markets) for one commodity, in LBP and USD. */
export async function commodityTrend(commodity: string, months = 36) {
  return query<{ month: string; median_lbp: string; median_usd: string | null; markets: string }>(
    `SELECT to_char(date_trunc('month', observed_date), 'YYYY-MM') AS month,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_lbp,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY usd_price) AS median_usd,
            count(DISTINCT market_id) AS markets
       FROM price_observations WHERE commodity = $1 AND currency = 'LBP' AND NOT is_synthetic
        AND observed_date > now() - make_interval(months => $2)
      GROUP BY 1 ORDER BY 1`,
    [commodity, months],
  );
}

export async function pricesFreshness() {
  return query<{ last: string | null; collected: Date | null; n: string }>(
    "SELECT max(observed_date)::text AS last, max(collected_at) AS collected, count(*) AS n FROM price_observations WHERE NOT is_synthetic",
  );
}
