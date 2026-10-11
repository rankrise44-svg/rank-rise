import { Bot } from "lucide-react";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { configStatus } from "@/lib/env";

export const metadata = { title: "المحادثة الذكية" };

export default function AssistantPage() {
  const cfg = configStatus();
  return (
    <div className="space-y-4">
      <PageHeader title="المحادثة الذكية" subtitle="اسأل بالعربية أو الإنكليزية. يبحث المساعد في قاعدة بيانات المنصة عبر أدوات محددة، ويذكر المصدر والتاريخ لكل معلومة، ويعترف حين لا تكفي الأدلة." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <Card className="flex h-[calc(100dvh-14rem)] min-h-[520px] flex-col">
          <CardHeader icon={<Bot className="size-4 text-cyan" />} title="المساعد" subtitle={cfg.llmConfigured ? `المزوّد: ${cfg.llmProvider}` : "وضع الاسترجاع فقط"} />
          <AssistantChat configured={cfg.llmConfigured} />
        </Card>
        <div className="space-y-3">
          <Notice>
            <b>كيف يعمل:</b> 13 أداة على الخادم (بحث الأخبار، المؤشرات، الأسواق، الإشارات، القطاعات، الشركات، التوقعات، التقارير…) بمدخلات مُتحقَّق منها واستعلامات محدودة. لا يُرسل كامل قاعدة البيانات إلى النموذج، ولا تُنفَّذ أي SQL يكتبها النموذج.
          </Notice>
          <Notice tone="amber">
            <b>الإعداد:</b> عيّن <code>LLM_PROVIDER</code> (<code>anthropic</code> أو <code>openai_compatible</code> لنموذج محلي مثل Ollama) و<code>LLM_MODEL</code> و<code>LLM_API_KEY</code>/<code>LLM_BASE_URL</code> في ملف البيئة. دون ذلك يبقى المساعد في وضع الاسترجاع ويعرض الأدلة فقط.
          </Notice>
          <Notice tone="violet">
            المراجع [n] تُتحقَّق على الخادم: أي رقم مرجع لا يطابق مصدراً أعادته الأدوات يُحذف ويُشار إلى ذلك. نصوص الأخبار تُعامل كبيانات غير موثوقة وليست تعليمات.
          </Notice>
        </div>
      </div>
    </div>
  );
}
