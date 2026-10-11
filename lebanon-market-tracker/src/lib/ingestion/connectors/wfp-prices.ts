import { csvToObjects } from "../csv";
import { matchAreaKey } from "../../intel/areas-match";
import type { ValidationIssue, Connector, MarketRecord, PriceRecord } from "../types";

/**
 * WFP market monitoring — Lebanon food prices, published on HDX (CC BY-IGO).
 * One row per market × commodity × date with market coordinates supplied by WFP.
 * The dataset also carries WFP's observed "Exchange rate (unofficial)" (parallel market LBP/USD).
 */
const DEFAULT_URL =
  "https://data.humdata.org/dataset/db0b4fb1-ce11-458e-94e0-3342365a117a/resource/772bc34e-1327-4ada-b2eb-e72020a546f2/download/wfp_food_prices_lbn.csv";

type Row = Record<string, string>;
type Raw = { url: string; rows: Row[] };

export const wfpPricesConnector: Connector<Raw, Row> = {
  id: "wfp_prices",
  requiresCredential: false,
  async fetch(ctx) {
    const url = ctx.source.endpoint_url?.startsWith("https://") ? ctx.source.endpoint_url : DEFAULT_URL;
    const res = await ctx.http.get(url, { timeoutMs: 120_000, retries: 2, maxBytes: 60 * 1024 * 1024 });
    let rows = csvToObjects(res.text);
    // Incremental runs only reprocess recent rows (the file is republished in full each month).
    const cutoff = ctx.since ? new Date(ctx.since.getTime() - 180 * 86400_000).toISOString().slice(0, 10) : ctx.mode === "test" ? "9999" : null;
    if (cutoff && cutoff !== "9999") rows = rows.filter((r) => (r.date ?? "") >= cutoff);
    if (ctx.mode === "test") rows = rows.slice(-50);
    // Raw archive keeps only the head of the file to bound storage.
    return { raw: { url, rows }, payloads: [{ url, contentType: res.contentType, body: res.text.slice(0, 200_000) }] };
  },
  validate(raw) {
    const items: Row[] = [];
    const issues: ValidationIssue[] = [];
    raw.rows.forEach((r, index) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "")) return issues.push({ index, reason: "bad date", sample: r.date });
      if (!r.market_id || !r.commodity || !r.commodity_id) return issues.push({ index, reason: "missing market/commodity" });
      const price = Number(r.price);
      if (!Number.isFinite(price) || price <= 0) return issues.push({ index, reason: "non-positive or missing price", sample: r.price });
      items.push({ ...r, __url: raw.url });
    });
    return { items, issues };
  },
  normalize(items) {
    const out: (PriceRecord | MarketRecord)[] = [];
    const fx = new Map<string, number[]>();
    for (const r of items) {
      const lat = Number(r.latitude);
      const lon = Number(r.longitude);
      out.push({
        kind: "price",
        observedDate: r.date,
        admin1: r.admin1 || null,
        admin2: r.admin2 || null,
        areaKey: matchAreaKey(r.admin1) ?? matchAreaKey(r.admin2),
        market: r.market,
        marketId: r.market_id,
        latitude: Number.isFinite(lat) && lat !== 0 ? lat : null,
        longitude: Number.isFinite(lon) && lon !== 0 ? lon : null,
        category: r.category || null,
        commodity: r.commodity,
        commodityId: r.commodity_id,
        unit: r.unit || "unit",
        priceFlag: r.priceflag || null,
        priceType: r.pricetype || "unspecified",
        currency: r.currency || "LBP",
        price: Number(r.price),
        usdPrice: Number.isFinite(Number(r.usdprice)) && r.usdprice !== "" ? Number(r.usdprice) : null,
        provenance: { dataset_url: r.__url, license: "CC BY-IGO" },
      });
      if (/exchange rate \(unofficial\)/i.test(r.commodity) && r.currency === "LBP") {
        const arr = fx.get(r.date) ?? [];
        arr.push(Number(r.price));
        fx.set(r.date, arr);
      }
    }
    for (const [date, vals] of fx) {
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      out.push({
        kind: "market",
        instrument: "USD/LBP",
        instrumentType: "fx",
        rateType: "parallel",
        provider: "WFP market monitoring",
        currency: "LBP",
        unit: "LBP per 1 USD",
        observedAt: new Date(`${date}T12:00:00Z`),
        value: median,
        close: median,
        delayMinutes: null,
        granularity: "monthly",
        sourceUrl: "https://data.humdata.org/dataset/wfp-food-prices-for-lebanon",
        provenance: { method: "median across WFP-monitored markets", markets: vals.length, license: "CC BY-IGO" },
      });
    }
    return out;
  },
};
