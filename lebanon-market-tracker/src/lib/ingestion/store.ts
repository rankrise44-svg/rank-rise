import type { Pool, PoolClient } from "pg";
import { canonicalizeUrl, isNearDuplicate, sha256, titleFingerprint } from "./normalize";
import type { IndicatorRecord, MarketRecord, NewsRecord, NormalizedRecord, PriceRecord } from "./types";

export type Queryable = Pick<Pool, "query"> | PoolClient;

export type StoreStats = { inserted: number; updated: number; skipped: number; newsIds: string[]; indicatorIds: string[]; instruments: string[] };

export function emptyStats(): StoreStats {
  return { inserted: 0, updated: 0, skipped: 0, newsIds: [], indicatorIds: [], instruments: [] };
}

/** Stable identity key for in-batch deduplication. */
export function recordKey(r: NormalizedRecord): string {
  switch (r.kind) {
    case "news":
      try {
        return `news:${canonicalizeUrl(r.url)}`;
      } catch {
        return `news:${r.url}`;
      }
    case "indicator":
      return `ind:${r.indicator.countryCode}:${r.indicator.code}:${r.periodDate}`;
    case "market":
      return `mkt:${r.instrument}:${r.rateType}:${r.granularity}:${r.observedAt.toISOString()}`;
    case "price":
      return `px:${r.marketId}:${r.commodityId}:${r.unit}:${r.priceType}:${r.currency}:${r.observedDate}`;
  }
}

export function dedupeBatch<T extends NormalizedRecord>(records: T[]): { unique: T[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const r of records) {
    const k = recordKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(r);
  }
  return { unique, duplicates: records.length - unique.length };
}

export async function storeNews(db: Queryable, sourceId: string, runId: string | null, r: NewsRecord, stats: StoreStats) {
  let canonical: string;
  try {
    canonical = canonicalizeUrl(r.url);
  } catch {
    stats.skipped++;
    return;
  }
  const urlHash = sha256(canonical);
  const fp = titleFingerprint(r.title);
  const res = await db.query<{ id: string }>(
    `INSERT INTO news_articles (source_id, ingestion_run_id, external_id, url, canonical_url, url_hash, title, title_fingerprint,
        summary, language, source_name, source_domain, source_country, image_url, published_at, provenance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (url_hash) DO NOTHING RETURNING id`,
    [
      sourceId, runId, r.externalId ?? null, r.url, canonical, urlHash, r.title, fp, r.summary ?? null, r.language ?? null,
      r.sourceName ?? null, r.sourceDomain ?? null, r.sourceCountry ?? null, r.imageUrl ?? null, r.publishedAt, JSON.stringify(r.provenance),
    ],
  );
  if (!res.rows[0]) {
    stats.skipped++;
    return;
  }
  const id = res.rows[0].id;
  stats.inserted++;
  stats.newsIds.push(id);
  // Near-duplicate detection (syndicated copies of the same story under a different URL).
  const candidates = await db.query<{ id: string; title: string }>(
    `SELECT id, title FROM news_articles
      WHERE id <> $1 AND duplicate_of IS NULL
        AND COALESCE(published_at, collected_at) > COALESCE($3::timestamptz, now()) - interval '4 days'
        AND similarity(title_fingerprint, $2) > 0.45
      ORDER BY similarity(title_fingerprint, $2) DESC LIMIT 5`,
    [id, fp, r.publishedAt],
  );
  const dup = candidates.rows.find((c) => isNearDuplicate(c.title, r.title));
  if (dup) await db.query("UPDATE news_articles SET duplicate_of = $2 WHERE id = $1", [id, dup.id]);
}

export async function upsertIndicator(db: Queryable, sourceId: string, m: IndicatorRecord["indicator"]): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO economic_indicators (source_id, code, country_code, name_en, name_ar, description, unit, unit_ar, frequency,
        category, sector_key, higher_is, methodology_url, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (source_id, code, country_code) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_ar = COALESCE(EXCLUDED.name_ar, economic_indicators.name_ar),
        description = COALESCE(EXCLUDED.description, economic_indicators.description),
        unit = COALESCE(EXCLUDED.unit, economic_indicators.unit),
        unit_ar = COALESCE(EXCLUDED.unit_ar, economic_indicators.unit_ar),
        category = COALESCE(EXCLUDED.category, economic_indicators.category),
        sector_key = COALESCE(EXCLUDED.sector_key, economic_indicators.sector_key),
        higher_is = COALESCE(EXCLUDED.higher_is, economic_indicators.higher_is),
        methodology_url = COALESCE(EXCLUDED.methodology_url, economic_indicators.methodology_url),
        metadata = economic_indicators.metadata || EXCLUDED.metadata
     RETURNING id`,
    [
      sourceId, m.code, m.countryCode, m.nameEn, m.nameAr ?? null, m.description ?? null, m.unit ?? null, m.unitAr ?? null,
      m.frequency, m.category ?? null, m.sectorKey ?? null, m.higherIs ?? null, m.methodologyUrl ?? null, JSON.stringify(m.metadata ?? {}),
    ],
  );
  return res.rows[0].id;
}

function sameValue(a: string | null, b: number | null): boolean {
  if (a === null || b === null) return a === null && b === null;
  return Math.abs(Number(a) - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);
}

/**
 * Stores one observation while preserving history: an unchanged value is skipped; a changed value
 * (provider revision) marks the previous row as superseded and inserts a new current row.
 */
export async function storeIndicatorObservation(
  db: Queryable,
  sourceId: string,
  runId: string | null,
  indicatorId: string,
  r: IndicatorRecord,
  stats: StoreStats,
) {
  const cur = await db.query<{ id: string; value: string | null; is_projection: boolean }>(
    "SELECT id, value, is_projection FROM indicator_observations WHERE indicator_id = $1 AND period_date = $2 AND is_current",
    [indicatorId, r.periodDate],
  );
  const prev = cur.rows[0];
  if (prev && sameValue(prev.value, r.value) && prev.is_projection === r.isProjection) {
    stats.skipped++;
    return;
  }
  if (prev) {
    await db.query("UPDATE indicator_observations SET is_current = false, superseded_at = now() WHERE id = $1", [prev.id]);
  }
  await db.query(
    `INSERT INTO indicator_observations (indicator_id, source_id, ingestion_run_id, period_date, period_label, value, unit, currency,
        is_projection, observed_at, published_at, source_url, quality_status, provenance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      indicatorId, sourceId, runId, r.periodDate, r.periodLabel, r.value, r.unit ?? null, r.currency ?? null, r.isProjection,
      r.observedAt, r.publishedAt ?? null, r.sourceUrl, r.qualityStatus ?? (r.isProjection ? "provisional" : "ok"),
      JSON.stringify({ ...r.provenance, ...(prev ? { revision_of: prev.id, previous_value: prev.value } : {}) }),
    ],
  );
  if (prev) stats.updated++;
  else stats.inserted++;
  if (!stats.indicatorIds.includes(indicatorId)) stats.indicatorIds.push(indicatorId);
}

