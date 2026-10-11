import { normalizeText } from "../ingestion/normalize";
import {
  AREAS,
  INSTITUTIONS,
  KNOWN_COMPANIES,
  LEBANON_TERMS,
  NEGATIVE_TERMS,
  POSITIVE_TERMS,
  SECTORS,
  TOPICS,
  UNCERTAINTY_TERMS,
  type Keywords,
  type SectorDef,
} from "./lexicon";

export const CLASSIFIER_VERSION = "rules-v1";

const ARABIC = /[؀-ۿ]/;
const ARABIC_PREFIX = "(?:و|ف|ب|ل|ك)?(?:ال|لل)?";

const regexCache = new Map<string, RegExp>();
function kwRegex(kw: string): RegExp {
  let re = regexCache.get(kw);
  if (!re) {
    const n = normalizeText(kw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (ARABIC.test(n)) {
      // Arabic words take attached prefixes (و، ب، ال ...) and short suffixes. Keywords shorter than
      // three letters (after removing the article) match far too much and are ignored.
      const stem = n.length - 2 >= 3 && n.startsWith("ال") ? n.slice(2) : n;
      re = stem.replace(/ /g, "").length < 3 ? /(?!)/ : new RegExp(`(?:^| )${ARABIC_PREFIX}${stem}(?= |$|[\\u0600-\\u06FF]{0,3}(?: |$))`);
    } else {
      re = new RegExp(`(?:^| )${n}(?= |$)`);
    }
    regexCache.set(kw, re);
  }
  return re;
}

export function countMatches(normText: string, kws: Keywords | string[]): { count: number; matched: string[] } {
  const list = Array.isArray(kws) ? kws : [...kws.ar, ...kws.en, ...kws.fr];
  const matched: string[] = [];
  for (const kw of list) if (kw && kwRegex(kw).test(normText)) matched.push(kw);
  return { count: matched.length, matched };
}

export type ArticleInput = {
  title: string;
  summary?: string | null;
  sourceCountry?: string | null;
  sourceDomain?: string | null;
};

export type Entity = { type: "company" | "institution" | "location"; key: string; name: string };

export type Classification = {
  topics: string[];
  sectors: string[];
  areas: string[];
  entities: Entity[];
  lebanonRelevance: number;
  impact: "positive" | "negative" | "mixed" | "uncertain" | "neutral";
  method: string;
  evidence: Record<string, string[]>;
};

/**
 * Transparent rule-based classification. Output is *system-inferred* and is labelled as such
 * everywhere it is displayed; it never replaces what the source itself reported.
 */
export function classifyArticle(a: ArticleInput, sectors: Pick<SectorDef, "key" | "keywords">[] = SECTORS): Classification {
  const title = normalizeText(a.title);
  const full = normalizeText(`${a.title} ${a.summary ?? ""}`);
  const evidence: Record<string, string[]> = {};

  const topics: string[] = [];
  for (const t of TOPICS) {
    const m = countMatches(full, t.keywords);
    if (m.count) {
      topics.push(t.key);
      evidence[`topic:${t.key}`] = m.matched;
    }
  }
  const sectorHits: string[] = [];
  for (const s of sectors) {
    const m = countMatches(full, s.keywords);
    if (m.count) {
      sectorHits.push(s.key);
      evidence[`sector:${s.key}`] = m.matched;
    }
  }

  const entities: Entity[] = [];
  const areas = new Set<string>();
  for (const area of AREAS) {
    if (area.level === "country") continue;
    if (countMatches(full, area.aliases).count) {
      areas.add(area.key);
      entities.push({ type: "location", key: area.key, name: area.name_ar });
    }
  }
  for (const inst of INSTITUTIONS) {
    if (countMatches(full, inst.aliases).count) entities.push({ type: "institution", key: inst.key, name: inst.name });
  }
  for (const c of KNOWN_COMPANIES) {
    if (countMatches(full, c.aliases).count) {
      entities.push({ type: "company", key: c.key, name: c.name });
      if (!sectorHits.includes(c.sector)) sectorHits.push(c.sector);
    }
  }

  // Lebanon relevance: explicit mentions weigh most; place names and Lebanese outlets add support.
  let relevance = 0;
  if (countMatches(title, LEBANON_TERMS).count) relevance += 0.6;
  else if (countMatches(full, LEBANON_TERMS).count) relevance += 0.35;
  if (areas.size) relevance += 0.2;
  if (entities.some((e) => e.type === "institution" && ["bdl", "edl", "abl", "cas", "lebanese_army", "port_beirut"].includes(e.key))) relevance += 0.2;
  if ((a.sourceCountry ?? "").toLowerCase() === "lebanon" || /\.lb$/i.test(a.sourceDomain ?? "")) relevance += 0.25;
  relevance = Math.min(1, Math.round(relevance * 1000) / 1000);
  if (areas.size || relevance >= 0.35) areas.add("lebanon");

  const pos = countMatches(full, POSITIVE_TERMS).count;
  const neg = countMatches(full, NEGATIVE_TERMS).count;
  const unc = countMatches(full, UNCERTAINTY_TERMS).count;
  let impact: Classification["impact"] = "neutral";
  if (pos && neg) impact = "mixed";
  else if (pos) impact = unc ? "uncertain" : "positive";
  else if (neg) impact = unc ? "uncertain" : "negative";
  else if (unc) impact = "uncertain";

  return { topics, sectors: sectorHits, areas: [...areas], entities, lebanonRelevance: relevance, impact, method: CLASSIFIER_VERSION, evidence };
}
