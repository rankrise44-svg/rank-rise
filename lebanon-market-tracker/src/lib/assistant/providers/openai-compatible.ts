import { z } from "zod";
import type { LlmProvider } from "./types";
import { LlmProviderError, wrapToolOutput } from "./types";

/**
 * Any server exposing an OpenAI-style /chat/completions endpoint with function calling — e.g. a local
 * open-source model served by Ollama, llama.cpp or vLLM, or a compatible third-party API.
 */
const toolCall = z.object({ id: z.string(), type: z.literal("function").optional(), function: z.object({ name: z.string(), arguments: z.string() }) });
const response = z.object({
  model: z.string().optional(),
  choices: z.array(z.object({ finish_reason: z.string().nullable().optional(), message: z.object({ content: z.string().nullable().optional(), tool_calls: z.array(toolCall).nullable().optional() }) })).min(1),
});

type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: z.infer<typeof toolCall>[] }
  | { role: "tool"; tool_call_id: string; content: string };

export function openAiCompatibleProvider(opts: { baseURL: string; model: string; apiKey?: string }): LlmProvider {
  const url = `${opts.baseURL.replace(/\/$/, "")}/chat/completions`;
  return {
    id: "openai_compatible",
    model: opts.model,
    async runToolLoop({ system, history, question, tools, execute, maxRounds }) {
      const messages: Msg[] = [{ role: "system", content: system }, ...history, { role: "user", content: question }];
      const toolCalls: { name: string; ok: boolean }[] = [];
      for (let round = 0; round <= maxRounds; round++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 180_000);
        let raw: unknown;
        try {
          const res = await fetch(url, {
            method: "POST",
            signal: ctrl.signal,
            headers: { "Content-Type": "application/json", ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}) },
            body: JSON.stringify({
              model: opts.model,
              messages,
              temperature: 0.2,
              ...(round < maxRounds ? { tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })), tool_choice: "auto" } : {}),
            }),
          });
          if (!res.ok) throw new LlmProviderError(`LLM endpoint returned HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`, res.status);
          raw = await res.json();
        } catch (e) {
          if (e instanceof LlmProviderError) throw e;
          throw new LlmProviderError(`Could not reach the LLM endpoint: ${(e as Error).message}`, null);
        } finally {
          clearTimeout(timer);
        }
        const parsed = response.safeParse(raw);
        if (!parsed.success) throw new LlmProviderError("LLM endpoint returned an unexpected response shape", null);
        const msg = parsed.data.choices[0].message;
        const calls = msg.tool_calls ?? [];
        if (!calls.length) return { text: (msg.content ?? "").trim() || "(لم يُرجع النموذج نصاً)", model: parsed.data.model ?? opts.model, stopReason: parsed.data.choices[0].finish_reason ?? "stop", toolCalls };
        messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
        for (const c of calls) {
          let input: unknown = {};
          try {
            input = JSON.parse(c.function.arguments || "{}");
          } catch {
            input = { __invalid_json: true };
          }
          const r = await execute(c.function.name, input);
          toolCalls.push({ name: c.function.name, ok: r.ok });
          messages.push({ role: "tool", tool_call_id: c.id, content: wrapToolOutput(r.content) });
        }
      }
      return { text: "تجاوز المساعد الحد الأقصى لجولات البحث دون إجابة نهائية.", model: opts.model, stopReason: "max_rounds", toolCalls };
    },
  };
}
