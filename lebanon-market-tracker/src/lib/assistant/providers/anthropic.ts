import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types";
import { LlmProviderError, wrapToolOutput } from "./types";

/**
 * Anthropic Messages API via the official SDK. Manual tool loop (shared orchestration with other providers).
 * Server-side refusal fallback is enabled (`fallbacks: "default"`) so a safety decline can be re-served
 * by a fallback model inside the same call; a final refusal is reported honestly.
 */
export function anthropicProvider(opts: { apiKey: string; model?: string; baseURL?: string }): LlmProvider {
  const client = new Anthropic({ apiKey: opts.apiKey, baseURL: opts.baseURL, timeout: 120_000, maxRetries: 2 });
  const model = opts.model || "claude-opus-5-5";
  return {
    id: "anthropic",
    model,
    async runToolLoop({ system, history, question, tools, execute, maxRounds }) {
      const messages: Anthropic.Beta.BetaMessageParam[] = [...history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content: question }];
      const toolCalls: { name: string; ok: boolean }[] = [];
      const betaTools: Anthropic.Beta.BetaTool[] = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Beta.BetaTool.InputSchema }));
      for (let round = 0; round <= maxRounds; round++) {
        const res = await client.beta.messages
          .create({
          model,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          // On the final round, tools are withheld so the model must answer from what it has gathered.
          ...(round < maxRounds ? { tools: betaTools, tool_choice: { type: "auto" } } : {}),
          messages,
          })
          .catch((e: unknown) => {
            if (e instanceof Anthropic.APIError) throw new LlmProviderError(`Anthropic API error ${e.status ?? ""}: ${e.message.slice(0, 200)}`, e.status ?? null);
            throw e;
          });
        const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        if (res.stop_reason === "refusal") {
          return { text: "تعذّر على النموذج الإجابة عن هذا الطلب.", model: res.model, stopReason: "refusal", toolCalls };
        }
        if (res.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: res.content });
          continue;
        }
        const toolUses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
        if (res.stop_reason !== "tool_use" || !toolUses.length) {
          return { text: text || "(لم يُرجع النموذج نصاً)", model: res.model, stopReason: res.stop_reason ?? "end_turn", toolCalls };
        }
        messages.push({ role: "assistant", content: res.content });
        // Execute all requested tools concurrently and return every result in one user message.
        const results = await Promise.all(
          toolUses.map(async (tu) => {
            const r = await execute(tu.name, tu.input);
            toolCalls.push({ name: tu.name, ok: r.ok });
            return { type: "tool_result" as const, tool_use_id: tu.id, content: wrapToolOutput(r.content), is_error: !r.ok };
          }),
        );
        messages.push({ role: "user", content: results });
      }
      return { text: "تجاوز المساعد الحد الأقصى لجولات البحث دون إجابة نهائية.", model, stopReason: "max_rounds", toolCalls };
    },
  };
}
