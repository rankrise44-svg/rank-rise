import { adminRoute } from "@/lib/api";
import { createOpportunity, opportunityInput } from "@/lib/opportunities/service";

export const dynamic = "force-dynamic";
export const POST = adminRoute("opportunities.create", async (req) => {
  const id = await createOpportunity(opportunityInput.parse(await req.json()), "user");
  return { body: { id }, status: 201, audit: { target: { type: "opportunity", id } } };
});
