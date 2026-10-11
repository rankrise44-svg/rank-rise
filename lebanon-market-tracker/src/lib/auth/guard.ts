import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "../env";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./token";

export function passwordMatches(candidate: string, expected: string | undefined): boolean {
  if (!expected) return false;
  // Compare fixed-length digests so timing does not leak length or content.
  const a = createHash("sha256").update(candidate, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function currentSession(): Promise<SessionPayload | null> {
  const env = getEnv();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(env.SESSION_SECRET, token);
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "error") {
    super(message);
  }
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite cookies). */
export function assertSameOrigin(req: NextRequest | Request) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (CLI, curl) do not send Origin; they still need a session.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request rejected", "csrf");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(403, "Invalid Origin header", "csrf");
  }
}

/**
 * Authorization for administrative operations. There is a single owner account
 * (personal platform); every admin action requires a valid signed session.
 */
export async function requireAdmin(req: NextRequest | Request): Promise<SessionPayload> {
  assertSameOrigin(req);
  const env = getEnv();
  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) {
    throw new HttpError(503, "Authentication is not configured (set SESSION_SECRET and ADMIN_PASSWORD)", "auth_not_configured");
  }
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const session = await verifySession(env.SESSION_SECRET, token ? decodeURIComponent(token) : undefined);
  if (!session) throw new HttpError(401, "Authentication required", "unauthorized");
  return session;
}

export function clientIp(req: NextRequest | Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  const name = (e as Error)?.name;
  if (name === "ZodError") {
    return NextResponse.json({ error: "invalid_input", message: "Invalid input", issues: (e as { issues: unknown }).issues }, { status: 400 });
  }
  if (name === "DatabaseNotConfiguredError") {
    return NextResponse.json({ error: "db_not_configured", message: "Database is not configured" }, { status: 503 });
  }
  console.error(JSON.stringify({ level: "error", msg: "unhandled route error", error: (e as Error)?.message }));
  return NextResponse.json({ error: "internal", message: "Internal error" }, { status: 500 });
}
