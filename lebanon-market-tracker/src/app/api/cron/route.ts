import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { schedulerTick } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Scheduler entry point for hosts with cron (e.g. Vercel Cron). Requires `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = getEnv().CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = secret && got.length === secret.length && timingSafeEqual(Buffer.from(got), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out = await schedulerTick(getPool(), { budgetMs: 240_000 });
  return NextResponse.json(out);
}
