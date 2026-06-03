import type {
  DominantTrackWindow,
  PodcastCameraDecisionPlanProof,
  PodcastCameraDecisionProofItem,
  TrackOverlapWindow,
} from "../types";

const MINIMUM_SHOT_LENGTH_SEC = 2;
const MERGE_GAP_SEC = 0.3;

export interface CameraDecisionPlanProofInput {
  dominantTrackAtTime: DominantTrackWindow[];
  overlaps: TrackOverlapWindow[];
}

export function generateCameraDecisionPlanProof(
  input: CameraDecisionPlanProofInput,
): PodcastCameraDecisionPlanProof {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.dominantTrackAtTime.length) blockers.push("DOMINANT_TRACK_WINDOWS_REQUIRED");

  const overlapKeys = new Set(input.overlaps.map((item) => timeKey(item.timelineStartSec, item.timelineEndSec)));
  const rawDecisions = input.dominantTrackAtTime.map((window, index) =>
    windowToCameraDecision(window, overlapKeys, index));
  const merged = mergeAdjacentDecisions(rawDecisions);
  const compacted = mergeShortDecisions(merged);
  const finalDecisions = mergeAdjacentDecisions(compacted.decisions);
  const summary = summarizeDecisions(finalDecisions, compacted.droppedShortDecisions);

  return {
    cameraDecisions: blockers.length ? [] : finalDecisions,
    summary,
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
): PodcastCameraDecisionProofItem {
  const hasOverlap = overlapKeys.has(timeKey(window.timelineStartSec, window.timelineEndSec));
  if (hasOverlap) {
    return makeDecision(window.timelineStartSec, window.timelineEndSec, "wide", null, 2, "V3", "overlap detected; using wide camera");
  }
  if (window.audioTrackIndex === 0 || window.speakerId === "speaker_1") {
    return makeDecision(window.timelineStartSec, window.timelineEndSec, "speaker_1", 0, 0, "V1", "dominant speaker mapped to camera");
  }
  if (window.audioTrackIndex === 1 || window.speakerId === "speaker_2") {
    return makeDecision(window.timelineStartSec, window.timelineEndSec, "speaker_2", 1, 1, "V2", "dominant speaker mapped to camera");
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
