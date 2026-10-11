import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { addEvidence, evidenceInput } from "@/lib/opportunities/service";

export const dynamic = "force-dynamic";
export const POST = adminRoute<{ id: string }>("opportunities.add_evidence", async (req, p) => {
  const oid = z.string().uuid().parse(p.id);
  await addEvidence(oid, evidenceInput.parse(await req.json()));
  return { body: { ok: true }, status: 201, audit: { target: { type: "opportunity", id: oid } } };
});
