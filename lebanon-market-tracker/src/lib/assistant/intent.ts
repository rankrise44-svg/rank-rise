import { normalizeText } from "../ingestion/normalize";
import { matchAreaKey } from "../intel/areas-match";
import { AREAS, SECTORS, TOPICS } from "../intel/lexicon";
import { countMatches } from "../intel/classify";

export type Intent = {
  days: number | null; // look-back window
  horizonMonths: number | null; // forward-looking horizon mentioned ("next three months")
  areas: string[];
  sectors: string[];
  topics: string[];
  wantsForecast: boolean;
  wantsOpportunities: boolean;
  wantsComparison: boolean;
  wantsMarkets: boolean;
  wantsIndicators: boolean;
};

const NUM_WORDS: Record<string, number> = {
  واحد: 1, واحده: 1, اثنين: 2, شهرين: 2, ثلاث: 3, ثلاثه: 3, اربع: 4, اربعه: 4, خمس: 5, خمسه: 5, سته: 6, ست: 6, سبع: 7, عشر: 10, عشره: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, twelve: 12,
};

function num(tok: string | undefined): number | null {
  if (!tok) return null;
  if (/^\d+$/.test(tok)) return Number(tok);
  return NUM_WORDS[tok] ?? null;
}

/** Extracts time window, horizon, geography and subject hints from an Arabic or English question. */
export function parseIntent(question: string): Intent {
  const q = ` ${normalizeText(question)} `;
  let days: number | null = null;
  let horizonMonths: number | null = null;
  if (/ (24 ساعه|اليوم|today|24 hours|last day) /.test(q) || / اخر 24 /.test(q)) days = 1;
  else if (/ (هذا الاسبوع|الاسبوع|this week|past week|last week|last 7 days) /.test(q)) days = 7;
  else if (/ (هذا الشهر|الشهر الماضي|this month|last month|past month|30 days) /.test(q)) days = 30;
  else if (/ (هذه السنه|هذا العام|this year|past year|last year) /.test(q)) days = 365;
  const back = /(?:اخر|خلال|last|past)\s+(\S+)\s+(يوم|ايام|اسابيع|اسبوع|اشهر|شهور|days?|weeks?|months?)/.exec(q);
  if (back) {
    const n = num(back[1]);
    if (n) days = /اسب|week/.test(back[2]) ? n * 7 : /شه|month/.test(back[2]) ? n * 30 : n;
  }
  const fwd = /(?:الاشهر|الشهور|next|coming|القادمه|المقبله)\s*(\S+)?\s*(اشهر|شهور|months?|سنوات|سنه|years?)?/.exec(q);
  const fwd2 = /(?:خلال|في|over the|within)\s+(?:ال)?(\S+)\s+(اشهر|شهور|months?|سنوات|years?)\s+(?:القادمه|المقبله|next|ahead)?/.exec(q);
  for (const m of [fwd2, fwd]) {
    if (m && m[2]) {
      const n = num(m[1]?.replace(/^ال/, "")) ?? (/شهرين/.test(q) ? 2 : null);
      if (n) horizonMonths = /سن|year/.test(m[2]) ? n * 12 : n;
      break;
    }
  }
  if (!horizonMonths && / (الاشهر الثلاثه|three months|3 months|ثلاثه اشهر) /.test(q) && / (القادمه|المقبله|next|coming) /.test(q)) horizonMonths = 3;

  const areas = new Set<string>();
  for (const a of AREAS) if (a.level !== "country" && countMatches(q, a.aliases).count) areas.add(a.key);
  const direct = matchAreaKey(question);
  if (direct) areas.add(direct);

  const sectors = SECTORS.filter((s) => countMatches(q, s.keywords).count || countMatches(q, [s.name_ar, s.name_en]).count).map((s) => s.key);
  const topics = TOPICS.filter((t) => countMatches(q, t.keywords).count).map((t) => t.key);
  // Arabic words may carry attached prefixes (و، ب، ل، ال); Latin words match on word boundaries.
  const has = (ar: string[], en: string[]) =>
    new RegExp(`(?:^| )(?:و|ب|ل|ف)?(?:ال)?(?:${ar.join("|")})`).test(q) || (en.length > 0 && new RegExp(`\\b(?:${en.join("|")})`).test(q));
  return {
    days,
    horizonMonths,
    areas: [...areas],
    sectors,
    topics,
    wantsForecast: has(["احتمال", "توقع", "سيرتفع", "سينخفض"], ["probability", "forecast", "likely", "will (?:rise|fall|increase|decrease)"]),
    wantsOpportunities: has(["فرص", "افكار مشاريع", "مشروع", "مشاريع", "طلب غير ملبى"], ["opportunit", "business idea", "unmet demand"]),
    wantsComparison: has(["قارن", "مقارنه"], ["compare", "versus", "vs"]),
    wantsMarkets: has(["ذهب", "دولار", "ليره", "سعر الصرف", "عملات", "نفط", "اسهم"], ["gold", "dollar", "lira", "currenc", "exchange rate", "oil", "stocks?"]),
    wantsIndicators: has(["تضخم", "نمو", "ناتج", "بطاله", "مؤشر"], ["inflation", "growth", "gdp", "unemployment", "indicator"]),
  };
}
