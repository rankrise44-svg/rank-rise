import { z } from "zod";
import { ConnectorConfigError, type Connector, type MarketRecord, type ValidationIssue } from "../types";

/** Twelve Data (optional, requires a free or paid API key). https://twelvedata.com/docs */
const BASE = "https://api.twelvedata.com";
const ok = z.object({
  meta: z.object({ symbol: z.string(), interval: z.string(), currency_base: z.string().optional(), currency_quote: z.string().optional(), currency: z.string().optional(), exchange: z.string().optional(), exchange_timezone: z.string().optional(), type: z.string().optional() }),
  values: z.array(z.object({ datetime: z.string(), open: z.string(), high: z.string(), low: z.string(), close: z.string() })),
  status: z.literal("ok"),
});
const err = z.object({ code: z.number(), message: z.string(), status: z.literal("error") });

type Item = z.infer<typeof ok>["values"][number] & { meta: z.infer<typeof ok>["meta"]; url: string };
type Raw = { responses: { symbol: string; url: string; body: unknown }[] };

const TYPE_MAP: Record<string, MarketRecord["instrumentType"]> = {
  "Physical Currency": "fx",
  "Digital Currency": "crypto",
  "Common Stock": "equity",
  Index: "index",
  ETF: "equity",
};

export const twelveDataConnector: Connector<Raw, Item> = {
  id: "twelvedata",
  requiresCredential: true,
  async fetch(ctx) {
    const cfg = ctx.source.config as { symbols?: string[]; outputsize?: number };
    const symbols = cfg.symbols?.length ? cfg.symbols : ["XAU/USD", "EUR/USD", "SPX"];
    const responses: Raw["responses"] = [];
    const payloads = [];
    const partialErrors: string[] = [];
    for (const symbol of ctx.mode === "test" ? symbols.slice(0, 1) : symbols) {
      const qs = new URLSearchParams({ symbol, interval: "1day", outputsize: String(ctx.since ? 10 : cfg.outputsize ?? 365), apikey: ctx.credential ?? "" });
      const url = `${BASE}/time_series?${qs}`;
      const safeUrl = url.replace(/apikey=[^&]+/, "apikey=***");
      try {
        // Free plan: 8 requests/minute → keep ≥ 8s between calls.
        const { data, res } = await ctx.http.getJson(url, { timeoutMs: 30_000, retries: 2, minIntervalMs: 8_000 });
        const e = err.safeParse(data);
        if (e.success) {
          if (e.data.code === 401 || e.data.code === 403) throw new ConnectorConfigError(`Twelve Data rejected the API key or plan: ${e.data.message}`, "needs_credentials");
          partialErrors.push(`${symbol}: ${e.data.message}`);
          continue;
        }
        responses.push({ symbol, url: safeUrl, body: data });
        payloads.push({ url: safeUrl, contentType: res.contentType, body: res.text });
      } catch (e) {
        if (e instanceof ConnectorConfigError) throw e;
        partialErrors.push(`${symbol}: ${(e as Error).message.replace(/apikey=[^&\s]+/g, "apikey=***")}`);
      }
    }
    return { raw: { responses }, payloads, partialErrors };
  },
  validate(raw) {
    const items: Item[] = [];
    const issues: ValidationIssue[] = [];
    raw.responses.forEach((r, index) => {
      const p = ok.safeParse(r.body);
      if (!p.success) return issues.push({ index, reason: `Unexpected response for ${r.symbol}`, sample: JSON.stringify(r.body).slice(0, 200) });
      for (const v of p.data.values) items.push({ ...v, meta: p.data.meta, url: r.url });
    });
    return { items, issues };
  },
  normalize(items) {
    return items
      .map<MarketRecord | null>((v) => {
        const close = Number(v.close);
        if (!Number.isFinite(close)) return null;
        const isMetal = /^X(AU|AG|PT|PD)\//.test(v.meta.symbol);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(v.datetime) ? `${v.datetime}T00:00:00Z` : `${v.datetime.replace(" ", "T")}Z`;
        return {
          kind: "market",
          instrument: v.meta.symbol,
          instrumentType: isMetal ? "metal" : TYPE_MAP[v.meta.type ?? ""] ?? "fx",
          rateType: "market",
          provider: "Twelve Data",
          exchange: v.meta.exchange ?? null,
          currency: v.meta.currency_quote ?? v.meta.currency ?? null,
          unit: isMetal ? `${v.meta.currency_quote ?? "USD"} per troy ounce` : null,
          observedAt: new Date(date),
          open: Number(v.open),
          high: Number(v.high),
          low: Number(v.low),
          close,
          value: close,
          delayMinutes: null,
          granularity: "daily",
          sourceUrl: "https://twelvedata.com",
          provenance: { api_url: v.url, exchange_timezone: v.meta.exchange_timezone ?? null, note: "Daily bar; delay depends on the API plan" },
        };
      })
      .filter((x): x is MarketRecord => x !== null);
  },
};
