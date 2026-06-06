import type {
  DominantTrackWindow,
  PodcastCameraDecisionPlanProof,
  PodcastCameraDecisionProofItem,
  TrackSpeakingSegment,
  TrackOverlapWindow,
} from "../types";

const MINIMUM_SHOT_LENGTH_SEC = 2;
const MERGE_GAP_SEC = 0.3;

export interface CameraDecisionPlanProofInput {
  dominantTrackAtTime: DominantTrackWindow[];
  overlaps: TrackOverlapWindow[];
  trackSpeakingSegments?: TrackSpeakingSegment[];
  timelineDurationSec?: number;
  videoTrackCount?: number;
}

export function generateCameraDecisionPlanProof(
  input: CameraDecisionPlanProofInput,
): PodcastCameraDecisionPlanProof {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.dominantTrackAtTime.length) blockers.push("DOMINANT_TRACK_WINDOWS_REQUIRED");

  const videoTrackCount = Math.max(1, input.videoTrackCount ?? 4);
  const overlapKeys = new Set(input.overlaps.map((item) => timeKey(item.timelineStartSec, item.timelineEndSec)));
  const rawDecisions = input.dominantTrackAtTime.map((window, index) =>
    windowToCameraDecision(window, overlapKeys, index, videoTrackCount));
  const merged = mergeAdjacentDecisions(rawDecisions);
  const compacted = mergeShortDecisions(merged);
  const finalDecisions = mergeAdjacentDecisions(compacted.decisions);
  const diagnostics = buildDecisionDiagnostics(input, rawDecisions, merged, compacted.decisions, finalDecisions);
  const summary = {
    ...summarizeDecisions(finalDecisions, compacted.droppedShortDecisions),
    ...diagnostics,
  };

  return {
    cameraDecisions: blockers.length ? [] : finalDecisions,
    summary,
    diagnostics,
    blockers,
    warnings,
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function windowToCameraDecision(
  window: DominantTrackWindow,
  overlapKeys: Set<string>,
  index: number,
  videoTrackCount: number,
): PodcastCameraDecisionProofItem {
  const hasOverlap = overlapKeys.has(timeKey(window.timelineStartSec, window.timelineEndSec));
  if (hasOverlap) {
    const wideTrackIndex = Math.min(2, videoTrackCount - 1);
    return makeDecision(window.timelineStartSec, window.timelineEndSec, "wide", null, wideTrackIndex, `V${wideTrackIndex + 1}`, "overlap detected; using wide camera");
  }
  if (typeof window.audioTrackIndex === "number" && window.audioTrackIndex >= 0) {
    const videoTrackIndex = Math.min(window.audioTrackIndex, videoTrackCount - 1);
    return makeDecision(
      window.timelineStartSec,
      window.timelineEndSec,
      window.speakerId ?? `speaker_${window.audioTrackIndex + 1}`,
      window.audioTrackIndex,
      videoTrackIndex,
      `V${videoTrackIndex + 1}`,
      "dominant microphone mapped to matching camera track",
    );
  }
  return makeDecision(
    window.timelineStartSec,
    window.timelineEndSec,
    null,
    null,
    index === 0 ? 0 : -1,
    index === 0 ? "V1" : "KEEP_PREVIOUS",
    "no dominant speaker; keep previous camera",
  );
}

function makeDecision(
  startSec: number,
  endSec: number,
  speakerId: string | null,
  audioTrackIndex: number | null,
  videoTrackIndex: number,
  cameraLabel: string,
  reason: string,
): PodcastCameraDecisionProofItem {
  const safeStartSec = Math.max(0, startSec);
  return {
    startSec: safeStartSec,
    endSec,
    durationSec: roundTime(endSec - safeStartSec),
    speakerId,
    audioTrackIndex,
    videoTrackIndex,
    cameraLabel,
    reason,
  };
}

function mergeAdjacentDecisions(decisions: PodcastCameraDecisionProofItem[]): PodcastCameraDecisionProofItem[] {
  const merged: PodcastCameraDecisionProofItem[] = [];
  for (const decision of decisions) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(normalizeKeepPrevious(decision, null));
      continue;
    }
    const normalized = normalizeKeepPrevious(decision, previous);
    const gap = normalized.startSec - previous.endSec;
    if (sameCamera(previous, normalized) && gap <= MERGE_GAP_SEC) {
      previous.endSec = normalized.endSec;
      previous.durationSec = roundTime(previous.endSec - previous.startSec);
      if (normalized.reason.includes("keep previous")) {
        previous.reason = "merged with keep previous camera window";
      }
      continue;
    }
    merged.push(normalized);
  }
  return merged;
}

function normalizeKeepPrevious(
  decision: PodcastCameraDecisionProofItem,
  previous: PodcastCameraDecisionProofItem | null,
): PodcastCameraDecisionProofItem {
  if (decision.videoTrackIndex !== -1 || !previous) return { ...decision };
  return {
    ...decision,
    speakerId: previous.speakerId,
    audioTrackIndex: previous.audioTrackIndex,
    videoTrackIndex: previous.videoTrackIndex,
    cameraLabel: previous.cameraLabel,
  };
}

