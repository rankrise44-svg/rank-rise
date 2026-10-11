import "server-only";
import { z } from "zod";
import { query, queryOne } from "../db";
import { getSettings } from "../settings";

export const newsFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  topic: z.string().max(40).optional(),
  sector: z.string().max(40).optional(),
  area: z.string().max(40).optional(),
  lang: z.enum(["ar", "en", "fr"]).optional(),
  source: z.string().max(80).optional(),
  minRelevance: z.coerce.number().min(0).max(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeDuplicates: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(30),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type NewsFilter = z.infer<typeof newsFilterSchema>;

export type NewsRow = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  language: string | null;
  source_name: string | null;
  source_domain: string | null;
  source_key: string;
  source_provenance: string;
  published_at: Date | null;
  collected_at: Date;
  topics: string[];
  sectors: string[];
  areas: string[];
  entities: { type: string; key: string; name: string }[];
  lebanon_relevance: string | null;
  impact: string | null;
  event_id: string | null;
  duplicate_of: string | null;
  is_synthetic: boolean;
  time_semantics: string | null;
  rank?: number;
  total?: string;
};

/**
 * Full-text + filter search over collected news. Uses PostgreSQL text search (simple + Arabic + English
 * configurations) with a trigram fallback on titles, so it works without any vector extension.
 */
export async function searchNews(f: NewsFilter): Promise<{ rows: NewsRow[]; total: number }> {
  const s = await getSettings();
  const params: unknown[] = [s.demoMode];
  const where: string[] = ["(NOT n.is_synthetic OR $1)"];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  let rankExpr = "0";
  if (f.q) {
    const q = p(f.q);
    const tsq = `(websearch_to_tsquery('simple', ${q}) || websearch_to_tsquery('arabic', ${q}) || websearch_to_tsquery('english', ${q}))`;
    where.push(`(n.search_vector @@ ${tsq} OR n.title ILIKE '%' || ${q} || '%')`);
    rankExpr = `ts_rank(n.search_vector, ${tsq})`;
  }
  if (f.topic) where.push(`${p(f.topic)} = ANY(n.topics)`);
  if (f.sector) where.push(`${p(f.sector)} = ANY(n.sectors)`);
  if (f.area) where.push(`${p(f.area)} = ANY(n.areas)`);
  if (f.lang) where.push(`n.language = ${p(f.lang)}`);
  if (f.source) where.push(`s.key = ${p(f.source)}`);
  if (f.minRelevance !== undefined) where.push(`COALESCE(n.lebanon_relevance, 0) >= ${p(f.minRelevance)}`);
  if (f.from) where.push(`COALESCE(n.published_at, n.collected_at) >= ${p(f.from)}`);
  if (f.to) where.push(`COALESCE(n.published_at, n.collected_at) <= ${p(f.to)}`);
  if (!f.includeDuplicates) where.push("n.duplicate_of IS NULL");
  const order = f.q ? `${rankExpr} DESC, COALESCE(n.published_at, n.collected_at) DESC` : "COALESCE(n.published_at, n.collected_at) DESC";
  const rows = await query<NewsRow>(
    `SELECT n.id, n.title, n.summary, n.url, n.language, n.source_name, n.source_domain, s.key AS source_key, s.provenance AS source_provenance,
            n.published_at, n.collected_at, n.topics, n.sectors, n.areas, n.entities, n.lebanon_relevance, n.impact, n.event_id,
            n.duplicate_of, n.is_synthetic, n.provenance->>'time_semantics' AS time_semantics, ${rankExpr} AS rank,
            count(*) OVER () AS total
       FROM news_articles n JOIN sources s ON s.id = n.source_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${order}
      LIMIT ${p(f.limit)} OFFSET ${p(f.offset)}`,
    params,
  );
  return { rows, total: rows[0] ? Number(rows[0].total) : 0 };
}

export type EventRow = {
  id: string;
  title: string;
  first_seen_at: Date;
  last_seen_at: Date;
  article_count: number;
  source_count: number;
  topics: string[];
  sectors: string[];
  areas: string[];
  impact: string | null;
  method: string;
};

export async function listEvents(limit = 20, sinceDays = 14): Promise<EventRow[]> {
  const s = await getSettings();
  return query<EventRow>(
    `SELECT id, title, first_seen_at, last_seen_at, article_count, source_count, topics, sectors, areas, impact, method
       FROM events WHERE (NOT is_synthetic OR $1) AND last_seen_at > now() - make_interval(days => $3)
      ORDER BY article_count DESC, last_seen_at DESC LIMIT $2`,
    [s.demoMode, limit, sinceDays],
  );
}

export async function getEvent(id: string) {
  const ev = await queryOne<EventRow>("SELECT * FROM events WHERE id = $1", [id]);
  if (!ev) return null;
  const articles = await query<NewsRow>(
    `SELECT n.id, n.title, n.summary, n.url, n.language, n.source_name, n.source_domain, s.key AS source_key, s.provenance AS source_provenance,
            n.published_at, n.collected_at, n.topics, n.sectors, n.areas, n.entities, n.lebanon_relevance, n.impact, n.event_id, n.duplicate_of,
            n.is_synthetic, n.provenance->>'time_semantics' AS time_semantics
       FROM news_articles n JOIN sources s ON s.id = n.source_id WHERE n.event_id = $1 ORDER BY COALESCE(n.published_at, n.collected_at)`,
    [id],
  );
  const entities = await query<{ entity_type: string; entity_key: string; name: string; mention_count: number }>(
    "SELECT entity_type, entity_key, name, mention_count FROM event_entities WHERE event_id = $1 ORDER BY mention_count DESC",
    [id],
  );
  return { event: ev, articles, entities };
}

export async function newsCountsByArea(days = 30) {
  return query<{ area: string; n: string }>(
    `SELECT a AS area, count(*) AS n FROM news_articles, unnest(areas) a
      WHERE NOT is_synthetic AND duplicate_of IS NULL AND a <> 'lebanon'
        AND COALESCE(published_at, collected_at) > now() - make_interval(days => $1)
      GROUP BY a`,
    [days],
  );
}

export async function newsVolumeDaily(days = 30, filter: { sector?: string; topic?: string } = {}) {
  return query<{ day: string; n: string }>(
    `SELECT to_char(date_trunc('day', COALESCE(published_at, collected_at)), 'YYYY-MM-DD') AS day, count(*) AS n
       FROM news_articles
      WHERE NOT is_synthetic AND duplicate_of IS NULL AND COALESCE(lebanon_relevance,0) >= 0.35
        AND COALESCE(published_at, collected_at) > now() - make_interval(days => $1)
        AND ($2::text IS NULL OR $2 = ANY(sectors)) AND ($3::text IS NULL OR $3 = ANY(topics))
      GROUP BY 1 ORDER BY 1`,
    [days, filter.sector ?? null, filter.topic ?? null],
  );
}
