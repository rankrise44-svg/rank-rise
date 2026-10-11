import type { Queryable, StoreStats } from "../ingestion/store";
import { classifyArticle, CLASSIFIER_VERSION } from "./classify";
import { findClusterMatch, type ClusterCandidate } from "./cluster";
import { KNOWN_COMPANIES, SECTORS, TOPICS, type SectorDef } from "./lexicon";
import { changeSignal, volumeSignal } from "./signals";

async function loadSectors(db: Queryable): Promise<Pick<SectorDef, "key" | "keywords">[]> {
  try {
    const r = await db.query<{ key: string; keywords: SectorDef["keywords"] }>("SELECT key, keywords FROM sectors WHERE is_active");
    const rows = r.rows.filter((s) => s.keywords && (s.keywords.ar?.length || s.keywords.en?.length));
    return rows.length ? rows.map((s) => ({ key: s.key, keywords: { ar: s.keywords.ar ?? [], en: s.keywords.en ?? [], fr: s.keywords.fr ?? [] } })) : SECTORS;
  } catch {
    return SECTORS;
  }
}

/** Classifies articles (topics, sectors, places, entities, relevance, tentative impact). */
export async function classifyArticles(db: Queryable, ids: string[]) {
  if (!ids.length) return 0;
  const sectors = await loadSectors(db);
  const r = await db.query<{ id: string; title: string; summary: string | null; source_country: string | null; source_domain: string | null }>(
    "SELECT id, title, summary, source_country, source_domain FROM news_articles WHERE id = ANY($1)",
    [ids],
  );
  for (const a of r.rows) {
    const c = classifyArticle({ title: a.title, summary: a.summary, sourceCountry: a.source_country, sourceDomain: a.source_domain }, sectors);
    await db.query(
      `UPDATE news_articles SET topics=$2, sectors=$3, areas=$4, entities=$5, lebanon_relevance=$6, impact=$7,
          classification_method=$8, classified_at=now(), provenance = provenance || jsonb_build_object('classification_evidence', $9::jsonb)
       WHERE id=$1`,
      [a.id, c.topics, c.sectors, c.areas, JSON.stringify(c.entities), c.lebanonRelevance, c.impact, CLASSIFIER_VERSION, JSON.stringify(c.evidence)],
    );
    // Company mentions become company observations (type news_mention), linked to the article.
    for (const e of c.entities.filter((x) => x.type === "company")) {
      const known = KNOWN_COMPANIES.find((k) => k.key === e.key);
      if (!known) continue;
      const comp = await db.query<{ id: string }>(
        `INSERT INTO companies (name, name_ar, aliases, website, domain, sector_key, provenance, quality_status)
         VALUES ($1,$2,$3,$4,$5,$6,'{"origin":"built-in gazetteer"}','ok')
         ON CONFLICT (domain) DO UPDATE SET last_seen_at = now() RETURNING id`,
        [known.name, known.name_ar, known.aliases, known.domain ? `https://${known.domain}` : null, known.domain ?? null, known.sector],
      );
      await db.query(
        `INSERT INTO company_observations (company_id, source_id, article_id, observation_type, title, url, observed_at, provenance)
         SELECT $1, n.source_id, n.id, 'news_mention', n.title, n.url, COALESCE(n.published_at, n.collected_at), '{"method":"entity-match"}'
           FROM news_articles n WHERE n.id = $2
         ON CONFLICT (company_id, article_id) DO NOTHING`,
        [comp.rows[0].id, a.id],
      );
    }
  }
  return r.rows.length;
}

