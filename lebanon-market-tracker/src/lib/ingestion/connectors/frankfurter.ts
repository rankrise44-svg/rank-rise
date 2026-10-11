import { z } from "zod";
import type { Connector, MarketRecord } from "../types";

/**
 * Frankfurter — free, keyless API for European Central Bank reference rates (published once per
 * working day around 16:00 CET). These are reference rates, not tradable market quotes, and the
 * ECB does not publish a Lebanese pound rate.
 */
const BASE = "https://api.frankfurter.dev/v1";
const schema = z.object({
  base: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  rates: z.record(z.string(), z.record(z.string(), z.number())),
});
type Item = { date: string; quote: string; value: number; base: string; url: string };
type Raw = { url: string; body: unknown };

export const frankfurterConnector: Connector<Raw, Item> = {
  id: "frankfurter",
  requiresCredential: false,
  async fetch(ctx) {
    const cfg = ctx.source.config as { base?: string; symbols?: string[]; backfillDays?: number };
    const base = cfg.base ?? "USD";
    const symbols = (cfg.symbols?.length ? cfg.symbols : ["EUR", "GBP", "JPY", "CHF", "CNY", "TRY"]).join(",");
    const days = ctx.since ? 10 : ctx.mode === "test" ? 7 : cfg.backfillDays ?? 400;
    const start = new Date(ctx.now.getTime() - days * 86400_000).toISOString().slice(0, 10);
    const url = `${BASE}/${start}..?from=${encodeURIComponent(base)}&to=${encodeURIComponent(symbols)}`;
    const { data, res } = await ctx.http.getJson(url, { timeoutMs: 30_000, retries: 3 });
    return { raw: { url, body: data }, payloads: [{ url, contentType: res.contentType, body: res.text }] };
  },
  validate(raw) {
    const p = schema.safeParse(raw.body);
    if (!p.success) return { items: [], issues: [{ index: 0, reason: "Unexpected Frankfurter response", sample: JSON.stringify(raw.body).slice(0, 200) }] };
    const items: Item[] = [];
    for (const [date, quotes] of Object.entries(p.data.rates)) {
      for (const [quote, value] of Object.entries(quotes)) items.push({ date, quote, value, base: p.data.base, url: raw.url });
    }
    return { items, issues: [] };
  },
  normalize(items) {
    return items
      .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && i.value > 0)
      .map<MarketRecord>((i) => ({
        kind: "market",
        instrument: `${i.base}/${i.quote}`,
        instrumentType: "fx",
        rateType: "reference",
        provider: "ECB via Frankfurter",
        currency: i.quote,
        unit: `${i.quote} per 1 ${i.base}`,
        // ECB reference rates are set at ~14:15 UTC (16:00 CET publication).
        observedAt: new Date(`${i.date}T14:15:00Z`),
        value: i.value,
        close: i.value,
        delayMinutes: null,
        granularity: "daily",
        sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
        provenance: { api_url: i.url, note: "ECB euro foreign exchange reference rate, cross-calculated by Frankfurter when base is not EUR" },
      }));
  },
};
