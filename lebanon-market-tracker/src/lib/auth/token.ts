/**
 * Signed session tokens (HMAC-SHA256 via Web Crypto) — usable from both the Edge
 * middleware and Node route handlers. Format: v1.<base64url(payload)>.<base64url(sig)>
 */
export type SessionPayload = { sub: string; role: "admin"; iat: number; exp: number };

export const SESSION_COOKIE = "lmt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(secret: string, sub = "owner", now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = { sub, role: "admin", iat, exp: iat + SESSION_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`v1.${body}`)));
  return `v1.${body}.${b64url(sig)}`;
}

export async function verifySession(secret: string | undefined, token: string | undefined, now = Date.now()): Promise<SessionPayload | null> {
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64url(parts[2]) as BufferSource,
      enc.encode(`v1.${parts[1]}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}
