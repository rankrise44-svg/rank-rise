import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";
import { realDeps } from "@/lib/ingestion/deps";
import { runConnector } from "@/lib/ingestion/runner";
import { evaluateAlerts } from "@/lib/alerts/evaluate";
import { getSourceByKey } from "@/lib/repo/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Manual synchronization ("full") or a dry-run connector test ("test", stores nothing). */
export const POST = adminRoute<{ key: string }>(
  "sources.run",
  async (req, { key }) => {
    const { mode } = z.object({ mode: z.enum(["full", "test"]).default("full") }).parse(await req.json().catch(() => ({})));
    const s = await getSourceByKey(key);
    if (!s) throw new HttpError(404, "Unknown source", "not_found");
    if (s.connector === "manual") throw new HttpError(400, "Manual sources have nothing to fetch", "invalid");
    const report = await runConnector(s, mode === "test" ? "test" : "manual", realDeps(getPool()));
    if (mode === "full" && report.status !== "failed") await evaluateAlerts().catch(() => {});
    const { stats, ...rest } = report;
    void stats;
    return { body: rest, audit: { target: { type: "source", id: s.id }, details: { key, mode, status: report.status } } };
  },
  { capacity: 6, perMinute: 6 },
);
