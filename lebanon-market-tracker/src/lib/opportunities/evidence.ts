import "server-only";
import { query } from "../db";
import { CitationRegistry } from "../assistant/citations";
import { SECTOR_LABELS } from "../nav";
import { listIndicators } from "../repo/indicators";
import { searchNews } from "../repo/news";

export type SectorEvidence = Awaited<ReturnType<typeof buildSectorEvidence>>;

/**
 * Gathers what the database actually knows about a sector. Every item carries a citation id; gaps are
 * listed explicitly so downstream reports cannot paper over missing data.
 */
export async function buildSectorEvidence(sector: string, days = 30, citations = new CitationRegistry()) {
  const from = new Date(Date.now() - days * 86400_000);
  const [indicators, news, signals, companies, volume] = await Promise.all([
    listIndicators({ sector }),
    searchNews({ sector, from, minRelevance: 0.35, limit: 8, offset: 0 }),
    query<{ change_pct: string | null; zscore: string | null; significance: string; current_value: string; baseline_value: string; window_end: Date; details: Record<string, unknown> }>(
      `SELECT change_pct, zscore, significance, current_value, baseline_value, window_end, details FROM trend_signals
        WHERE signal_type = 'news_volume' AND subject_type = 'sector' AND subject_key = $1 AND NOT is_synthetic ORDER BY window_end DESC LIMIT 1`,
      [sector],
    ),
    query<{ name: string; mentions: string }>(
      `SELECT c.name, count(o.id) AS mentions FROM companies c LEFT JOIN company_observations o ON o.company_id = c.id
        WHERE c.sector_key = $1 AND NOT c.is_synthetic GROUP BY c.id ORDER BY 2 DESC LIMIT 10`,
      [sector],
    ),
    query<{ positive: string; negative: string; total: string }>(
      `SELECT count(*) FILTER (WHERE impact = 'positive') AS positive, count(*) FILTER (WHERE impact = 'negative') AS negative, count(*) AS total
         FROM news_articles WHERE $1 = ANY(sectors) AND duplicate_of IS NULL AND NOT is_synthetic AND COALESCE(published_at, collected_at) > $2`,
      [sector, from],
    ),
  ]);
  const inds = indicators
    .filter((r) => r.latest_value !== null && (r.country_code === "LBN") && !(r.metadata?.measure === "index"))
    .filter((r) => !(r.metadata?.region && r.metadata.region !== "Lebanon"))
    .slice(0, 8)
    .map((r) => ({
      cite: citations.add({ title: `${r.name_ar ?? r.name_en}`, url: r.source_url ?? r.methodology_url, source: r.source_name, date: r.latest_label, kind: "indicator" }, `ind:${r.id}`),
      name: r.name_ar ?? r.name_en,
      latest_period: r.latest_label,
      latest_value: Number(r.latest_value),
      previous_value: r.prev_value === null ? null : Number(r.prev_value),
      unit: r.unit,
      provenance: r.provenance,
    }));
  const v = volume[0];
  const sig = signals[0];
  const gaps: string[] = [];
  if (!inds.length) gaps.push("لا يوجد مؤشر رسمي مرتبط بهذا القطاع في قاعدة البيانات");
  if (Number(v?.total ?? 0) < 5) gaps.push("تغطية إخبارية ضعيفة في الفترة المحددة (أقل من 5 أخبار)");
  gaps.push("لا تتوفر بيانات مبيعات أو حصص سوقية أو هوامش ربح لهذا القطاع");
  gaps.push("لا يوجد مصدر مفعّل لإعلانات الوظائف أو العقارات أو المناقصات لهذا القطاع");
  if (!companies.length) gaps.push("لا توجد شركات معروفة في هذا القطاع ضمن قاعدة البيانات");
  return {
    sector,
    sector_name: SECTOR_LABELS[sector] ?? sector,
    window_days: days,
    official_indicators: inds,
    news_coverage: {
      articles: Number(v?.total ?? 0),
      inferred_positive: Number(v?.positive ?? 0),
      inferred_negative: Number(v?.negative ?? 0),
      volume_signal: sig
        ? { current_7d: Number(sig.current_value), baseline_weekly_avg: Number(sig.baseline_value), change_pct: sig.change_pct === null ? null : Number(sig.change_pct), significance: sig.significance }
        : null,
      top_articles: news.rows.map((n) => ({
        cite: citations.add({ title: n.title, url: n.url, source: n.source_name ?? n.source_domain ?? "", date: (n.published_at ?? n.collected_at).toISOString().slice(0, 10), kind: "news" }, `news:${n.id}`),
        title: n.title.slice(0, 180),
        date: (n.published_at ?? n.collected_at).toISOString().slice(0, 10),
        inferred_impact: n.impact,
      })),
    },
    known_companies: companies.map((c) => ({ name: c.name, news_mentions: Number(c.mentions) })),
    data_gaps: gaps,
  };
}
