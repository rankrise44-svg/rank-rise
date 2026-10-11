import { describe, expect, it } from "vitest";
import { createLogger } from "@/lib/ingestion/runner";
import type { ConnectorContext, SourceRow } from "@/lib/ingestion/types";
import { worldBankConnector } from "@/lib/ingestion/connectors/worldbank";
import { imfConnector } from "@/lib/ingestion/connectors/imf";
import { gdeltConnector, buildGdeltUrl } from "@/lib/ingestion/connectors/gdelt";
import { rssConnector, parseFeed } from "@/lib/ingestion/connectors/rss";
import { frankfurterV2Connector } from "@/lib/ingestion/connectors/frankfurter-v2";
import { goldApiConnector } from "@/lib/ingestion/connectors/goldapi";
import { parseCpiGrid, casCpiConnector, type Cell } from "@/lib/ingestion/connectors/cas-cpi";
import { wfpPricesConnector } from "@/lib/ingestion/connectors/wfp-prices";
import { csvToObjects } from "@/lib/ingestion/csv";

function ctx(overrides: Partial<SourceRow> = {}, now = new Date("2026-10-11T12:00:00Z")): ConnectorContext {
  const source = { id: "s", key: "k", connector: "x", name: "Test Feed", config: {}, endpoint_url: "https://feed.example.com/rss", domain: "example.com", language: null, ...overrides } as SourceRow;
  return { source, credential: null, log: createLogger({}, false), since: null, mode: "full", now, http: { get: async () => { throw new Error("no network in unit tests"); }, getJson: async () => { throw new Error("no network"); } } };
}

describe("World Bank connector", () => {
  const body = [
    { page: 1, pages: 1, per_page: 2000, total: 3, lastupdated: "2026-10-08" },
    [
      { indicator: { id: "FP.CPI.TOTL.ZG", value: "Inflation, consumer prices (annual %)" }, country: { id: "LB", value: "Lebanon" }, countryiso3code: "LBN", date: "2025", value: 14.6, unit: "", obs_status: "", decimal: 1 },
      { indicator: { id: "FP.CPI.TOTL.ZG", value: "Inflation, consumer prices (annual %)" }, country: { id: "LB", value: "Lebanon" }, countryiso3code: "LBN", date: "2026", value: null, unit: "", obs_status: "", decimal: 1 },
      { indicator: { id: "FP.CPI.TOTL.ZG" }, country: { id: "LB" }, date: "2024" },
    ],
  ];
  it("validates rows, keeps metadata, and does not invent missing years", () => {
    const { items, issues } = worldBankConnector.validate({ responses: [{ url: "u", body }] }, ctx());
    expect(items).toHaveLength(2);
    expect(issues).toHaveLength(1); // malformed row reported, not silently dropped
    const recs = worldBankConnector.normalize(items, ctx());
    expect(recs).toHaveLength(1); // null 2026 value is not an observation
    expect(recs[0]).toMatchObject({ kind: "indicator", periodDate: "2025-01-01", value: 14.6, isProjection: false });
    expect(recs[0].kind === "indicator" && recs[0].indicator.nameAr).toBe("التضخم (أسعار المستهلك)");
  });
  it("reports API error payloads as validation issues", () => {
    const { items, issues } = worldBankConnector.validate({ responses: [{ url: "u", body: [{ message: [{ id: "120", key: "Invalid value" }] }] }] }, ctx());
    expect(items).toHaveLength(0);
    expect(issues[0].reason).toMatch(/API error/);
  });
});

describe("IMF DataMapper connector", () => {
  it("filters configured countries, tolerates null entries, flags current/future years as projections", () => {
    const body = { values: { NGDP_RPCH: { LBN: { "2024": -7.5, "2025": 4, "2026": 3.1 }, SDN: { "2025": 1 } }, "": null }, api: { version: "1" } };
    const c = ctx({ config: { countries: ["LBN"] } });
    const { items } = imfConnector.validate({ responses: [{ url: "u", body }] }, c);
    expect(items.map((i) => i.year)).toEqual(["2024", "2025", "2026"]);
    const recs = imfConnector.normalize(items, c);
    expect(recs.find((r) => r.kind === "indicator" && r.periodLabel === "2026")).toMatchObject({ isProjection: true });
    expect(recs.find((r) => r.kind === "indicator" && r.periodLabel === "2025")).toMatchObject({ isProjection: false });
  });
});