/** Groups new (non-duplicate) articles into events with earlier coverage of the same story. */
export async function clusterArticles(db: Queryable, ids: string[]) {
  if (!ids.length) return 0;
  const fresh = await db.query<{ id: string; title: string; topics: string[]; at: Date; language: string | null }>(
    `SELECT id, title, topics, COALESCE(published_at, collected_at) AS at, language FROM news_articles
      WHERE id = ANY($1) AND duplicate_of IS NULL AND event_id IS NULL ORDER BY at`,
    [ids],
  );
  let grouped = 0;
  for (const a of fresh.rows) {
    const cands = await db.query<{ id: string; title: string; event_id: string | null; topics: string[]; at: Date }>(
      `SELECT id, title, event_id, topics, COALESCE(published_at, collected_at) AS at FROM news_articles
        WHERE id <> $1 AND duplicate_of IS NULL AND language IS NOT DISTINCT FROM $2
          AND COALESCE(published_at, collected_at) BETWEEN $3::timestamptz - interval '72 hours' AND $3::timestamptz + interval '72 hours'
        ORDER BY COALESCE(published_at, collected_at) DESC LIMIT 400`,
      [a.id, a.language, a.at],
    );
    const match = findClusterMatch(
      { title: a.title, topics: a.topics, at: a.at.getTime() },
      cands.rows.map<ClusterCandidate>((c) => ({ id: c.id, title: c.title, eventId: c.event_id, topics: c.topics, at: c.at.getTime() })),
    );
    if (!match) continue;
    let eventId = match.eventId;
    if (!eventId) {
      const ev = await db.query<{ id: string }>(
        "INSERT INTO events (title, first_seen_at, last_seen_at) VALUES ($1, $2, $2) RETURNING id",
        [match.title, new Date(Math.min(match.at, a.at.getTime()))],
      );
      eventId = ev.rows[0].id;
      await db.query("UPDATE news_articles SET event_id = $2 WHERE id = $1", [match.id, eventId]);
    }
    await db.query("UPDATE news_articles SET event_id = $2 WHERE id = $1", [a.id, eventId]);
    await refreshEvent(db, eventId);
    grouped++;
  }
  return grouped;
}

export async function refreshEvent(db: Queryable, eventId: string) {
  const arr = (col: string) =>
    `COALESCE((SELECT array_agg(DISTINCT v) FROM news_articles n2, unnest(n2.${col}) v WHERE n2.event_id = $1), '{}')`;
  await db.query(
    `UPDATE events e SET
        article_count = s.n, source_count = s.sources, first_seen_at = s.first_at, last_seen_at = s.last_at,
        topics = ${arr("topics")}, sectors = ${arr("sectors")}, areas = ${arr("areas")},
        impact = CASE WHEN s.polar > 1 THEN 'mixed' WHEN s.polar = 1 THEN s.one_impact ELSE 'neutral' END
       FROM (
         SELECT count(*) AS n,
                count(DISTINCT COALESCE(source_domain, source_id::text)) AS sources,
                min(COALESCE(published_at, collected_at)) AS first_at,
                max(COALESCE(published_at, collected_at)) AS last_at,
                count(DISTINCT impact) FILTER (WHERE impact IN ('positive','negative')) AS polar,
                max(impact) FILTER (WHERE impact IN ('positive','negative')) AS one_impact
           FROM news_articles WHERE event_id = $1
       ) s
      WHERE e.id = $1`,
    [eventId],
  );
  // Entities: aggregate article-level entity mentions.
  await db.query("DELETE FROM event_entities WHERE event_id = $1", [eventId]);
  await db.query(
    `INSERT INTO event_entities (event_id, entity_type, entity_key, name, mention_count)
     SELECT $1, e->>'type', e->>'key', max(e->>'name'), count(*)
       FROM news_articles n, jsonb_array_elements(n.entities) e
      WHERE n.event_id = $1
      GROUP BY e->>'type', e->>'key'`,
    [eventId],
  );
}

