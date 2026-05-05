/**
 * lib/providers/mock.ts — Mock Provider Runner
 *
 * Returns deterministic fake responses for use in:
 *   - Unit tests
 *   - CI environments (no real API keys needed)
 *   - Local development without spending credits
 *
 * Activate via:
 *   AI_PROVIDER=mock   (global)
 *   STORY_ENGINE_PROVIDER=mock  (per-task)
 *
 * Never use in production.
 */

import type { ResolvedTaskConfig } from "@/lib/ai-engine";

const MOCK_RESPONSES: Record<string, string> = {
  story_engine: JSON.stringify({
    sections: [
      { title: "Hook",        start: "00:00:00", end: "00:00:30", reason: "Opens with a compelling question to grab attention." },
      { title: "Setup",       start: "00:00:30", end: "00:01:30", reason: "Establishes context and introduces the main subject." },
      { title: "Conflict",    start: "00:01:30", end: "00:03:00", reason: "Tension or problem that drives the narrative forward." },
      { title: "Resolution",  start: "00:03:00", end: "00:04:30", reason: "Outcome or solution revealed — strong edit point." },
      { title: "Call to Action", start: "00:04:30", end: "00:05:00", reason: "Direct audience prompt; ideal for end card overlay." },
    ],
  }),
};

const DEFAULT_MOCK = JSON.stringify({
  sections: [
    { title: "Mock Section", start: "00:00:00", end: "00:01:00", reason: "Mock response — replace AI_PROVIDER=mock with AI_PROVIDER=kie in production." },
  ],
});

export async function runMockTask(config: ResolvedTaskConfig, _userInput: string): Promise<string> {
  // Simulate a small network delay so tests mirror real async behavior
  await new Promise((resolve) => setTimeout(resolve, 80));

  const key = config.name.toLowerCase().replace(/\s+/g, "_");
  return MOCK_RESPONSES[key] ?? DEFAULT_MOCK;
}
