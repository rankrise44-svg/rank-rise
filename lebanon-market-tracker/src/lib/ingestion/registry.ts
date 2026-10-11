import type { Queryable } from "./store";
import { alphaVantageConnector } from "./connectors/alphavantage";
import { frankfurterConnector } from "./connectors/frankfurter";
import { gdeltConnector, DEFAULT_GDELT_QUERIES } from "./connectors/gdelt";
import { imfConnector } from "./connectors/imf";
import { rssConnector } from "./connectors/rss";
import { twelveDataConnector } from "./connectors/twelvedata";
import { worldBankConnector } from "./connectors/worldbank";
import { goldApiConnector } from "./connectors/goldapi";
import { casCpiConnector } from "./connectors/cas-cpi";
import { frankfurterV2Connector } from "./connectors/frankfurter-v2";
import { wfpPricesConnector } from "./connectors/wfp-prices";
import { ConnectorConfigError, type Connector } from "./types";

/** Placeholder for investigated sources that cannot be ingested automatically (yet). */
const unavailableConnector: Connector<never, never> = {
  id: "unavailable",
  requiresCredential: false,
  async fetch(ctx) {
    const reason = (ctx.source.config as { unavailable_reason?: string }).unavailable_reason ?? "No automated access method has been verified for this source.";
    throw new ConnectorConfigError(reason, "blocked");
  },
  validate: () => ({ items: [], issues: [] }),
  normalize: () => [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CONNECTORS: Record<string, Connector<any, any>> = {
  worldbank: worldBankConnector,
  imf: imfConnector,
  gdelt: gdeltConnector,
  rss: rssConnector,
  frankfurter: frankfurterConnector,
  goldapi: goldApiConnector,
  cas_cpi: casCpiConnector,
  frankfurter_v2: frankfurterV2Connector,
  wfp_prices: wfpPricesConnector,
  twelvedata: twelveDataConnector,
  alphavantage: alphaVantageConnector,
  unavailable: unavailableConnector,
};

export type SourceDefinition = {
  key: string;
  connector: string;
  name: string;
  name_ar: string;
  domain: string;
  endpoint_url: string | null;
  homepage_url: string;
  source_type: "api" | "rss" | "dataset" | "document" | "manual" | "web";
  provenance: "official" | "third_party" | "inferred" | "user";
  auth_required: "none" | "api_key";
  terms_of_use: string;
  terms_url: string | null;
  topics: string[];
  update_schedule: string;
  schedule_minutes: number | null;
  coverage_notes: string;
  language: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
};

export const SYSTEM_SOURCES: SourceDefinition[] = [
  {
    key: "worldbank-indicators",
    connector: "worldbank",
    name: "World Bank — World Development Indicators",
    name_ar: "البنك الدولي — مؤشرات التنمية",
    domain: "api.worldbank.org",
    endpoint_url: "https://api.worldbank.org/v2/country/{countries}/indicator/{code}?format=json",
    homepage_url: "https://data.worldbank.org/country/lebanon",
    source_type: "api",
    provenance: "official",
    auth_required: "none",
    terms_of_use: "Open data under CC BY 4.0; attribution to The World Bank required.",
    terms_url: "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
    topics: ["macro", "prices", "external", "labour", "fiscal", "social"],
    update_schedule: "Weekly check; WDI is updated a few times per year",
    schedule_minutes: 7 * 24 * 60,
    coverage_notes: "Annual series. Lebanon data lags 1–2 years and several series stop around 2020–2022 due to the crisis.",
    language: "en",
    config: { countries: ["LBN", "JOR", "EGY", "CYP"] },
    enabled: true,
  },
  {
    key: "imf-datamapper",
    connector: "imf",
    name: "IMF DataMapper (World Economic Outlook)",
    name_ar: "صندوق النقد الدولي — آفاق الاقتصاد العالمي",
    domain: "www.imf.org",
    endpoint_url: "https://www.imf.org/external/datamapper/api/v1/{indicator}/{countries}",
    homepage_url: "https://www.imf.org/external/datamapper/profile/LBN",
    source_type: "api",
    provenance: "official",
    auth_required: "none",
    terms_of_use: "IMF copyright and usage terms apply; data may be used with attribution.",
    terms_url: "https://www.imf.org/external/terms.htm",
    topics: ["macro", "prices", "fiscal", "external"],
    update_schedule: "Weekly check; WEO is published in April and October",
    schedule_minutes: 7 * 24 * 60,
    coverage_notes: "Annual WEO series. Values for the current and future years are projections; recent years can be staff estimates.",
    language: "en",
    config: { countries: ["LBN", "JOR", "EGY", "CYP"] },
    enabled: true,
  },
  {
    key: "gdelt-doc",
    connector: "gdelt",
    name: "GDELT DOC 2.0 API",
    name_ar: "قاعدة GDELT للأخبار العالمية",
    domain: "api.gdeltproject.org",
    endpoint_url: "https://api.gdeltproject.org/api/v2/doc/doc",
    homepage_url: "https://www.gdeltproject.org/",
    source_type: "api",
    provenance: "third_party",
    auth_required: "none",
    terms_of_use: "Free and open; GDELT requests at most one API request every 5 seconds. Returns article metadata and links only.",
    terms_url: "https://www.gdeltproject.org/about.html#termsofuse",
    topics: ["news"],
    update_schedule: "Every 2 hours",
    schedule_minutes: 120,
    coverage_notes: "Discovery index of global online news. Times are when GDELT first saw the article, not publication time. Coverage of small Lebanese outlets is incomplete.",
    language: null,
    config: { queries: DEFAULT_GDELT_QUERIES },
    enabled: true,
  },
  {
    key: "ecb-frankfurter",
    connector: "frankfurter",
    name: "ECB reference rates (via Frankfurter)",
    name_ar: "أسعار الصرف المرجعية للبنك المركزي الأوروبي",
    domain: "api.frankfurter.app",
    endpoint_url: "https://api.frankfurter.app/{start}..?from=USD&to=...",
    homepage_url: "https://www.frankfurter.app/",
    source_type: "api",
    provenance: "official",
    auth_required: "none",
    terms_of_use: "Frankfurter is an open-source, keyless service; underlying data is published by the European Central Bank.",
    terms_url: "https://www.ecb.europa.eu/home/disclaimer/html/index.en.html",
    topics: ["fx"],
    update_schedule: "Daily (ECB publishes on TARGET working days ~16:00 CET)",
    schedule_minutes: 6 * 60,
    coverage_notes: "Reference rates for major currencies only. Does NOT include the Lebanese pound.",
    language: "en",
    config: { base: "USD", symbols: ["EUR", "GBP", "JPY", "CHF", "CNY", "TRY"] },
    enabled: true,
  },
  {
    key: "gold-api",
    connector: "goldapi",
    name: "Gold API (spot metal prices)",
    name_ar: "أسعار المعادن الفورية (Gold API)",
    domain: "api.gold-api.com",
    endpoint_url: "https://api.gold-api.com/price/{symbol}",
    homepage_url: "https://gold-api.com/",
    source_type: "api",
    provenance: "third_party",
    auth_required: "none",
    terms_of_use: "Third-party free service; review its terms before relying on it. Prices are indicative spot quotes, not an official fixing.",
    terms_url: "https://gold-api.com/",
    topics: ["gold", "metals"],
    update_schedule: "Every 6 hours (one snapshot per run)",
    schedule_minutes: 6 * 60,
    coverage_notes: "Latest spot price only (no history). History accumulates in this database from the first run onward.",
    language: "en",
    config: { symbols: ["XAU", "XAG"] },
    enabled: true,
  },
  {
    key: "twelvedata",
    connector: "twelvedata",
    name: "Twelve Data",
    name_ar: "Twelve Data — بيانات الأسواق",
    domain: "api.twelvedata.com",
    endpoint_url: "https://api.twelvedata.com/time_series",
    homepage_url: "https://twelvedata.com/",
    source_type: "api",
    provenance: "third_party",
    auth_required: "api_key",
    terms_of_use: "Requires an API key. Free plan has per-minute and daily credit limits and personal-use restrictions; check current plan terms.",
    terms_url: "https://twelvedata.com/terms",
    topics: ["fx", "gold", "equities", "indices"],
    update_schedule: "Daily",
    schedule_minutes: 24 * 60,
    coverage_notes: "Symbol coverage depends on plan. No Lebanese equities and no official USD/LBP rate should be assumed.",
    language: "en",
    config: { symbols: ["XAU/USD", "EUR/USD", "SPX"] },
    enabled: false,
  },
  {
    key: "alphavantage",
    connector: "alphavantage",
    name: "Alpha Vantage",
    name_ar: "Alpha Vantage — بيانات الأسواق",
    domain: "www.alphavantage.co",
    endpoint_url: "https://www.alphavantage.co/query",
    homepage_url: "https://www.alphavantage.co/",
    source_type: "api",
    provenance: "third_party",
    auth_required: "api_key",
    terms_of_use: "Requires an API key. The free tier has a small daily request quota; premium plans are paid.",
    terms_url: "https://www.alphavantage.co/terms_of_service/",
    topics: ["fx", "commodities"],
    update_schedule: "Daily",
    schedule_minutes: 24 * 60,
    coverage_notes: "FX daily series and commodity series (Brent, WTI). Commodity series are sourced from the US EIA/FRED via Alpha Vantage.",
    language: "en",
    config: { series: ["EUR/USD", "BRENT"] },
    enabled: false,
  },
  {
    key: "manual-entry",
    connector: "manual",
    name: "Manual entries & CSV imports",
    name_ar: "إدخالات يدوية واستيراد ملفات",
    domain: "local",
    endpoint_url: null,
    homepage_url: "/sources",
    source_type: "manual",
    provenance: "user",
    auth_required: "none",
    terms_of_use: "Data you enter yourself. Each entry must cite where it came from.",
    terms_url: null,
    topics: ["fx", "indicators", "listings"],
    update_schedule: "On demand",
    schedule_minutes: null,
    coverage_notes: "Use for official figures that cannot be fetched automatically (e.g. BDL exchange rate, CAS CPI), always with a source link.",
    language: null,
    config: {},
    enabled: true,
  },
  {
    key: "bdl",
    connector: "unavailable",
    name: "Banque du Liban",
    name_ar: "مصرف لبنان",
    domain: "www.bdl.gov.lb",
    endpoint_url: null,
    homepage_url: "https://www.bdl.gov.lb/",
    source_type: "web",
    provenance: "official",
    auth_required: "none",
    terms_of_use: "No documented public API found.",
    terms_url: null,
    topics: ["fx", "monetary", "banking"],
    update_schedule: "Not automated",
    schedule_minutes: null,
    coverage_notes: "The site returned a bot-protection challenge (HTTP 403) to automated requests during investigation. The platform does not bypass such protections; enter figures manually with a citation.",
    language: "ar",
    config: { unavailable_reason: "BDL website returns a bot-protection challenge (HTTP 403) to automated clients; no documented API. Use manual entry with a source link." },
    enabled: false,
  },
  {
    key: "cas",
    connector: "cas_cpi",
    name: "Central Administration of Statistics — CPI",
    name_ar: "إدارة الإحصاء المركزي — مؤشر أسعار الاستهلاك",
    domain: "www.cas.gov.lb",
    endpoint_url: "https://www.cas.gov.lb/economic-statistics/cpi/",
    homepage_url: "https://www.cas.gov.lb/economic-statistics/cpi/",
    source_type: "document",
    provenance: "official",
    auth_required: "none",
    terms_of_use: "Official statistics published by the Lebanese Republic (CAS). robots.txt permits access to the CPI pages; cite CAS as the source.",
    terms_url: "https://www.cas.gov.lb/",
    topics: ["prices", "inflation"],
    update_schedule: "Daily check; CAS publishes monthly",
    schedule_minutes: 24 * 60,
    coverage_notes: "Monthly CPI (Dec 2013 = 100) for Lebanon and six regions by expenditure division. The page links only the latest workbook, so history accumulates from the first run (each workbook has two months plus year-on-year change). Nabatieh indexes are sometimes based on imputed prices.",
    language: "ar",
    config: {},
    enabled: true,
  },
  {
    key: "bdl-official-rate",
    connector: "frankfurter_v2",
    name: "BDL official USD/LBP rate (via Frankfurter v2)",
    name_ar: "سعر الصرف الرسمي لمصرف لبنان (عبر Frankfurter)",
    domain: "api.frankfurter.dev",
    endpoint_url: "https://api.frankfurter.dev/v2/rates?base=USD&quotes=LBP&providers=BDL",
    homepage_url: "https://www.bdl.gov.lb/currentrate.php",
    source_type: "api",
    provenance: "official",
    auth_required: "none",
    terms_of_use: "Frankfurter is free with no quotas (abuse rate-limiting only); the rate itself is published by Banque du Liban under its terms.",
    terms_url: "https://www.bdl.gov.lb/disclaimer.php",
    topics: ["fx"],
    update_schedule: "Every 12 hours",
    schedule_minutes: 12 * 60,
    coverage_notes: "Banque du Liban's published official rate, retrieved through an open aggregator because BDL's site blocks automated access. Provider history starts January 2024. This is NOT the parallel-market rate.",
    language: "en",
    config: { base: "USD", quotes: ["LBP"], provider: "BDL" },
    enabled: true,
  },
  {
    key: "wfp-food-prices",
    connector: "wfp_prices",
    name: "WFP food prices — Lebanon (HDX)",
    name_ar: "أسعار الغذاء — برنامج الأغذية العالمي (HDX)",
    domain: "data.humdata.org",
    endpoint_url: "https://data.humdata.org/dataset/db0b4fb1-ce11-458e-94e0-3342365a117a/resource/772bc34e-1327-4ada-b2eb-e72020a546f2/download/wfp_food_prices_lbn.csv",
    homepage_url: "https://data.humdata.org/dataset/wfp-food-prices-for-lebanon",
    source_type: "dataset",
    provenance: "third_party",
    auth_required: "none",
    terms_of_use: "Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO). Attribute WFP / HDX.",
    terms_url: "https://data.humdata.org/faqs/licenses",
    topics: ["prices", "food", "fx"],
    update_schedule: "Weekly check; WFP updates roughly monthly",
    schedule_minutes: 7 * 24 * 60,
    coverage_notes: "Retail prices for monitored markets with coordinates supplied by WFP, 2012 onward. Includes WFP's observed unofficial (parallel) LBP/USD rate. Market sample is not a full consumer basket and coverage varies by month.",
    language: "en",
    config: {},
    enabled: true,
  },
];


type FeedDef = { key: string; name: string; name_ar: string; url: string; domain: string; homepage: string; language: "ar" | "en" | "fr"; topics: string[]; enabled: boolean; notes?: string };

const FEEDS: FeedDef[] = [
  { key: "rss-annahar", name: "Annahar", name_ar: "النهار", url: "https://www.annahar.com/rss", domain: "annahar.com", homepage: "https://www.annahar.com", language: "ar", topics: ["news"], enabled: true, notes: "General news (includes sports and regional items)." },
  { key: "rss-lbci-lebanon-ar", name: "LBCI — Lebanon news", name_ar: "LBCI — أخبار لبنان", url: "https://www.lbcgroup.tv/Rss/News/ar/1/" + encodeURIComponent("أخبار-لبنان"), domain: "lbcgroup.tv", homepage: "https://www.lbcgroup.tv", language: "ar", topics: ["news", "politics"], enabled: true },
  { key: "rss-lbci-economy-ar", name: "LBCI — Economy", name_ar: "LBCI — اقتصاد", url: "https://www.lbcgroup.tv/Rss/News/ar/25/" + encodeURIComponent("اقتصاد"), domain: "lbcgroup.tv", homepage: "https://www.lbcgroup.tv", language: "ar", topics: ["economy"], enabled: true },
  { key: "rss-lbci-latest-en", name: "LBCI — Latest (English)", name_ar: "LBCI — آخر الأخبار (إنكليزي)", url: "https://www.lbcgroup.tv/Rss/latest-news/en", domain: "lbcgroup.tv", homepage: "https://www.lbcgroup.tv", language: "en", topics: ["news"], enabled: true },
  { key: "rss-aljadeed-economy-ar", name: "Al Jadeed — Economy", name_ar: "الجديد — اقتصاد", url: "https://www.aljadeed.tv/Rss/News/1055/" + encodeURIComponent("إقتصاد") + "/ar", domain: "aljadeed.tv", homepage: "https://www.aljadeed.tv", language: "ar", topics: ["economy"], enabled: true },
  { key: "rss-aljadeed-latest-ar", name: "Al Jadeed — Latest", name_ar: "الجديد — آخر الأخبار", url: "https://www.aljadeed.tv/Rss/latest-news/ar", domain: "aljadeed.tv", homepage: "https://www.aljadeed.tv", language: "ar", topics: ["news"], enabled: false, notes: "Includes regional news." },
  { key: "rss-naharnet-lebanon", name: "Naharnet — Lebanon", name_ar: "نهارنت — لبنان", url: "https://www.naharnet.com/tags/lebanon/en/feed.atom", domain: "naharnet.com", homepage: "https://www.naharnet.com", language: "en", topics: ["news", "politics"], enabled: true },
  { key: "rss-naharnet-business", name: "Naharnet — Business", name_ar: "نهارنت — أعمال", url: "https://www.naharnet.com/tags/business/en/feed.atom", domain: "naharnet.com", homepage: "https://www.naharnet.com", language: "en", topics: ["economy", "business"], enabled: true },
  { key: "rss-the961", name: "The961", name_ar: "The961", url: "https://www.the961.com/feed/", domain: "the961.com", homepage: "https://www.the961.com", language: "en", topics: ["news"], enabled: true },
  { key: "rss-executive", name: "Executive Magazine", name_ar: "مجلة Executive", url: "https://www.executive-magazine.com/feed", domain: "executive-magazine.com", homepage: "https://www.executive-magazine.com", language: "en", topics: ["economy", "business"], enabled: true },
  { key: "rss-blominvest", name: "BlomInvest Bank research blog", name_ar: "مدونة أبحاث بلوم إنفست", url: "https://blog.blominvestbank.com/feed/", domain: "blog.blominvestbank.com", homepage: "https://blog.blominvestbank.com", language: "en", topics: ["economy", "markets"], enabled: true },
  { key: "rss-beirut-today", name: "Beirut Today", name_ar: "Beirut Today", url: "https://beirut-today.com/feed/", domain: "beirut-today.com", homepage: "https://beirut-today.com", language: "en", topics: ["news"], enabled: true },
  { key: "rss-libnanews-economie", name: "Libnanews — Économie", name_ar: "ليبنانيوز — اقتصاد", url: "https://libnanews.com/category/economie/feed/", domain: "libnanews.com", homepage: "https://libnanews.com", language: "fr", topics: ["economy"], enabled: true },
  { key: "rss-aawsat-ar", name: "Asharq Al-Awsat", name_ar: "الشرق الأوسط", url: "https://aawsat.com/feed", domain: "aawsat.com", homepage: "https://aawsat.com", language: "ar", topics: ["regional"], enabled: false, notes: "Pan-Arab outlet; high volume, mostly non-Lebanon." },
  { key: "rss-arabnews", name: "Arab News", name_ar: "عرب نيوز", url: "https://www.arabnews.com/rss.xml", domain: "arabnews.com", homepage: "https://www.arabnews.com", language: "en", topics: ["regional"], enabled: false, notes: "Regional outlet; no Lebanon-only feed found." },
];

export const RSS_SOURCES: SourceDefinition[] = FEEDS.map((f) => ({
  key: f.key,
  connector: "rss",
  name: f.name,
  name_ar: f.name_ar,
  domain: f.domain,
  endpoint_url: f.url,
  homepage_url: f.homepage,
  source_type: "rss",
  provenance: "third_party",
  auth_required: "none",
  terms_of_use: "Publisher's public feed. Only titles, links, dates and short excerpts are stored; article content remains the publisher's copyright.",
  terms_url: null,
  topics: f.topics,
  update_schedule: "Every hour",
  schedule_minutes: 60,
  coverage_notes: f.notes ?? "Feed contains only the most recent items; history accumulates from the first run.",
  language: f.language,
  config: { country: "Lebanon" },
  enabled: f.enabled,
}));

/**
 * Inserts system sources that do not exist yet and refreshes their descriptive metadata.
 * User-controlled fields (enabled, config overrides, schedule) are never overwritten.
 */
export async function syncSystemSources(db: Queryable, defs: SourceDefinition[] = [...SYSTEM_SOURCES, ...RSS_SOURCES]) {
  for (const s of defs) {
    await db.query(
      `INSERT INTO sources (key, connector, name, name_ar, domain, endpoint_url, homepage_url, source_type, provenance, auth_required,
          terms_of_use, terms_url, topics, update_schedule, schedule_minutes, coverage_notes, language, config, enabled, is_system, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true,
          CASE WHEN $2 = 'unavailable' THEN 'blocked' WHEN $10 = 'api_key' THEN 'needs_credentials' WHEN $2 = 'manual' THEN 'ok' ELSE 'never_run' END)
       ON CONFLICT (key) DO UPDATE SET
          connector = EXCLUDED.connector, name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, domain = EXCLUDED.domain,
          homepage_url = EXCLUDED.homepage_url, source_type = EXCLUDED.source_type, provenance = EXCLUDED.provenance,
          auth_required = EXCLUDED.auth_required, terms_of_use = EXCLUDED.terms_of_use, terms_url = EXCLUDED.terms_url,
          topics = EXCLUDED.topics, coverage_notes = EXCLUDED.coverage_notes, is_system = true,
          endpoint_url = COALESCE(sources.endpoint_url, EXCLUDED.endpoint_url),
          -- Built-in connector parameters are refreshed unless the user has edited them in the UI.
          config = CASE WHEN COALESCE(sources.config->>'_user_modified', 'false') = 'true' THEN sources.config ELSE EXCLUDED.config END,
          status = CASE WHEN sources.connector <> EXCLUDED.connector THEN EXCLUDED.status ELSE sources.status END`,
      [
        s.key, s.connector, s.name, s.name_ar, s.domain, s.endpoint_url, s.homepage_url, s.source_type, s.provenance, s.auth_required,
        s.terms_of_use, s.terms_url, s.topics, s.update_schedule, s.schedule_minutes, s.coverage_notes, s.language, JSON.stringify(s.config), s.enabled,
      ],
    );
  }
}
