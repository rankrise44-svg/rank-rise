import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, requireAdmin } from "@/lib/auth/guard";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Markdown download of a stored report. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const id = z.string().uuid().parse((await ctx.params).id);
    const r = await queryOne<{ title: string; content_md: string; created_at: Date }>("SELECT title, content_md, created_at FROM reports WHERE id = $1", [id]);
    if (!r) throw new HttpError(404, "Not found", "not_found");
    return new NextResponse(r.content_md, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="report-${r.created_at.toISOString().slice(0, 10)}-${id.slice(0, 8)}.md"` },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
