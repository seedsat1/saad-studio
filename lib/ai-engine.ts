/**
 * lib/ai-engine.ts — Saad Studio Centralized AI Execution Layer
 *
 * All AI calls go through this file. Features never reference a provider directly.
 *
 * Provider: KIE AI (https://kie.ai) — env var: KIE_API_KEY
 *
 * Supported KIE model routes:
 *   gpt-5-4            →  POST https://api.kie.ai/codex/v1/responses
 *   claude-sonnet-4-6  →  POST https://api.kie.ai/claude/v1/messages
 *   gemini-3-pro       →  POST https://api.kie.ai/gemini-3-pro/v1/chat/completions
 *
 * To add a new task: add an entry to TASK_REGISTRY.
 * To switch the model for a task: edit modelId in TASK_REGISTRY, or set an env var.
 */

import { fetchWithTimeout, readErrorBody } from "@/lib/http";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AiTaskName =
  | "story_engine"
  // Future tasks:
  // | "caption_generator"
  // | "broll_suggester"
  // | "voiceover_script"
  // | "timeline_assistant"
  ;

/** KIE model identifiers */
export type KieModelId =
  | "gpt-5-4"
  | "claude-sonnet-4-6"
  | "gemini-3-pro";

export interface AiTaskConfig {
  name: string;
  systemPrompt: string;
  /** Primary KIE model id */
  modelId: KieModelId;
  /** Fallback KIE model if primary fails */
  fallbackModelId?: KieModelId;
  temperature?: number;
  maxTokens: number;
}

export interface AiRunInput {
  task: AiTaskName;
  input: string;
}

