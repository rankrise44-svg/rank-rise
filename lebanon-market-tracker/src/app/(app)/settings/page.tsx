import { ApiButton, ApiForm } from "@/components/actions";
import { Badge, Card, CardHeader, ErrorState, PageHeader } from "@/components/ui";
import { RULE_TYPES } from "@/lib/alerts/evaluate";
import { query } from "@/lib/db";
import { configStatus } from "@/lib/env";
import { fmtDate } from "@/lib/format";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";
import { LogoutButton } from "./LogoutButton";

export const metadata = { title: "الإعدادات" };

const RULE_AR: Record<string, string> = {
  high_relevance_news: "أخبار عالية الصلة", news_keyword: "كلمات مفتاحية في الأخبار", indicator_change: "تغيّر كبير في مؤشر", trend_signal: "إشارة اتجاه جديدة",
  company_activity: "نشاط شركة", data_anomaly: "مراجعة/شذوذ بيانات", opportunity_score: "تغيّر درجة فرصة", forecast_outcome: "حسم توقع", source_failure: "فشل مصدر",
};

export default async function SettingsPage() {
  const s = await getSettings();
  const cfg = configStatus();
  const [rules, notes, auditLog] = await Promise.all([
    safe(() => query<{ id: string; name: string; rule_type: string; params: unknown; enabled: boolean; last_evaluated_at: Date | null }>("SELECT id, name, rule_type, params, enabled, last_evaluated_at FROM alert_rules ORDER BY created_at")),
    safe(() => query<{ id: string; title: string; body: string | null; severity: string; link: string | null; created_at: Date; read_at: Date | null }>("SELECT id, title, body, severity, link, created_at, read_at FROM notifications ORDER BY created_at DESC LIMIT 50")),
    safe(() => query<{ actor: string; action: string; target_type: string | null; created_at: Date; ip: string | null }>("SELECT actor, action, target_type, created_at, ip FROM audit_log ORDER BY created_at DESC LIMIT 30")),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="الإعدادات" actions={<LogoutButton />} />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="التفضيلات" />
          <div className="p-4">
            <ApiForm
              url="/api/settings"
              method="PUT"
              reset={false}
              submitLabel="حفظ"
              fields={[
                { name: "timezone", label: "المنطقة الزمنية (IANA)", type: "text", defaultValue: s.timezone, help: "مثال: Asia/Beirut أو Europe/Paris" },
                { name: "min_relevance", label: "الحد الأدنى للصلة بلبنان في قوائم الأخبار (0–1)", type: "number", step: "0.05", defaultValue: String(s.minRelevance) },
                { name: "watchlist", label: "قائمة المتابعة (مفصولة بفواصل)", type: "text", defaultValue: s.watchlist.join(", ") },
                ...(process.env.NODE_ENV !== "production" ? [{ name: "demo_mode", label: "وضع العرض بالبيانات الاصطناعية (للتطوير فقط)", type: "checkbox" as const, defaultValue: String(s.demoMode) }] : []),
              ]}
              transform="settings"
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="حالة الإعداد" subtitle="لا تُعرض أي أسرار" />
          <ul className="space-y-1.5 p-4 text-sm">
            <li className="flex justify-between">قاعدة البيانات <Badge tone={cfg.database ? "emerald" : "rose"}>{cfg.database ? "مُعدّة" : "غير مُعدّة"}</Badge></li>
            <li className="flex justify-between">المصادقة <Badge tone={cfg.auth ? "emerald" : "rose"}>{cfg.auth ? "مفعّلة" : "غير مُعدّة"}</Badge></li>
            <li className="flex justify-between">تشفير مفاتيح API <Badge tone={cfg.secretsEncryption ? "emerald" : "amber"}>{cfg.secretsEncryption ? "مُعدّ" : "غير مُعدّ"}</Badge></li>
            <li className="flex justify-between">النموذج اللغوي <Badge tone={cfg.llmConfigured ? "emerald" : "amber"}>{cfg.llmConfigured ? cfg.llmProvider : "غير مُعدّ (استرجاع فقط)"}</Badge></li>
            <li className="flex justify-between">قنوات البريد/الرسائل <Badge>غير مفعّلة — تنبيهات داخل التطبيق فقط</Badge></li>
            {cfg.error ? <li className="text-xs text-rose">{cfg.error}</li> : null}
          </ul>
        </Card>
      </div>

      <Card id="alerts">
        <CardHeader title="التنبيهات" subtitle="تُقيَّم بعد كل مزامنة وفي كل دورة للعامل الخلفي" actions={<ApiButton url="/api/notifications" body={{ all: true }} label="تعليم الكل كمقروء" variant="ghost" />} />
        <div className="grid gap-4 p-4 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <h3 className="mb-2 text-sm font-medium">الإشعارات</h3>
            {!notes.ok ? <ErrorState message={notes.error} /> : (
              <ul className="scroll-thin max-h-96 space-y-1.5 overflow-auto text-xs">
                {notes.data.map((n) => (
                  <li key={n.id} className={`rounded-md border p-2 ${n.read_at ? "border-line text-muted" : "border-cyan/30 bg-cyan/5"}`}>
                    <div className="flex justify-between gap-2"><a href={n.link ?? "#"} className="hover:text-cyan" dir="auto" target={n.link?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{n.title}</a><Badge tone={n.severity === "warning" ? "amber" : n.severity === "critical" ? "rose" : "neutral"}>{n.severity}</Badge></div>
                    {n.body ? <p className="mt-0.5 text-muted">{n.body}</p> : null}
                    <p className="mt-0.5 text-[10px] text-faint">{fmtDate(n.created_at, s.timezone, true)}</p>
                  </li>
                ))}
                {!notes.data.length ? <li className="text-muted">لا إشعارات.</li> : null}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium">القواعد</h3>
            {rules.ok ? (
              <ul className="space-y-1.5 text-xs">
                {rules.data.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-2">
                    <span>{r.name} <span className="text-muted">({RULE_AR[r.rule_type]})</span> <span dir="ltr" className="break-all text-faint">{JSON.stringify(r.params)}</span></span>
                    <span className="flex gap-1">
                      <ApiButton url={`/api/alerts/${r.id}`} method="PATCH" body={{ enabled: !r.enabled }} label={r.enabled ? "إيقاف" : "تشغيل"} variant="ghost" />
                      <ApiButton url={`/api/alerts/${r.id}`} method="DELETE" label="حذف" variant="ghost" confirm="حذف القاعدة؟" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ApiForm
              url="/api/alerts"
              columns={2}
              submitLabel="إضافة قاعدة"
              fields={[
                { name: "name", label: "الاسم", type: "text", required: true },
                { name: "rule_type", label: "النوع", type: "select", options: RULE_TYPES.map((t) => ({ value: t, label: RULE_AR[t] })) },
                { name: "params", label: "المعاملات (JSON)", type: "textarea", rows: 2, placeholder: '{"keywords":["صندوق النقد","eurobonds"]}', help: 'أمثلة: {"min_relevance":0.9} · {"code_prefix":"PCPIPCH","min_abs_change_pct":10} · {"company":"MEA"}' },
              ]}
              transform="alertRule"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="سجل التدقيق" subtitle="آخر 30 إجراءً إدارياً" />
        <ul className="divide-y divide-line/60 text-xs">
          {auditLog.ok ? auditLog.data.map((a, i) => (
            <li key={i} className="flex flex-wrap gap-3 p-2"><span className="text-muted">{fmtDate(a.created_at, s.timezone, true)}</span><span className="ltr-num">{a.action}</span><span className="text-muted">{a.actor} · {a.ip ?? ""}</span></li>
          )) : null}
        </ul>
      </Card>
    </div>
  );
}
