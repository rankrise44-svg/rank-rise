import type { ValidationIssue, Connector, MarketRecord } from "../types";
import { ConnectorConfigError } from "../types";

/** Alpha Vantage (optional, requires an API key). https://www.alphavantage.co/documentation/ */
const BASE = "https://www.alphavantage.co/query";

type Request = { kind: "fx"; from: string; to: string } | { kind: "commodity"; fn: "BRENT" | "WTI" | "NATURAL_GAS" };
type Item = { instrument: string; type: MarketRecord["instrumentType"]; date: string; open?: number; high?: number; low?: number; close: number; unit?: string; url: string };
type Raw = { responses: { req: Request; url: string; body: Record<string, unknown> }[] };

function parseReq(s: string): Request | null {
  const fx = /^([A-Z]{3})\/([A-Z]{3})$/.exec(s);
  if (fx) return { kind: "fx", from: fx[1], to: fx[2] };
  if (s === "BRENT" || s === "WTI" || s === "NATURAL_GAS") return { kind: "commodity", fn: s };
  return null;
}

export const alphaVantageConnector: Connector<Raw, Item> = {
  id: "alphavantage",
  requiresCredential: true,
  async fetch(ctx) {
    const cfg = ctx.source.config as { series?: string[] };
    const reqs = (cfg.series?.length ? cfg.series : ["EUR/USD", "BRENT"]).map(parseReq).filter((r): r is Request => r !== null);
    const responses: Raw["responses"] = [];
    const payloads = [];
    const partialErrors: string[] = [];
    for (const req of ctx.mode === "test" ? reqs.slice(0, 1) : reqs) {
      const qs = new URLSearchParams(
        req.kind === "fx"
          ? { function: "FX_DAILY", from_symbol: req.from, to_symbol: req.to, outputsize: "compact", apikey: ctx.credential ?? "" }
          : { function: req.fn, interval: "daily", apikey: ctx.credential ?? "" },
      );
      const url = `${BASE}?${qs}`;
      const safeUrl = url.replace(/apikey=[^&]+/, "apikey=***");
      try {
        // Free tier is limited to a small daily quota; space calls out.
        const { data, res } = await ctx.http.getJson<Record<string, unknown>>(url, { timeoutMs: 30_000, retries: 1, minIntervalMs: 15_000 });
        const msg = (data["Error Message"] ?? data["Information"] ?? data["Note"]) as string | undefined;
        if (msg) {
          if (/api key|apikey/i.test(msg) && /invalid|missing/i.test(msg)) throw new ConnectorConfigError(`Alpha Vantage: ${msg}`, "needs_credentials");
          partialErrors.push(`${req.kind === "fx" ? `${req.from}/${req.to}` : req.fn}: ${msg.slice(0, 200)}`);
          continue;
        }
        responses.push({ req, url: safeUrl, body: data });
        payloads.push({ url: safeUrl, contentType: res.contentType, body: res.text });
      } catch (e) {
        if (e instanceof ConnectorConfigError) throw e;
        partialErrors.push((e as Error).message.replace(/apikey=[^&\s]+/g, "apikey=***"));
      }
    }
    return { raw: { responses }, payloads, partialErrors };
  },
  validate(raw) {
    const items: Item[] = [];
    const issues: ValidationIssue[] = [];
    raw.responses.forEach((r, index) => {
      if (r.req.kind === "fx") {
        const series = r.body["Time Series FX (Daily)"] as Record<string, Record<string, string>> | undefined;
        if (!series) return issues.push({ index, reason: "Missing 'Time Series FX (Daily)'" });
        for (const [date, v] of Object.entries(series)) {
          items.push({ instrument: `${r.req.from}/${r.req.to}`, type: "fx", date, open: +v["1. open"], high: +v["2. high"], low: +v["3. low"], close: +v["4. close"], url: r.url });
        }
      } else {
        const data = r.body["data"] as { date: string; value: string }[] | undefined;
        if (!Array.isArray(data)) return issues.push({ index, reason: "Missing commodity data array" });
        const unit = String(r.body["unit"] ?? "");
        for (const d of data.slice(0, 400)) {
          if (d.value === "." || !Number.isFinite(+d.value)) continue;
          items.push({ instrument: r.req.fn, type: "commodity", date: d.date, close: +d.value, unit, url: r.url });
        }
      }
    });
    return { items, issues };
  },
  normalize(items) {
    return items
      .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && Number.isFinite(i.close))
      .map<MarketRecord>((i) => ({
        kind: "market",
        instrument: i.instrument,
        instrumentType: i.type,
        rateType: "market",
        provider: "Alpha Vantage",
        currency: i.type === "fx" ? i.instrument.split("/")[1] : "USD",
        unit: i.unit ?? null,
        observedAt: new Date(`${i.date}T00:00:00Z`),
        open: i.open ?? null,
        high: i.high ?? null,
        low: i.low ?? null,
        close: i.close,
        value: i.close,
        delayMinutes: null,
        granularity: "daily",
        sourceUrl: "https://www.alphavantage.co",
        provenance: { api_url: i.url },
      }));
  },
};
