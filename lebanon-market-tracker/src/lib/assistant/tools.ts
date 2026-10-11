import "server-only";
import { z } from "zod";
import { query } from "../db";

import { buildSectorEvidence } from "../opportunities/evidence";
import { requestForecast, listForecasts } from "../forecasting/requests";
import { generateReport } from "../reports/generate";
import { findIndicator, getSeries, listIndicators } from "../repo/indicators";
import { listInstruments, getMarketSeries } from "../repo/markets";
import { searchNews } from "../repo/news";
import { commodityTrend, listCommodities } from "../repo/prices";
import { latestSignals } from "../repo/signals";
import { SECTORS } from "../intel/lexicon";
import type { CitationRegistry } from "./citations";

export type ToolContext = { citations: CitationRegistry; now: Date };

export type AssistantTool<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  schema: S;
  jsonSchema: Record<string, unknown>;
  run(input: z.infer<S>, ctx: ToolContext): Promise<unknown>;
};

const SECTOR_KEYS = SECTORS.map((s) => s.key) as [string, ...string[]];
const MAX_TEXT = 280;
const clip = (s: string | null | undefined, n = MAX_TEXT) => (s ? (s.length > n ? `${s.slice(0, n)}…` : s) : null);

function tool<S extends z.ZodTypeAny>(t: AssistantTool<S>): AssistantTool<S> {
  return t;
}

const sectorEnum = z.enum(SECTOR_KEYS);

