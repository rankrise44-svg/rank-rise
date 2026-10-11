"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button, cn, inputCls } from "./ui";


type Json = Record<string, unknown>;
type FormValues = Record<string, string | boolean>;
const ANALYST_KEYS = ["market_accessibility", "competitive_intensity", "economic_feasibility", "regulatory_operational_risk"] as const;

/**
 * Named formatters/transforms. Server Components cannot pass functions to Client Components, so pages
 * refer to these by key; client components may still pass functions directly.
 */
const DESCRIBERS: Record<string, (r: Json) => string> = {
  title: (r) => String(r.title ?? "تم"),
  discover: (r) => (Number(r.created) ? `أُنشئت ${r.created} فرضية جديدة` : "لا إشارات جديدة كافية لتوليد فرضيات"),
  opportunityCreated: () => "أُضيفت الفرضية — افتحها لإضافة الأدلة والتقييمات",
  csvImport: (r) => `أُضيف ${r.inserted}، رُوجع ${r.updated}، تُرك ${r.skipped}${Array.isArray(r.errors) && r.errors.length ? ` — أخطاء: ${(r.errors as string[]).join("؛ ")}` : ""}`,
  forecastQueued: (r) => `سُجّل السؤال (${r.status}). شغّل المحرك لحسابه.`,
  engineRan: () => "اكتمل التشغيل — حدّث الصفحة",
  rssAdded: (r) => `أُضيف (${r.items_in_feed} عنصراً في الخلاصة الآن) — شغّل «مزامنة»`,
  sectorReport: (r) => `أُنشئ التقرير: ${r.title}`,
};

const TRANSFORMS: Record<string, (v: FormValues) => unknown> = {
  manualMarket: (v) => ({ kind: "market", instrument: String(v.instrument).toUpperCase().trim(), claimed_rate_type: v.claimed_rate_type, value: Number(v.value), observed_at: new Date(String(v.observed_at)).toISOString(), source_name: v.source_name, source_url: v.source_url }),
  indicatorCsv: (v) => ({ kind: "indicator_csv", csv: v.csv, source_name: v.source_name, source_url: v.source_url }),
  opportunityCreate: (v) => ({ title: v.title, sector_key: v.sector_key || null, area_key: v.area_key || null, customer_segments: v.customer_segments || undefined, problem: v.problem || undefined }),
  evidence: (v) => ({ stance: v.stance, evidence_type: v.evidence_type, summary: v.summary, source_name: v.source_name || undefined, url: v.url || undefined, observed_at: v.observed_at || undefined }),
  analystRatings: (v) => ({ analyst_ratings: Object.fromEntries(ANALYST_KEYS.map((k) => [k, v[`${k}_score`] === "" ? null : { score: Number(v[`${k}_score`]), rationale: String(v[`${k}_why`] ?? "") }])) }),
  forecast: (v) => {
    const [code, country, source] = String(v.indicator).split("|");
    return { indicator_code: code, country, source_key: source, event: v.event, threshold: v.threshold === "" ? null : Number(v.threshold), horizon_periods: Number(v.horizon || 1) };
  },
  rss: (v) => ({ name: v.name, url: v.url, language: v.language || undefined, topics: String(v.topics || "news").split(",").map((t) => t.trim()).filter(Boolean) }),
  settings: (v) => ({ timezone: v.timezone, min_relevance: Number(v.min_relevance), watchlist: String(v.watchlist).split(",").map((x) => x.trim().toUpperCase()).filter(Boolean), ...("demo_mode" in v ? { demo_mode: Boolean(v.demo_mode) } : {}) }),
  alertRule: (v) => {
    let params: unknown = {};
    if (v.params) {
      try {
        params = JSON.parse(String(v.params));
      } catch {
        throw new Error("المعاملات ليست JSON صالحاً");
      }
    }
    return { name: v.name, rule_type: v.rule_type, params };
  },
};

function resolveDescribe(d: string | ((r: Json) => string) | undefined) {
  return typeof d === "string" ? DESCRIBERS[d] : d;
}
function resolveTransform(t: string | ((v: FormValues) => unknown) | undefined) {
  return typeof t === "string" ? TRANSFORMS[t] : t;
}

export async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issues = Array.isArray(j.issues) ? ` (${j.issues.map((i: { path?: string[]; message?: string }) => `${(i.path ?? []).join(".")}: ${i.message}`).join("؛ ")})` : "";
    throw new Error((j.message ?? `HTTP ${res.status}`) + issues);
  }
  return j;
}

