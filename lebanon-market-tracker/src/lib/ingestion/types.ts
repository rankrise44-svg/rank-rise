import type { FetchOptions, HttpResponse } from "./http";

export type SourceRow = {
  id: string;
  key: string;
  connector: string;
  name: string;
  name_ar: string | null;
  domain: string | null;
  endpoint_url: string | null;
  homepage_url: string | null;
  source_type: string;
  provenance: "official" | "third_party" | "inferred" | "user";
  auth_required: string;
  terms_of_use: string | null;
  terms_url: string | null;
  topics: string[];
  update_schedule: string | null;
  schedule_minutes: number | null;
  coverage_notes: string | null;
  language: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
  status: string;
  last_attempt_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
  last_error_at: Date | null;
  is_system: boolean;
};

export type LogEntry = { t: string; level: "debug" | "info" | "warn" | "error"; msg: string; data?: Record<string, unknown> };

export type Logger = {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  entries: LogEntry[];
};

export type ConnectorContext = {
  source: SourceRow;
  credential: string | null;
  log: Logger;
  http: {
    get(url: string, opts?: FetchOptions): Promise<HttpResponse>;
    getJson<T = unknown>(url: string, opts?: FetchOptions): Promise<{ data: T; res: HttpResponse }>;
  };
  /** Most recent successful fetch, for incremental updates. */
  since: Date | null;
  mode: "full" | "test";
  now: Date;
};

export type RawPayload = { url: string; contentType: string | null; body: string };

export type NewsRecord = {
  kind: "news";
  externalId?: string | null;
  url: string;
  title: string;
  summary?: string | null;
  language?: string | null;
  sourceName?: string | null;
  sourceDomain?: string | null;
  sourceCountry?: string | null;
  imageUrl?: string | null;
  publishedAt: Date | null;
  provenance: Record<string, unknown>;
};

export type IndicatorMeta = {
  code: string;
  countryCode: string;
  nameEn: string;
  nameAr?: string | null;
  description?: string | null;
  unit?: string | null;
  unitAr?: string | null;
  frequency: "annual" | "quarterly" | "monthly" | "weekly" | "daily" | "irregular";
  category?: string | null;
  sectorKey?: string | null;
  higherIs?: "better" | "worse" | "neutral" | null;
  methodologyUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type IndicatorRecord = {
  kind: "indicator";
  indicator: IndicatorMeta;
  periodDate: string; // YYYY-MM-DD
  periodLabel: string;
  value: number | null;
  unit?: string | null;
  currency?: string | null;
  isProjection: boolean;
  observedAt: Date;
  publishedAt?: Date | null;
  sourceUrl: string;
  qualityStatus?: "ok" | "provisional" | "flagged";
  provenance: Record<string, unknown>;
};

export type MarketRecord = {
  kind: "market";
  instrument: string;
  instrumentType: "fx" | "metal" | "commodity" | "equity" | "index" | "rate" | "crypto";
  rateType: "official" | "reference" | "market" | "third_party_quote" | "parallel" | "user_entered";
  provider: string;
  exchange?: string | null;
  currency?: string | null;
  unit?: string | null;
  observedAt: Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  value: number;
  delayMinutes?: number | null;
  granularity: "tick" | "intraday" | "daily" | "weekly" | "monthly";
  sourceUrl?: string | null;
  provenance: Record<string, unknown>;
};

export type PriceRecord = {
  kind: "price";
  observedDate: string; // YYYY-MM-DD
  admin1: string | null;
  admin2: string | null;
  areaKey: string | null;
  market: string;
  marketId: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  commodity: string;
  commodityId: string;
  unit: string;
  priceFlag: string | null;
  priceType: string | null;
  currency: string;
  price: number;
  usdPrice: number | null;
  provenance: Record<string, unknown>;
};

export type NormalizedRecord = NewsRecord | IndicatorRecord | MarketRecord | PriceRecord;

export type ValidationIssue = { index: number; reason: string; sample?: string };

export type FetchResult<Raw> = { raw: Raw; payloads: RawPayload[]; partialErrors?: string[] };

/**
 * Common connector contract. The runner drives: fetch → validate → normalize → dedupe → store → report.
 * Connectors never write to the database directly; storage, deduplication and status reporting are shared.
 */
export interface Connector<Raw = unknown, Item = unknown> {
  id: string;
  /** Human description of what the connector needs. */
  requiresCredential: boolean;
  fetch(ctx: ConnectorContext): Promise<FetchResult<Raw>>;
  validate(raw: Raw, ctx: ConnectorContext): { items: Item[]; issues: ValidationIssue[] };
  normalize(items: Item[], ctx: ConnectorContext): NormalizedRecord[];
}

export class ConnectorConfigError extends Error {
  constructor(message: string, public status: "needs_credentials" | "blocked" | "error" = "error") {
    super(message);
    this.name = "ConnectorConfigError";
  }
}
