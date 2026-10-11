import Link from "next/link";

/** Cedar-inspired mark drawn inline (no external assets). */
export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Lebanon Market Tracker — الرئيسية">
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
        <defs>
          <linearGradient id="lmt-g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="10" fill="#0f192c" stroke="#27395a" />
        <path d="M20 6 L27 14 H23 L30 21 H25 L32 28 H8 L15 21 H10 L17 14 H13 Z" fill="url(#lmt-g)" />
        <rect x="18.5" y="28" width="3" height="6" rx="1" fill="#34d399" />
      </svg>
      <div className="hidden leading-tight sm:block">
        <div className="text-[15px] font-semibold text-ink" dir="ltr">Lebanon Market Tracker</div>
        <div className="text-[11px] text-muted">منصة استخبارات الأسواق اللبنانية</div>
      </div>
    </Link>
  );
}
