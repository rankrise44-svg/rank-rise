import { z } from "zod";
import { IMF_INDICATORS, catalogEntry } from "../../catalog/indicators";
import { parsePeriod } from "../normalize";
import type { Connector, IndicatorRecord } from "../types";

/** IMF DataMapper API (WEO-based series) — https://www.imf.org/external/datamapper/api/ */
const BASE = "https://www.imf.org/external/datamapper/api/v1";

const valuesSchema = z.object({
  // indicator -> country -> year -> value. The API includes odd entries (e.g. an empty-string indicator
  // key with a null value), so countries and cells are validated individually below.
  values: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.unknown()).nullable()).nullable()).optional(),
});

type Item = { code: string; country: string; year: string; value: number; requestUrl: string };
type Raw = { responses: { url: string; body: unknown }[] };

export const imfConnector: Connector<Raw, Item> = {
  id: "imf",
  requiresCredential: false,
  async fetch(ctx) {
    const cfg = ctx.source.config as { indicators?: string[]; countries?: string[] };
    const codes = cfg.indicators?.length ? cfg.indicators : IMF_INDICATORS.map((i) => i.code);
    const countries = cfg.countries?.length ? cfg.countries : ["LBN"];
    const responses: Raw["responses"] = [];
    const payloads = [];
    const partialErrors: string[] = [];
    for (const code of ctx.mode === "test" ? codes.slice(0, 1) : codes) {
      const url = `${BASE}/${encodeURIComponent(code)}/${countries.map(encodeURIComponent).join("/")}`;
      try {
        const { data, res } = await ctx.http.getJson(url, { timeoutMs: 45_000, retries: 3, minIntervalMs: 2_000 });
        responses.push({ url, body: data });
        payloads.push({ url, contentType: res.contentType, body: res.text });
      } catch (e) {
        partialErrors.push(`${code}: ${(e as Error).message}`);
      }
    }
    return { raw: { responses }, payloads, partialErrors };
  },
  validate(raw, ctx) {
    const cfg = ctx.source.config as { countries?: string[] };
    const wanted = new Set(cfg.countries?.length ? cfg.countries : ["LBN"]);
    const items: Item[] = [];
    const issues = [];
    let idx = 0;
    for (const r of raw.responses) {
      const p = valuesSchema.safeParse(r.body);
      if (!p.success || !p.data.values) {
        issues.push({ index: idx++, reason: "Unexpected IMF response shape", sample: JSON.stringify(r.body).slice(0, 200) });
        continue;
      }
      for (const [code, byCountry] of Object.entries(p.data.values)) {
        if (!byCountry) continue;
        // The API may return every country; keep only the configured ones.
        for (const [country, byYear] of Object.entries(byCountry)) {
          if (!wanted.has(country) || !byYear) continue;
          for (const [year, value] of Object.entries(byYear)) {
            idx++;
            if (value === null) continue;
            if (typeof value !== "number" || !Number.isFinite(value)) {
              issues.push({ index: idx, reason: `Non-numeric value for ${code}/${country}/${year}`, sample: String(value).slice(0, 40) });
              continue;
            }
            if (!/^\d{4}$/.test(year)) {
              issues.push({ index: idx, reason: `Unexpected period label ${year}` });
              continue;
            }
            items.push({ code, country, year, value, requestUrl: r.url });
          }
        }
      }
    }
    return { items, issues };
  },
  normalize(items, ctx) {
    const currentYear = ctx.now.getUTCFullYear();
    const out: IndicatorRecord[] = [];
    for (const it of items) {
      const period = parsePeriod(it.year)!;
      const cat = catalogEntry("imf", it.code);
      const isProjection = Number(it.year) >= currentYear;
      out.push({
        kind: "indicator",
        indicator: {
          code: it.code,
          countryCode: it.country,
          nameEn: it.code,
          nameAr: cat?.nameAr ?? null,
          unit: cat?.unit ?? null,
          unitAr: cat?.unitAr ?? null,
          frequency: "annual",
          category: cat?.category ?? null,
          sectorKey: cat?.sectorKey ?? null,
          higherIs: cat?.higherIs ?? null,
          methodologyUrl: `https://www.imf.org/external/datamapper/${it.code}@WEO/${it.country}`,
          metadata: { provider: "IMF DataMapper (WEO)" },
        },
        periodDate: period.periodDate,
        periodLabel: it.year,
        value: it.value,
        unit: cat?.unit ?? null,
        currency: it.code === "NGDPD" ? "USD" : null,
        isProjection,
        observedAt: period.observedAt,
        sourceUrl: `https://www.imf.org/external/datamapper/${it.code}@WEO/${it.country}`,
        provenance: {
          api_url: it.requestUrl,
          note: isProjection
            ? "Year is not yet complete: IMF value is a projection."
            : "IMF WEO values for recent years may be staff estimates subject to revision.",
        },
      });
    }
    return out;
  },
};
