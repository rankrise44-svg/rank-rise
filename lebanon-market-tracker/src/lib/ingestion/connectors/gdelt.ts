import { z } from "zod";
import { detectLanguage, parseCompactUtc } from "../normalize";
import type { Connector, NewsRecord } from "../types";

/**
 * GDELT DOC 2.0 API (article list mode). Free, no key; GDELT asks for at most one request every 5 seconds.
 * https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 * GDELT returns metadata (URL, title, seen date, domain, language) — never article bodies.
 */
const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

// GDELT matches keywords against English (machine-translated) text, so Arabic-script keywords return
// nothing; Arabic/French coverage is reached with sourcelang/sourcecountry filters instead.
export const DEFAULT_GDELT_QUERIES = [
  "(Lebanon OR Beirut OR Lebanese) (economy OR economic OR bank OR banking OR investment OR tourism OR currency OR imports OR inflation OR market)",
  "(Lebanon OR Beirut) sourcelang:arabic",
  "(Lebanon OR Beirut) sourcelang:french",
  "sourcecountry:LE",
];

const article = z.object({
  url: z.string().url(),
  url_mobile: z.string().optional().default(""),
  title: z.string().min(1),
  seendate: z.string(),
  socialimage: z.string().optional().default(""),
  domain: z.string().optional().default(""),
  language: z.string().optional().default(""),
  sourcecountry: z.string().optional().default(""),
});
type Item = z.infer<typeof article> & { query: string };
type Raw = { responses: { query: string; url: string; body: unknown }[] };

const LANG: Record<string, string> = { english: "en", arabic: "ar", french: "fr" };

function gdeltStamp(d: Date) {
  return d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

export function buildGdeltUrl(query: string, opts: { since?: Date | null; now: Date; maxRecords?: number }) {
  const params = new URLSearchParams({ query, mode: "artlist", format: "json", sort: "DateDesc", maxrecords: String(opts.maxRecords ?? 250) });
  const floor = new Date(opts.now.getTime() - 7 * 86400_000);
  if (opts.since && opts.since > floor) {
    params.set("startdatetime", gdeltStamp(new Date(opts.since.getTime() - 3600_000))); // 1h overlap; dedupe handles repeats
    params.set("enddatetime", gdeltStamp(opts.now));
  } else {
    params.set("timespan", "7d");
  }
  return `${BASE}?${params.toString()}`;
}

export const gdeltConnector: Connector<Raw, Item> = {
  id: "gdelt",
  requiresCredential: false,
  async fetch(ctx) {
    const cfg = ctx.source.config as { queries?: string[]; maxRecords?: number; minIntervalMs?: number };
    const queries = cfg.queries?.length ? cfg.queries : DEFAULT_GDELT_QUERIES;
    const responses: Raw["responses"] = [];
    const payloads = [];
    const partialErrors: string[] = [];
    for (const q of ctx.mode === "test" ? queries.slice(0, 1) : queries) {
      const url = buildGdeltUrl(q, { since: ctx.since, now: ctx.now, maxRecords: ctx.mode === "test" ? 10 : cfg.maxRecords });
      try {
        const res = await ctx.http.get(url, {
          timeoutMs: 40_000,
          retries: 2,
          backoffBaseMs: 10_000,
          minIntervalMs: Math.max(5_500, Number(process.env.GDELT_MIN_INTERVAL_MS ?? 6000), cfg.minIntervalMs ?? 0),
        });
        // GDELT answers some errors with HTTP 200 and a plain-text message.
        const text = res.text.trim();
        if (!text) {
          responses.push({ query: q, url, body: { articles: [] } });
          continue;
        }
        if (!text.startsWith("{")) {
          partialErrors.push(`${q}: ${text.slice(0, 160)}`);
          continue;
        }
        responses.push({ query: q, url, body: JSON.parse(text) });
        payloads.push({ url, contentType: res.contentType, body: res.text });
      } catch (e) {
        partialErrors.push(`${q}: ${(e as Error).message}`);
      }
    }
    return { raw: { responses }, payloads, partialErrors };
  },
  validate(raw) {
    const items: Item[] = [];
    const issues = [];
    let idx = 0;
    for (const r of raw.responses) {
      const list = (r.body as { articles?: unknown[] })?.articles ?? [];
      for (const a of list) {
        const p = article.safeParse(a);
        if (p.success) items.push({ ...p.data, query: r.query });
        else issues.push({ index: idx, reason: p.error.issues[0]?.message ?? "invalid article", sample: JSON.stringify(a).slice(0, 160) });
        idx++;
      }
    }
    return { items, issues };
  },
  normalize(items) {
    return items.map<NewsRecord>((a) => ({
      kind: "news",
      url: a.url,
      title: a.title.trim(),
      summary: null,
      language: LANG[a.language.toLowerCase()] ?? detectLanguage(a.title),
      sourceName: a.domain || null,
      sourceDomain: a.domain || null,
      sourceCountry: a.sourcecountry || null,
      imageUrl: a.socialimage?.startsWith("https://") ? a.socialimage : null,
      // GDELT reports when its crawler first saw the article, not the outlet's publication time.
      publishedAt: parseCompactUtc(a.seendate),
      provenance: { via: "GDELT DOC 2.0", gdelt_query: a.query, seendate: a.seendate, time_semantics: "gdelt_first_seen" },
    }));
  },
};
