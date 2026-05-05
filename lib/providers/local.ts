/**
 * lib/providers/local.ts — Local / Self-hosted Provider Runner
 *
 * Placeholder for running models locally (e.g. Ollama, LM Studio, llama.cpp).
 *
 * Env vars (when implemented):
 *   LOCAL_AI_URL    — base URL of the local inference server (e.g. http://localhost:11434)
 *   LOCAL_AI_MODEL  — model name to use
 *
 * TODO: implement when self-hosted inference is needed.
 */

import type { ResolvedTaskConfig } from "@/lib/ai-engine";

export async function runLocalTask(config: ResolvedTaskConfig, _userInput: string): Promise<string> {
  // TODO: implement local provider runner
  // Possible targets: Ollama (http://localhost:11434/api/chat), LM Studio, llama.cpp server
  // Env vars to add: LOCAL_AI_URL, LOCAL_AI_MODEL
  void config;
  throw new Error(
    "Local AI provider is not yet implemented. " +
    "Set AI_PROVIDER=kie in your environment to use KIE instead.",
  );
}