/** Button that calls an admin API, shows the outcome inline, then refreshes server data. */
export function ApiButton({
  url, method = "POST", body, label, confirm: confirmText, variant = "secondary", className, onDone, describe,
}: {
  url: string; method?: string; body?: unknown; label: React.ReactNode; confirm?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string;
  onDone?: (r: unknown) => void; describe?: string | ((r: Json) => string);
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, start] = useTransition();
  const describeFn = resolveDescribe(describe);
  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <Button
        variant={variant}
        disabled={busy}
        onClick={async () => {
          if (confirmText && !window.confirm(confirmText)) return;
          setBusy(true);
          setMsg(null);
          try {
            const r = await api(url, method, body);
            setMsg({ ok: true, text: describeFn ? describeFn(r) : "تمّ" });
            onDone?.(r);
            start(() => router.refresh());
          } catch (e) {
            setMsg({ ok: false, text: (e as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {label}
      </Button>
      {msg ? <span role="status" className={cn("max-w-xs text-[11px]", msg.ok ? "text-emerald" : "text-rose")}>{msg.text}</span> : null}
    </span>
  );
}

export type Field =
  | { name: string; label: string; type: "text" | "url" | "number" | "date" | "datetime-local" | "password"; required?: boolean; placeholder?: string; step?: string; help?: string; defaultValue?: string }
  | { name: string; label: string; type: "textarea"; required?: boolean; placeholder?: string; rows?: number; help?: string; defaultValue?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; help?: string; defaultValue?: string }
  | { name: string; label: string; type: "checkbox"; help?: string; defaultValue?: string };

/** Generic form → JSON → admin API. `transform` maps raw string values to the API body. */
export function ApiForm({
  url, method = "POST", fields, submitLabel, transform, onDone, className, columns = 1, reset = true, describe,
}: {
  url: string; method?: string; fields: Field[]; submitLabel: string; transform?: string | ((v: FormValues) => unknown); onDone?: (r: Json) => void;
  className?: string; columns?: 1 | 2 | 3; reset?: boolean; describe?: string | ((r: Json) => string);
}) {
  const router = useRouter();
  const describeFn = resolveDescribe(describe);
  const transformFn = resolveTransform(transform);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className={cn("space-y-3", className)}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const v: Record<string, string | boolean> = {};
        for (const f of fields) v[f.name] = f.type === "checkbox" ? fd.get(f.name) === "on" : String(fd.get(f.name) ?? "");
        setBusy(true);
        setMsg(null);
        try {
          const r = await api(url, method, transformFn ? transformFn(v) : v);
          setMsg({ ok: true, text: describeFn ? describeFn(r) : "تم الحفظ" });
          if (reset) form.reset();
          onDone?.(r);
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className={cn("grid gap-3", columns === 2 && "md:grid-cols-2", columns === 3 && "md:grid-cols-3")}>
        {fields.map((f) => (
          <label key={f.name} className={cn("block text-xs text-ink-2", f.type === "textarea" && columns > 1 && "md:col-span-full")}>
            {f.type === "checkbox" ? (
              <span className="flex items-center gap-2">
                <input type="checkbox" name={f.name} defaultChecked={f.defaultValue === "true"} className="accent-cyan" /> {f.label}
              </span>
            ) : (
              <>
                {f.label}
                {"required" in f && f.required ? <span className="text-rose"> *</span> : null}
                {f.type === "textarea" ? (
                  <textarea name={f.name} required={f.required} placeholder={f.placeholder} rows={f.rows ?? 3} defaultValue={f.defaultValue} className={cn(inputCls, "mt-1")} />
                ) : f.type === "select" ? (
                  <select name={f.name} required={f.required} defaultValue={f.defaultValue} className={cn(inputCls, "mt-1")}>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input name={f.name} type={f.type} required={f.required} placeholder={f.placeholder} step={"step" in f ? f.step : undefined} defaultValue={f.defaultValue} dir={f.type === "url" || f.type === "number" ? "ltr" : undefined} className={cn(inputCls, "mt-1")} />
                )}
              </>
            )}
            {f.help ? <span className="mt-1 block text-[11px] text-muted">{f.help}</span> : null}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
        {msg ? <span role="status" className={cn("text-xs", msg.ok ? "text-emerald" : "text-rose")}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
