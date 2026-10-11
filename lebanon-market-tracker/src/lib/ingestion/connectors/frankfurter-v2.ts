import { z } from "zod";
import type { ValidationIssue, Connector, MarketRecord } from "../types";

/**
 * Frankfurter v2 — keyless aggregator of central-bank and official rates (https://frankfurter.dev).
 * Used here with providers=BDL to obtain Banque du Liban's published official USD/LBP rate
 * (BDL's own site blocks automated clients). Data history from this provider starts 2024-01-02.
 */
const BASE = "https://api.frankfurter.dev/v2/rates";
const row = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), base: z.string(), quote: z.string(), rate: z.number().positive() });
type Item = z.infer<typeof row> & { url: string; provider: string };
type Raw = { url: string; provider: string; body: unknown };

const PROVIDER_LABELS: Record<string, { name: string; rateType: MarketRecord["rateType"]; url: string }> = {
  BDL: { name: "Banque du Liban (via Frankfurter)", rateType: "official", url: "https://www.bdl.gov.lb/currentrate.php" },
  ECB: { name: "ECB (via Frankfurter)", rateType: "reference", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" },
};

export const frankfurterV2Connector: Connector<Raw, Item> = {
  id: "frankfurter_v2",
  requiresCredential: false,
  async fetch(ctx) {
    const cfg = ctx.source.config as { base?: string; quotes?: string[]; provider?: string; backfillFrom?: string };
    const provider = cfg.provider ?? "BDL";
    const from = ctx.since ? new Date(ctx.since.getTime() - 14 * 86400_000).toISOString().slice(0, 10) : ctx.mode === "test" ? new Date(ctx.now.getTime() - 30 * 86400_000).toISOString().slice(0, 10) : cfg.backfillFrom ?? "2024-01-01";
    const qs = new URLSearchParams({ base: cfg.base ?? "USD", quotes: (cfg.quotes ?? ["LBP"]).join(","), providers: provider, from, to: ctx.now.toISOString().slice(0, 10) });
    const url = `${BASE}?${qs}`;
    const { data, res } = await ctx.http.getJson(url, { timeoutMs: 30_000, retries: 3 });
    return { raw: { url, provider, body: data }, payloads: [{ url, contentType: res.contentType, body: res.text }] };
  },
  validate(raw) {
    if (!Array.isArray(raw.body)) return { items: [], issues: [{ index: 0, reason: "Expected an array of rates", sample: JSON.stringify(raw.body).slice(0, 200) }] };
    const items: Item[] = [];
    const issues: ValidationIssue[] = [];
    raw.body.forEach((r, index) => {
      const p = row.safeParse(r);
      if (p.success) items.push({ ...p.data, url: raw.url, provider: raw.provider });
      else issues.push({ index, reason: "invalid rate row", sample: JSON.stringify(r).slice(0, 120) });
    });
    return { items, issues };
  },
  normalize(items) {
    return items.map<MarketRecord>((i) => {
      const p = PROVIDER_LABELS[i.provider] ?? { name: `${i.provider} (via Frankfurter)`, rateType: "official" as const, url: "https://frankfurter.dev" };
      return {
        kind: "market",
        instrument: `${i.base}/${i.quote}`,
        instrumentType: "fx",
        rateType: p.rateType,
        provider: p.name,
        currency: i.quote,
        unit: `${i.quote} per 1 ${i.base}`,
        observedAt: new Date(`${i.date}T12:00:00Z`),
        value: i.rate,
        close: i.rate,
        delayMinutes: null,
        granularity: "daily",
        sourceUrl: p.url,
        provenance: { api_url: i.url, provider_key: i.provider, note: "Official published rate; this is not the parallel-market rate." },
      };
    });
  },
};
