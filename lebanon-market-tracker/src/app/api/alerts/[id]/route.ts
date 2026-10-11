import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const PATCH = adminRoute<{ id: string }>("alerts.update", async (req, p) => {
  const id = z.string().uuid().parse(p.id);
  const { enabled } = z.object({ enabled: z.boolean() }).parse(await req.json());
  await query("UPDATE alert_rules SET enabled = $2 WHERE id = $1", [id, enabled]);
  return { body: { ok: true }, audit: { target: { type: "alert_rule", id }, details: { enabled } } };
});
export const DELETE = adminRoute<{ id: string }>("alerts.delete", async (_req, p) => {
  const id = z.string().uuid().parse(p.id);
  await query("DELETE FROM alert_rules WHERE id = $1", [id]);
  return { body: { ok: true }, audit: { target: { type: "alert_rule", id } } };
});
