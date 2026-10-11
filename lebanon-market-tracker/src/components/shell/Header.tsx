import Link from "next/link";
import { Bell, Bot, Search } from "lucide-react";
import { query } from "@/lib/db";
import { freshnessSummary } from "@/lib/repo/sources";
import { getSettings } from "@/lib/settings";
import { Badge, relativeAr } from "../ui";
import { MobileNav } from "./Sidebar";
import { Logo } from "./Logo";

async function headerData() {
  try {
    const [f, n] = await Promise.all([
      freshnessSummary(),
      query<{ n: string }>("SELECT count(*) AS n FROM notifications WHERE read_at IS NULL"),
    ]);
    return { f, unread: Number(n[0]?.n ?? 0), ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function Header() {
  const [d, settings] = await Promise.all([headerData(), getSettings()]);
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("ar-LB", { timeZone: settings.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" }).format(now);
  const timeStr = new Intl.DateTimeFormat("ar-LB", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit", numberingSystem: "latn" }).format(now);
  return (
    <header className="no-print sticky top-0 z-[500] border-b border-line bg-bg/85 backdrop-blur">
      <div className="flex items-center gap-3 px-3 py-2.5 md:px-5">
        <MobileNav />
        <Logo />
        <form action="/news" method="get" role="search" className="mx-auto hidden w-full max-w-xl md:block">
          <label className="relative block">
            <span className="sr-only">بحث</span>
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              placeholder="ابحث في الأخبار والمؤشرات… (الاقتصاد، الليرة، السياحة، العقارات)"
              className="w-full rounded-xl border border-line-strong bg-panel-2/80 py-2 pr-9 pl-3 text-sm text-ink placeholder:text-faint focus:border-cyan/60 focus:outline-none"
            />
          </label>
        </form>
        <div className="ms-auto flex items-center gap-2 md:ms-0">
          {d.ok ? (
            <Link href="/sources" className="hidden xl:block" title="حالة المصادر وحداثة البيانات">
              <Badge tone={d.f.failing ? "amber" : "emerald"}>
                {d.f.ok}/{d.f.enabled} مصادر تعمل
                {d.f.lastSuccess ? ` · آخر تحديث ${relativeAr(d.f.lastSuccess)}` : ""}
              </Badge>
            </Link>
          ) : (
            <Badge tone="rose">قاعدة البيانات غير متاحة</Badge>
          )}
          <div className="hidden text-left text-[11px] leading-tight text-muted sm:block" title={`المنطقة الزمنية: ${settings.timezone}`}>
            <div>{dateStr}</div>
            <div className="ltr-num">{timeStr} · {settings.timezone.split("/").pop()}</div>
          </div>
          <Link href="/assistant" className="rounded-lg p-2 text-ink-2 hover:bg-panel-3 hover:text-cyan" aria-label="المساعد الذكي">
            <Bot className="size-5" />
          </Link>
          <Link href="/settings#alerts" className="relative rounded-lg p-2 text-ink-2 hover:bg-panel-3 hover:text-cyan" aria-label={`التنبيهات${d.ok && d.unread ? ` (${d.unread} غير مقروءة)` : ""}`}>
            <Bell className="size-5" />
            {d.ok && d.unread ? <span className="absolute top-1 left-1 grid min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-bg">{d.unread > 99 ? "99+" : d.unread}</span> : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
