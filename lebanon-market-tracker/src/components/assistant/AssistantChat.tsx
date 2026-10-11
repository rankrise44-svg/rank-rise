"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, ExternalLink, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge, Button, cn } from "../ui";

export type Citation = { id: string; title: string; url: string | null; source: string; date: string | null; kind: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  mode?: "llm" | "retrieval_only";
  citations?: Citation[];
  sections?: { facts?: string[]; interpretation?: string[]; uncertainty?: string[] };
  tools?: string[];
  error?: boolean;
};

const SUGGESTIONS = [
  "ما أبرز التطورات الاقتصادية في لبنان خلال آخر 24 ساعة؟",
  "ما هو اتجاه التضخم في لبنان؟",
  "كيف يتحرك سعر صرف الليرة الرسمي مقابل الموازي؟",
  "ما الإشارات التي تغيّرت بشكل ملحوظ هذا الأسبوع؟",
  "قارن بين قطاع السياحة وقطاع الطاقة",
];

/**
 * Chat UI. The answer text is rendered as plain text (no HTML injection); citations are links to the
 * original sources returned by the server-side retrieval tools.
 */
export function AssistantChat({ compact = false, configured }: { compact?: boolean; configured: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [msgs]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "user", content: question }]);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, history }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message ?? "تعذّر الحصول على إجابة");
      setMsgs((m) => [...m, { role: "assistant", content: j.answer, mode: j.mode, citations: j.citations, sections: j.sections, tools: j.tools }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!configured ? (
        <p className="mx-3 mt-3 rounded-lg border border-amber/30 bg-amber/10 p-2 text-[11px] leading-relaxed text-amber">
          نموذج المحادثة غير مُعدّ. يعمل المساعد الآن بوضع «الاسترجاع فقط»: يعرض الأدلة المطابقة من قاعدة البيانات مع مصادرها دون صياغة تحليل.
        </p>
      ) : null}
      <div className={cn("scroll-thin flex-1 space-y-3 overflow-y-auto p-3", compact ? "max-h-[460px]" : "")} aria-live="polite">
        {msgs.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">اسأل بالعربية أو الإنكليزية. كل إجابة تفصل بين الحقائق المسترجعة والتفسير وحدود اليقين.</p>
            {SUGGESTIONS.slice(0, compact ? 3 : 5).map((s) => (
              <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border border-line bg-panel-2/70 px-3 py-2 text-start text-xs text-ink-2 hover:border-cyan/40 hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ms-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-gradient-to-l from-sky/80 to-violet/60 px-3 py-2 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className={cn("max-w-[98%] rounded-2xl rounded-tr-sm border px-3 py-2 text-sm", m.error ? "border-rose/40 bg-rose/10 text-rose" : "border-line bg-panel-2 text-ink")}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                <Bot className="size-3.5 text-cyan" />
                {m.mode === "retrieval_only" ? <Badge tone="amber">استرجاع فقط — بلا نموذج لغوي</Badge> : m.mode === "llm" ? <Badge tone="sky">تحليل بنموذج لغوي مع أدلة</Badge> : null}
                {m.tools?.length ? <span title={m.tools.join(", ")}>· {m.tools.length} أداة</span> : null}
              </div>
              <div dir="auto" className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              {m.citations?.length ? (
                <div className="mt-2 border-t border-line pt-2">
                  <p className="mb-1 text-[11px] font-medium text-ink-2">المصادر</p>
                  <ol className="space-y-1 text-[11px]">
                    {m.citations.map((c) => (
                      <li key={c.id} className="flex items-start gap-1">
                        <span className="ltr-num text-faint">[{c.id}]</span>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="text-sky hover:underline" dir="auto">
                            {c.title} <ExternalLink className="inline size-3" />
                          </a>
                        ) : (
                          <span dir="auto">{c.title}</span>
                        )}
                        <span className="text-muted">— {c.source}{c.date ? ` · ${c.date}` : ""}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {!m.error ? (
                <div className="mt-1 flex gap-1 text-faint">
                  <button aria-label="مفيد" className="rounded p-1 hover:text-emerald"><ThumbsUp className="size-3.5" /></button>
                  <button aria-label="غير مفيد" className="rounded p-1 hover:text-rose"><ThumbsDown className="size-3.5" /></button>
                </div>
              ) : null}
            </div>
          ),
        )}
        {busy ? <div className="text-xs text-muted">جارٍ البحث في قاعدة البيانات…</div> : null}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-line p-3"
      >
        <label className="sr-only" htmlFor={`ask-${compact ? "c" : "f"}`}>سؤالك</label>
        <input
          id={`ask-${compact ? "c" : "f"}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="اكتب سؤالك هنا…"
          className="min-w-0 flex-1 rounded-xl border border-line-strong bg-panel-2 px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-cyan/60 focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={busy || !input.trim()} aria-label="إرسال">
          <Send className="size-4 -scale-x-100" />
        </Button>
      </form>
    </div>
  );
}
