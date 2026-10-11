import { jaccard, normalizeText, stripOutletSuffix } from "../ingestion/normalize";

const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "with", "as", "at", "by", "from", "is", "are", "was", "after", "over", "amid", "says", "said",
  "le", "la", "les", "de", "des", "du", "et", "en", "au", "aux", "pour", "sur", "dans", "par", "une", "un",
  "في", "من", "على", "الى", "عن", "مع", "بعد", "حول", "ان", "قال", "او", "هذا", "هذه", "التي", "الذي",
  "lebanon", "lebanese", "liban", "لبنان", "اللبناني", "اللبنانيه", "beirut", "بيروت",
]);

/** Content-word set of a title (stopwords and the ubiquitous country name removed). */
export function contentWords(title: string): Set<string> {
  return new Set(
    normalizeText(stripOutletSuffix(title))
      .split(" ")
      .map((w) => w.replace(/^(وال|بال|لل|ال)/, ""))
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export type ClusterCandidate = { id: string; title: string; eventId: string | null; topics: string[]; at: number };

/**
 * Finds the best existing article/event to attach a new article to. Two headlines are treated as the
 * same event when they share enough content words (same language) and at least one topic.
 * Cross-language grouping is not attempted (a documented limitation).
 */
export function findClusterMatch(
  article: { title: string; topics: string[]; at: number },
  candidates: ClusterCandidate[],
  opts = { threshold: 0.34, windowMs: 72 * 3600_000 },
): ClusterCandidate | null {
  const words = contentWords(article.title);
  if (words.size < 3) return null;
  let best: ClusterCandidate | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (Math.abs(c.at - article.at) > opts.windowMs) continue;
    if (article.topics.length && c.topics.length && !article.topics.some((t) => c.topics.includes(t))) continue;
    const s = jaccard(words, contentWords(c.title));
    if (s >= opts.threshold && s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
