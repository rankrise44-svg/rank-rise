import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/lib/assistant/orchestrator";
import { LlmProviderError } from "@/lib/assistant/providers/types";
import { clientIp, errorResponse, requireAdmin } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const body = z.object({
  question: z.string().trim().min(2).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(12).default([]),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    await rateLimit(`assistant:${clientIp(req)}`, 10, 10 / 60); // burst 10, then 10/min
    const { question, history } = body.parse(await req.json());
    const r = await answerQuestion(question, history);
    const answer = r.warnings.length ? `${r.answer}\n\n⚠️ ${r.warnings.join(" ")}` : r.answer;
    return NextResponse.json({ answer, mode: r.mode, citations: r.citations, tools: r.tools, model: r.model ?? null, intent: r.intent });
  } catch (e) {
    if (e instanceof LlmProviderError) {
      console.error(JSON.stringify({ level: "error", msg: "llm provider error", status: e.status, error: e.message }));
      return NextResponse.json({ error: "llm_error", message: `تعذّر الاتصال بمزوّد النموذج اللغوي${e.status ? ` (HTTP ${e.status})` : ""}. تحقق من الإعدادات.` }, { status: 502 });
    }
    return errorResponse(e);
  }
}
