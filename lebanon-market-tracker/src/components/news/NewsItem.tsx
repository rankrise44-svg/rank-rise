import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge, InferredBadge, SyntheticBadge, relativeAr } from "../ui";
import { fmtDate, LANG_LABEL } from "@/lib/format";
import { IMPACT_LABELS, SECTOR_LABELS, TOPIC_LABELS } from "@/lib/nav";
import type { NewsRow } from "@/lib/repo/news";

/**
 * One collected article. Everything the source reported (title, outlet, time, link) is shown plainly;
 * system-inferred metadata (topics, sectors, relevance, impact) is grouped and labelled as inferred.
 * External text is rendered as plain text (React escapes it), never as HTML.
 */
export function NewsItem({ n, tz, compact = false }: { n: NewsRow; tz: string; compact?: boolean }) {
  const when = n.published_at ?? n.collected_at;
  const isFirstSeen = n.time_semantics === "gdelt_first_seen";
  const rel = n.lebanon_relevance === null ? null : Number(n.lebanon_relevance);
  return (
    <article className="group border-b border-line/60 px-4 py-3 last:border-0 hover:bg-panel-2/50">
      <div className="flex items-start justify-between gap-3">
        <a
          href={n.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          dir="auto"
          className="min-w-0 text-[14px] leading-snug font-medium [overflow-wrap:anywhere] text-ink group-hover:text-cyan"
        >
          {n.title}
          <ExternalLink className="ms-1 inline size-3 opacity-50" />
        </a>
        <span className="shrink-0 text-[11px] text-muted" title={`${isFirstSeen ? "أول رصد عبر GDELT" : "تاريخ النشر"}: ${fmtDate(when, tz, true)}`}>
          {relativeAr(new Date(when))}
        </span>
      </div>
      {!compact && n.summary ? (
        <p dir="auto" className="mt-1 line-clamp-2 text-xs leading-relaxed [overflow-wrap:anywhere] text-muted">{n.summary}</p>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span className="font-medium text-ink-2">{n.source_name ?? n.source_domain}</span>
        {n.language ? <Badge>{LANG_LABEL[n.language] ?? n.language}</Badge> : null}
        {n.is_synthetic ? <SyntheticBadge /> : null}
        {!compact ? (
          <>
            <span title="وقت النشر أو أول رصد">{isFirstSeen ? "أول رصد" : "نُشر"}: {fmtDate(when, tz, true)}</span>
            <span>· جُمع: {fmtDate(n.collected_at, tz, true)}</span>
          </>
        ) : null}
        {n.event_id ? (
          <Link href={`/news/events/${n.event_id}`} className="text-sky hover:underline">
            ضمن حدث
          </Link>
        ) : null}
      </div>
      {(n.topics.length || n.sectors.length || rel !== null) && !compact ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <InferredBadge />
          {n.topics.slice(0, 3).map((t) => (
            <Badge key={t} tone="sky">{TOPIC_LABELS[t] ?? t}</Badge>
          ))}
          {n.sectors.slice(0, 3).map((s) => (
            <Badge key={s} tone="cyan">{SECTOR_LABELS[s] ?? s}</Badge>
          ))}
          {n.impact && n.impact !== "neutral" ? <Badge tone={IMPACT_LABELS[n.impact].tone}>{IMPACT_LABELS[n.impact].label}</Badge> : null}
          {rel !== null ? <Badge title="درجة الصلة بلبنان (0–1) مستنتجة آلياً">صلة بلبنان {rel.toFixed(2)}</Badge> : null}
        </div>
      ) : null}
    </article>
  );
}
