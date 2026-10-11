"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV } from "@/lib/nav";
import { cn } from "../ui";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="التنقل الرئيسي" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon];
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition",
              active ? "bg-gradient-to-l from-sky/20 to-cyan/5 text-ink ring-1 ring-sky/30" : "text-ink-2 hover:bg-panel-3/70 hover:text-ink",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-cyan" : "text-muted group-hover:text-ink-2")} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-l border-line bg-panel/80 px-3 py-4 backdrop-blur lg:flex">
      <div className="scroll-thin flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="mt-3 rounded-lg border border-line bg-panel-2/70 p-3 text-[11px] leading-relaxed text-muted">
        كل رقم معروض مرتبط بمصدره وتاريخه. حين لا تتوفر بيانات، تعرض المنصة ذلك بوضوح بدل تقديرها.
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-2 hover:bg-panel-3">
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[1000] flex" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative ms-auto h-full w-72 overflow-y-auto border-l border-line bg-panel p-3">
            <div className="mb-3 flex justify-end">
              <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-2 hover:bg-panel-3">
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