function mergeShortDecisions(decisions: PodcastCameraDecisionProofItem[]): {
  decisions: PodcastCameraDecisionProofItem[];
  droppedShortDecisions: number;
} {
  const output: PodcastCameraDecisionProofItem[] = [];
  let droppedShortDecisions = 0;
  for (const decision of decisions) {
    if (decision.durationSec >= MINIMUM_SHOT_LENGTH_SEC) {
      output.push({ ...decision });
      continue;
    }
    droppedShortDecisions += 1;
    const previous = output[output.length - 1];
    if (previous) {
      previous.endSec = decision.endSec;
      previous.durationSec = roundTime(previous.endSec - previous.startSec);
      previous.reason = "absorbed short decision below minimum shot length";
      continue;
    }
    const next = decisions.find((candidate) => candidate.startSec >= decision.endSec && candidate.durationSec >= MINIMUM_SHOT_LENGTH_SEC);
    if (next) {
      output.push({
        ...next,
        startSec: decision.startSec,
        durationSec: roundTime(next.endSec - decision.startSec),
        reason: "absorbed leading short decision below minimum shot length",
      });
    }
  }
  return { decisions: output, droppedShortDecisions };
}

function buildDecisionDiagnostics(
  input: CameraDecisionPlanProofInput,
  rawDecisions: PodcastCameraDecisionProofItem[],
  adjacentMerged: PodcastCameraDecisionProofItem[],
  afterShortMerge: PodcastCameraDecisionProofItem[],
  finalDecisions: PodcastCameraDecisionProofItem[],
): NonNullable<PodcastCameraDecisionPlanProof["diagnostics"]> {
  const speakerSegmentsPerMicrophone = summarizeSpeakerSegments(input.trackSpeakingSegments ?? []);
  const mergedSegmentsCount = Math.max(0, rawDecisions.length - finalDecisions.length);
  const totalTimelineDurationSec = input.timelineDurationSec
    ?? maxEnd(input.dominantTrackAtTime.map((item) => item.timelineEndSec))
    ?? maxEnd(finalDecisions.map((item) => item.endSec))
    ?? 0;
  return {
    totalDetectedSpeakerSegments: input.trackSpeakingSegments?.length ?? 0,
    speakerSegmentsPerMicrophone,
    dominantWindowsCount: input.dominantTrackAtTime.length,
    cameraDecisionsBeforeMerge: rawDecisions.length,
    cameraDecisionsAfterAdjacentMerge: adjacentMerged.length,
    cameraDecisionsAfterShortMerge: afterShortMerge.length,
    mergedSegmentsCount,
    totalTimelineDurationSec: roundTime(totalTimelineDurationSec),
    singleDecisionReason: finalDecisions.length === 1
      ? explainSingleDecision(input, rawDecisions, adjacentMerged, afterShortMerge, finalDecisions)
      : null,
    unmappedAudioTrackIndexes: [],
  };
}

function summarizeSpeakerSegments(segments: TrackSpeakingSegment[]) {
  const map = new Map<string, { audioTrackIndex: number; speakerId: string; segments: number }>();
  for (const segment of segments) {
    const key = `${segment.audioTrackIndex}:${segment.speakerId}`;
    const existing = map.get(key) ?? {
      audioTrackIndex: segment.audioTrackIndex,
      speakerId: segment.speakerId,
      segments: 0,
    };
    existing.segments += 1;
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => a.audioTrackIndex - b.audioTrackIndex);
}

function explainSingleDecision(
  input: CameraDecisionPlanProofInput,
  rawDecisions: PodcastCameraDecisionProofItem[],
  adjacentMerged: PodcastCameraDecisionProofItem[],
  afterShortMerge: PodcastCameraDecisionProofItem[],
  finalDecisions: PodcastCameraDecisionProofItem[],
): string {
  const uniqueCameras = new Set(rawDecisions.map((decision) => decision.cameraLabel));
  const activeTracks = new Set(input.trackSpeakingSegments?.map((segment) => segment.audioTrackIndex) ?? []);
  if (input.dominantTrackAtTime.length <= 1) return "dominantTrackAtTime produced one or zero windows";
  if (activeTracks.size <= 1) return "speaker attribution detected activity on only one microphone";
  if (uniqueCameras.size <= 1) return "all dominant windows mapped to the same camera";
  if (adjacentMerged.length === 1) return "adjacent merge collapsed all windows into one camera decision";
  if (afterShortMerge.length === 1) return "minimum shot length absorbed short decisions into one decision";
  if (finalDecisions.length === 1) return "final adjacent merge collapsed the camera plan into one decision";
  return "unknown single decision collapse";
}

function maxEnd(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length ? Math.max(...finite) : null;
}

function summarizeDecisions(
  decisions: PodcastCameraDecisionProofItem[],
  droppedShortDecisions: number,
) {
  let speaker1CameraTimeSec = 0;
  let speaker2CameraTimeSec = 0;
  let wideCameraTimeSec = 0;
  let keptPreviousCameraEvents = 0;
  for (const decision of decisions) {
    if (decision.videoTrackIndex === 0) speaker1CameraTimeSec += decision.durationSec;
    if (decision.videoTrackIndex === 1) speaker2CameraTimeSec += decision.durationSec;
    if (decision.videoTrackIndex === 2) wideCameraTimeSec += decision.durationSec;
    if (decision.reason.includes("keep previous")) keptPreviousCameraEvents += 1;
  }
  return {
    totalDecisions: decisions.length,
    speaker1CameraTimeSec: roundTime(speaker1CameraTimeSec),
    speaker2CameraTimeSec: roundTime(speaker2CameraTimeSec),
    wideCameraTimeSec: roundTime(wideCameraTimeSec),
    keptPreviousCameraEvents,
    droppedShortDecisions,
  };
}

function sameCamera(a: PodcastCameraDecisionProofItem, b: PodcastCameraDecisionProofItem): boolean {
  return a.videoTrackIndex === b.videoTrackIndex;
}

function timeKey(startSec: number, endSec: number): string {
  return `${roundTime(startSec)}-${roundTime(endSec)}`;
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}
