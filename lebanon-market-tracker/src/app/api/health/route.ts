import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public liveness/readiness probe. Reveals no configuration details beyond up/down. */
export async function GET() {
  const db = await dbHealth();
  return NextResponse.json({ ok: db.ok, db: db.ok ? "ok" : db.reason }, { status: db.ok ? 200 : 503 });
}
