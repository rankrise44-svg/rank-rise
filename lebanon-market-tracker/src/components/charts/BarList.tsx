/** Horizontal bars rendered with plain CSS (server-friendly). */
export function BarList({ items, color = "bg-sky/70" }: { items: { label: string; value: number; hint?: string }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-ink-2" title={i.label}>{i.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-panel-3">
            <span className={`block h-full rounded-full ${color}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="ltr-num w-10 text-left text-muted" title={i.hint}>{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
