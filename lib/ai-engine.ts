/**
 * lib/ai-engine.ts — Saad Studio Centralized AI Execution Layer
 *
 * ─ Architecture ────────────────────────────────────────────────────────────
 *
 *   Feature Route (app/api/...)
 *        │
 *        ▼
 *   runAiTask({ task, input })          ← this file
 *        │  reads TASK_REGISTRY
 *        ▼
 *   Provider Runner (lib/providers/*)
 *        │  kie.ts  |  local.ts  |  mock.ts
 *        ▼
 *   External AI API (KIE / local model / mock)
 *
 * ─ Provider selection ──────────────────────────────────────────────────────
 *
 *   Global default  →  AI_PROVIDER=kie
 *   Per-task        →  STORY_ENGINE_PROVIDER=kie
 *   Per-task model  →  STORY_ENGINE_MODEL=claude-sonnet-4-6
 *
 * ─ Adding a new task ───────────────────────────────────────────────────────
 *   1. Add the task name to AiTaskName union.
 *   2. Add an entry to TASK_REGISTRY.
 *   3. Feature route calls runAiTask({ task: "your_task", input: "..." }).
 *
 * ─ Adding a new provider ───────────────────────────────────────────────────
 *   1. Create lib/providers/<name>.ts  exporting  runXxxTask(config, input)
 *   2. Import it here and add to PROVIDERS map.
 *   3. Set AI_PROVIDER=<name> in env.
 */

import { runKieTask }   from "@/lib/providers/kie";
import { runLocalTask } from "@/lib/providers/local";
import { runMockTask }  from "@/lib/providers/mock";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AiTaskName =
  | "story_engine"
  // Extend here as new Saad Studio features are added:
  // | "caption_generator"
  // | "broll_suggester"
  // | "voiceover_script"
  // | "timeline_assistant"
  ;

/** Provider identifiers — KIE is the primary external provider. */
export type AiProvider = "kie" | "local" | "mock";

export interface AiTaskConfig {
  /** Human-readable feature name (used for mock key + logging) */
  name: string;
  /** Chat system prompt */
  systemPrompt: string;
  /** Provider to use for this task */
  provider: AiProvider;
  /** Provider-specific model identifier (e.g. "claude-sonnet-4-6") */
  modelId: string;
  /** Fallback model id if the primary call fails */
  fallbackModelId?: string;
  /** Sampling temperature 0–1 */
  temperature: number;
  /** Max output tokens */
  maxTokens: number;
  /** Credits deducted per call (informational — enforced in the route) */
  creditCost: number;
}

export interface AiRunInput {
  task: AiTaskName;
  input: string;
}

export interface AiRunResult {
  content:  string;
  modelId:  string;
  provider: AiProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
//
// Provider resolution order for each task:
//   1. STORY_ENGINE_PROVIDER env var  (per-task override)
//   2. AI_PROVIDER env var            (global override)
//   3. registry default               (KIE)
//
// Model resolution order:
//   1. STORY_ENGINE_MODEL env var     (per-task override)
//   2. registry default

function resolveProvider(envKey: string, fallback: AiProvider): AiProvider {
  const v = process.env[envKey] ?? process.env.AI_PROVIDER ?? fallback;
  if (v === "kie" || v === "local" || v === "mock") return v;
  console.warn(`[ai-engine] Unknown provider value "${v}" for ${envKey}, using "${fallback}"`);
  return fallback;
}

const TASK_REGISTRY: Record<AiTaskName, AiTaskConfig> = {
  story_engine: {
    name:        "Story Engine",
    provider:    resolveProvider("STORY_ENGINE_PROVIDER", "kie"),
    modelId:     process.env.STORY_ENGINE_MODEL ?? "claude-sonnet-4-6",
    fallbackModelId: "gemini-3-pro",
    temperature: 0.3,
    maxTokens:   1500,
    creditCost:  5,
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
// PROVIDER DISPATCH MAP
// ─────────────────────────────────────────────────────────────────────────────

type ProviderRunner = (config: AiTaskConfig, input: string) => Promise<string>;

const PROVIDERS: Record<AiProvider, ProviderRunner> = {
  kie:   runKieTask,
  local: runLocalTask,
  mock:  runMockTask,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute an AI task through the centralized engine.
 *
 * @example
 * const result = await runAiTask({ task: "story_engine", input: transcript });
 * // result.content  — raw string from the model
 * // result.modelId  — which model was used (for credit ledger)
 * // result.provider — which provider handled it
 */
export async function runAiTask(params: AiRunInput): Promise<AiRunResult> {
  const config = TASK_REGISTRY[params.task];
  if (!config) {
    throw new AiEngineError(`Unknown AI task: "${params.task}"`, "UNKNOWN_TASK");
  }

  const runner = PROVIDERS[config.provider];
  if (!runner) {
    throw new AiEngineError(`No runner registered for provider: "${config.provider}"`, "UNKNOWN_PROVIDER");
  }

  let content: string;
  try {
    content = await runner(config, params.input);
  } catch (primaryErr) {
    // Attempt fallback model on provider errors (same provider, different model)
    if (config.fallbackModelId && config.fallbackModelId !== config.modelId) {
      console.warn(
        `[ai-engine] Primary model "${config.modelId}" failed, retrying with fallback "${config.fallbackModelId}"`,
        primaryErr,
      );
      try {
        content = await runner({ ...config, modelId: config.fallbackModelId }, params.input);
      } catch (fallbackErr) {
        throw new AiEngineError(
          `Both primary ("${config.modelId}") and fallback ("${config.fallbackModelId}") models failed.`,
          "PROVIDER_ERROR",
        );
      }
    } else {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      throw new AiEngineError(msg, "PROVIDER_ERROR");
    }
  }

  if (!content) {
    throw new AiEngineError("Provider returned an empty response.", "EMPTY_RESPONSE");
  }

  return { content, modelId: config.modelId, provider: config.provider };
}

/**
 * Resolve the model ID that will be used for a task.
 * Call before runAiTask to record the model in the credit ledger.
 */
export function resolveModelId(task: AiTaskName): string {
  return TASK_REGISTRY[task]?.modelId ?? "unknown";
}

/**
 * Resolve the credit cost for a task (informational reference for route handlers).
 */
export function resolveTaskCreditCost(task: AiTaskName): number {
  return TASK_REGISTRY[task]?.creditCost ?? 0;
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


