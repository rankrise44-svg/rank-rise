import "server-only";
import { getEnv } from "../env";
import { query } from "../db";
import { SECTOR_LABELS } from "../nav";
import { contentWords } from "../intel/cluster";
import { CitationRegistry, type Citation } from "./citations";
import { parseIntent, type Intent } from "./intent";
import { SYSTEM_PROMPT } from "./prompt";
import { anthropicProvider } from "./providers/anthropic";
import { openAiCompatibleProvider } from "./providers/openai-compatible";
import type { ChatTurn, LlmProvider } from "./providers/types";
import { executeTool, TOOLS, type ToolContext } from "./tools";

export type AssistantAnswer = {
  answer: string;
  mode: "llm" | "retrieval_only";
  citations: Citation[];
  tools: string[];
  intent: Intent;
  model?: string;
  warnings: string[];
};

export function getProvider(): LlmProvider | null {
  const env = getEnv();
  if (env.LLM_PROVIDER === "anthropic" && env.LLM_API_KEY) return anthropicProvider({ apiKey: env.LLM_API_KEY, model: env.LLM_MODEL, baseURL: env.LLM_BASE_URL });
  if (env.LLM_PROVIDER === "openai_compatible" && env.LLM_BASE_URL && env.LLM_MODEL) return openAiCompatibleProvider({ baseURL: env.LLM_BASE_URL, model: env.LLM_MODEL, apiKey: env.LLM_API_KEY });
  return null;
}

/** Turns the question into an OR-query of its content words for PostgreSQL websearch syntax. */
export function keywordQuery(q: string): string | undefined {
  const words = [...contentWords(q)].filter((w) => w.length > 2).slice(0, 6);
  return words.length ? words.join(" or ") : undefined;
}

export async function answerQuestion(question: string, history: ChatTurn[] = [], provider: LlmProvider | null = getProvider()): Promise<AssistantAnswer> {
  const t0 = Date.now();
  const intent = parseIntent(question);
  const citations = new CitationRegistry();
  const ctx: ToolContext = { citations, now: new Date() };
  const used: { name: string; ok: boolean }[] = [];
  const warnings: string[] = [];
  let result: AssistantAnswer;

  if (provider) {
    const today = new Date().toISOString().slice(0, 10);
    const hints = [
      `تاريخ اليوم: ${today}.`,
      intent.days ? `الفترة المطلوبة على الأرجح: آخر ${intent.days} يوماً.` : "",
      intent.horizonMonths ? `الأفق المستقبلي المذكور: ${intent.horizonMonths} أشهر.` : "",
      intent.areas.length ? `المناطق المذكورة: ${intent.areas.join(", ")}.` : "",
      intent.sectors.length ? `القطاعات المحتملة: ${intent.sectors.join(", ")}.` : "",
    ].filter(Boolean).join(" ");
    const loop = await provider.runToolLoop({
      system: SYSTEM_PROMPT,
      history: history.slice(-6),
      question: `${hints}\n\nسؤال المستخدم:\n${question}`,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.jsonSchema })),
      execute: async (name, input) => {
        const r = await executeTool(name, input, ctx);
        used.push({ name, ok: r.ok });
        return r;
      },
      maxRounds: getEnv().LLM_MAX_TOOL_ROUNDS,
    });
    const v = citations.validate(loop.text);
    if (v.invalid.length) warnings.push(`أُزيلت ${v.invalid.length} إشارة مرجعية لا تطابق أي مصدر مسترجع.`);
    if (!used.length) warnings.push("لم يستخدم النموذج أي أداة استرجاع؛ تعامل مع الإجابة بحذر.");
    result = { answer: v.text, mode: "llm", citations: v.cited, tools: used.map((u) => u.name), intent, model: loop.model, warnings };
  } else {
    result = await retrievalOnly(question, intent, ctx, used);
  }

  try {
    await query(
      "INSERT INTO assistant_queries (question, provider, model, tools_used, citations, mode, latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [question.slice(0, 2000), provider?.id ?? null, result.model ?? null, JSON.stringify(used), JSON.stringify(result.citations.map((c) => c.id)), result.mode, Date.now() - t0],
    );
  } catch {
    /* logging must not break answers */
  }
  return result;
}

/**
 * Without a configured model, the assistant retrieves and lists evidence only. It does not write
 * conclusions, so it cannot invent any — and says plainly when nothing relevant is stored.
 */