export async function storeMarket(db: Queryable, sourceId: string, runId: string | null, r: MarketRecord, stats: StoreStats) {
  const res = await db.query<{ inserted: boolean }>(
    `INSERT INTO market_observations (source_id, ingestion_run_id, instrument, instrument_type, rate_type, provider, exchange, currency,
        unit, observed_at, open, high, low, close, value, delay_minutes, granularity, source_url, provenance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (source_id, instrument, rate_type, granularity, observed_at) DO UPDATE SET
        value = EXCLUDED.value, open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close,
        collected_at = now(), provenance = EXCLUDED.provenance
      WHERE market_observations.value IS DISTINCT FROM EXCLUDED.value
     RETURNING (xmax = 0) AS inserted`,
    [
      sourceId, runId, r.instrument, r.instrumentType, r.rateType, r.provider, r.exchange ?? null, r.currency ?? null, r.unit ?? null,
      r.observedAt, r.open ?? null, r.high ?? null, r.low ?? null, r.close ?? null, r.value, r.delayMinutes ?? null, r.granularity,
      r.sourceUrl ?? null, JSON.stringify(r.provenance),
    ],
  );
  const row = res.rows[0];
  if (!row) stats.skipped++;
  else if (row.inserted) stats.inserted++;
  else stats.updated++;
  if (row && !stats.instruments.includes(r.instrument)) stats.instruments.push(r.instrument);
}

/** Batched insert for high-volume price rows; existing rows (same market/commodity/date) are left as-is. */
export async function storePrices(db: Queryable, sourceId: string, runId: string | null, rows: PriceRecord[], stats: StoreStats) {
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000).map((r) => ({
      observed_date: r.observedDate, admin1: r.admin1, admin2: r.admin2, area_key: r.areaKey, market: r.market, market_id: r.marketId,
      latitude: r.latitude, longitude: r.longitude, category: r.category, commodity: r.commodity, commodity_id: r.commodityId, unit: r.unit,
      price_flag: r.priceFlag, price_type: r.priceType, currency: r.currency, price: r.price, usd_price: r.usdPrice, provenance: r.provenance,
    }));
    const res = await db.query<{ n: string }>(
      `WITH ins AS (
         INSERT INTO price_observations (source_id, ingestion_run_id, observed_date, admin1, admin2, area_key, market, market_id, latitude, longitude,
            category, commodity, commodity_id, unit, price_flag, price_type, currency, price, usd_price, provenance)
         SELECT $1, $2, x.observed_date, x.admin1, x.admin2, x.area_key, x.market, x.market_id, x.latitude, x.longitude, x.category, x.commodity,
                x.commodity_id, x.unit, x.price_flag, x.price_type, x.currency, x.price, x.usd_price, x.provenance
           FROM jsonb_to_recordset($3::jsonb) AS x(observed_date date, admin1 text, admin2 text, area_key text, market text, market_id text,
                latitude double precision, longitude double precision, category text, commodity text, commodity_id text, unit text,
                price_flag text, price_type text, currency text, price numeric, usd_price numeric, provenance jsonb)
         ON CONFLICT (source_id, market_id, commodity_id, unit, price_type, currency, observed_date) DO NOTHING
         RETURNING 1)
       SELECT count(*) AS n FROM ins`,
      [sourceId, runId, JSON.stringify(chunk)],
    );
    const n = Number(res.rows[0].n);
    stats.inserted += n;
    stats.skipped += chunk.length - n;
  }
}

export async function storeRecords(db: Queryable, sourceId: string, runId: string | null, records: NormalizedRecord[]): Promise<StoreStats> {
  const stats = emptyStats();
  const indicatorIds = new Map<string, string>();
  const prices = records.filter((r): r is PriceRecord => r.kind === "price");
  if (prices.length) await storePrices(db, sourceId, runId, prices, stats);
  for (const r of records) {
    if (r.kind === "price") continue;
    if (r.kind === "news") await storeNews(db, sourceId, runId, r, stats);
    else if (r.kind === "market") await storeMarket(db, sourceId, runId, r, stats);
    else {
      const key = `${r.indicator.countryCode}:${r.indicator.code}`;
      let id = indicatorIds.get(key);
      if (!id) {
        id = await upsertIndicator(db, sourceId, r.indicator);
        indicatorIds.set(key, id);
      }
      await storeIndicatorObservation(db, sourceId, runId, id, r, stats);
    }
  }
  return stats;
}
