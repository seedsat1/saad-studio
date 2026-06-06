import { evalES } from "../../cep";
import type {
  AudioSourceInspectionResult,
  AudioTrackSpeakerMapping,
} from "../types";
import type {
  ApplyCameraDecisionsVisualOnlyInput,
  ApplyCameraDecisionsVisualOnlyResult,
  ApplyCameraSwitchesInput,
  ApplyPodcastCutsInput,
  ApplySilenceRemovalVisualOnlyInput,
  CreatePodcastSequenceInput,
  DuplicatePodcastSequenceInput,
  PodcastAdapterResult,
  PodcastExecutionResearchResult,
  PodcastSequenceInfo,
  PodcastTimelineLayout,
  PodcastTrackInfo,
  PremierePodcastAdapterContract,
} from "../types/premiere";
import type { SilenceRemovalApplyResult } from "../types";

function unsupported(reason: string): Promise<PodcastAdapterResult> {
  return Promise.resolve({ ok: false, reason, dryRun: true });
}

export class PremierePodcastAdapter implements PremierePodcastAdapterContract {
  async getActiveSequence(): Promise<PodcastSequenceInfo | null> {
    return evalES<PodcastSequenceInfo | null>("getPodcastDiagnostics");
  }

  async getVideoTracks(): Promise<PodcastTrackInfo[]> {
    const info = await this.getActiveSequence();
    return tracksFromCount("video", info?.videoTrackCount ?? 0);
  }

  async getAudioTracks(): Promise<PodcastTrackInfo[]> {
    const info = await this.getActiveSequence();
    return tracksFromCount("audio", info?.audioTrackCount ?? 0);
  }

  async getTimelineLayout(): Promise<PodcastTimelineLayout> {
    return evalES<PodcastTimelineLayout>("getPodcastTimelineLayout");
  }

  inspectAudioSources(mappings: AudioTrackSpeakerMapping[]): Promise<AudioSourceInspectionResult> {
    return evalES<AudioSourceInspectionResult>("inspectPodcastAudioSources", mappings);
  }

  createSequence(_input: CreatePodcastSequenceInput): Promise<PodcastAdapterResult> {
    return unsupported("Podcast createSequence is diagnostic-only in this phase.");
  }

  duplicateSequence(input: DuplicatePodcastSequenceInput): Promise<PodcastAdapterResult> {
    return evalES<PodcastAdapterResult>("duplicateActiveSequenceForPodcast", input.newName);
  }

  testSafeDuplicateSequence(): Promise<PodcastExecutionResearchResult> {
    return evalES<PodcastExecutionResearchResult>("testPodcastSafeDuplicateSequence");
  }

  testDisableEnableOnDuplicate(): Promise<PodcastExecutionResearchResult> {
    return evalES<PodcastExecutionResearchResult>("testPodcastDisableEnableOnDuplicate");
  }

  testDisableTimeRangeOnDuplicate(): Promise<PodcastExecutionResearchResult> {
    return evalES<PodcastExecutionResearchResult>("testPodcastDisableTimeRangeOnDuplicate");
  }

  testInsertOverwriteOnDuplicate(): Promise<PodcastExecutionResearchResult> {
    return evalES<PodcastExecutionResearchResult>("testPodcastInsertOverwriteOnDuplicate");
  }

  testReconstructInsertOverwriteOnDuplicate(): Promise<PodcastExecutionResearchResult> {
    return evalES<PodcastExecutionResearchResult>("testPodcastReconstructInsertOverwriteOnDuplicate");
  }

  applyCameraDecisionsVisualOnly(input: ApplyCameraDecisionsVisualOnlyInput): Promise<ApplyCameraDecisionsVisualOnlyResult> {
    return evalES<ApplyCameraDecisionsVisualOnlyResult>("applyPodcastCameraDecisionsOverlapAwareVisualOnly", input.cameraDecisions);
  }

  applySilenceRemovalVisualOnly(input: ApplySilenceRemovalVisualOnlyInput): Promise<SilenceRemovalApplyResult> {
    return evalES<SilenceRemovalApplyResult>(
      "applyPodcastSilenceRemovalVisualOnly",
      input.keepSegments,
      input.silenceRemovedCount,
      input.totalRemovedDurationSec,
      input.sequenceDurationSec ?? null,
      input.analyzedDurationSec ?? null,
      input.audioSourceDurationSec ?? null,
    );
  }

  applyCuts(_input: ApplyPodcastCutsInput): Promise<PodcastAdapterResult> {
    return unsupported("Podcast applyCuts is not implemented in the diagnostics foundation.");
  }

  applyCameraSwitches(_input: ApplyCameraSwitchesInput): Promise<PodcastAdapterResult> {
    return unsupported("Podcast applyCameraSwitches is not implemented in the diagnostics foundation.");
  }
}

export const premierePodcastAdapter = new PremierePodcastAdapter();

function tracksFromCount(kind: PodcastTrackInfo["kind"], count: number): PodcastTrackInfo[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    kind,
    index,
    name: `${kind === "video" ? "V" : "A"}${index + 1}`,
  }));
}
