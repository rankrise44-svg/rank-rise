import clsx from "clsx";
import { AlertTriangle, Clock, Database, FlaskConical, Info, SearchX, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

export function cn(...a: Parameters<typeof clsx>) {
  return clsx(...a);
}

export function Card({ className, children, as: As = "section", ...rest }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" } & Record<string, unknown>) {
  return (
    <As className={cn("rounded-xl border border-line bg-panel/90 shadow-[0_0_0_1px_rgba(255,255,255,0.01),0_10px_30px_-15px_rgba(0,0,0,0.6)] backdrop-blur-sm", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, subtitle, actions, icon }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {icon}
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

const TONES = {
  neutral: "border-line-strong bg-panel-3/60 text-ink-2",
  cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  emerald: "border-emerald/30 bg-emerald/10 text-emerald",
  amber: "border-amber/30 bg-amber/10 text-amber",
  rose: "border-rose/30 bg-rose/10 text-rose",
  violet: "border-violet/30 bg-violet/10 text-violet",
  sky: "border-sky/30 bg-sky/10 text-sky",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...rest
}: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-cyan/90 text-bg hover:bg-cyan",
        variant === "secondary" && "border border-line-strong bg-panel-2 text-ink hover:border-cyan/40 hover:bg-panel-3",
        variant === "ghost" && "text-ink-2 hover:bg-panel-3 hover:text-ink",
        variant === "danger" && "border border-rose/40 bg-rose/10 text-rose hover:bg-rose/20",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line-strong bg-panel-2 px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-cyan/60 focus:outline-none";

/** Empty state: no data has been collected yet (never filled with invented values). */
export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <div className="text-faint">{icon ?? <Database className="size-6" />}</div>
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {children ? <div className="max-w-md text-xs leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "تعذّر تحميل البيانات", message }: { title?: string; message?: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        {message ? <p className="mt-0.5 text-xs text-rose/80">{message}</p> : null}
      </div>
    </div>
  );
}

export function NoResults({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-muted">
      <SearchX className="size-4" />
      {children}
    </div>
  );
}

export function Notice({ tone = "sky", children, icon }: { tone?: "sky" | "amber" | "rose" | "violet"; children: ReactNode; icon?: ReactNode }) {
  const Icon = tone === "amber" ? ShieldAlert : tone === "rose" ? AlertTriangle : tone === "violet" ? FlaskConical : Info;
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed", TONES[tone])}>
      <span className="mt-0.5 shrink-0">{icon ?? <Icon className="size-4" />}</span>
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-panel-3/70", className)} />;
}

export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="جارٍ التحميل">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  );
}

/** Freshness indicator: compares the last observation with how often the source is expected to update. */
export function Freshness({ at, expectedHours, label }: { at: Date | string | null | undefined; expectedHours: number; label?: string }) {
  if (!at) return <Badge tone="rose">لا بيانات</Badge>;
  const d = typeof at === "string" ? new Date(at) : at;
  const ageH = (Date.now() - d.getTime()) / 3600_000;
  const stale = ageH > expectedHours * 1.5;
  return (
    <Badge tone={stale ? "amber" : "emerald"} title={d.toISOString()}>
      <Clock className="size-3" />
      {label ?? (stale ? "بيانات قديمة" : "محدّثة")} · {relativeAr(d)}
    </Badge>
  );
}

export function relativeAr(d: Date, now = Date.now()) {
  const s = Math.round((now - d.getTime()) / 1000);
  if (s < 60) return "الآن";
  const m = Math.round(s / 60);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60);
  if (h < 48) return `قبل ${h} س`;
  const days = Math.round(h / 24);
  if (days < 60) return `قبل ${days} يوم`;
  const months = Math.round(days / 30);
  if (months < 24) return `قبل ${months} شهر`;
  return `قبل ${Math.round(months / 12)} سنة`;
}

export const PROVENANCE_LABEL: Record<string, { label: string; tone: Tone }> = {
  official: { label: "رسمي", tone: "emerald" },
  third_party: { label: "طرف ثالث", tone: "sky" },
  inferred: { label: "مستنتج", tone: "violet" },
  user: { label: "إدخال يدوي", tone: "amber" },
};

export const RATE_TYPE_LABEL: Record<string, { label: string; tone: Tone }> = {
  official: { label: "سعر رسمي", tone: "emerald" },
  reference: { label: "سعر مرجعي", tone: "sky" },
  market: { label: "سعر سوق", tone: "cyan" },
  third_party_quote: { label: "تسعير طرف ثالث", tone: "sky" },
  parallel: { label: "سوق موازية", tone: "amber" },
  user_entered: { label: "إدخال يدوي", tone: "amber" },
};

export function SourceTag({ name, url, provenance }: { name: string; url?: string | null; provenance?: string | null }) {
  const p = provenance ? PROVENANCE_LABEL[provenance] : null;
  const inner = (
    <>
      <span className="truncate">{name}</span>
      {p ? <Badge tone={p.tone}>{p.label}</Badge> : null}
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted hover:text-cyan">
      {inner}
    </a>
  ) : (
    <span className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted">{inner}</span>
  );
}

export function SyntheticBadge() {
  return (
    <Badge tone="violet" title="بيانات اصطناعية لأغراض العرض في وضع التطوير فقط">
      <FlaskConical className="size-3" /> بيانات تجريبية
    </Badge>
  );
}

export function InferredBadge({ title = "استنتاج آلي من النظام وليس معلومة منشورة من المصدر" }: { title?: string }) {
  return (
    <Badge tone="violet" title={title}>
      مستنتج آلياً
    </Badge>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink md:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ value, unit, className }: { value: string; unit?: string; className?: string }) {
  return (
    <span className={cn("ltr-num font-semibold tracking-tight", className)}>
      {value}
      {unit ? <span className="ms-1 text-[0.6em] font-medium text-muted">{unit}</span> : null}
    </span>
  );
}
