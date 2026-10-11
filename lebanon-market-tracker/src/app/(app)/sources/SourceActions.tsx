"use client";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ApiButton, ApiForm } from "@/components/actions";

export function SourceActions({ k, enabled, connector, needsKey, hint, isSystem }: { k: string; enabled: boolean; connector: string; needsKey: boolean; hint: string | null; isSystem: boolean }) {
  const [showKey, setShowKey] = useState(false);
  const runnable = !["manual", "unavailable"].includes(connector);
  return (
    <div className="flex flex-wrap items-start gap-1.5">
      {runnable ? (
        <>
          <ApiButton url={`/api/sources/${k}/run`} body={{ mode: "test" }} label="اختبار" variant="ghost" describe={(r) => `${r.status === "failed" ? "فشل" : "نجح"}: ${r.valid} سجلاً صالحاً${r.invalid ? `، ${r.invalid} غير صالح` : ""}${r.error ? ` — ${r.error}` : ""} (لم يُخزَّن شيء)`} />
          <ApiButton url={`/api/sources/${k}/run`} body={{ mode: "full" }} label="مزامنة" describe={(r) => `${r.status}: +${r.inserted} جديد، ${r.updated} مُراجع، ${r.skipped} مكرر${r.error ? ` — ${r.error}` : ""}`} />
        </>
      ) : null}
      <ApiButton url={`/api/sources/${k}`} method="PATCH" body={{ enabled: !enabled }} label={enabled ? "تعطيل" : "تفعيل"} variant="ghost" />
      {needsKey ? (
        <button onClick={() => setShowKey((x) => !x)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-amber hover:bg-panel-3"><KeyRound className="size-4" /> {hint ? `المفتاح ${hint}` : "إعداد المفتاح"}</button>
      ) : null}
      {!isSystem ? <ApiButton url={`/api/sources/${k}`} method="DELETE" label="حذف" variant="danger" confirm="حذف هذا المصدر وكل بياناته؟" /> : null}
      {showKey ? (
        <div className="w-full rounded-lg border border-line bg-panel-2 p-3">
          <ApiForm url={`/api/sources/${k}/credential`} method="PUT" submitLabel="حفظ مشفّراً" fields={[{ name: "secret", label: "مفتاح API", type: "password", required: true, help: "يُشفَّر بـ AES-256-GCM على الخادم ولا يُعرض مجدداً؛ تظهر آخر 4 خانات فقط." }]} describe={(r) => `حُفظ ${r.hint}`} />
          {hint ? <div className="mt-2"><ApiButton url={`/api/sources/${k}/credential`} method="DELETE" label="حذف المفتاح" variant="danger" /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
