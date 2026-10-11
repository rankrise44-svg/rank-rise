import { describe, expect, it } from "vitest";
import { backoffDelay, httpGet, HttpFetchError } from "@/lib/ingestion/http";

const resp = (status: number, body = "ok", headers: Record<string, string> = {}) => new Response(body, { status, headers });
const noSleep = async () => {};

describe("HTTP client retries and errors", () => {
  it("retries transient 5xx/429 and then succeeds", async () => {
    let calls = 0;
    const f = (async () => (++calls < 3 ? resp(calls === 1 ? 503 : 429) : resp(200, "done"))) as typeof fetch;
    const r = await httpGet("https://api.example.com/x", { fetchImpl: f, sleep: noSleep, retries: 3 });
    expect(r.text).toBe("done");
    expect(calls).toBe(3);
  });
  it("does not retry permanent 4xx errors and reports status accurately", async () => {
    let calls = 0;
    const f = (async () => {
      calls++;
      return resp(403, "Just a moment...");
    }) as typeof fetch;
    await expect(httpGet("https://bdl.example/x", { fetchImpl: f, sleep: noSleep })).rejects.toMatchObject({ status: 403 });
    expect(calls).toBe(1);
  });
  it("gives up after the retry budget with the last error", async () => {
    const f = (async () => resp(500)) as typeof fetch;
    const p = httpGet("https://api.example.com/x", { fetchImpl: f, sleep: noSleep, retries: 2 });
    await expect(p).rejects.toBeInstanceOf(HttpFetchError);
  });
  it("times out hung requests", async () => {
    const f = ((_u: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as typeof fetch;
    await expect(httpGet("https://slow.example/x", { fetchImpl: f, sleep: noSleep, retries: 0, timeoutMs: 50 })).rejects.toThrow(/Timed out/);
  });
  it("honours Retry-After and caps exponential backoff", () => {
    expect(backoffDelay(0, 1000, "7")).toBe(7000);
    expect(backoffDelay(10, 1000)).toBeLessThanOrEqual(60_000);
  });
});
