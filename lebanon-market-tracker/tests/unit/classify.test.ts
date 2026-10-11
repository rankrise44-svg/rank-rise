import { describe, expect, it } from "vitest";
import { classifyArticle, countMatches } from "@/lib/intel/classify";
import { normalizeText } from "@/lib/ingestion/normalize";
import { findClusterMatch } from "@/lib/intel/cluster";
import { volumeSignal, changeSignal } from "@/lib/intel/signals";

describe("rule-based classifier", () => {
  it("matches Arabic keywords with attached prefixes and suffixes", () => {
    expect(countMatches(normalizeText("ارتفاع بالدولار اليوم"), ["الدولار"]).count).toBe(1);
    expect(countMatches(normalizeText("تحويلات المصارف اللبنانية"), ["مصارف"]).count).toBe(1);
  });
  it("ignores keywords too short to be meaningful (avoids false positives)", () => {
    expect(countMatches(normalizeText("فاز الفريق في الدوري"), ["الفا", "ري"]).count).toBe(0);
  });
  it("uses whole-word matching for Latin keywords", () => {
    expect(countMatches("said the minister", ["ai"]).count).toBe(0);
    expect(countMatches("new ai startup", ["ai"]).count).toBe(1);
  });
  it("scores Lebanon relevance and extracts places and institutions", () => {
    const c = classifyArticle({ title: "مصرف لبنان يبقي سعر الصرف ثابتاً في بيروت", summary: null, sourceDomain: "lbcgroup.tv" });
    expect(c.lebanonRelevance).toBeGreaterThanOrEqual(0.6);
    expect(c.areas).toEqual(expect.arrayContaining(["beirut", "lebanon"]));
    expect(c.entities.some((e) => e.key === "bdl")).toBe(true);
    expect(c.topics).toContain("currency");
    expect(c.sectors).toContain("banking");
  });
  it("leaves unrelated foreign stories with low relevance", () => {
    const c = classifyArticle({ title: "Manchester City beat Liverpool in Premier League", summary: null });
    expect(c.lebanonRelevance).toBeLessThan(0.35);
    expect(c.sectors).toEqual([]);
  });
  it("marks impact as mixed/uncertain rather than overclaiming", () => {
    expect(classifyArticle({ title: "Lebanon tourism recovery amid war escalation fears" }).impact).toBe("mixed");
    expect(classifyArticle({ title: "Lebanon may see growth next year" }).impact).toBe("uncertain");
  });
});

describe("event clustering", () => {
  const t = Date.UTC(2026, 9, 11);
  it("groups same-language headlines about the same story within 72h", () => {
    const m = findClusterMatch(
      { title: "Lebanese army deploys troops along southern border villages", topics: ["security"], at: t },
      [{ id: "1", title: "Army deploys troops to southern border villages, Lebanese officials say", eventId: null, topics: ["security"], at: t - 3600_000 }],
    );
    expect(m?.id).toBe("1");
  });
  it("does not group stories outside the window or with disjoint topics", () => {
    const art = { title: "Lebanese army deploys troops along southern border villages", topics: ["security"], at: t };
    expect(findClusterMatch(art, [{ id: "1", title: art.title, eventId: null, topics: ["security"], at: t - 5 * 86400_000 }])).toBeNull();
    expect(findClusterMatch(art, [{ id: "2", title: art.title, eventId: null, topics: ["economy"], at: t }])).toBeNull();
  });
});

describe("trend signal statistics", () => {
  it("flags a large coverage jump as high significance only with enough data", () => {
    expect(volumeSignal(30, [5, 6, 4, 5]).significance).toBe("high");
    expect(volumeSignal(3, [1, 0]).significance).toBe("low");
    expect(volumeSignal(5, [5, 5, 5, 5]).direction).toBe("flat");
  });
  it("needs history before calling an indicator change significant", () => {
    expect(changeSignal([1, 2])?.significance).toBe("low");
    expect(changeSignal([1, 1.1, 1.2, 1.1, 1.2, 1.3, 1.2, 5])?.significance).toBe("high");
  });
});
