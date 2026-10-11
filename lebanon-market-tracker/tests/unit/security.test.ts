import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/auth/token";
import { assertSameOrigin, passwordMatches, requireAdmin, HttpError } from "@/lib/auth/guard";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secrets-core";
import { SESSION_COOKIE } from "@/lib/auth/token";

const SECRET = "x".repeat(40);

describe("session tokens", () => {
  it("verifies a valid token and rejects tampering, wrong secret and expiry", async () => {
    const t = await signSession(SECRET);
    expect((await verifySession(SECRET, t))?.role).toBe("admin");
    const [v, body, sig] = t.split(".");
    expect(await verifySession(SECRET, `${v}.${body}x.${sig}`)).toBeNull();
    expect(await verifySession("y".repeat(40), t)).toBeNull();
    const old = await signSession(SECRET, "owner", Date.now() - 8 * 86400_000);
    expect(await verifySession(SECRET, old)).toBeNull();
    expect(await verifySession(SECRET, undefined)).toBeNull();
  });
});

describe("access control", () => {
  it("compares passwords without leaking length", () => {
    expect(passwordMatches("abc", "abc")).toBe(true);
    expect(passwordMatches("abcd", "abc")).toBe(false);
    expect(passwordMatches("abc", undefined)).toBe(false);
  });
  it("rejects admin calls without a valid session cookie", async () => {
    await expect(requireAdmin(new Request("http://localhost/api/sources/x/run", { method: "POST" }))).rejects.toMatchObject({ status: 401 });
    const forged = new Request("http://localhost/api/x", { method: "POST", headers: { cookie: `${SESSION_COOKIE}=v1.e30.AAAA` } });
    await expect(requireAdmin(forged)).rejects.toMatchObject({ status: 401 });
  });
  it("accepts a valid session and rejects cross-origin state changes", async () => {
    const token = await signSession(process.env.SESSION_SECRET!);
    const ok = new Request("http://localhost/api/x", { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${token}`, host: "localhost", origin: "http://localhost" } });
    await expect(requireAdmin(ok)).resolves.toMatchObject({ sub: "owner" });
    const csrf = new Request("http://localhost/api/x", { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${token}`, host: "localhost", origin: "https://evil.example" } });
    expect(() => assertSameOrigin(csrf)).toThrow(HttpError);
  });
});

describe("secret encryption", () => {
  const key = Buffer.alloc(32, 9);
  it("round-trips and detects tampering", () => {
    const box = encryptSecret("sk-live-123456", key);
    expect(box.ciphertext).not.toContain("sk-live");
    expect(decryptSecret(box, key)).toBe("sk-live-123456");
    expect(() => decryptSecret({ ...box, authTag: Buffer.alloc(16).toString("base64") }, key)).toThrow();
    expect(() => decryptSecret(box, Buffer.alloc(32, 1))).toThrow();
  });
  it("only ever displays the last four characters", () => {
    expect(maskSecret("abcdefgh1234")).toBe("••••1234");
  });
});
