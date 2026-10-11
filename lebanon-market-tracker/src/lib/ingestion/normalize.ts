import { createHash } from "node:crypto";

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|igshid|cmpid|ito|at_medium|at_campaign|ocid|amp)$/i;

/** Canonical URL used for exact-duplicate detection: lowercase host, no fragment/tracking params, no trailing slash. */
export function canonicalizeUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
  u.protocol = "https:";
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/amp\/?$/, "").replace(/\/+$/, "") || "/";
  const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING_PARAMS.test(k)).sort(([a], [b]) => a.localeCompare(b));
  u.search = "";
  for (const [k, v] of keep) u.searchParams.append(k, v);
  return u.toString();
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Normalizes Arabic letter variants so the same word matches regardless of spelling convention. */
export function normalizeArabic(s: string): string {
  return s
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/** Lowercased, accent/diacritic-free, punctuation-free text for matching. */
export function normalizeText(s: string): string {
  return normalizeArabic(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[،؛؟٪-٭«»“”"'’‘`´]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip the trailing " - Outlet Name" / " | Outlet" that aggregators append to titles. */
export function stripOutletSuffix(title: string): string {
  return title.replace(/\s+[-–—|]\s+[^-–—|]{2,40}$/u, "").trim();
}

export function titleFingerprint(title: string): string {
  return normalizeText(stripOutletSuffix(title));
}

/** Word-shingle Jaccard similarity used for near-duplicate and same-event detection. */
export function shingles(text: string, n = 2): Set<string> {
  const words = normalizeText(text).split(" ").filter((w) => w.length > 1);
  const out = new Set<string>();
  if (words.length < n) {
    words.forEach((w) => out.add(w));
    return out;
  }
  for (let i = 0; i <= words.length - n; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function isNearDuplicate(titleA: string, titleB: string, threshold = 0.6): boolean {
  const fa = titleFingerprint(titleA);
  const fb = titleFingerprint(titleB);
  if (fa === fb) return true;
  return jaccard(shingles(fa), shingles(fb)) >= threshold;
}

/** GDELT seendate format: 20250426T101500Z */
export function parseCompactUtc(s: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses RFC-822 / ISO dates; rejects implausible values (far future or before 1990). */
export function parseDateLoose(s: string | undefined | null, now = new Date()): Date | null {
  if (!s) return null;
  const compact = parseCompactUtc(s);
  const d = compact ?? new Date(s.trim());
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > now.getTime() + 36 * 3600 * 1000) return null; // >36h in the future: bad timezone/data
  if (d.getUTCFullYear() < 1990) return null;
  return d;
}

export type Frequency = "annual" | "quarterly" | "monthly" | "weekly" | "daily" | "irregular";

/** Converts provider period labels ('2023', '2023Q2', '2023-Q2', '2023M04', '2023-04') into period start/end. */
export function parsePeriod(label: string): { periodDate: string; observedAt: Date; frequency: Frequency } | null {
  const s = label.trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})$/.exec(s))) {
    return { periodDate: `${m[1]}-01-01`, observedAt: new Date(Date.UTC(+m[1], 11, 31, 23, 59, 59)), frequency: "annual" };
  }
  if ((m = /^(\d{4})-?Q([1-4])$/i.exec(s))) {
    const q = +m[2];
    const startMonth = (q - 1) * 3;
    return {
      periodDate: `${m[1]}-${String(startMonth + 1).padStart(2, "0")}-01`,
      observedAt: new Date(Date.UTC(+m[1], startMonth + 3, 0, 23, 59, 59)),
      frequency: "quarterly",
    };
  }
  if ((m = /^(\d{4})-?M?(\d{2})$/i.exec(s))) {
    const mo = +m[2];
    if (mo < 1 || mo > 12) return null;
    return { periodDate: `${m[1]}-${m[2]}-01`, observedAt: new Date(Date.UTC(+m[1], mo, 0, 23, 59, 59)), frequency: "monthly" };
  }
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59));
    if (Number.isNaN(d.getTime())) return null;
    return { periodDate: s, observedAt: d, frequency: "daily" };
  }
  return null;
}

export function detectLanguage(text: string): "ar" | "en" | "fr" | null {
  if (!text) return null;
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  if (arabic > latin) return "ar";
  if (!latin) return null;
  const lower = ` ${text.toLowerCase()} `;
  const fr = (lower.match(/ (le|la|les|des|du|une|est|et|pour|dans|au|aux|sur) /g) ?? []).length + (/[éèêàçù]/.test(lower) ? 2 : 0);
  const en = (lower.match(/ (the|and|of|to|in|for|on|is|with|as) /g) ?? []).length;
  return fr > en ? "fr" : "en";
}

/** Plain-text excerpt from HTML-ish feed content, capped (we store short summaries only). */
export function toExcerpt(html: string | undefined | null, max = 400): string | null {
  if (!html) return null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;
}

/** Format a date in a given IANA timezone (default Asia/Beirut) for display. */
export function formatInTimeZone(d: Date, timeZone = "Asia/Beirut", locale = "ar-LB"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  }).format(d);
}
