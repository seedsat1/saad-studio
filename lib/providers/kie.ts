/**
 * lib/providers/kie.ts — KIE AI Provider Runner
 *
 * KIE is the primary external AI provider for Saad Studio.
 * Docs: https://docs.kie.ai/1973359m0
 *
 * Env vars required:
 *   KIE_API_KEY   — primary key name
 *   KIEAI_API_KEY — alternative key name (either is accepted)
 *
 * Supported model routes:
 *   claude-sonnet-4-6  →  POST https://api.kie.ai/claude/v1/messages       (Anthropic format)
 *   gpt-5-4            →  POST https://api.kie.ai/codex/v1/responses        (Responses API)
 *   gemini-3-pro       →  POST https://api.kie.ai/gemini-3-pro/v1/chat/completions  (OAI-compat)
 *
 * This module is called only from lib/ai-engine.ts.
 * Feature routes (app/api/...) never import this file directly.
 */

import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import type { AiTaskConfig, AiEngineError as IAiEngineError } from "@/lib/ai-engine";

// Re-use the error class from the engine (imported lazily to avoid circular dep)
// We throw plain Error here; ai-engine wraps into AiEngineError.

// ─────────────────────────────────────────────────────────────────────────────
// KEY RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

function getKey(): string {
  const key = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
  if (!key) {
    throw new Error("KIE_API_KEY is not configured. Set KIE_API_KEY in your environment.");
  }
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT MESSAGE TYPE
// ─────────────────────────────────────────────────────────────────────────────

type Role = "system" | "user" | "assistant";
interface ChatMessage { role: Role; content: string }

// ─────────────────────────────────────────────────────────────────────────────
// MODEL RUNNERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Claude via KIE — Anthropic messages format.
 * Endpoint: POST https://api.kie.ai/claude/v1/messages
 * Docs: https://docs.kie.ai/1973359m0
 */
async function runClaude(messages: ChatMessage[], config: AiTaskConfig, key: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs  = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: config.modelId,
    stream: false,
    max_tokens: config.maxTokens,
    messages: chatMsgs,
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetchWithTimeout(
    "https://api.kie.ai/claude/v1/messages",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    50_000,
  );

  if (!res.ok) {
    throw new Error(`KIE Claude ${res.status}: ${await readErrorBody(res)}`);
  }

  const data = await res.json() as { content?: { type: string; text?: string }[] };
  const text = data?.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) throw new Error("KIE Claude returned an empty response.");
  return text.trim();
}

/**
 * GPT-5.4 via KIE Responses API.
 * Endpoint: POST https://api.kie.ai/codex/v1/responses
 * Docs: https://docs.kie.ai/1973359m0
 */
async function runGpt54(messages: ChatMessage[], config: AiTaskConfig, key: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs  = messages.filter((m) => m.role !== "system");

  // KIE Responses API uses an `input[]` array with typed content blocks
  const input: unknown[] = [];
  if (systemMsg) {
    input.push({ role: "system", content: [{ type: "input_text", text: systemMsg.content }] });
  }
  for (const m of chatMsgs) {
    input.push({ role: m.role, content: [{ type: "input_text", text: m.content }] });
  }

  const res = await fetchWithTimeout(
    "https://api.kie.ai/codex/v1/responses",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.modelId, stream: false, input, reasoning: { effort: "low" } }),
    },
    50_000,
  );

  if (!res.ok) {
    throw new Error(`KIE GPT-5.4 ${res.status}: ${await readErrorBody(res)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as Record<string, any>;

  type OutputBlock = { type: string; text?: string; content?: { type: string; text?: string }[] };
  const outputArr: OutputBlock[] | undefined =
    (data?.output as OutputBlock[] | undefined) ??
    (data?.response?.output as OutputBlock[] | undefined);

  const msgBlock = outputArr?.find((o) => o.type === "message");
  const text =
    msgBlock?.content?.find((c) => c.type === "output_text")?.text ??
    msgBlock?.content?.find((c) => c.type === "text")?.text ??
    msgBlock?.text ??
    data?.output_text ??
    data?.choices?.[0]?.message?.content ??
    "";

  if (!text) throw new Error("KIE GPT-5.4 returned an empty response.");
  return String(text).trim();
}

/**
 * Gemini 3 Pro via KIE — OpenAI-compatible chat completions.
 * Endpoint: POST https://api.kie.ai/gemini-3-pro/v1/chat/completions
 * Docs: https://docs.kie.ai/1973359m0
 */
async function runGemini(messages: ChatMessage[], config: AiTaskConfig, key: string): Promise<string> {
  const res = await fetchWithTimeout(
    "https://api.kie.ai/gemini-3-pro/v1/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        max_tokens: config.maxTokens,
      }),
    },
    50_000,
  );

  if (!res.ok) {
    throw new Error(`KIE Gemini ${res.status}: ${await readErrorBody(res)}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("KIE Gemini returned an empty response.");
  return String(text).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/** Known KIE chat model ids (not exhaustive — add as KIE expands their catalog). */
const KIE_CLAUDE_MODELS  = ["claude-sonnet-4-6", "claude-opus-4", "claude-haiku-3-5"];
const KIE_GPT54_MODELS   = ["gpt-5-4"];
const KIE_GEMINI_MODELS  = ["gemini-3-pro", "gemini-flash-2-5"];

/**
 * Run a task against the KIE AI provider.
 * Dispatches to the correct KIE endpoint based on config.modelId.
 *
 * @throws Error — caught and wrapped in AiEngineError by ai-engine.ts
 */
export async function runKieTask(config: AiTaskConfig, userInput: string): Promise<string> {
  const key = getKey();

  const messages: ChatMessage[] = [
    { role: "system", content: config.systemPrompt },
    { role: "user",   content: userInput },
  ];

  const modelId = config.modelId;

  if (KIE_CLAUDE_MODELS.some((m) => modelId.startsWith(m) || modelId === m)) {
    return runClaude(messages, config, key);
  }

  if (KIE_GPT54_MODELS.includes(modelId)) {
    return runGpt54(messages, config, key);
  }

  if (KIE_GEMINI_MODELS.some((m) => modelId.startsWith(m) || modelId === m)) {
    return runGemini(messages, config, key);
  }

  // Unknown model — attempt generic OpenAI-compatible endpoint as fallback
  // TODO: update KIE_CLAUDE_MODELS / KIE_GEMINI_MODELS as new models are added
  // Docs: https://docs.kie.ai/1973359m0
  throw new Error(
    `KIE provider does not recognise model "${modelId}". ` +
    `Check https://docs.kie.ai/1973359m0 and update lib/providers/kie.ts.`,
  );
}
