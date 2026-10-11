import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { RULE_TYPES, ruleParams } from "@/lib/alerts/evaluate";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const POST = adminRoute("alerts.create", async (req) => {
  const b = z.object({ name: z.string().trim().min(2).max(120), rule_type: z.enum(RULE_TYPES), params: z.record(z.string(), z.unknown()).default({}) }).parse(await req.json());
  const params = ruleParams[b.rule_type].parse(b.params);
  const r = await queryOne<{ id: string }>("INSERT INTO alert_rules (name, rule_type, params, last_evaluated_at) VALUES ($1,$2,$3, now()) RETURNING id", [b.name, b.rule_type, JSON.stringify(params)]);
  return { body: { id: r!.id }, status: 201, audit: { target: { type: "alert_rule", id: r!.id }, details: b } };
});
