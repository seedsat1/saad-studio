import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import type { PodcastTimelineLayout } from "../types/premiere";

export async function analyzeTimelineLayout(): Promise<PodcastTimelineLayout> {
  try {
    return await premierePodcastAdapter.getTimelineLayout();
  } catch (err) {
    return {
      status: "error",
      sequenceId: null,
      sequenceName: null,
      sequenceDurationSec: null,
      workArea: null,
      videoTracks: [],
      audioTracks: [],
      supportedExecutionStrategies: ["decision-plan-only"],
      unsupportedApis: ["set/get active multicam camera angle via official ExtendScript API"],
      recommendedStrategy: "decision-plan-only",
      messages: [`Timeline read failed: ${(err as Error).message}`],
    };
  }
}
