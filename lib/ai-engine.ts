/**
 * lib/ai-engine.ts — Saad Studio Centralized AI Execution Layer
 *
 * ─ Architecture ────────────────────────────────────────────────────────────
 *
 *   Feature Route (app/api/...)
 *        │  passes { task, input, userContext: { planId } }
 *        ▼
 *   runAiTask()                         ← this file
 *        │  calls resolveModelId(task, userContext)
 *        │  reads TASK_REGISTRY for config
 *        ▼
 *   Provider Runner (lib/providers/*)
 *        │  kie.ts  |  local.ts  |  mock.ts
 *        ▼
 *   External AI API  (KIE AI — https://docs.kie.ai/1973359m0)
 *
 * ─ Model selection is feature-driven, not hardcoded ───────────────────────
 *
 *   Models are selected by resolveModelId() based on:
 *     1. Admin env override  (STORY_ENGINE_MODEL=...)
 *     2. User plan tier      (free → starter → plus → pro → max)
 *
 *   Task definitions in TASK_REGISTRY do NOT contain modelId.
 *   This keeps features decoupled from specific model names.
 *
 * ─ Provider selection ──────────────────────────────────────────────────────
 *
 *   Global default  →  AI_PROVIDER=kie
 *   Per-task        →  STORY_ENGINE_PROVIDER=kie
 *
 * ─ Adding a new task ───────────────────────────────────────────────────────
 *   1. Add name to AiTaskName union.
 *   2. Add entry to TASK_REGISTRY (no modelId needed).
 *   3. Add tier→model mapping to MODEL_TIERS.
 *   4. Route calls runAiTask({ task, input, userContext }).
 *
 * ─ Adding a new provider ───────────────────────────────────────────────────
 *   1. Create lib/providers/<name>.ts  exporting  runXxxTask(config, input)
 *   2. Import here and add to PROVIDERS map.
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

/**
 * Task definition — describes the feature, NOT the model.
 * Model selection happens at runtime via resolveModelId().
 */
export interface AiTaskConfig {
  /** Human-readable feature name (for logging + mock dispatch) */
  name: string;
  /** Chat system prompt */
  systemPrompt: string;
  /** Provider to use for this task */
  provider: AiProvider;
  /** Sampling temperature 0–1 */
  temperature: number;
  /** Max output tokens */
  maxTokens: number;
  /** Credits deducted per call — enforced in the route, declared here for reference */
  creditCost: number;
}

/**
 * Resolved config passed to provider runners — adds the dynamically chosen modelId.
 * Created inside runAiTask(); never stored in TASK_REGISTRY.
 */
export interface ResolvedTaskConfig extends AiTaskConfig {
  modelId: string;
}

/**
 * User context supplied by the route — used to select the appropriate model tier.
 * planId comes from UserSubscription.planId in the database.
 */
export interface UserContext {
  /** "starter" | "plus" | "pro" | "max" | null (null = free / unauthenticated) */
  planId?: string | null;
}

export interface AiRunInput {
  task: AiTaskName;
  input: string;
  /** Pass the user's plan so the engine can select the right model tier. */
  userContext?: UserContext;
}