/** Recomputes coverage-volume signals per sector/topic (7-day window vs. the 4 previous weeks). */
export async function computeNewsSignals(db: Queryable, now = new Date()) {
  const end = new Date(now);
  const start = new Date(end.getTime() - 7 * 86400_000);
  const rows = await db.query<{ kind: string; key: string; w: number; n: string }>(
    `WITH base AS (
       SELECT COALESCE(published_at, collected_at) AS at, topics, sectors FROM news_articles
        WHERE duplicate_of IS NULL AND NOT is_synthetic AND lebanon_relevance >= 0.35
          AND COALESCE(published_at, collected_at) > $1::timestamptz - interval '35 days'
          AND COALESCE(published_at, collected_at) <= $1::timestamptz
     ), weeks AS (
       SELECT floor(EXTRACT(EPOCH FROM ($1::timestamptz - at)) / 604800)::int AS w, topics, sectors FROM base
     )
     SELECT 'topic' AS kind, t AS key, w, count(*) AS n FROM weeks, unnest(topics) t GROUP BY 1,2,3
     UNION ALL
     SELECT 'sector', s, w, count(*) FROM weeks, unnest(sectors) s GROUP BY 1,2,3`,
    [end],
  );
  const series = new Map<string, number[]>();
  for (const r of rows.rows) {
    const k = `${r.kind}:${r.key}`;
    const arr = series.get(k) ?? [0, 0, 0, 0, 0];
    if (r.w >= 0 && r.w < 5) arr[r.w] = Number(r.n);
    series.set(k, arr);
  }
  // Coverage-volume collection only starts once sources run, so empty early weeks are not real zeros.
  const firstCollected = await db.query<{ min: Date | null }>("SELECT min(collected_at) AS min FROM news_articles WHERE NOT is_synthetic");
  const historyWeeks = firstCollected.rows[0].min ? Math.floor((end.getTime() - firstCollected.rows[0].min.getTime()) / 604800_000) : 0;
  let n = 0;
  for (const [k, arr] of series) {
    const [subjectType, key] = k.split(":");
    const prev = arr.slice(1, 1 + Math.min(4, historyWeeks));
    const sig = volumeSignal(arr[0], prev);
    if (!prev.length) sig.significance = "low";
    await db.query(
      `INSERT INTO trend_signals (signal_type, subject_type, subject_key, window_start, window_end, baseline_value, current_value,
          change_pct, zscore, direction, significance, sample_size, method, details)
       VALUES ('news_volume',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'poisson-z-7d-vs-4w',$12)
       ON CONFLICT (signal_type, subject_type, subject_key, window_end) DO UPDATE SET
          baseline_value=EXCLUDED.baseline_value, current_value=EXCLUDED.current_value, change_pct=EXCLUDED.change_pct,
          zscore=EXCLUDED.zscore, direction=EXCLUDED.direction, significance=EXCLUDED.significance, details=EXCLUDED.details, computed_at=now()`,
      [subjectType, key, start, new Date(end.toISOString().slice(0, 13) + ":00:00Z"), sig.baseline, sig.current, sig.changePct, sig.zscore, sig.direction,
        sig.significance, arr[0] + prev.reduce((a, b) => a + b, 0),
        JSON.stringify({ weekly_counts_recent_first: arr, history_weeks_available: historyWeeks, caveat: "Coverage volume, not economic magnitude" })],
    );
    n++;
  }
  return n;
}

/** Latest-change signals for indicators that received new observations. */
export async function computeIndicatorSignals(db: Queryable, indicatorIds: string[]) {
  let n = 0;
  for (const id of indicatorIds) {
    const r = await db.query<{ period_date: Date; value: string; observed_at: Date }>(
      `SELECT period_date, value, observed_at FROM indicator_observations
        WHERE indicator_id=$1 AND is_current AND NOT is_projection AND value IS NOT NULL ORDER BY period_date`,
      [id],
    );
    if (r.rows.length < 3) continue;
    const vals = r.rows.map((x) => Number(x.value));
    const sig = changeSignal(vals);
    if (!sig) continue;
    const last = r.rows[r.rows.length - 1];
    const prev = r.rows[r.rows.length - 2];
    await db.query(
      `INSERT INTO trend_signals (signal_type, subject_type, subject_key, window_start, window_end, baseline_value, current_value,
          change_pct, zscore, direction, significance, sample_size, method, details)
       VALUES ('indicator_change','indicator',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'latest-change-vs-history-z',$11)
       ON CONFLICT (signal_type, subject_type, subject_key, window_end) DO UPDATE SET
          baseline_value=EXCLUDED.baseline_value, current_value=EXCLUDED.current_value, change_pct=EXCLUDED.change_pct, zscore=EXCLUDED.zscore,
          direction=EXCLUDED.direction, significance=EXCLUDED.significance, computed_at=now()`,
      [id, prev.observed_at, last.observed_at, Number(prev.value), Number(last.value), sig.changePct, sig.zscore, sig.direction, sig.significance,
        vals.length, JSON.stringify({ change: sig.change })],
    );
    n++;
  }
  return n;
}

