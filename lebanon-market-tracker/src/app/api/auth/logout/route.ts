import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, errorResponse } from "@/lib/auth/guard";
import { SESSION_COOKIE } from "@/lib/auth/token";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
