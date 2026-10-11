import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Card, Notice } from "@/components/ui";
import { queryOne } from "@/lib/db";
import { PrintButton } from "./PrintButton";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const r = await queryOne<{ title: string; content_md: string; generated_by: string; created_at: Date }>("SELECT title, content_md, generated_by, created_at FROM reports WHERE id = $1", [id]);
  if (!r) notFound();
  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap gap-2">
        <a href={`/api/reports/${id}`} className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-panel-2 px-3 py-1.5 text-sm hover:border-cyan/40"><Download className="size-4" /> تنزيل Markdown</a>
        <PrintButton />
      </div>
      <Card className="p-5 md:p-8"><Markdown source={r.content_md} /></Card>
      <Notice>أُعدّ بواسطة: {r.generated_by} — {r.created_at.toISOString()}</Notice>
    </div>
  );
}
