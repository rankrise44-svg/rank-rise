import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { deleteOpportunity, opportunityInput, updateOpportunity } from "@/lib/opportunities/service";

export const dynamic = "force-dynamic";
const id = z.string().uuid();

export const PATCH = adminRoute<{ id: string }>("opportunities.update", async (req, p) => {
  const oid = id.parse(p.id);
  const ok = await updateOpportunity(oid, opportunityInput.partial().parse(await req.json()));
  if (!ok) throw new HttpError(404, "Not found", "not_found");
  return { body: { ok: true }, audit: { target: { type: "opportunity", id: oid } } };
});

export const DELETE = adminRoute<{ id: string }>("opportunities.delete", async (_req, p) => {
  const oid = id.parse(p.id);
  await deleteOpportunity(oid);
  return { body: { ok: true }, audit: { target: { type: "opportunity", id: oid } } };
});
