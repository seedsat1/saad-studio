/**
 * lib/ai-engine.ts — Saad Studio Centralized AI Execution Layer
 *
 * Decouples features from AI providers.
 *
 * Usage:
 *   const result = await runAiTask({ task: "story_engine", input: transcript });
 *   // result.content  — raw model output (string)
 *   // result.modelId  — which model was actually used (for ledger)
 *   // result.provider — "openai" | "kie" | "local" | ...
 *
 * The caller (route.ts) never references a model name or provider directly.
 *
 * To switch models system-wide: change TASK_REGISTRY or set env vars.
 * To add a new task: add an entry to TASK_REGISTRY.
 * To add a new provider: add a runner to PROVIDERS.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AiTaskName =
  | "story_engine"
  // Future tasks registered here:
  // | "caption_generator"
  // | "broll_suggester"
  // | "voiceover_script"
  // | "timeline_assistant"
  ;

export type AiProvider = "openai" | "kie" | "local";

export interface AiTaskConfig {
  /** Human-readable task name */
  name: string;
  /** System prompt for chat-based models */
  systemPrompt: string;
  /** Preferred provider key */
  provider: AiProvider;
  /** Provider-specific model identifier */
  modelId: string;
  /** Fallback model if primary is unavailable */
  fallbackModelId?: string;
  /** Temperature (0–1). Lower = more deterministic. */
  temperature: number;
  /** Max output tokens */
  maxTokens: number;
}

export interface AiRunInput {
  task: AiTaskName;
  /** User-supplied text to process */
  input: string;
}

export interface AiRunResult {
  /** Raw string output from the model */
  content: string;
  /** The model id that was actually used (for credit ledger) */
  modelId: string;
  /** The provider that handled the request */
  provider: AiProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK REGISTRY
// Centralizes all task configs. To change the model for a task, edit here.
// ─────────────────────────────────────────────────────────────────────────────

const TASK_REGISTRY: Record<AiTaskName, AiTaskConfig> = {
  story_engine: {
    name: "Story Engine",
    provider: "openai",
    // Override model via STORY_ENGINE_MODEL env var (e.g. "gpt-4o", "gpt-4.1-mini")
    modelId: process.env.STORY_ENGINE_MODEL ?? "gpt-4o-mini",
    fallbackModelId: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 1500,
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
// PROVIDER RUNNERS
// Each provider receives: config + user input → returns raw string content
// ─────────────────────────────────────────────────────────────────────────────

async function runOpenAI(config: AiTaskConfig, input: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiEngineError("AI service not configured.", "PROVIDER_NOT_CONFIGURED");

  const body = {
    model: config.modelId,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user",   content: input },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = errBody?.error?.message ?? `Provider error ${res.status}`;

    // Attempt fallback if primary model failed and fallback is different
    if (config.fallbackModelId && config.fallbackModelId !== config.modelId) {
      const fallback = { ...config, modelId: config.fallbackModelId };
      return runOpenAI(fallback, input);
    }
    throw new AiEngineError(msg, "PROVIDER_ERROR");
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new AiEngineError("Provider returned empty response.", "EMPTY_RESPONSE");
  return content;
}

// Provider dispatch map
const PROVIDERS: Record<AiProvider, (config: AiTaskConfig, input: string) => Promise<string>> = {
  openai: runOpenAI,
  // Future providers wired here — route.ts never changes
  kie:   (_c, _i) => Promise.reject(new AiEngineError("KIE text provider not yet implemented.", "NOT_IMPLEMENTED")),
  local: (_c, _i) => Promise.reject(new AiEngineError("Local provider not yet implemented.", "NOT_IMPLEMENTED")),
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run an AI task through the centralized engine.
 *
 * @example
 * const result = await runAiTask({ task: "story_engine", input: transcript });
 * // result.content  — raw string from model
 * // result.modelId  — what was actually used (log/ledger)
 * // result.provider — "openai" | ...
 */
export async function runAiTask(params: AiRunInput): Promise<AiRunResult> {
  const config = TASK_REGISTRY[params.task];
  if (!config) {
    throw new AiEngineError(`Unknown AI task: "${params.task}"`, "UNKNOWN_TASK");
  }

  const runner = PROVIDERS[config.provider];
  if (!runner) {
    throw new AiEngineError(`No runner for provider: "${config.provider}"`, "UNKNOWN_PROVIDER");
  }

  const content = await runner(config, params.input);

  return {
    content,
    modelId:  config.modelId,
    provider: config.provider,
  };
}

/**
 * Resolve the model ID that will be used for a task (for credit ledger logging).
 * Call this before runAiTask to determine the cost model string.
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