export interface AiRunResult {
  content:  string;
  /** The model id that was actually used — record in the credit ledger. */
  modelId:  string;
  provider: AiProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL TIERS
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps each task × plan tier → KIE model id.
// This is the ONLY place model names appear in the AI engine.
//
// Tier order (cheapest → best):  free → starter → plus → pro → max
//
// To change a model for a tier, edit this table.
// To force a single model in any environment, set the env var override.
//   e.g. STORY_ENGINE_MODEL=claude-sonnet-4-6

type PlanTier = "free" | "starter" | "plus" | "pro" | "max";

const MODEL_TIERS: Record<AiTaskName, Record<PlanTier, string>> = {
  story_engine: {
    free:    "gemini-3-pro",       // cost-efficient — solid for transcript parsing
    starter: "gemini-3-pro",       // same as free
    plus:    "claude-sonnet-4-6",  // strong structured JSON + reasoning
    pro:     "claude-sonnet-4-6",  // same as plus (pro value is higher credit allowance)
    max:     "gpt-5-4",            // best available via KIE
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TASK REGISTRY  (no modelId — model is resolved at runtime)
// ─────────────────────────────────────────────────────────────────────────────

function resolveProvider(envKey: string, fallback: AiProvider): AiProvider {
  const v = process.env[envKey] ?? process.env.AI_PROVIDER ?? fallback;
  if (v === "kie" || v === "local" || v === "mock") return v;
  console.warn(`[ai-engine] Unknown provider "${v}" for ${envKey}, falling back to "${fallback}"`);
  return fallback;
}

const TASK_REGISTRY: Record<AiTaskName, AiTaskConfig> = {
  story_engine: {
    name:        "Story Engine",
    provider:    resolveProvider("STORY_ENGINE_PROVIDER", "kie"),
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
// MODEL RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the model id for a task based on the user's plan tier.
 *
 * Resolution order:
 *   1. Env var override  (e.g. STORY_ENGINE_MODEL)  — admin / deployment control
 *   2. MODEL_TIERS table — plan-aware selection
 *
 * @param task         — AiTaskName
 * @param userContext  — { planId } from UserSubscription; omit for free tier
 */
export function resolveModelId(task: AiTaskName, userContext?: UserContext): string {
  // 1. Admin env override (e.g. STORY_ENGINE_MODEL=gpt-5-4)
  const envKey = `${task.toUpperCase()}_MODEL`; // e.g. STORY_ENGINE_MODEL
  const override = process.env[envKey];
  if (override) return override;

  // 2. Plan-aware selection from MODEL_TIERS
  const tiers = MODEL_TIERS[task];
  if (!tiers) return "gemini-3-pro"; // safe default if task has no tier map yet

  const planId = userContext?.planId ?? null;
  let tier: PlanTier;

  switch (planId) {
    case "max":     tier = "max";     break;
    case "pro":     tier = "pro";     break;
    case "plus":    tier = "plus";    break;
    case "starter": tier = "starter"; break;
    default:        tier = "free";    break; // null, undefined, unknown → free
  }

  return tiers[tier];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER DISPATCH MAP
// ─────────────────────────────────────────────────────────────────────────────

type ProviderRunner = (config: ResolvedTaskConfig, input: string) => Promise<string>;

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
 * The route passes userContext so the engine picks the right model tier.
 * The route does NOT know which model or provider is used.
 *
 * @example
 * const result = await runAiTask({ task: "story_engine", input: transcript, userContext: { planId } });
 * // result.content  — raw string from the model
 * // result.modelId  — the model that was used (record in credit ledger)
 * // result.provider — which provider handled it
 */
export async function runAiTask(params: AiRunInput): Promise<AiRunResult> {
  const baseConfig = TASK_REGISTRY[params.task];
  if (!baseConfig) {
    throw new AiEngineError(`Unknown AI task: "${params.task}"`, "UNKNOWN_TASK");
  }

  const runner = PROVIDERS[baseConfig.provider];
  if (!runner) {
    throw new AiEngineError(`No runner registered for provider: "${baseConfig.provider}"`, "UNKNOWN_PROVIDER");
  }

  // Resolve model at runtime — plan-aware
  const modelId = resolveModelId(params.task, params.userContext);
  const config: ResolvedTaskConfig = { ...baseConfig, modelId };

  let content: string;
  try {
    content = await runner(config, params.input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AiEngineError(msg, "PROVIDER_ERROR");
  }

  if (!content) {
    throw new AiEngineError("Provider returned an empty response.", "EMPTY_RESPONSE");
  }

  return { content, modelId, provider: baseConfig.provider };
}

/**
 * Resolve the credit cost for a task (for route handlers to reference).
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


