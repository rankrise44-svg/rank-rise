import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, requireAdmin } from "@/lib/auth/guard";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Neutralize spreadsheet formula injection from third-party text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * CSV export of permitted data: official/open datasets and *metadata only* for news (title, link, outlet,
 * date) — never full article text. Every row carries its source and URL.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const p = z.object({ dataset: z.enum(["indicators", "market", "prices", "news"]), code: z.string().max(60).optional(), instrument: z.string().max(20).optional() }).parse(Object.fromEntries(req.nextUrl.searchParams));
    let rows: Record<string, unknown>[] = [];
    if (p.dataset === "indicators")
      rows = await query(
        `SELECT i.code, i.country_code, COALESCE(i.name_ar, i.name_en) AS name, o.period_label, o.value, o.unit, o.is_projection, o.quality_status, s.name AS source, o.source_url, o.collected_at
           FROM indicator_observations o JOIN economic_indicators i ON i.id = o.indicator_id JOIN sources s ON s.id = o.source_id
          WHERE o.is_current AND NOT o.is_synthetic AND ($1::text IS NULL OR i.code = $1) ORDER BY i.code, i.country_code, o.period_date LIMIT 200000`,
        [p.code ?? null],
      );
    else if (p.dataset === "market")
      rows = await query(
        `SELECT m.instrument, m.rate_type, m.provider, m.observed_at, m.value, m.unit, m.granularity, m.source_url, m.collected_at
           FROM market_observations m WHERE NOT m.is_synthetic AND ($1::text IS NULL OR m.instrument = $1) ORDER BY m.instrument, m.rate_type, m.observed_at LIMIT 200000`,
        [p.instrument ?? null],
      );
    else if (p.dataset === "prices")
      rows = await query(
        `SELECT observed_date, admin1, market, latitude, longitude, commodity, unit, price_type, currency, price, usd_price, price_flag, 'WFP/HDX CC BY-IGO' AS source
           FROM price_observations WHERE NOT is_synthetic ORDER BY observed_date, market, commodity LIMIT 200000`,
      );
    else
      rows = await query(
        `SELECT n.title, n.url, n.source_name, n.language, COALESCE(n.published_at, n.collected_at) AS date, n.collected_at,
                array_to_string(n.topics, '|') AS inferred_topics, array_to_string(n.sectors, '|') AS inferred_sectors, n.lebanon_relevance AS inferred_relevance
           FROM news_articles n WHERE NOT n.is_synthetic AND n.duplicate_of IS NULL ORDER BY date DESC LIMIT 50000`,
      );
    const cols = rows[0] ? Object.keys(rows[0]) : ["no_data"];
    const body = "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
    return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lmt-${p.dataset}-${new Date().toISOString().slice(0, 10)}.csv"` } });
  } catch (e) {
    return errorResponse(e);
  }
}