describe("GDELT connector", () => {
  it("normalizes articles with first-seen semantics and language codes", () => {
    const body = { articles: [{ url: "https://news.example.lb/a", url_mobile: "", title: "Lebanon economy news", seendate: "20261010T064500Z", socialimage: "", domain: "news.example.lb", language: "Arabic", sourcecountry: "Lebanon" }] };
    const { items } = gdeltConnector.validate({ responses: [{ query: "q", url: "u", body }] }, ctx());
    const [r] = gdeltConnector.normalize(items, ctx());
    expect(r).toMatchObject({ kind: "news", language: "ar", sourceCountry: "Lebanon" });
    expect(r.kind === "news" && r.publishedAt?.toISOString()).toBe("2026-10-10T06:45:00.000Z");
    expect(r.kind === "news" && r.provenance.time_semantics).toBe("gdelt_first_seen");
  });
  it("uses incremental start/end windows after a successful run", () => {
    const url = buildGdeltUrl("sourcecountry:LE", { since: new Date("2026-10-11T00:00:00Z"), now: new Date("2026-10-11T12:00:00Z") });
    expect(url).toContain("startdatetime=20261010230000");
    expect(url).not.toContain("timespan");
  });
});

describe("RSS/Atom connector", () => {
  const rss = `\r\n<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>
    <item><title>ارتفاع &amp; انخفاض</title><link>https://x.lb/1</link><pubDate>Sun, 11 Oct 2026 10:00:00 +0300</pubDate><description><![CDATA[<p>Short <b>summary</b></p>]]></description><guid>g1</guid></item>
    <item><title></title><link>https://x.lb/2</link></item>
    <item><title>Bad link</title><link>javascript:alert(1)</link></item>
  </channel></rss>`;
  it("parses RSS 2.0 with leading whitespace and rejects unsafe/empty items", () => {
    const c = ctx();
    const { items, issues } = rssConnector.validate({ url: "https://x.lb/feed", xml: rss }, c);
    expect(items).toHaveLength(1);
    expect(issues).toHaveLength(2);
    const [r] = rssConnector.normalize(items, c);
    expect(r).toMatchObject({ kind: "news", title: "ارتفاع & انخفاض", summary: "Short summary", language: "ar" });
    expect(r.kind === "news" && r.publishedAt?.toISOString()).toBe("2026-10-11T07:00:00.000Z");
  });
  it("parses Atom alternate links", () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title><entry><title>T</title><link rel="alternate" href="https://n.com/x"/><updated>2026-10-11T08:00:00Z</updated><id>1</id></entry></feed>`;
    expect(parseFeed(atom).items[0]).toMatchObject({ title: "T", link: "https://n.com/x" });
  });
  it("rejects documents that are not feeds", () => {
    expect(() => parseFeed("<html><body>Just a moment...</body></html>")).toThrow();
  });
});

describe("FX and gold connectors", () => {
  it("labels BDL rates as official and keeps them distinct from market quotes", () => {
    const { items } = frankfurterV2Connector.validate({ url: "u", provider: "BDL", body: [{ date: "2026-10-08", base: "USD", quote: "LBP", rate: 89500 }, { date: "bad", base: "USD", quote: "LBP", rate: 1 }] }, ctx());
    expect(items).toHaveLength(1);
    const [r] = frankfurterV2Connector.normalize(items, ctx());
    expect(r).toMatchObject({ kind: "market", instrument: "USD/LBP", rateType: "official", value: 89500 });
  });
  it("labels gold-api prices as third-party quotes with unit", () => {
    const { items } = goldApiConnector.validate({ responses: [{ url: "u", body: { currency: "USD", name: "Gold", price: 4195.6, symbol: "XAU", updatedAt: "2026-10-11T18:44:38Z" } }] }, ctx());
    const [r] = goldApiConnector.normalize(items, ctx());
    expect(r).toMatchObject({ instrument: "XAU/USD", rateType: "third_party_quote", unit: "USD per troy ounce" });
  });
});

describe("CAS CPI workbook parser", () => {
  const grid: Cell[][] = [
    ["Lebanon", "Lebanon", null, null, null, null, "لبنان"],
    ["Expenditure Divisions", "Monthly Change", "Aug index 2026", "Jul index 2026", "Weights", "أبواب الانفاق", "أبواب الانفاق"],
    ["Expenditure Divisions", "التغير الشهري", "مؤشر آب 2026", "مؤشر تموز 2026", "التثقيلات", "أبواب الانفاق", null],
    ["Food and non-alcoholic beverages", 0.01, 101, 100, 20, "المواد الغذائية", null],
    ["Consumer price index", 0.014, 8816.3, 8694.6, 100, "الرقم القياسي", null],
    ["Nabatieh", null, null, null, null, null, "النبطية"],
    ["Expenditure Divisions", "Monthly Change", "*Aug index 2026", "*Jul index 2026", "Weight as % of Lebanon", "Weights", "أبواب الانفاق"],
    ["Consumer price index", 0.02, 8685.8, 8505.6, 6.1, 100, "الرقم القياسي"],
  ];
  it("extracts region × division × month values and flags imputed regions", () => {
    const { items, issues } = parseCpiGrid(grid, "monthly", "https://www.cas.gov.lb/x.xlsx");
    expect(issues).toEqual([]);
    expect(items.filter((i) => i.region === "Lebanon" && i.measure === "index")).toHaveLength(4);
    const nab = items.find((i) => i.region === "Nabatieh" && i.measure === "index" && i.month === 8)!;
    expect(nab).toMatchObject({ year: 2026, value: 8685.8, imputed: true, weight: 100 });
    const recs = casCpiConnector.normalize(items, ctx());
    const nabRec = recs.find((r) => r.kind === "indicator" && r.indicator.code === "CAS.CPI.INDEX.NAB.TOTAL" && r.periodDate === "2026-08-01");
    expect(nabRec).toMatchObject({ qualityStatus: "provisional" });
    const mom = recs.find((r) => r.kind === "indicator" && r.indicator.code === "CAS.CPI.MOM_PCT.LBN.TOTAL");
    expect(mom && mom.kind === "indicator" && mom.value).toBeCloseTo(1.4);
  });
});

describe("WFP prices connector", () => {
  const csv = `date,admin1,admin2,market,market_id,latitude,longitude,category,commodity,commodity_id,unit,priceflag,pricetype,currency,price,usdprice
#date,#adm1+name,#adm2+name,#loc+market+name,#loc+market+code,#geo+lat,#geo+lon,#item+type,#item+name,#item+code,#item+unit,#item+price+flag,#item+price+type,#currency,#value,#value+usd
2026-08-15,Beirut,Beirut,Beirut,1689,33.89,35.5,non-food,Exchange rate (unofficial),473,USD/LCU,aggregate,Retail,LBP,89700,1
2026-08-15,El Nabatieh,Nabatieh,Nabatieh,1700,33.37,35.48,non-food,Exchange rate (unofficial),473,USD/LCU,aggregate,Retail,LBP,89500,1
2026-08-15,North,Tripoli,"Tripoli, old souk",1705,34.44,35.83,cereals,"Bread (pita)",57,1 KG,actual,Retail,LBP,80000,0.89
2026-08-15,North,Tripoli,Bad,1706,34.44,35.83,cereals,Bread,57,1 KG,actual,Retail,LBP,-5,0`;
  it("skips HXL rows, validates prices, maps governorates, and derives a labelled parallel rate", () => {
    const rows = csvToObjects(csv);
    expect(rows).toHaveLength(4);
    expect(rows[2].market).toBe("Tripoli, old souk");
    const { items, issues } = wfpPricesConnector.validate({ url: "u", rows }, ctx());
    expect(issues).toHaveLength(1);
    const recs = wfpPricesConnector.normalize(items, ctx());
    expect(recs.find((r) => r.kind === "price" && r.market === "Nabatieh")).toMatchObject({ areaKey: "nabatieh" });
    const fx = recs.find((r) => r.kind === "market")!;
    expect(fx).toMatchObject({ instrument: "USD/LBP", rateType: "parallel", granularity: "monthly" });
    expect(fx.kind === "market" && fx.value).toBe(89600); // median of the two monitored markets
  });
});
