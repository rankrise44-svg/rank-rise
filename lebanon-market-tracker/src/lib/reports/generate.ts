import "server-only";
import { query, queryOne } from "../db";
import { CitationRegistry } from "../assistant/citations";
import { fmtNum, fmtPct, fmtPeriod } from "../format";
import { SECTOR_LABELS, TOPIC_LABELS } from "../nav";
import { buildSectorEvidence } from "../opportunities/evidence";
import { findIndicator } from "../repo/indicators";
import { listInstruments } from "../repo/markets";
import { listEvents, searchNews } from "../repo/news";
import { latestSignals } from "../repo/signals";

export type ReportType = "daily" | "weekly" | "sector";

const RATE_AR: Record<string, string> = { official: "رسمي", reference: "مرجعي", market: "سوق", third_party_quote: "تسعير طرف ثالث", parallel: "موازٍ", user_entered: "يدوي" };

/**
 * Deterministic, template-based report built only from stored data. Every figure is followed by a
 * citation marker that resolves to the stored source. No LLM is involved, so nothing is invented.
 */
export async function generateReport(opts: { type: ReportType; sector?: string; save?: boolean; now?: Date }) {
  const now = opts.now ?? new Date();
  const days = opts.type === "weekly" ? 7 : opts.type === "sector" ? 30 : 1;
  const from = new Date(now.getTime() - days * 86400_000);
  const c = new CitationRegistry();
  const L: string[] = [];
  const title =
    opts.type === "sector"
      ? `تقرير قطاع: ${SECTOR_LABELS[opts.sector ?? ""] ?? opts.sector}`
      : opts.type === "weekly"
        ? `التقرير الأسبوعي — الأسبوع المنتهي في ${now.toISOString().slice(0, 10)}`
        : `الملخص اليومي — ${now.toISOString().slice(0, 10)}`;
  L.push(`# ${title}`, "", `الفترة: ${from.toISOString().slice(0, 16).replace("T", " ")} → ${now.toISOString().slice(0, 16).replace("T", " ")} (UTC). أُعدّ آلياً من البيانات المخزّنة فقط.`, "");

  if (opts.type === "sector" && opts.sector) {
    const ev = await buildSectorEvidence(opts.sector, 30, c);
    L.push("## المؤشرات الرسمية المرتبطة");
    if (ev.official_indicators.length) for (const i of ev.official_indicators) L.push(`- ${i.name}: ${fmtNum(i.latest_value)} ${i.unit ?? ""} (${fmtPeriod(i.latest_period ?? "")}) [${i.cite}]`);
    else L.push("- لا يوجد مؤشر رسمي مرتبط بهذا القطاع في قاعدة البيانات.");
    L.push("", "## التغطية الإخبارية (آخر 30 يوماً)");
    L.push(`- عدد الأخبار ذات الصلة: ${ev.news_coverage.articles} (التصنيف آلي). أثر إيجابي محتمل: ${ev.news_coverage.inferred_positive}، سلبي محتمل: ${ev.news_coverage.inferred_negative}.`);
    if (ev.news_coverage.volume_signal) L.push(`- حجم التغطية خلال 7 أيام: ${ev.news_coverage.volume_signal.current_7d} مقابل متوسط أسبوعي ${ev.news_coverage.volume_signal.baseline_weekly_avg} (دلالة: ${ev.news_coverage.volume_signal.significance}).`);
    for (const a of ev.news_coverage.top_articles.slice(0, 6)) L.push(`- ${a.title} (${a.date}) [${a.cite}]`);
    L.push("", "## الشركات المعروفة", ev.known_companies.length ? ev.known_companies.map((k) => `- ${k.name} (${k.news_mentions} ذكر)`).join("\n") : "- لا توجد.", "", "## فجوات البيانات", ...ev.data_gaps.map((g) => `- ${g}`));
  } else {
    L.push("## المؤشرات الرئيسية");
    const [cpi, growth, inst] = await Promise.all([findIndicator("CAS.CPI.YOY_PCT.LBN.TOTAL", "LBN", "cas"), findIndicator("NGDP_RPCH", "LBN", "imf-datamapper"), listInstruments()]);
    if (cpi?.latest_value) L.push(`- التضخم السنوي (CAS): ${fmtPct(cpi.latest_value, 1, false)} — ${fmtPeriod(cpi.latest_label ?? "")} [${c.add({ title: cpi.name_ar ?? cpi.name_en, url: cpi.source_url, source: cpi.source_name, date: cpi.latest_label, kind: "indicator" }, `ind:${cpi.id}`)}]`);
    if (growth?.latest_value) L.push(`- نمو الناتج الحقيقي (IMF): ${fmtPct(growth.latest_value)} — ${growth.latest_label} (قد يكون تقديراً) [${c.add({ title: growth.name_ar ?? growth.name_en, url: growth.methodology_url, source: growth.source_name, date: growth.latest_label, kind: "indicator" }, `ind:${growth.id}`)}]`);
    L.push("", "## العملات والذهب");
    for (const r of inst.filter((x) => ["USD/LBP", "XAU/USD", "USD/EUR"].includes(x.instrument))) {
      const ch = r.prev_value ? ((Number(r.latest_value) - Number(r.prev_value)) / Number(r.prev_value)) * 100 : null;
      L.push(`- ${r.instrument} (${RATE_AR[r.rate_type] ?? r.rate_type}، ${r.provider}): ${fmtNum(r.latest_value, { digits: 2 })} بتاريخ ${r.latest_at.toISOString().slice(0, 10)}${ch !== null ? `، التغير عن الرصد السابق ${fmtPct(ch, 2)}` : ""} [${c.add({ title: `${r.instrument} — ${r.provider}`, url: r.source_url, source: r.provider, date: r.latest_at.toISOString().slice(0, 10), kind: "market" }, `mkt:${r.source_key}:${r.instrument}:${r.rate_type}`)}]`);
    }
    L.push("", "## أبرز الأخبار");
    const news = await searchNews({ from, minRelevance: 0.5, limit: 12, offset: 0 });
    if (!news.rows.length) L.push("- لم تُجمع أخبار ذات صلة عالية خلال هذه الفترة.");
    for (const n of news.rows) {
      const topics = n.topics.map((t) => TOPIC_LABELS[t] ?? t).join("، ");
      L.push(`- ${n.title}${topics ? ` — (${topics}، تصنيف آلي)` : ""} — ${n.source_name ?? n.source_domain} [${c.add({ title: n.title, url: n.url, source: n.source_name ?? n.source_domain ?? "", date: (n.published_at ?? n.collected_at).toISOString().slice(0, 10), kind: "news" }, `news:${n.id}`)}]`);
    }
    const events = await listEvents(5, days + 2);
    if (events.length) {
      L.push("", "## أحداث غطّتها مصادر متعددة");
      for (const e of events) L.push(`- ${e.title} — ${e.article_count} خبراً من ${e.source_count} مصدراً (تجميع آلي حسب تشابه العناوين)`);
    }
    const sig = await latestSignals({ minSignificance: "medium", limit: 8, recentOnly: true });
    L.push("", "## إشارات تغيّر");
    if (!sig.length) L.push("- لا إشارات ذات دلالة متوسطة أو أعلى.");
    for (const s of sig) L.push(`- ${s.subject_label ?? `${s.subject_type}:${SECTOR_LABELS[s.subject_key] ?? TOPIC_LABELS[s.subject_key] ?? s.subject_key}`} (${s.signal_type}): ${s.change_pct !== null ? fmtPct(s.change_pct) : "—"}، دلالة ${s.significance}`);
  }

  const health = await query<{ name: string; status: string; last_error: string | null }>(
    "SELECT name, status, last_error FROM sources WHERE enabled AND status IN ('error','blocked','needs_credentials','partial') ORDER BY name",
  );
  L.push("", "## حدود البيانات");
  L.push("- التصنيفات الموضوعية والقطاعية للأخبار وتقدير الأثر مستنتجة آلياً وقد تخطئ.");
  L.push("- حجم التغطية الإخبارية لا يقيس الأثر الاقتصادي.");
  for (const h of health) L.push(`- مصدر بحالة «${h.status}»: ${h.name}${h.last_error ? ` — ${h.last_error.slice(0, 140)}` : ""}`);
  L.push("", "## المصادر");
  for (const ci of c.all()) L.push(`${ci.id}. ${ci.title} — ${ci.source}${ci.date ? ` (${ci.date})` : ""}${ci.url ? ` — ${ci.url}` : ""}`);

  const content_md = L.join("\n");
  let id = "";
  if (opts.save !== false) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO reports (report_type, title, period_start, period_end, sector_key, content_md, citations, generated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'template-v1') RETURNING id`,
      [opts.type, title, from, now, opts.sector ?? null, content_md, JSON.stringify(c.all())],
    );
    id = row!.id;
  }
  return { id, title, content_md, citations: c.all() };
}
