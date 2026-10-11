import { z } from "zod";
import { WORLD_BANK_INDICATORS, catalogEntry } from "../../catalog/indicators";
import { parsePeriod } from "../normalize";
import type { Connector, IndicatorRecord } from "../types";

/** World Bank Indicators API v2 — https://datahelpdesk.worldbank.org/knowledgebase/articles/889392 */
const BASE = "https://api.worldbank.org/v2";

const pageMeta = z.object({ page: z.coerce.number(), pages: z.coerce.number(), total: z.coerce.number(), lastupdated: z.string().optional() });
const row = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  country: z.object({ id: z.string(), value: z.string() }),
  countryiso3code: z.string(),
  date: z.string(),
  value: z.number().nullable(),
  unit: z.string().optional().default(""),
  obs_status: z.string().optional().default(""),
  decimal: z.number().optional(),
});
type Row = z.infer<typeof row> & { lastupdated?: string; requestUrl: string };

type Raw = { responses: { url: string; body: unknown }[] };

export const worldBankConnector: Connector<Raw, Row> = {
  id: "worldbank",
  requiresCredential: false,
  async fetch(ctx) {
    const cfg = ctx.source.config as { indicators?: string[]; countries?: string[]; mrv?: number };
    const codes = cfg.indicators?.length ? cfg.indicators : WORLD_BANK_INDICATORS.map((i) => i.code);
    const countries = (cfg.countries?.length ? cfg.countries : ["LBN"]).join(";");
    const codesToFetch = ctx.mode === "test" ? codes.slice(0, 2) : codes;
    const responses: Raw["responses"] = [];
    const payloads = [];
    const partialErrors: string[] = [];
    for (const code of codesToFetch) {
      const url = `${BASE}/country/${countries}/indicator/${encodeURIComponent(code)}?format=json&per_page=2000${cfg.mrv ? `&mrv=${cfg.mrv}` : ""}`;
      try {
        const { data, res } = await ctx.http.getJson(url, { timeoutMs: 90_000, retries: 2, minIntervalMs: 500 });
        responses.push({ url, body: data });
        payloads.push({ url, contentType: res.contentType, body: res.text });
      } catch (e) {
        partialErrors.push(`${code}: ${(e as Error).message}`);
      }
    }
    return { raw: { responses }, payloads, partialErrors };
  },
  validate(raw) {
    const items: Row[] = [];
    const issues = [];
    let idx = 0;
    for (const r of raw.responses) {
      const body = r.body as unknown[];
      if (!Array.isArray(body)) {
        issues.push({ index: idx++, reason: "Unexpected response shape (not an array)", sample: JSON.stringify(r.body).slice(0, 200) });
        continue;
      }
      // Error payloads look like [{"message":[{"id":"120","key":"Invalid value",...}]}]
      if (body.length === 1 && (body[0] as { message?: unknown })?.message) {
        issues.push({ index: idx++, reason: `API error: ${JSON.stringify((body[0] as { message: unknown }).message).slice(0, 200)}` });
        continue;
      }
      const meta = pageMeta.safeParse(body[0]);
      const rows = Array.isArray(body[1]) ? body[1] : [];
      for (const x of rows) {
        const p = row.safeParse(x);
        if (p.success) items.push({ ...p.data, lastupdated: meta.success ? meta.data.lastupdated : undefined, requestUrl: r.url });
        else issues.push({ index: idx, reason: p.error.issues[0]?.message ?? "invalid row", sample: JSON.stringify(x).slice(0, 200) });
        idx++;
      }
    }
    return { items, issues };
  },
  normalize(items) {
    const out: IndicatorRecord[] = [];
    for (const r of items) {
      if (r.value === null) continue; // the API lists every year; missing values are simply not observations
      const period = parsePeriod(r.date);
      if (!period) continue;
      const cat = catalogEntry("worldbank", r.indicator.id);
      out.push({
        kind: "indicator",
        indicator: {
          code: r.indicator.id,
          countryCode: r.countryiso3code || r.country.id,
          nameEn: r.indicator.value,
          nameAr: cat?.nameAr ?? null,
          unit: cat?.unit ?? (r.unit || null),
          unitAr: cat?.unitAr ?? null,
          frequency: period.frequency,
          category: cat?.category ?? null,
          sectorKey: cat?.sectorKey ?? null,
          higherIs: cat?.higherIs ?? null,
          methodologyUrl: `https://data.worldbank.org/indicator/${r.indicator.id}`,
          metadata: { provider: "World Bank WDI" },
        },
        periodDate: period.periodDate,
        periodLabel: r.date,
        value: r.value,
        unit: cat?.unit ?? (r.unit || null),
        currency: cat?.unit.includes("US$") ? "USD" : null,
        isProjection: false,
        observedAt: period.observedAt,
        publishedAt: r.lastupdated ? new Date(`${r.lastupdated}T00:00:00Z`) : null,
        sourceUrl: `https://data.worldbank.org/indicator/${r.indicator.id}?locations=${r.country.id}`,
        provenance: { api_url: r.requestUrl, obs_status: r.obs_status || null, country: r.country.value },
      });
    }
    return out;
  },
};
