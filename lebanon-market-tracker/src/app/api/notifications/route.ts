import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const POST = adminRoute("notifications.read", async (req) => {
  const b = z.object({ ids: z.array(z.string().uuid()).max(200).optional(), all: z.boolean().optional() }).parse(await req.json());
  if (b.all) await query("UPDATE notifications SET read_at = now() WHERE read_at IS NULL");
  else if (b.ids?.length) await query("UPDATE notifications SET read_at = now() WHERE id = ANY($1)", [b.ids]);
  return { body: { ok: true }, audit: false };
});
