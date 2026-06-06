import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import { analyzeSilenceRemovalAudio } from "./audio-source-inspector-service";
import type {
  SilenceRemovalAnalysisResult,
  SilenceRemovalApplyResult,
  SilenceRemovalSettings,
} from "../types";

export interface SilenceRemovalRunResult {
  ok: boolean;
  analysis: SilenceRemovalAnalysisResult;
  apply: SilenceRemovalApplyResult | null;
  blockers: string[];
  warnings: string[];
}

export async function runSilenceRemovalDraft(
  settings: SilenceRemovalSettings,
): Promise<SilenceRemovalRunResult> {
  const analysis = await analyzeSilenceRemovalAudio(settings);
  if (!analysis.ok || analysis.blockers.length || !analysis.keepSegments.length) {
    return {
      ok: false,
      analysis,
      apply: null,
      blockers: analysis.blockers.length ? analysis.blockers : ["KEEP_SEGMENTS_REQUIRED"],
      warnings: analysis.warnings,
    };
  }

  const apply = await premierePodcastAdapter.applySilenceRemovalVisualOnly({
    keepSegments: analysis.keepSegments,
    silenceRemovedCount: analysis.silenceSegments.length,
    totalRemovedDurationSec: analysis.totalRemovedDurationSec,
    sequenceDurationSec: analysis.sequenceDurationSec ?? null,
    analyzedDurationSec: analysis.analyzedDurationSec,
    audioSourceDurationSec: analysis.audioSourceDurationSec ?? analysis.analyzedDurationSec,
  });

  return {
    ok: apply.ok,
    analysis,
    apply,
    blockers: [...analysis.blockers, ...apply.blockers],
    warnings: [...analysis.warnings, ...apply.warnings],
  };
}
