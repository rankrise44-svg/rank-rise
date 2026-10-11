import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "./audit";
import { clientIp, errorResponse, requireAdmin } from "./auth/guard";
import { rateLimit } from "./ratelimit";

/**
 * Wraps an admin route: authentication + same-origin check, rate limit, uniform error handling,
 * and an audit-log entry for every successful state change.
 */
export function adminRoute<P>(
  action: string,
  handler: (req: NextRequest, params: P) => Promise<{ body: unknown; status?: number; audit?: { target?: { type?: string; id?: string }; details?: Record<string, unknown> } | false }>,
  limit: { capacity: number; perMinute: number } = { capacity: 30, perMinute: 30 },
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      const session = await requireAdmin(req);
      const ip = clientIp(req);
      await rateLimit(`admin:${action}:${ip}`, limit.capacity, limit.perMinute / 60);
      const params = await ctx.params;
      const out = await handler(req, params);
      if (out.audit !== false && req.method !== "GET") await audit(session.sub, action, out.audit?.target ?? {}, out.audit?.details ?? {}, ip);
      return NextResponse.json(out.body, { status: out.status ?? 200 });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
