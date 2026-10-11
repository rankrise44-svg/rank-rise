/** Display formatting. Latin digits are used throughout (as in the design reference) for scannability. */
export function fmtNum(v: number | string | null | undefined, opts: { digits?: number; compact?: boolean } = {}): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (opts.compact && abs >= 1e9) return `${(n / 1e9).toFixed(1)} مليار`;
  if (opts.compact && abs >= 1e6) return `${(n / 1e6).toFixed(1)} مليون`;
  const digits = opts.digits ?? (abs >= 1000 ? 0 : abs >= 10 ? 1 : 2);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

export function fmtPct(v: number | string | null | undefined, digits = 1, signed = true): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${signed && n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function fmtDate(d: Date | string | null | undefined, tz = "Asia/Beirut", withTime = false): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-LB", {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    numberingSystem: "latn",
  }).format(date);
}

export function fmtPeriod(label: string, frequency?: string): string {
  if (frequency === "monthly" || /^\d{4}-\d{2}$/.test(label)) {
    const [y, m] = label.split("-").map(Number);
    return new Intl.DateTimeFormat("ar-LB", { year: "numeric", month: "long", numberingSystem: "latn", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  }
  return label;
}

export const LANG_LABEL: Record<string, string> = { ar: "عربي", en: "English", fr: "Français" };