async function retrievalOnly(question: string, intent: Intent, ctx: ToolContext, used: { name: string; ok: boolean }[]): Promise<AssistantAnswer> {
  const call = async (name: string, input: unknown) => {
    const r = await executeTool(name, input, ctx);
    used.push({ name, ok: r.ok });
    return r.ok ? JSON.parse(r.content.replace(/… \[truncated\]$/, "")) : null;
  };
  const lines: string[] = ["**وضع الاسترجاع فقط** — لم يُضبط نموذج لغوي، لذلك أعرض الأدلة المطابقة من قاعدة البيانات دون تحليل أو استنتاج.", ""];
  let found = 0;

  if (intent.wantsMarkets) {
    const m = await call("search_market_observations", {});
    const inst = (m?.instruments ?? []) as { cite: string; instrument: string; rate_type: string; provider: string; latest: number; latest_at: string; unit: string | null }[];
    if (inst.length) {
      lines.push("**بيانات الأسواق المخزّنة:**");
      for (const x of inst) lines.push(`- ${x.instrument} (${x.rate_type}، ${x.provider}): ${x.latest.toLocaleString("en-US", { maximumFractionDigits: 4 })} بتاريخ ${x.latest_at.slice(0, 10)} [${x.cite}]`);
      lines.push("");
      found += inst.length;
    }
  }
  if (intent.wantsIndicators || (!intent.wantsMarkets && !intent.sectors.length)) {
    const cat = /تضخم|اسعار|inflation|price/i.test(question) ? "prices" : /نمو|الناتج|growth|gdp/i.test(question) ? "growth" : /بطال|unemploy/i.test(question) ? "labour" : undefined;
    const ind = await call("get_economic_indicators", { country: "LBN", category: cat, limit: 8 });
    const rows = (ind?.indicators ?? []) as { cite: string; name: string; latest_period: string; latest_value: number; unit: string | null; source: string }[];
    if (rows.length && (intent.wantsIndicators || cat)) {
      lines.push("**مؤشرات ذات صلة (آخر قيمة منشورة):**");
      for (const r of rows) lines.push(`- ${r.name}: ${r.latest_value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${r.unit ?? ""} — ${r.latest_period} (${r.source}) [${r.cite}]`);
      lines.push("");
      found += rows.length;
    }
  }
  if (intent.wantsComparison && intent.sectors.length >= 2) {
    const cmp = await call("compare_sectors", { sector_a: intent.sectors[0], sector_b: intent.sectors[1], days: intent.days ?? 30 });
    if (cmp) {
      lines.push("**مقارنة الأدلة بين القطاعين (بلا حكم):**");
      for (const key of [intent.sectors[0], intent.sectors[1]]) {
        const e = cmp[key];
        lines.push(`- ${SECTOR_LABELS[key]}: ${e.news_coverage.articles} خبراً ذا صلة، ${e.official_indicators.length} مؤشراً رسمياً مرتبطاً، فجوات: ${e.data_gaps.length}.`);
      }
      lines.push("");
      found++;
    }
  } else if (intent.sectors.length) {
    const ev = await call("search_sector_data", { sector: intent.sectors[0], days: intent.days ?? 30 });
    if (ev) {
      lines.push(`**أدلة قطاع ${SECTOR_LABELS[intent.sectors[0]]}:**`);
      for (const i of ev.official_indicators) lines.push(`- ${i.name}: ${i.latest_value} ${i.unit ?? ""} (${i.latest_period}) [${i.cite}]`);
      lines.push(`- عدد الأخبار ذات الصلة خلال ${ev.window_days} يوماً: ${ev.news_coverage.articles} (تصنيف آلي).`);
      lines.push(`- فجوات البيانات: ${ev.data_gaps.join("؛ ")}`, "");
      found += ev.official_indicators.length + ev.news_coverage.articles;
    }
  }
  if (/اشار|تغير|signal|changed/i.test(question)) {
    const s = await call("get_trend_signals", { min_significance: "medium" });
    const sig = (s?.signals ?? []) as { cite: string; subject: string; type: string; change_pct: number | null; significance: string }[];
    if (sig.length) {
      lines.push("**إشارات تغيّر محسوبة:**");
      for (const x of sig.slice(0, 8)) lines.push(`- ${x.subject} (${x.type}): ${x.change_pct ?? "—"}% — دلالة ${x.significance} [${x.cite}]`);
      lines.push("");
      found += sig.length;
    }
  }
  const news = await call("search_news", { query: keywordQuery(question), days: intent.days ?? 14, sector: intent.sectors[0], area: intent.areas[0], limit: 8 });
  const arts = (news?.articles ?? []) as { cite: string; title: string; outlet: string | null; published_or_first_seen: string }[];
  if (arts.length) {
    lines.push(`**أخبار مطابقة (${intent.days ?? 14} يوماً الأخيرة):**`);
    for (const a of arts) lines.push(`- ${a.title} — ${a.outlet ?? ""}، ${a.published_or_first_seen.slice(0, 10)} [${a.cite}]`);
    lines.push("");
    found += arts.length;
  }
  if (intent.wantsForecast || intent.horizonMonths) {
    lines.push("**بخصوص التوقع:** لا يقدّم وضع الاسترجاع احتمالات. يمكن طلب توقع إحصائي لمؤشر محدد من صفحة «التحليلات والتوقعات»، ولن يُعرض احتمال رقمي إلا إذا اجتاز النموذج الاختبار الرجعي.", "");
  }
  if (intent.wantsOpportunities) {
    lines.push("**بخصوص الفرص:** أي فرصة هنا فرضية غير متحقق منها؛ راجع صفحة «الفرص» للأدلة الداعمة والمعاكسة وفجوات البيانات.", "");
  }
  if (!found) {
    lines.push("لا تتوفر في قاعدة البيانات أدلة كافية للإجابة عن هذا السؤال. جرّب صياغة أخرى، أو فعّل مصادر إضافية من صفحة «المصادر والبيانات».");
  }
  const v = ctx.citations.validate(lines.join("\n"));
  return { answer: v.text, mode: "retrieval_only", citations: v.cited, tools: used.map((u) => u.name), intent, warnings: [] };
}
