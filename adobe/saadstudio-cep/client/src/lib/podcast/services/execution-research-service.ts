import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import type {
  ApplyCameraDecisionsVisualOnlyInput,
  ApplyCameraDecisionsVisualOnlyResult,
  PodcastExecutionResearchResult,
} from "../types/premiere";

export function testSafeDuplicateSequence(): Promise<PodcastExecutionResearchResult> {
  return premierePodcastAdapter.testSafeDuplicateSequence();
}

export function testDisableEnableOnDuplicate(): Promise<PodcastExecutionResearchResult> {
  return premierePodcastAdapter.testDisableEnableOnDuplicate();
}

export function testDisableTimeRangeOnDuplicate(): Promise<PodcastExecutionResearchResult> {
  return premierePodcastAdapter.testDisableTimeRangeOnDuplicate();
}

export function testInsertOverwriteOnDuplicate(): Promise<PodcastExecutionResearchResult> {
  return premierePodcastAdapter.testInsertOverwriteOnDuplicate();
}

export function testReconstructInsertOverwriteOnDuplicate(): Promise<PodcastExecutionResearchResult> {
  return premierePodcastAdapter.testReconstructInsertOverwriteOnDuplicate();
}

export function applyCameraDecisionsVisualOnly(
  input: ApplyCameraDecisionsVisualOnlyInput,
): Promise<ApplyCameraDecisionsVisualOnlyResult> {
  return premierePodcastAdapter.applyCameraDecisionsVisualOnly(input);
}
