import { z } from "zod";
import type { ValidationIssue, Connector, MarketRecord } from "../types";

/**
 * gold-api.com — free, keyless spot prices for precious metals (third-party quotes, latest value only).
 * Each run stores one snapshot; history accumulates in our database over time.
 */
const BASE = "https://api.gold-api.com/price";
const schema = z.object({
  name: z.string().optional(),
  price: z.number().positive(),
  symbol: z.string(),
  updatedAt: z.string(),
  currency: z.string().optional(),
});
type Item = z.infer<typeof schema> & { url: string };
type Raw = { responses: { url: string; body: unknown }[] };

const NAMES: Record<string, string> = { XAU: "Gold", XAG: "Silver", XPT: "Platinum", XPD: "Palladium" };

export const goldApiConnector: Connector<Raw, Item> = {
  id: "goldapi",
  requiresCredential: false,
  async fetch(ctx) {
    const cfg = ctx.source.config as { symbols?: string[] };
    const symbols = cfg.symbols?.length ? cfg.symbols : ["XAU"];
    const responses: Raw["responses"] = [];
    const payloads = [];
    const partialErrors: string[] = [];
    for (const s of symbols) {
      const url = `${BASE}/${encodeURIComponent(s)}`;
      try {
        const { data, res } = await ctx.http.getJson(url, { timeoutMs: 20_000, retries: 2, minIntervalMs: 1_000 });
        responses.push({ url, body: data });
        payloads.push({ url, contentType: res.contentType, body: res.text });
      } catch (e) {
        partialErrors.push(`${s}: ${(e as Error).message}`);
      }
    }
    return { raw: { responses }, payloads, partialErrors };
  },
  validate(raw) {
    const items: Item[] = [];
    const issues: ValidationIssue[] = [];
    raw.responses.forEach((r, index) => {
      const p = schema.safeParse(r.body);
      if (p.success && !Number.isNaN(Date.parse(p.data.updatedAt))) items.push({ ...p.data, url: r.url });
      else issues.push({ index, reason: "Unexpected gold-api response", sample: JSON.stringify(r.body).slice(0, 200) });
    });
    return { items, issues };
  },
  normalize(items) {
    return items.map<MarketRecord>((i) => ({
      kind: "market",
      instrument: `${i.symbol}/${i.currency ?? "USD"}`,
      instrumentType: "metal",
      rateType: "third_party_quote",
      provider: "gold-api.com",
      currency: i.currency ?? "USD",
      unit: `${i.currency ?? "USD"} per troy ounce`,
      observedAt: new Date(i.updatedAt),
      value: i.price,
      close: i.price,
      delayMinutes: null,
      granularity: "intraday",
      sourceUrl: "https://gold-api.com/",
      provenance: { api_url: i.url, name: i.name ?? NAMES[i.symbol] ?? i.symbol, note: "Indicative spot quote from a third-party aggregator, not an official fixing" },
    }));
  },
};
