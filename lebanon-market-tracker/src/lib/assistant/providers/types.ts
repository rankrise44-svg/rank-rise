export type ToolSpec = { name: string; description: string; input_schema: Record<string, unknown> };
export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ToolExecutor = (name: string, input: unknown) => Promise<{ ok: boolean; content: string }>;

export type LoopResult = {
  text: string;
  model: string;
  stopReason: string;
  toolCalls: { name: string; ok: boolean }[];
};

/** Provider-neutral contract: run a tool-use conversation to completion and return the final text. */
export interface LlmProvider {
  id: "anthropic" | "openai_compatible";
  model: string;
  runToolLoop(args: { system: string; history: ChatTurn[]; question: string; tools: ToolSpec[]; execute: ToolExecutor; maxRounds: number }): Promise<LoopResult>;
}

/** Tool output is wrapped so the model can tell untrusted third-party data from instructions. */
export function wrapToolOutput(content: string) {
  return `<tool_output trust="untrusted-data">\n${content}\n</tool_output>`;
}

/** Raised when the configured model endpoint fails (auth, rate limit, outage, bad response). */
export class LlmProviderError extends Error {
  constructor(message: string, public status: number | null) {
    super(message);
    this.name = "LlmProviderError";
  }
}
