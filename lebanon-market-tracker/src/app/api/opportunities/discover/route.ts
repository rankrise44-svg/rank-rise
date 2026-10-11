import { adminRoute } from "@/lib/api";
import { discoverCandidates } from "@/lib/opportunities/service";

export const dynamic = "force-dynamic";
export const POST = adminRoute("opportunities.discover", async () => {
  const ids = await discoverCandidates();
  return { body: { created: ids.length, ids }, audit: { details: { created: ids.length } } };
}, { capacity: 3, perMinute: 3 });
