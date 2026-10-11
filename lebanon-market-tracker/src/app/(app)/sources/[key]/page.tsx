import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { getSourceByKey, recentRuns } from "@/lib/repo/sources";
import { getSettings } from "@/lib/settings";

export default async function SourceDetail({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const s = await getSourceByKey(key);
  if (!s) notFound();
  const [runs, st] = await Promise.all([recentRuns(s.id, 20), getSettings()]);
  const { _user_modified, ...cfg } = s.config as Record<string, unknown>;
  void _user_modified;
  return (
    <div className="space-y-4">
      <PageHeader title={s.name_ar ?? s.name} subtitle={`${s.name} · ${s.connector} · ${s.endpoint_url ?? ""}`} />
      <Card>
        <CardHeader title="الإعداد" subtitle="معاملات الموصّل (بلا أسرار)" />
        <pre dir="ltr" className="scroll-thin overflow-auto p-4 text-xs text-ink-2">{JSON.stringify(cfg, null, 2)}</pre>
      </Card>
      <Card>
        <CardHeader title="سجل التشغيل" subtitle="آخر 20 تشغيلاً مع السجلات المنظمة" />
        <ul className="divide-y divide-line/60">
          {runs.map((r) => (
            <li key={r.id} className="p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "success" ? "emerald" : r.status === "partial" ? "amber" : r.status === "running" ? "sky" : "rose"}>{r.status}</Badge>
                <span>{r.trigger}</span>
                <span className="text-muted">{fmtDate(r.started_at, st.timezone, true)}</span>
                <span className="text-muted">جُلب {r.records_fetched} · جديد {r.records_inserted} · مُراجع {r.records_updated} · متجاوز {r.records_skipped}</span>
              </div>
              {r.error_message ? <p className="mt-1 text-rose">{r.error_message}</p> : null}
              <details className="mt-1">
                <summary className="cursor-pointer text-muted">السجل</summary>
                <pre dir="ltr" className="scroll-thin mt-1 max-h-64 overflow-auto rounded bg-bg/60 p-2 text-[11px]">{(r.log as { t: string; level: string; msg: string; data?: unknown }[]).map((l) => `${l.t} ${l.level.toUpperCase()} ${l.msg}${l.data ? ` ${JSON.stringify(l.data)}` : ""}`).join("\n")}</pre>
              </details>
            </li>
          ))}
          {!runs.length ? <li className="p-3 text-xs text-muted">لم يُشغَّل بعد.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
