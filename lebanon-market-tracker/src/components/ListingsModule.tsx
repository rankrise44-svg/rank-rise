import { Badge, Card, CardHeader, EmptyState, Notice } from "./ui";
import { query } from "@/lib/db";
import { fmtNum } from "@/lib/format";
import { safe } from "@/lib/safe";

/**
 * Listings (property / jobs / tenders). Shows observed listings when a lawful source has been configured;
 * otherwise explains exactly what is missing instead of showing placeholder data.
 */
export async function ListingsModule({ types, title, what }: { types: string[]; title: string; what: string }) {
  const r = await safe(() =>
    query<{ id: string; title: string; url: string | null; price: string | null; price_currency: string | null; price_type: string | null; area_key: string | null; first_seen_at: Date; last_seen_at: Date; status: string; source: string }>(
      `SELECT l.id, l.title, l.url, l.price, l.price_currency, l.price_type, l.area_key, l.first_seen_at, l.last_seen_at, l.status, s.name AS source
         FROM listings l JOIN sources s ON s.id = l.source_id WHERE l.listing_type = ANY($1) AND NOT l.is_synthetic AND l.duplicate_of IS NULL
        ORDER BY l.last_seen_at DESC LIMIT 50`,
      [types],
    ),
  );
  return (
    <Card>
      <CardHeader title={title} subtitle="يتتبّع كل إعلان عبر الزمن (أول ظهور، آخر ظهور، تغيّر السعر)" />
      <div className="p-3">
        {r.ok && r.data.length ? (
          <ul className="divide-y divide-line/60 text-sm">
            {r.data.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <a href={l.url ?? "#"} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-cyan" dir="auto">{l.title}</a>
                <span className="flex items-center gap-1 text-xs text-muted">
                  {l.price ? <span className="ltr-num">{fmtNum(l.price)} {l.price_currency}</span> : null}
                  <Badge tone="amber">{l.price_type === "asking" ? "سعر مطلوب" : l.price_type ?? "—"}</Badge>
                  {l.status === "stale" ? <Badge>قديم</Badge> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="لا يوجد مصدر إعلانات مفعّل">
            لم نتحقق بعد من مصدر عام يسمح قانونياً وتقنياً بجمع {what} آلياً (مع احترام شروط الاستخدام وملف robots.txt ودون تجاوز أي حماية). لإضافة مصدر: سجّل موصّلاً مخصصاً في سجل المصادر بعد مراجعة شروطه، أو اربط واجهة برمجية رسمية إن توفرت.
          </EmptyState>
        )}
        <div className="mt-3">
          <Notice tone="amber">أسعار الإعلانات أسعار مطلوبة وليست أسعار صفقات منجزة، وعيّنة الإعلانات منحازة وغير مكتملة؛ لا يُستنتج منها اتجاه أسعار دون الإفصاح عن هذه الحدود.</Notice>
        </div>
      </div>
    </Card>
  );
}
