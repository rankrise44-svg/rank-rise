import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { generateReport } from "@/lib/reports/generate";

export const dynamic = "force-dynamic";
export const POST = adminRoute("reports.generate", async (req) => {
  const b = z.object({ type: z.enum(["daily", "weekly", "sector"]), sector: z.string().max(40).optional() }).parse(await req.json());
  const r = await generateReport({ type: b.type, sector: b.sector });
  return { body: { id: r.id, title: r.title }, status: 201, audit: { target: { type: "report", id: r.id } } };
}, { capacity: 5, perMinute: 5 });
