import Link from "next/link";
import { ApiForm } from "@/components/actions";
import { Badge, Card, CardHeader, ErrorState, Freshness, Notice, PageHeader, PROVENANCE_LABEL } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { listSources } from "@/lib/repo/sources";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";
import { SourceActions } from "./SourceActions";

export const metadata = { title: "المصادر والبيانات" };

const STATUS: Record<string, { l: string; t: "emerald" | "amber" | "rose" | "neutral" | "sky" }> = {
  ok: { l: "يعمل", t: "emerald" }, partial: { l: "جزئي", t: "amber" }, error: { l: "خطأ", t: "rose" }, never_run: { l: "لم يُشغَّل", t: "neutral" },
  disabled: { l: "معطّل", t: "neutral" }, needs_credentials: { l: "يحتاج مفتاحاً", t: "amber" }, blocked: { l: "محجوب/غير متاح", t: "rose" },
};

export default async function SourcesPage() {
  const s = await getSettings();
  const r = await safe(listSources);
  return (
    <div className="space-y-4">
      <PageHeader title="المصادر والبيانات" subtitle="سجل المصادر: الحالة، آخر مزامنة ناجحة، الأخطاء، حداثة البيانات، الترخيص والتغطية. «اختبار» يشغّل الموصّل دون تخزين." />
      {!r.ok ? <ErrorState message={r.error} /> : (
        <Card>
          <ul className="divide-y divide-line/60">
            {r.data.map((x) => {
              const st = STATUS[x.status] ?? { l: x.status, t: "neutral" as const };
              const p = PROVENANCE_LABEL[x.provenance];
              return (
                <li key={x.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/sources/${x.key}`} className="font-medium text-ink hover:text-cyan">{x.name_ar ?? x.name}</Link>
                      <span className="ms-2 text-xs text-muted" dir="ltr">{x.name}</span>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                        <Badge tone={st.t}>{st.l}</Badge>
                        {p ? <Badge tone={p.tone}>{p.label}</Badge> : null}
                        <Badge>{x.source_type}</Badge>
                        {x.auth_required === "api_key" ? <Badge tone="amber">يتطلب مفتاح API</Badge> : <Badge>بلا مفتاح</Badge>}
                        {x.enabled ? null : <Badge>معطّل</Badge>}
                        <span>· {x.update_schedule}</span>
                        <span>· {Number(x.records).toLocaleString("en-US")} سجلاً</span>
                        {x.last_success_at ? <Freshness at={x.last_success_at} expectedHours={Math.max(1, (x.schedule_minutes ?? 1440) / 60)} label="آخر نجاح" /> : <span>· لم ينجح بعد</span>}
                      </div>
                    </div>
                    <SourceActions k={x.key} enabled={x.enabled} connector={x.connector} needsKey={x.auth_required === "api_key"} hint={x.credential_hint ? `••••${x.credential_hint}` : null} isSystem={x.is_system} />
                  </div>
                  {x.last_error ? <p className="rounded-md border border-rose/30 bg-rose/5 p-2 text-xs text-rose">آخر خطأ ({x.last_error_at ? fmtDate(x.last_error_at, s.timezone, true) : "—"}): {x.last_error}</p> : null}
                  <details className="text-xs text-muted">
                    <summary className="cursor-pointer text-ink-2">التغطية والترخيص</summary>
                    <p className="mt-1">{x.coverage_notes}</p>
                    <p className="mt-1">{x.terms_of_use} {x.terms_url ? <a href={x.terms_url} target="_blank" rel="noopener noreferrer" className="text-sky underline">الشروط</a> : null}</p>
                    {x.homepage_url?.startsWith("http") ? <p className="mt-1"><a href={x.homepage_url} target="_blank" rel="noopener noreferrer" className="text-sky underline" dir="ltr">{x.homepage_url}</a></p> : null}
                  </details>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Card>
        <CardHeader title="إضافة خلاصة RSS/Atom" subtitle="يُتحقق من أن الرابط يعيد خلاصة صالحة قبل الإضافة. تُخزَّن العناوين والروابط ومقتطفات قصيرة فقط." />
        <div className="p-4">
          <ApiForm
            url="/api/sources"
            columns={3}
            submitLabel="إضافة المصدر"
            fields={[
              { name: "name", label: "الاسم", type: "text", required: true },
              { name: "url", label: "رابط الخلاصة", type: "url", required: true },
              { name: "language", label: "اللغة", type: "select", options: [{ value: "", label: "تلقائي" }, { value: "ar", label: "عربي" }, { value: "en", label: "English" }, { value: "fr", label: "Français" }] },
              { name: "topics", label: "التصنيف (مفصول بفواصل)", type: "text", placeholder: "news, economy" },
            ]}
            transform="rss"
            describe="rssAdded"
          />
        </div>
      </Card>
      <Notice>
        لا تتجاوز المنصة حمايات الوصول (Cloudflare، CAPTCHA، تسجيل الدخول، الجدران المدفوعة). المصادر المحجوبة مُعلَّمة بذلك؛ يمكن إدخال أرقامها يدوياً مع رابط المصدر من صفحتي «العملات والذهب» و«الاقتصاد اللبناني».
      </Notice>
    </div>
  );
}
