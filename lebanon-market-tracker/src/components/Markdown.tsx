import type { ReactNode } from "react";

/** Minimal Markdown renderer for our own generated reports (headings, lists, bold, links). No raw HTML. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-b${i++}`}>{m[1]}</strong>);
    else if (m[2]) out.push(<a key={`${key}-a${i++}`} href={m[2]} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-sky underline">{m[2]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={`l${blocks.length}`} className={`my-2 space-y-1 ps-6 ${list.ordered ? "list-decimal" : "list-disc"}`}>{list.items.map((t, i) => <li key={i} dir="auto">{inline(t, `li${blocks.length}-${i}`)}</li>)}</Tag>);
    list = null;
  };
  lines.forEach((l, idx) => {
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    const ul = /^\s*[-*]\s+(.*)$/.exec(l);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(l);
    if (h) {
      flush();
      const cls = h[1].length === 1 ? "mt-2 text-xl font-semibold" : h[1].length === 2 ? "mt-5 border-b border-line pb-1 text-base font-semibold" : "mt-3 text-sm font-semibold";
      blocks.push(<div key={idx} role="heading" aria-level={h[1].length} className={cls}>{inline(h[2], `h${idx}`)}</div>);
    } else if (ul || ol) {
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
    } else if (l.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push(<p key={idx} dir="auto" className="my-2 text-sm leading-relaxed">{inline(l, `p${idx}`)}</p>);
    }
  });
  flush();
  return <div className="text-ink-2">{blocks}</div>;
}
