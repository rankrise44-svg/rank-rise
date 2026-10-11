/**
 * Outbound HTTP for connectors: timeouts, bounded retries with exponential backoff + jitter,
 * Retry-After support, and a per-host minimum interval so we never poll a source uncontrolled.
 */
export const USER_AGENT = "LebanonMarketTracker/0.1 (personal research platform; +https://github.com/)";

export class HttpFetchError extends Error {
  constructor(message: string, public status: number | null, public url: string, public bodySnippet?: string) {
    super(message);
    this.name = "HttpFetchError";
  }
}

export type HttpResponse = { status: number; url: string; text: string; bytes: Uint8Array; contentType: string | null; headers: Headers };

export type FetchOptions = {
  timeoutMs?: number;
  retries?: number;
  backoffBaseMs?: number;
  minIntervalMs?: number; // per-host spacing
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Treat these statuses as final (no retry). 4xx other than 408/429 are always final. */
};

const lastRequestAt = new Map<string, number>();
const defaultSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function backoffDelay(attempt: number, baseMs: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return Math.min(secs * 1000, 120_000);
    const at = Date.parse(retryAfter);
    if (!Number.isNaN(at)) return Math.max(0, Math.min(at - Date.now(), 120_000));
  }
  const exp = baseMs * 2 ** attempt;
  return Math.min(exp + Math.floor(Math.random() * baseMs), 60_000);
}

function isRetryable(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export async function httpGet(url: string, opts: FetchOptions = {}): Promise<HttpResponse> {
  const {
    timeoutMs = 20_000,
    retries = 3,
    backoffBaseMs = 1_000,
    minIntervalMs = 0,
    headers = {},
    maxBytes = 15 * 1024 * 1024,
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = opts;
  const host = new URL(url).host;
  let lastErr: HttpFetchError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (minIntervalMs > 0) {
      const wait = (lastRequestAt.get(host) ?? 0) + minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequestAt.set(host, Date.now());
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: opts.method ?? "GET",
        body: opts.body,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*", ...headers },
        signal: ctrl.signal,
        redirect: "follow",
      });
      const buf = await res.arrayBuffer();
      if (buf.byteLength > maxBytes) throw new HttpFetchError(`Response too large (${buf.byteLength} bytes)`, res.status, url);
      const bytes = new Uint8Array(buf);
      const text = new TextDecoder("utf-8").decode(bytes);
      if (res.ok) return { status: res.status, url: res.url || url, text, bytes, contentType: res.headers.get("content-type"), headers: res.headers };
      lastErr = new HttpFetchError(`HTTP ${res.status} from ${host}`, res.status, url, text.slice(0, 300));
      if (!isRetryable(res.status) || attempt === retries) throw lastErr;
      await sleep(backoffDelay(attempt, backoffBaseMs, res.headers.get("retry-after")));
    } catch (e) {
      if (e instanceof HttpFetchError && (!isRetryable(e.status ?? 500) || attempt === retries)) throw e;
      const msg = (e as Error).name === "AbortError" ? `Timed out after ${timeoutMs}ms` : (e as Error).message;
      lastErr = e instanceof HttpFetchError ? e : new HttpFetchError(`Network error contacting ${host}: ${msg}`, null, url);
      if (attempt === retries) throw lastErr;
      await sleep(backoffDelay(attempt, backoffBaseMs));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new HttpFetchError("Unknown fetch failure", null, url);
}

export async function httpGetJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<{ data: T; res: HttpResponse }> {
  const res = await httpGet(url, { ...opts, headers: { Accept: "application/json", ...opts.headers } });
  try {
    return { data: JSON.parse(res.text) as T, res };
  } catch {
    throw new HttpFetchError(`Expected JSON but received: ${res.text.slice(0, 160)}`, res.status, url, res.text.slice(0, 300));
  }
}