/** Recent move of each market instrument versus its own daily volatility. */
export async function computeMarketSignals(db: Queryable, instruments: string[]) {
  let n = 0;
  for (const inst of instruments) {
    const r = await db.query<{ observed_at: Date; value: string }>(
      `SELECT DISTINCT ON (observed_at::date) observed_at, value FROM market_observations
        WHERE instrument=$1 AND NOT is_synthetic AND granularity='daily' ORDER BY observed_at::date DESC, observed_at DESC LIMIT 120`,
      [inst],
    );
    const rows = r.rows.reverse();
    if (rows.length < 10) continue;
    const vals = rows.map((x) => Number(x.value));
    const rets = vals.slice(1).map((v, i) => Math.log(v / vals[i]));
    const last5 = rets.slice(-5).reduce((a, b) => a + b, 0);
    const hist = rets.slice(0, -5);
    const sd = Math.sqrt(hist.reduce((a, b) => a + b * b, 0) / Math.max(1, hist.length)) * Math.sqrt(5);
    const z = sd > 0 ? last5 / sd : 0;
    const pct = (Math.exp(last5) - 1) * 100;
    await db.query(
      `INSERT INTO trend_signals (signal_type, subject_type, subject_key, window_start, window_end, baseline_value, current_value,
          change_pct, zscore, direction, significance, sample_size, method, details)
       VALUES ('market_change','instrument',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'5obs-logreturn-vs-vol',$11)
       ON CONFLICT (signal_type, subject_type, subject_key, window_end) DO UPDATE SET
          current_value=EXCLUDED.current_value, change_pct=EXCLUDED.change_pct, zscore=EXCLUDED.zscore, direction=EXCLUDED.direction,
          significance=EXCLUDED.significance, computed_at=now()`,
      [inst, rows[rows.length - 6].observed_at, rows[rows.length - 1].observed_at, vals[vals.length - 6], vals[vals.length - 1],
        Math.round(pct * 100) / 100, Math.round(z * 100) / 100, Math.abs(z) < 1 ? "flat" : z > 0 ? "up" : "down",
        hist.length < 20 ? "low" : Math.abs(z) >= 2.5 ? "high" : Math.abs(z) >= 1.5 ? "medium" : "low", rows.length, JSON.stringify({ window_obs: 5 })],
    );
    n++;
  }
  return n;
}

/** Post-store hook called by the ingestion runner. */
export async function afterStore(db: Queryable, stats: StoreStats) {
  if (stats.newsIds.length) {
    await classifyArticles(db, stats.newsIds);
    await clusterArticles(db, stats.newsIds);
    await computeNewsSignals(db);
  }
  if (stats.indicatorIds.length) await computeIndicatorSignals(db, stats.indicatorIds);
  if (stats.instruments.length) await computeMarketSignals(db, stats.instruments);
}

export async function seedReferenceData(db: Queryable) {
  for (const s of SECTORS) {
    await db.query(
      // Built-in keyword sets are refreshed on every sync unless the user has edited them (_origin = 'user').
      `INSERT INTO sectors (key, name_ar, name_en, keywords, sort_order) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (key) DO UPDATE SET keywords = EXCLUDED.keywords
        WHERE COALESCE(sectors.keywords->>'_origin', 'builtin') = 'builtin'`,
      [s.key, s.name_ar, s.name_en, JSON.stringify({ ...s.keywords, _origin: "builtin" }), s.sort_order],
    );
  }
  void TOPICS;
}
