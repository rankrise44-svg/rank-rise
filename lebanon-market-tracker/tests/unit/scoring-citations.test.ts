import { describe, expect, it } from "vitest";
import { scoreOpportunity } from "@/lib/opportunities/scoring";
import { CitationRegistry } from "@/lib/assistant/citations";
import { parseIntent } from "@/lib/assistant/intent";

const now = new Date("2026-10-11T00:00:00Z");
const ev = (stance: "supports" | "contradicts", type: "indicator" | "news", daysAgo = 10, prov = "official") => ({ stance, evidence_type: type, observed_at: new Date(now.getTime() - daysAgo * 86400_000), source_provenance: prov });

describe("opportunity scoring", () => {
  it("does not produce a score without evidence and never imputes analyst components", () => {
    const r = scoreOpportunity([], {}, "candidate", now);
    expect(r.overall).toBeNull();
    expect(r.confidence).toBe("unvalidated");
    expect(r.components.market_accessibility.score).toBeNull();
    expect(r.missing).toContain("economic_feasibility");
  });
  it("contradicting evidence lowers demand evidence", () => {
    const base = [ev("supports", "indicator"), ev("supports", "news", 5, "third_party"), ev("supports", "indicator", 20)];
    const a = scoreOpportunity(base, {}, "candidate", now).components.demand_evidence.score!;
    const b = scoreOpportunity([...base, ev("contradicts", "indicator"), ev("contradicts", "indicator")], {}, "candidate", now).components.demand_evidence.score!;
    expect(b).toBeLessThan(a);
  });
  it("stays unvalidated/low with only data components; needs analyst ratings for medium", () => {
    const evidence = [ev("supports", "indicator"), ev("supports", "indicator", 3), ev("supports", "news", 1, "third_party"), ev("contradicts", "news", 2, "third_party")];
    const r1 = scoreOpportunity(evidence, {}, "candidate", now);
    expect(r1.overall).toBeNull(); // only 2 of 6 components → below minimum
    const r2 = scoreOpportunity(evidence, { market_accessibility: { score: 60, rationale: "x" }, economic_feasibility: { score: 50, rationale: "y" } }, "investigating", now);
    expect(r2.overall).not.toBeNull();
    expect(["low", "medium"]).toContain(r2.confidence);
  });
});

describe("citation registry", () => {
  it("removes citation markers that do not correspond to retrieved sources", () => {
    const c = new CitationRegistry();
    const id = c.add({ title: "CPI", url: "https://cas.gov.lb", source: "CAS", date: "2026-08", kind: "indicator" }, "ind:1");
    expect(c.add({ title: "CPI", url: null, source: "CAS", date: null, kind: "indicator" }, "ind:1")).toBe(id); // deduplicated
    const v = c.validate(`Inflation was 16.7% [${id}] and GDP fell [7].`);
    expect(v.text).toContain(`[${id}]`);
    expect(v.text).toContain("[؟]");
    expect(v.invalid).toEqual(["7"]);
    expect(v.cited.map((x) => x.id)).toEqual([id]);
  });
});

describe("question intent parsing", () => {
  it("extracts time windows, horizons, sectors and places from Arabic questions", () => {
    const i = parseIntent("ما هي الفرص التجارية في قطاع السياحة في طرابلس خلال الأشهر الثلاثة القادمة؟");
    expect(i.wantsOpportunities).toBe(true);
    expect(i.sectors).toContain("tourism");
    expect(i.areas).toContain("north");
    expect(i.horizonMonths).toBe(3);
    expect(parseIntent("ما أبرز التطورات في لبنان خلال آخر 24 ساعة؟").days).toBe(1);
    expect(parseIntent("What changed this week in gold prices?").wantsMarkets).toBe(true);
  });
});
