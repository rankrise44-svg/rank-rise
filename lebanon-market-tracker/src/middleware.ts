import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth/token";

/**
 * Authentication gate. All pages and APIs require the owner session when REQUIRE_LOGIN is on
 * (the default). Public exceptions: the login page/API, health check, and the cron endpoint
 * (which authenticates with CRON_SECRET itself). Admin APIs re-check the session in the handler.
 */
const PUBLIC = [/^\/login$/, /^\/api\/auth\/login$/, /^\/api\/health$/, /^\/api\/cron(\/.*)?$/, /^\/_next\//, /^\/geo\//, /^\/favicon/, /^\/icon/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const requireLogin = !["false", "0"].includes((process.env.REQUIRE_LOGIN ?? "true").toLowerCase());
  const secret = process.env.SESSION_SECRET;
  if (!requireLogin) return NextResponse.next();
  if (!secret || !process.env.ADMIN_PASSWORD) {
    // Auth is required but not configured: fail closed with an explanatory page/response.
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "auth_not_configured", message: "Set SESSION_SECRET and ADMIN_PASSWORD" }, { status: 503 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?setup=1";
    return NextResponse.redirect(url);
  }
  const session = await verifySession(secret, req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized", message: "Authentication required" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
