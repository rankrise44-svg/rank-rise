import "server-only";
import { query } from "./db";

export async function audit(actor: string, action: string, target: { type?: string; id?: string } = {}, details: Record<string, unknown> = {}, ip?: string) {
  try {
    await query(
      "INSERT INTO audit_log (actor, action, target_type, target_id, details, ip) VALUES ($1,$2,$3,$4,$5,$6)",
      [actor, action, target.type ?? null, target.id ?? null, JSON.stringify(details), ip ?? null],
    );
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "audit write failed", action, error: (e as Error).message }));
  }
}
