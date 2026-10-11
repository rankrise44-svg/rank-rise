import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, requireAdmin } from "@/lib/auth/guard";
import { getIndicator, getSeries } from "@/lib/repo/indicators";

export const dynamic = "force-dynamic";

/** Series for the client-side indicator explorer (date-range filtering happens here, server-side). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const id = z.string().uuid().parse((await ctx.params).id);
    const q = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(Object.fromEntries(req.nextUrl.searchParams));
    const ind = await getIndicator(id);
    if (!ind) throw new HttpError(404, "Not found", "not_found");
    const obs = await getSeries(id, { from: q.from, to: q.to });
    return NextResponse.json({
      indicator: { id: ind.id, code: ind.code, country: ind.country_code, name: ind.name_ar ?? ind.name_en, unit: ind.unit_ar ?? ind.unit, source: ind.source_name, provenance: ind.provenance, url: ind.methodology_url },
      observations: obs.map((o) => ({ period: o.period_label, value: o.value === null ? null : Number(o.value), projection: o.is_projection, quality: o.quality_status })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