export interface AiRunResult {
  /** Raw string output from the model */
  content: string;
  /** The model id actually used (for credit ledger) */
  modelId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

const TASK_REGISTRY: Record<AiTaskName, AiTaskConfig> = {
  story_engine: {
    name: "Story Engine",
    // Override via STORY_ENGINE_MODEL env var, e.g. "gpt-5-4" or "gemini-3-pro"
    modelId: (process.env.STORY_ENGINE_MODEL as KieModelId) ?? "claude-sonnet-4-6",
    fallbackModelId: "gemini-3-pro",
    maxTokens: 1500,
    temperature: 0.3,
    systemPrompt: `You are an expert video editor and story analyst working inside Adobe Premiere Pro.
The user will paste a raw transcript of a video, possibly including speaker labels and timestamps.
Your job is to identify the best structural sections for a professional edit.

Respond ONLY with a valid JSON object — no markdown fences, no extra text.
Use this exact schema:

{
  "sections": [
    {
      "title": "<short section name, 2-5 words>",
      "start": "<HH:MM:SS or MM:SS — best guess from context, or '00:00:00' if none>",
      "end":   "<HH:MM:SS or MM:SS — best guess, or '00:00:00' if none>",
      "reason": "<one sentence explaining why this section matters to an editor>"
    }
  ]
}

Guidelines:
- Identify 4–8 distinct structural sections (hook, setup, conflict, resolution, CTA, etc.)
- If the transcript has timestamps, use them. If not, set start/end to "00:00:00".
- Keep titles concise and editorial. Keep reasons actionable for an editor.
- Do NOT include any text outside the JSON object.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KIE PROVIDER RUNNERS
// ─────────────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function getKieKey(): string {
  const key = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
  if (!key) throw new AiEngineError("KIE_API_KEY is not configured on the server.", "PROVIDER_NOT_CONFIGURED");
  return key;
}

/** GPT-5.4 via KIE Responses API */
async function runKieGpt54(messages: ChatMessage[], config: AiTaskConfig, key: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs  = messages.filter((m) => m.role !== "system");

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
      body: JSON.stringify({
        model: "gpt-5-4",
        stream: false,
        input,
        reasoning: { effort: "low" },
      }),
    },
    50_000,
  );

  if (!res.ok) {
    throw new AiEngineError(`KIE GPT-5.4 error ${res.status}: ${await readErrorBody(res)}`, "PROVIDER_ERROR");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyObj = Record<string, any>;
  type OutputBlock = { type: string; text?: string; content?: { type: string; text: string }[] };

  const data = await res.json() as AnyObj;
  const outputArr: OutputBlock[] | undefined =
    (data?.output as OutputBlock[] | undefined) ??
    (data?.response?.output as OutputBlock[] | undefined);

  const msgBlock = outputArr?.find((o) => o.type === "message");

  const text =
    msgBlock?.content?.find((c: { type: string; text?: string }) => c.type === "output_text")?.text ??
    msgBlock?.content?.find((c: { type: string; text?: string }) => c.type === "text")?.text ??
    msgBlock?.text ??
    data?.output_text ??
    data?.response?.output_text ??
    data?.choices?.[0]?.message?.content ??
    (data?.content as { type: string; text?: string }[] | undefined)?.find((c) => c.type === "text")?.text ??
    "";

  if (!text) throw new AiEngineError("KIE GPT-5.4 returned an empty response.", "EMPTY_RESPONSE");
  return String(text).trim();
}

/** Claude Sonnet 4.6 via KIE Anthropic format */
async function runKieClaude(messages: ChatMessage[], config: AiTaskConfig, key: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs  = messages.filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
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
    throw new AiEngineError(`KIE Claude error ${res.status}: ${await readErrorBody(res)}`, "PROVIDER_ERROR");
  }

  const data = await res.json() as { content?: { type: string; text?: string }[] };
  const text = data?.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) throw new AiEngineError("KIE Claude returned an empty response.", "EMPTY_RESPONSE");
  return text.trim();
}

/** Gemini 3 Pro via KIE OpenAI-compatible chat completions */
async function runKieGemini(messages: ChatMessage[], config: AiTaskConfig, key: string): Promise<string> {
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
    throw new AiEngineError(`KIE Gemini error ${res.status}: ${await readErrorBody(res)}`, "PROVIDER_ERROR");
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new AiEngineError("KIE Gemini returned an empty response.", "EMPTY_RESPONSE");
  return String(text).trim();
}

/** Dispatch to the correct KIE endpoint based on modelId */
async function runKie(config: AiTaskConfig, userInput: string): Promise<string> {
  const key = getKieKey();

  const messages: ChatMessage[] = [
    { role: "system", content: config.systemPrompt },
    { role: "user",   content: userInput },
  ];

  try {
    switch (config.modelId) {
      case "gpt-5-4":          return await runKieGpt54 (messages, config, key);
      case "claude-sonnet-4-6": return await runKieClaude(messages, config, key);
      case "gemini-3-pro":     return await runKieGemini(messages, config, key);
      default:
        throw new AiEngineError(`Unknown KIE model: "${config.modelId}"`, "UNKNOWN_PROVIDER");
    }
  } catch (err) {
    // Attempt fallback if primary failed and a fallback is defined
    if (
      config.fallbackModelId &&
      config.fallbackModelId !== config.modelId &&
      err instanceof AiEngineError &&
      err.code === "PROVIDER_ERROR"
    ) {
      console.warn(`[ai-engine] Primary model "${config.modelId}" failed, trying fallback "${config.fallbackModelId}"`);
      return await runKie({ ...config, modelId: config.fallbackModelId, fallbackModelId: undefined }, userInput);
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute an AI task through the centralized engine.
 *
 * @example
 * const result = await runAiTask({ task: "story_engine", input: transcript });
 * // result.content  — raw string output from model
 * // result.modelId  — which model was used (for ledger)
 */
export async function runAiTask(params: AiRunInput): Promise<AiRunResult> {
  const config = TASK_REGISTRY[params.task];
  if (!config) {
    throw new AiEngineError(`Unknown AI task: "${params.task}"`, "UNKNOWN_TASK");
  }

  const content = await runKie(config, params.input);

  return { content, modelId: config.modelId };
}

/**
 * Resolve the model ID for a task (for credit ledger logging before the call).
 */
export function resolveModelId(task: AiTaskName): string {
  return TASK_REGISTRY[task]?.modelId ?? "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CLASS
// ─────────────────────────────────────────────────────────────────────────────

export type AiEngineErrorCode =
  | "UNKNOWN_TASK"
  | "UNKNOWN_PROVIDER"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "EMPTY_RESPONSE"
  | "NOT_IMPLEMENTED";

export class AiEngineError extends Error {
  constructor(message: string, public readonly code: AiEngineErrorCode) {
    super(message);
    this.name = "AiEngineError";
  }
}

