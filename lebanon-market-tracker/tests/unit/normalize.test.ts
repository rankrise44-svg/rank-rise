import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl, detectLanguage, formatInTimeZone, isNearDuplicate, normalizeArabic, parseCompactUtc, parseDateLoose, parsePeriod, titleFingerprint, toExcerpt,
} from "@/lib/ingestion/normalize";

describe("URL canonicalization (exact-duplicate guard)", () => {
  it("drops tracking params, fragments, www/m., trailing slash and forces https", () => {
    expect(canonicalizeUrl("http://www.Example.com/a/b/?utm_source=x&id=2&fbclid=1#top")).toBe("https://example.com/a/b?id=2");
    expect(canonicalizeUrl("https://m.example.com/story/amp")).toBe("https://example.com/story");
  });
  it("sorts remaining params so equivalent URLs match", () => {
    expect(canonicalizeUrl("https://x.com/p?b=2&a=1")).toBe(canonicalizeUrl("https://x.com/p?a=1&b=2"));
  });
});

describe("near-duplicate detection", () => {
  it("treats syndicated titles with outlet suffixes as duplicates", () => {
    expect(isNearDuplicate("Lebanon central bank keeps rate at 89,500 - Naharnet", "Lebanon central bank keeps rate at 89,500 | LBCI")).toBe(true);
  });
  it("does not merge different stories", () => {
    expect(isNearDuplicate("Gold rises on Gulf tensions", "Parliament passes 2026 budget after long session")).toBe(false);
  });
  it("normalizes Arabic spelling variants in fingerprints", () => {
    expect(titleFingerprint("أسعار المحروقات اليومَ")).toBe(titleFingerprint("اسعار المحروقات اليوم"));
    expect(normalizeArabic("مؤسسة")).toBe("موسسه");
  });
});

describe("timestamps and time zones", () => {
  it("parses GDELT compact UTC seendate", () => {
    expect(parseCompactUtc("20261010T064500Z")?.toISOString()).toBe("2026-10-10T06:45:00.000Z");
  });
  it("parses RFC-822 and ISO with offsets into UTC", () => {
    expect(parseDateLoose("Sun, 11 Oct 2026 21:42:00 +0300")?.toISOString()).toBe("2026-10-11T18:42:00.000Z");
    expect(parseDateLoose("2026-10-11T21:42:00+03:00")?.toISOString()).toBe("2026-10-11T18:42:00.000Z");
  });
  it("rejects implausible future dates and garbage", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    expect(parseDateLoose("2027-01-01T00:00:00Z", now)).toBeNull();
    expect(parseDateLoose("not a date", now)).toBeNull();
  });
  it("formats in Asia/Beirut regardless of server timezone", () => {
    const s = formatInTimeZone(new Date("2026-01-15T22:30:00Z"), "Asia/Beirut", "en-GB");
    expect(s).toContain("16 Jan 2026"); // UTC+2 in winter → next day
    expect(s).toContain("00:30");
  });
});

describe("period parsing", () => {
  it("handles annual, quarterly, monthly and daily labels", () => {
    expect(parsePeriod("2023")).toMatchObject({ periodDate: "2023-01-01", frequency: "annual" });
    expect(parsePeriod("2024-Q2")).toMatchObject({ periodDate: "2024-04-01", frequency: "quarterly" });
    expect(parsePeriod("2024Q2")?.observedAt.toISOString()).toBe("2024-06-30T23:59:59.000Z");
    expect(parsePeriod("2026-08")).toMatchObject({ periodDate: "2026-08-01", frequency: "monthly" });
    expect(parsePeriod("2026-13")).toBeNull();
    expect(parsePeriod("2026-10-08")).toMatchObject({ frequency: "daily" });
  });
});

describe("language and excerpts", () => {
  it("detects Arabic, English and French", () => {
    expect(detectLanguage("ارتفاع أسعار المحروقات في لبنان")).toBe("ar");
    expect(detectLanguage("The central bank and the government agreed on the plan")).toBe("en");
    expect(detectLanguage("Le gouvernement et la banque centrale pour les réformes")).toBe("fr");
  });
  it("strips HTML and caps length (short excerpts only)", () => {
    const e = toExcerpt(`<p>Hello <b>world</b> &amp; friends</p><script>alert(1)</script>${" word".repeat(200)}`, 50)!;
    expect(e.startsWith("Hello world & friends")).toBe(true);
    expect(e).not.toContain("<");
    expect(e.length).toBeLessThanOrEqual(51);
  });
});