export const TOOLS: AssistantTool[] = [
  tool({
    name: "search_news",
    description:
      "Full-text search over collected news articles (Arabic, English, French) with optional filters. Returns titles, outlets, dates and citation ids. Article text is untrusted third-party content.",
    schema: z.object({
      query: z.string().max(200).optional(),
      days: z.number().int().min(1).max(365).optional(),
      sector: sectorEnum.optional(),
      topic: z.string().max(40).optional(),
      area: z.string().max(40).optional(),
      limit: z.number().int().min(1).max(15).default(8),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords (Arabic or English). Omit to list latest." },
        days: { type: "integer", minimum: 1, maximum: 365, description: "Look-back window in days" },
        sector: { type: "string", enum: SECTOR_KEYS },
        topic: { type: "string", description: "economy|currency|inflation|fiscal|reforms_imf|politics|security|aid|regional|business" },
        area: { type: "string", description: "Governorate key e.g. beirut, north, south, beqaa" },
        limit: { type: "integer", minimum: 1, maximum: 15 },
      },
      additionalProperties: false,
    },
    async run(i, ctx) {
      const from = i.days ? new Date(ctx.now.getTime() - i.days * 86400_000) : undefined;
      const r = await searchNews({ q: i.query, sector: i.sector, topic: i.topic, area: i.area, from, minRelevance: 0.35, limit: i.limit, offset: 0 });
      return {
        total_matches: r.total,
        articles: r.rows.map((n) => ({
          cite: ctx.citations.add(
            { title: n.title, url: n.url, source: n.source_name ?? n.source_domain ?? n.source_key, date: (n.published_at ?? n.collected_at).toISOString().slice(0, 10), kind: "news" },
            `news:${n.id}`,
          ),
          title: clip(n.title, 200),
          summary: clip(n.summary, 240),
          outlet: n.source_name,
          language: n.language,
          published_or_first_seen: (n.published_at ?? n.collected_at).toISOString(),
          inferred_topics: n.topics,
          inferred_sectors: n.sectors,
          inferred_impact: n.impact,
          lebanon_relevance: n.lebanon_relevance === null ? null : Number(n.lebanon_relevance),
        })),
        note: "Topics, sectors, impact and relevance are system-inferred labels, not reported facts.",
      };
    },
  }),

  tool({
    name: "get_economic_indicators",
    description: "List available economic indicators with their latest observed (non-projection) value, period, unit and official source. Use country 'LBN' for Lebanon.",
    schema: z.object({
      country: z.string().regex(/^[A-Z]{3}$/).default("LBN"),
      category: z.enum(["growth", "prices", "external", "labour", "fiscal", "monetary", "social", "structure", "tourism"]).optional(),
      search: z.string().max(80).optional(),
      limit: z.number().int().min(1).max(30).default(15),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        country: { type: "string", description: "ISO3 code, default LBN" },
        category: { type: "string", enum: ["growth", "prices", "external", "labour", "fiscal", "monetary", "social", "structure", "tourism"] },
        search: { type: "string", description: "Substring of indicator name (English or Arabic) or code" },
        limit: { type: "integer", minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
    async run(i, ctx) {
      let rows = await listIndicators({ country: i.country, category: i.category });
      rows = rows.filter((r) => r.latest_value !== null && !String(r.metadata?.division ?? "").startsWith(" "));
      if (i.search) {
        const s = i.search.toLowerCase();
        rows = rows.filter((r) => `${r.code} ${r.name_en} ${r.name_ar ?? ""}`.toLowerCase().includes(s));
      }
      // Headline national series first; regional CPI and index levels after (CAS detail is long).
      const rank = (r: (typeof rows)[number]) =>
        (r.metadata?.region && r.metadata.region !== "Lebanon" ? 4 : 0) + (r.metadata?.division && !r.metadata?.headline ? 2 : 0) + (r.metadata?.measure === "index" || r.metadata?.measure === "mom_pct" ? 1 : 0);
      rows.sort((a, b) => rank(a) - rank(b));
      return {
        indicators: rows.slice(0, i.limit).map((r) => ({
          cite: ctx.citations.add(
            { title: `${r.name_ar ?? r.name_en} (${r.country_code})`, url: r.source_url ?? r.methodology_url, source: r.source_name, date: r.latest_label, kind: "indicator" },
            `ind:${r.id}`,
          ),
          id: r.id,
          code: r.code,
          name: r.name_ar ?? r.name_en,
          latest_period: r.latest_label,
          latest_value: Number(r.latest_value),
          previous_period: r.prev_label,
          previous_value: r.prev_value === null ? null : Number(r.prev_value),
          unit: r.unit,
          source: r.source_name,
          provenance: r.provenance,
          quality: r.latest_quality,
          frequency: r.frequency,
        })),
      };
    },
  }),

  tool({
    name: "get_indicator_history",
    description: "Historical observations for one indicator (by id from get_economic_indicators, or by provider code + country). Marks provider projections.",
    schema: z.object({
      indicator_id: z.string().uuid().optional(),
      code: z.string().max(60).optional(),
      country: z.string().regex(/^[A-Z]{3}$/).default("LBN"),
      from_year: z.number().int().min(1960).max(2100).optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        indicator_id: { type: "string" },
        code: { type: "string", description: "e.g. FP.CPI.TOTL.ZG, PCPIPCH, CAS.CPI.YOY_PCT.LBN.TOTAL" },
        country: { type: "string" },
        from_year: { type: "integer" },
      },
      additionalProperties: false,
    },
    async run(i, ctx) {
      const ind = i.indicator_id
        ? (await listIndicators({})).find((r) => r.id === i.indicator_id) ?? null
        : i.code
          ? await findIndicator(i.code, i.country)
          : null;
      if (!ind) return { error: "indicator_not_found", hint: "Call get_economic_indicators first to obtain an id." };
      const obs = await getSeries(ind.id, { from: i.from_year ? `${i.from_year}-01-01` : undefined });
      const cite = ctx.citations.add({ title: `${ind.name_ar ?? ind.name_en} (${ind.country_code})`, url: ind.source_url ?? ind.methodology_url, source: ind.source_name, date: ind.latest_label, kind: "indicator" }, `ind:${ind.id}`);
      return {
        cite,
        indicator: { code: ind.code, name: ind.name_ar ?? ind.name_en, unit: ind.unit, source: ind.source_name, frequency: ind.frequency },
        observations: obs.slice(-60).map((o) => ({ period: o.period_label, value: o.value === null ? null : Number(o.value), projection: o.is_projection, quality: o.quality_status })),
        truncated_to_last: obs.length > 60 ? 60 : undefined,
      };
    },
  }),

  tool({
    name: "search_companies",
    description: "Search known companies (built-in gazetteer plus companies seen in collected news) and their recent mentions. Coverage is NOT comprehensive.",
    schema: z.object({ query: z.string().max(80).optional(), sector: sectorEnum.optional(), limit: z.number().int().min(1).max(20).default(10) }),
    jsonSchema: { type: "object", properties: { query: { type: "string" }, sector: { type: "string", enum: SECTOR_KEYS }, limit: { type: "integer" } }, additionalProperties: false },
    async run(i, ctx) {
      const rows = await query<{ id: string; name: string; name_ar: string | null; sector_key: string | null; website: string | null; mentions: string; last_mention: Date | null }>(
        `SELECT c.id, c.name, c.name_ar, c.sector_key, c.website, count(o.id) AS mentions, max(o.observed_at) AS last_mention
           FROM companies c LEFT JOIN company_observations o ON o.company_id = c.id
          WHERE NOT c.is_synthetic AND ($1::text IS NULL OR c.name ILIKE '%' || $1 || '%' OR c.name_ar ILIKE '%' || $1 || '%')
            AND ($2::text IS NULL OR c.sector_key = $2)
          GROUP BY c.id ORDER BY count(o.id) DESC LIMIT $3`,
        [i.query ?? null, i.sector ?? null, i.limit],
      );
      const out = [];
      for (const c of rows) {
        const obs = await query<{ title: string; url: string | null; observed_at: Date; observation_type: string; source_name: string | null }>(
          `SELECT o.title, o.url, o.observed_at, o.observation_type, s.name AS source_name FROM company_observations o LEFT JOIN sources s ON s.id = o.source_id
            WHERE o.company_id = $1 ORDER BY o.observed_at DESC LIMIT 3`,
          [c.id],
        );
        out.push({
          name: c.name,
          name_ar: c.name_ar,
          sector: c.sector_key,
          website: c.website,
          mention_count: Number(c.mentions),
          recent: obs.map((o) => ({
            cite: ctx.citations.add({ title: o.title, url: o.url, source: o.source_name ?? "news", date: o.observed_at.toISOString().slice(0, 10), kind: "news" }, `cobs:${o.url ?? o.title}`),
            type: o.observation_type,
            title: clip(o.title, 160),
            date: o.observed_at.toISOString().slice(0, 10),
          })),
        });
      }
      return { companies: out, coverage_note: "Company coverage is limited to a seed list and entity matches in collected news." };
    },
  }),

  tool({
    name: "search_sector_data",
    description: "Evidence pack for one sector: related official indicators, recent relevant news, coverage-volume signals, and data gaps.",
    schema: z.object({ sector: sectorEnum, days: z.number().int().min(1).max(180).default(30) }),
    jsonSchema: { type: "object", properties: { sector: { type: "string", enum: SECTOR_KEYS }, days: { type: "integer", minimum: 1, maximum: 180 } }, required: ["sector"], additionalProperties: false },
    async run(i, ctx) {
      return buildSectorEvidence(i.sector, i.days, ctx.citations);
    },
  }),

  tool({
    name: "search_market_observations",
    description:
      "Market data stored in the database: FX (official BDL, ECB reference, WFP parallel LBP), gold/silver, and any optional provider instruments. Each series states rate type, provider and timestamp. Also supports WFP retail food prices via 'commodity'.",
    schema: z.object({ instrument: z.string().max(20).optional(), commodity: z.string().max(80).optional(), days: z.number().int().min(1).max(1500).default(90) }),
    jsonSchema: {
      type: "object",
      properties: {
        instrument: { type: "string", description: "e.g. USD/LBP, XAU/USD, USD/EUR. Omit to list all instruments." },
        commodity: { type: "string", description: "WFP commodity name for retail prices, e.g. 'Bread (pita)'" },
        days: { type: "integer" },
      },
      additionalProperties: false,
    },
    async run(i, ctx) {
      if (i.commodity) {
        const trend = await commodityTrend(i.commodity, Math.ceil(i.days / 30) + 1);
        const cite = ctx.citations.add({ title: `WFP retail prices — ${i.commodity}`, url: "https://data.humdata.org/dataset/wfp-food-prices-for-lebanon", source: "WFP / HDX", date: trend.at(-1)?.month ?? null, kind: "price" }, `wfp:${i.commodity}`);
        const available = trend.length ? undefined : (await listCommodities()).slice(0, 25).map((c) => c.commodity);
        return { cite, monthly_median_across_markets: trend.map((t) => ({ month: t.month, lbp: Math.round(Number(t.median_lbp)), usd: t.median_usd ? Number(Number(t.median_usd).toFixed(2)) : null, markets: Number(t.markets) })), available_commodities: available };
      }
      const all = await listInstruments();
      const rows = i.instrument ? all.filter((x) => x.instrument === i.instrument!.toUpperCase()) : all;
      const out = [];
      for (const r of rows.slice(0, 12)) {
        const series = i.instrument ? await getMarketSeries(r.instrument, r.source_key, r.rate_type, i.days) : [];
        out.push({
          cite: ctx.citations.add({ title: `${r.instrument} — ${r.provider} (${r.rate_type})`, url: r.source_url, source: r.provider, date: r.latest_at.toISOString().slice(0, 10), kind: "market" }, `mkt:${r.source_key}:${r.instrument}:${r.rate_type}`),
          instrument: r.instrument,
          rate_type: r.rate_type,
          provider: r.provider,
          unit: r.unit,
          latest: Number(r.latest_value),
          latest_at: r.latest_at.toISOString(),
          previous: r.prev_value === null ? null : Number(r.prev_value),
          granularity: r.granularity,
          observations_stored: Number(r.n),
          history_from: r.first_at.toISOString().slice(0, 10),
          series_sample: series.length ? series.filter((_, k) => k % Math.max(1, Math.floor(series.length / 24)) === 0).map((s) => [s.observed_at.toISOString().slice(0, 10), Number(s.value)]) : undefined,
        });
      }
      return { instruments: out, note: "Official, reference, parallel and third-party quotes are different rate types and must not be conflated." };
    },
  }),

  tool({
    name: "get_trend_signals",
    description: "Statistical change signals: news coverage volume by sector/topic (7d vs prior 4 weeks), latest indicator changes vs history, and market moves vs volatility.",
    schema: z.object({ type: z.enum(["news_volume", "indicator_change", "market_change"]).optional(), min_significance: z.enum(["low", "medium", "high"]).default("medium"), recent_only: z.boolean().default(true) }),
    jsonSchema: { type: "object", properties: { type: { type: "string", enum: ["news_volume", "indicator_change", "market_change"] }, min_significance: { type: "string", enum: ["low", "medium", "high"] }, recent_only: { type: "boolean" } }, additionalProperties: false },
    async run(i, ctx) {
      const rows = await latestSignals({ type: i.type, minSignificance: i.min_significance, limit: 20, recentOnly: i.recent_only });
      return {
        signals: rows.map((s) => ({
          cite: ctx.citations.add({ title: `إشارة: ${s.subject_label ?? s.subject_key} (${s.signal_type})`, url: null, source: "Lebanon Market Tracker — حساب إحصائي", date: s.window_end.toISOString().slice(0, 10), kind: "signal" }, `sig:${s.id}`),
          type: s.signal_type,
          subject: s.subject_label ?? `${s.subject_type}:${s.subject_key}`,
          window_end: s.window_end.toISOString().slice(0, 10),
          baseline: s.baseline_value === null ? null : Number(s.baseline_value),
          current: s.current_value === null ? null : Number(s.current_value),
          change_pct: s.change_pct === null ? null : Number(s.change_pct),
          zscore: s.zscore === null ? null : Number(s.zscore),
          significance: s.significance,
          method: s.method,
        })),
        caveat: "News volume measures coverage, not economic impact. Signals are computed by this system.",
      };
    },
  }),

  tool({
    name: "compare_sectors",
    description: "Side-by-side evidence for two sectors (indicators, news coverage, signals, data gaps). Does not produce a verdict by itself.",
    schema: z.object({ sector_a: sectorEnum, sector_b: sectorEnum, days: z.number().int().min(7).max(180).default(30) }),
    jsonSchema: { type: "object", properties: { sector_a: { type: "string", enum: SECTOR_KEYS }, sector_b: { type: "string", enum: SECTOR_KEYS }, days: { type: "integer" } }, required: ["sector_a", "sector_b"], additionalProperties: false },
    async run(i, ctx) {
      const [a, b] = await Promise.all([buildSectorEvidence(i.sector_a, i.days, ctx.citations), buildSectorEvidence(i.sector_b, i.days, ctx.citations)]);
      return { [i.sector_a]: a, [i.sector_b]: b };
    },
  }),

  tool({
    name: "generate_opportunity_report",
    description:
      "Assemble a structured, evidence-based opportunity assessment frame for a sector (and optional area/budget): supporting and contradicting evidence, data gaps and validation steps. Market sizes and revenues are never estimated.",
    schema: z.object({ sector: sectorEnum, area: z.string().max(40).optional(), budget_usd: z.number().min(0).max(1e9).optional(), risk_tolerance: z.enum(["low", "medium", "high"]).optional() }),
    jsonSchema: {
      type: "object",
      properties: { sector: { type: "string", enum: SECTOR_KEYS }, area: { type: "string" }, budget_usd: { type: "number" }, risk_tolerance: { type: "string", enum: ["low", "medium", "high"] } },
      required: ["sector"],
      additionalProperties: false,
    },
    async run(i, ctx) {
      const ev = await buildSectorEvidence(i.sector, 60, ctx.citations);
      const existing = await query<{ id: string; title: string; overall_score: string | null; confidence: string; status: string }>(
        "SELECT id, title, overall_score, confidence, status FROM opportunities WHERE sector_key = $1 AND NOT is_synthetic ORDER BY updated_at DESC LIMIT 5",
        [i.sector],
      );
      return {
        sector: i.sector,
        constraints: { area: i.area ?? null, budget_usd: i.budget_usd ?? null, risk_tolerance: i.risk_tolerance ?? null },
        evidence: ev,
        tracked_hypotheses: existing,
        required_sections: [
          "problem/unmet need", "evidence for", "evidence against", "customer segments", "known competitors", "market-size estimates WITH sources (or 'none available')",
          "startup requirements", "regulatory considerations", "operational & financial risks", "data gaps", "validation steps", "confidence", "assessment date",
        ],
        rule: "If evidence is thin, label the opportunity as unvalidated. Never invent market sizes, revenues, margins or customer counts.",
      };
    },
  }),

  tool({
    name: "run_forecast",
    description:
      "Request a statistical forecast for a well-defined indicator event (threshold or direction over N future periods). Runs in the separate forecasting engine; returns the stored result if one exists, else queues it. Probabilities are shown only when backtests justify them.",
    schema: z.object({
      indicator_code: z.string().max(60),
      country: z.string().regex(/^[A-Z]{3}$/).default("LBN"),
      event: z.enum(["above_threshold", "below_threshold", "increase", "decrease"]),
      threshold: z.number().optional(),
      horizon_periods: z.number().int().min(1).max(5).default(1),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        indicator_code: { type: "string" },
        country: { type: "string" },
        event: { type: "string", enum: ["above_threshold", "below_threshold", "increase", "decrease"] },
        threshold: { type: "number" },
        horizon_periods: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["indicator_code", "event"],
      additionalProperties: false,
    },
    async run(i, ctx) {
      const r = await requestForecast({ indicatorCode: i.indicator_code, country: i.country, event: i.event, threshold: i.threshold ?? null, horizonPeriods: i.horizon_periods, via: "assistant" });
      if ("error" in r) return r;
      const cite = ctx.citations.add({ title: `توقع: ${r.question}`, url: `/analytics#f-${r.id}`, source: "محرك التوقعات الإحصائي", date: r.created_at.toISOString().slice(0, 10), kind: "forecast" }, `fc:${r.id}`);
      return { cite, ...r, created_at: r.created_at.toISOString() };
    },
  }),

  tool({
    name: "get_forecast_history",
    description: "Past forecasts with their stated probabilities (if any), backtest metrics, and resolved outcomes — for judging the system's own track record.",
    schema: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
    jsonSchema: { type: "object", properties: { limit: { type: "integer" } }, additionalProperties: false },
    async run(i) {
      return { forecasts: await listForecasts(i.limit) };
    },
  }),

  tool({
    name: "retrieve_source_document",
    description: "Retrieve stored metadata for a source registry entry or one collected article (by id) — terms, coverage limitations, last successful update.",
    schema: z.object({ source_key: z.string().max(80).optional(), article_id: z.string().uuid().optional() }),
    jsonSchema: { type: "object", properties: { source_key: { type: "string" }, article_id: { type: "string" } }, additionalProperties: false },
    async run(i, ctx) {
      if (i.article_id) {
        const rows = await query<{ title: string; summary: string | null; url: string; source_name: string | null; published_at: Date | null; collected_at: Date; provenance: unknown }>(
          "SELECT title, summary, url, source_name, published_at, collected_at, provenance - 'classification_evidence' AS provenance FROM news_articles WHERE id = $1",
          [i.article_id],
        );
        const a = rows[0];
        if (!a) return { error: "not_found" };
        return { cite: ctx.citations.add({ title: a.title, url: a.url, source: a.source_name ?? "news", date: (a.published_at ?? a.collected_at).toISOString().slice(0, 10), kind: "news" }, `art:${i.article_id}`), title: a.title, summary: clip(a.summary, 600), url: a.url, published: a.published_at, collected: a.collected_at, provenance: a.provenance, note: "Only metadata and a short excerpt are stored; open the URL for the full article." };
      }
      const rows = await query("SELECT key, name, provenance, source_type, homepage_url, terms_of_use, coverage_notes, update_schedule, status, last_success_at, last_error FROM sources WHERE ($1::text IS NULL OR key = $1) ORDER BY key LIMIT 40", [i.source_key ?? null]);
      return { sources: rows };
    },
  }),

  tool({
    name: "generate_market_report",
    description: "Generate a template-based daily or weekly market summary from stored data (indicators, FX, gold, news, signals) with citations. Persisted under Reports.",
    schema: z.object({ period: z.enum(["daily", "weekly"]).default("daily"), sector: sectorEnum.optional() }),
    jsonSchema: { type: "object", properties: { period: { type: "string", enum: ["daily", "weekly"] }, sector: { type: "string", enum: SECTOR_KEYS } }, additionalProperties: false },
    async run(i, ctx) {
      const r = await generateReport({ type: i.sector ? "sector" : i.period, sector: i.sector, save: true });
      const cite = ctx.citations.add({ title: r.title, url: `/reports/${r.id}`, source: "Lebanon Market Tracker", date: new Date().toISOString().slice(0, 10), kind: "document" }, `rep:${r.id}`);
      return { cite, report_id: r.id, title: r.title, markdown_excerpt: r.content_md.slice(0, 3000) };
    },
  }),
];

export function getTool(name: string) {
  return TOOLS.find((t) => t.name === name);
}

/** Validates model-supplied input and executes the tool. Errors are returned as data, never thrown to the model loop. */
export async function executeTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<{ ok: boolean; content: string }> {
  const t = getTool(name);
  if (!t) return { ok: false, content: JSON.stringify({ error: `unknown tool ${name}` }) };
  const parsed = t.schema.safeParse(rawInput ?? {});
  if (!parsed.success) return { ok: false, content: JSON.stringify({ error: "invalid_input", issues: parsed.error.issues.slice(0, 5).map((x) => `${x.path.join(".")}: ${x.message}`) }) };
  try {
    const out = await t.run(parsed.data, ctx);
    let s = JSON.stringify(out);
    if (s.length > 14_000) s = `${s.slice(0, 14_000)}… [truncated]`;
    return { ok: true, content: s };
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "assistant tool failed", tool: name, error: (e as Error).message }));
    return { ok: false, content: JSON.stringify({ error: "tool_failed", message: "The data query failed; say that this information could not be retrieved." }) };
  }
}

