import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { query } from "@/lib/db";
import { getSourceByKey, recentRuns } from "@/lib/repo/sources";

export const dynamic = "force-dynamic";

export const GET = adminRoute<{ key: string }>("sources.get", async (_req, { key }) => {
  const s = await getSourceByKey(key);
  if (!s) throw new HttpError(404, "Unknown source", "not_found");
  return { body: { source: s, runs: await recentRuns(s.id, 15) }, audit: false };
});

const patch = z.object({
  enabled: z.boolean().optional(),
  schedule_minutes: z.number().int().min(15).max(60 * 24 * 31).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const PATCH = adminRoute<{ key: string }>("sources.update", async (req, { key }) => {
  const b = patch.parse(await req.json());
  const s = await getSourceByKey(key);
  if (!s) throw new HttpError(404, "Unknown source", "not_found");
  if (b.config && JSON.stringify(b.config).length > 20_000) throw new HttpError(400, "Config too large", "invalid_input");
  await query(
    `UPDATE sources SET enabled = COALESCE($2, enabled), schedule_minutes = CASE WHEN $3::boolean THEN $4 ELSE schedule_minutes END,
        config = CASE WHEN $5::jsonb IS NULL THEN config ELSE $5::jsonb || '{"_user_modified":"true"}'::jsonb END,
        status = CASE WHEN $2 = false THEN 'disabled' WHEN $2 = true AND status = 'disabled' THEN 'never_run' ELSE status END
      WHERE id = $1`,
    [s.id, b.enabled ?? null, b.schedule_minutes !== undefined, b.schedule_minutes ?? null, b.config ? JSON.stringify(b.config) : null],
  );
  return { body: { ok: true }, audit: { target: { type: "source", id: s.id }, details: { key, ...b } } };
});

export const DELETE = adminRoute<{ key: string }>("sources.delete", async (_req, { key }) => {
  const s = await getSourceByKey(key);
  if (!s) throw new HttpError(404, "Unknown source", "not_found");
  if (s.is_system) throw new HttpError(400, "Built-in sources can be disabled but not deleted", "forbidden");
  await query("DELETE FROM sources WHERE id = $1", [s.id]);
  return { body: { ok: true }, audit: { target: { type: "source", id: s.id }, details: { key } } };
});
