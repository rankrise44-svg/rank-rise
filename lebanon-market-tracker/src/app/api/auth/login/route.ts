import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertSameOrigin, clientIp, errorResponse, HttpError, passwordMatches } from "@/lib/auth/guard";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/auth/token";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";

const body = z.object({ password: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const ip = clientIp(req);
    await rateLimit(`login:${ip}`, 5, 1 / 60); // 5 attempts, then 1 per minute
    const env = getEnv();
    if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) throw new HttpError(503, "Authentication is not configured", "auth_not_configured");
    const { password } = body.parse(await req.json());
    if (!passwordMatches(password, env.ADMIN_PASSWORD)) {
      await audit("anonymous", "auth.login_failed", {}, {}, ip);
      throw new HttpError(401, "كلمة المرور غير صحيحة", "invalid_credentials");
    }
    const token = await signSession(env.SESSION_SECRET);
    await audit("owner", "auth.login", {}, {}, ip);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
