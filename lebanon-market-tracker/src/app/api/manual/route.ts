import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";
import { csvToObjects } from "@/lib/ingestion/csv";
import { parsePeriod } from "@/lib/ingestion/normalize";
import { storeRecords } from "@/lib/ingestion/store";
import type { IndicatorRecord, MarketRecord } from "@/lib/ingestion/types";
import { afterStore } from "@/lib/intel/pipeline";
import { getSourceByKey } from "@/lib/repo/sources";

export const dynamic = "force-dynamic";

const market = z.object({
  kind: z.literal("market"),
  instrument: z.string().regex(/^[A-Z]{3}\/[A-Z]{3}$/),
  claimed_rate_type: z.enum(["official", "parallel", "market", "reference"]),
  value: z.number().positive(),
  observed_at: z.coerce.date(),
  source_name: z.string().trim().min(2).max(200),
  source_url: z.string().url(),
  note: z.string().max(500).optional(),
});
const csv = z.object({ kind: z.literal("indicator_csv"), csv: z.string().min(10).max(1_000_000), source_name: z.string().min(2).max(200), source_url: z.string().url() });

/**
 * Manual data entry with mandatory citation. Values are stored with rate_type 'user_entered' (market) or
 * under the manual source (indicators), so they are always distinguishable from automated collection.
 */
export const POST = adminRoute("manual.import", async (req) => {
  const body = z.discriminatedUnion("kind", [market, csv]).parse(await req.json());
  const src = await getSourceByKey("manual-entry");
  if (!src) throw new HttpError(500, "manual-entry source missing; run npm run ingest -- --sync", "setup");
  const pool = getPool();
  if (body.kind === "market") {
    if (body.observed_at.getTime() > Date.now() + 3600_000) throw new HttpError(400, "Observation date is in the future", "invalid_input");
    const rec: MarketRecord = {
      kind: "market", instrument: body.instrument, instrumentType: "fx", rateType: "user_entered", provider: body.source_name, currency: body.instrument.split("/")[1],
      unit: `${body.instrument.split("/")[1]} per 1 ${body.instrument.split("/")[0]}`, observedAt: body.observed_at, value: body.value, close: body.value, granularity: "daily",
      sourceUrl: body.source_url, provenance: { entered_by: "owner", claimed_rate_type: body.claimed_rate_type, source_name: body.source_name, note: body.note ?? null },
    };
    const stats = await storeRecords(pool, src.id, null, [rec]);
    await afterStore(pool, stats);
    return { body: { inserted: stats.inserted, updated: stats.updated }, audit: { details: { kind: "market", instrument: body.instrument } } };
  }
  const rows = csvToObjects(body.csv);
  const required = ["code", "name", "unit", "period", "value"];
  if (!rows.length || required.some((k) => !(k in rows[0]))) throw new HttpError(400, `CSV header must include: ${required.join(", ")} (optional: name_ar, country, category)`, "invalid_csv");
  const recs: IndicatorRecord[] = [];
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const p = parsePeriod(r.period ?? "");
    const v = Number(r.value);
    if (!p) return errors.push(`row ${i + 2}: unrecognized period "${r.period}" (use 2024, 2024-Q2 or 2024-05)`);
    if (r.value === "" || !Number.isFinite(v)) return errors.push(`row ${i + 2}: value is not a number`);
    if (!/^[A-Za-z0-9._-]{2,60}$/.test(r.code)) return errors.push(`row ${i + 2}: invalid code`);
    recs.push({
      kind: "indicator",
      indicator: { code: `MANUAL.${r.code}`, countryCode: (r.country || "LBN").toUpperCase().slice(0, 3), nameEn: r.name.slice(0, 200), nameAr: r.name_ar?.slice(0, 200) || null, unit: r.unit.slice(0, 60), frequency: p.frequency, category: r.category || null, metadata: { provider: body.source_name, manual: true } },
      periodDate: p.periodDate, periodLabel: r.period, value: v, unit: r.unit, isProjection: false, observedAt: p.observedAt, sourceUrl: body.source_url,
      provenance: { entered_by: "owner", source_name: body.source_name, import: "csv" },
    });
  });
  if (errors.length && !recs.length) throw new HttpError(400, errors.slice(0, 5).join("; "), "invalid_csv");
  const stats = await storeRecords(pool, src.id, null, recs);
  await afterStore(pool, stats);
  return { body: { inserted: stats.inserted, updated: stats.updated, skipped: stats.skipped, errors: errors.slice(0, 20) }, audit: { details: { kind: "indicator_csv", rows: rows.length } } };
}, { capacity: 10, perMinute: 10 });
