import Link from "next/link";
import { ApiButton, ApiForm } from "@/components/actions";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, SyntheticBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { AREA_LABELS, SECTOR_LABELS } from "@/lib/nav";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "الفرص الاستثمارية والتجارية" };

const CONF: Record<string, { l: string; t: "amber" | "sky" | "emerald" | "neutral" }> = { unvalidated: { l: "غير متحقق منها", t: "amber" }, low: { l: "ثقة منخفضة", t: "neutral" }, medium: { l: "ثقة متوسطة", t: "sky" }, high: { l: "ثقة عالية", t: "emerald" } };
const STATUS: Record<string, string> = { candidate: "مرشّحة", investigating: "قيد التحقق", validated: "متحقق منها", rejected: "مرفوضة", archived: "مؤرشفة" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const r = await safe(() =>
    query<{ id: string; title: string; sector_key: string | null; area_key: string | null; overall_score: string | null; confidence: string; status: string; origin: string; assessed_at: Date | null; is_synthetic: boolean; n_for: string; n_against: string; missing: number }>(
      `SELECT o.id, o.title, o.sector_key, o.area_key, o.overall_score, o.confidence, o.status, o.origin, o.assessed_at, o.is_synthetic,
              (SELECT count(*) FROM opportunity_evidence e WHERE e.opportunity_id = o.id AND e.stance = 'supports') AS n_for,
              (SELECT count(*) FROM opportunity_evidence e WHERE e.opportunity_id = o.id AND e.stance = 'contradicts') AS n_against,
              COALESCE(jsonb_array_length(o.scores->'missing'), 0) AS missing
         FROM opportunities o WHERE (NOT o.is_synthetic OR $1) AND ($2::text IS NULL OR o.status = $2)
        ORDER BY o.status IN ('rejected','archived'), o.overall_score DESC NULLS LAST, o.created_at DESC`,
      [s.demoMode, sp.status ?? null],
    ),
  );
  return (
    <div className="space-y-4">
      <PageHeader
        title="الفرص الاستثمارية والتجارية"
        subtitle="فرضيات تستحق التحقيق، لكل منها أدلة داعمة ومعاكسة وفجوات بيانات وخطوات تحقق. الدرجة أداة ترتيب وليست احتمال نجاح مالي."
        actions={<ApiButton url="/api/opportunities/discover" label="توليد فرضيات من الإشارات الحالية" variant="primary" describe="discover" />}
      />
      <div className="flex flex-wrap gap-1 text-xs">
        {[["", "الكل"], ...Object.entries(STATUS)].map(([k, v]) => (
          <Link key={k} href={k ? `/opportunities?status=${k}` : "/opportunities"} className={`rounded-md border px-2 py-1 ${(sp.status ?? "") === k ? "border-cyan/50 text-cyan" : "border-line text-muted"}`}>{v}</Link>
        ))}
      </div>
      <Card>
        {!r.ok ? <div className="p-3"><ErrorState message={r.error} /></div> : r.data.length ? (
          <ul className="divide-y divide-line/60">
            {r.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-panel-2/40">
                <div className="min-w-0">
                  <Link href={`/opportunities/${o.id}`} className="font-medium text-ink hover:text-cyan">{o.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                    {o.sector_key ? <Badge tone="cyan">{SECTOR_LABELS[o.sector_key] ?? o.sector_key}</Badge> : null}
                    {o.area_key ? <Badge>{AREA_LABELS[o.area_key] ?? o.area_key}</Badge> : null}
                    <Badge tone={CONF[o.confidence].t}>{CONF[o.confidence].l}</Badge>
                    <Badge>{STATUS[o.status]}</Badge>
                    <Badge>{o.origin === "system" ? "مولّدة من الإشارات" : "أضافها المستخدم"}</Badge>
                    {o.is_synthetic ? <SyntheticBadge /> : null}
                    <span>داعمة {o.n_for} · معاكسة {o.n_against} · مكوّنات غير مقيّمة {o.missing}</span>
                    {o.assessed_at ? <span>· قُيّمت {fmtDate(o.assessed_at, s.timezone)}</span> : null}
                  </div>
                </div>
                <div className="text-center">
                  <div className="ltr-num text-2xl font-semibold text-cyan">{o.overall_score === null ? "—" : Number(o.overall_score).toFixed(0)}</div>
                  <div className="text-[10px] text-muted">{o.overall_score === null ? "مكوّنات غير كافية" : "درجة ترتيب /100"}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="لا توجد فرضيات">ولّد فرضيات من الإشارات أو أضف واحدة يدوياً أدناه.</EmptyState>}
      </Card>
      <Card>
        <CardHeader title="إضافة فرضية يدوياً" />
        <div className="p-4">
          <ApiForm
            url="/api/opportunities"
            columns={2}
            submitLabel="إضافة"
            fields={[
              { name: "title", label: "عنوان الفرضية", type: "text", required: true },
              { name: "sector_key", label: "القطاع", type: "select", options: [{ value: "", label: "—" }, ...Object.entries(SECTOR_LABELS).map(([k, v]) => ({ value: k, label: v }))] },
              { name: "area_key", label: "المنطقة", type: "select", options: [{ value: "", label: "—" }, ...Object.entries(AREA_LABELS).map(([k, v]) => ({ value: k, label: v }))] },
              { name: "customer_segments", label: "شرائح العملاء المحتملة", type: "text" },
              { name: "problem", label: "المشكلة أو الحاجة غير الملبّاة", type: "textarea" },
            ]}
            transform="opportunityCreate"
            describe="opportunityCreated"
          />
        </div>
      </Card>
      <Notice tone="amber">لا تقدّر المنصة أحجام أسواق أو إيرادات أو هوامش أو أعداد زبائن. أي رقم من هذا النوع يجب إدخاله مع مصدره. حين تكون الأدلة غير كافية، تبقى الفرضية «غير متحقق منها».</Notice>
    </div>
  );
}
