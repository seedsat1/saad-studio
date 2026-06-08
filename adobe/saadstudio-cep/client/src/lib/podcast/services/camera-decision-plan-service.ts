import type {
  CameraMapping,
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
  cameraMappings?: CameraMapping[];
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
  const cameraMap = buildCameraMap(input.cameraMappings ?? []);
  const usedSpeakerIds = usedSpeakerIdsFromInput(input);
  const missingCameraMappings = usedSpeakerIds.filter((speakerId) => !cameraMap.has(speakerId));
  if (missingCameraMappings.length > 0) {
    blockers.push("MISSING_CAMERA_MAPPING_FOR_SPEAKER");
    warnings.push(...missingCameraMappings.map((speakerId) => `MISSING_CAMERA_MAPPING_FOR_SPEAKER:${speakerId}`));
  }
  if (input.overlaps.length > 0 && !cameraMap.has("wide")) {
    blockers.push("MISSING_CAMERA_MAPPING_FOR_WIDE_CAMERA");
  }
  const mappedCameraIndexes = new Set(
    usedSpeakerIds
      .map((speakerId) => cameraMap.get(speakerId))
      .filter((videoTrackIndex): videoTrackIndex is number => Number.isFinite(videoTrackIndex)),
  );
  if (usedSpeakerIds.length > 1 && mappedCameraIndexes.size <= 1 && videoTrackCount > 1) {
    blockers.push("CAMERA_MAPPING_COLLAPSED_TO_SINGLE_CAMERA");
  }
  const overlapKeys = new Set(input.overlaps.map((item) => timeKey(item.timelineStartSec, item.timelineEndSec)));
  const sourceDecisions = (input.trackSpeakingSegments?.length ?? 0) > 0
    ? decisionsFromSpeakingSegments(input.trackSpeakingSegments ?? [], videoTrackCount, cameraMap)
    : input.dominantTrackAtTime.map((window) =>
      windowToCameraDecision(window, overlapKeys, videoTrackCount, cameraMap));
  const rawDecisions = sortDecisions(sourceDecisions);
  const merged = mergeAdjacentDecisions(rawDecisions);
  const compacted = mergeShortDecisions(merged);
  const finalDecisions = mergeAdjacentDecisions(compacted.decisions);
  const invalidDecisions = findInvalidDecisions(finalDecisions);
  if (invalidDecisions.length > 0) blockers.push("INVALID_CAMERA_DECISION_TIMING");
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
    warnings: invalidDecisions.length
      ? [...warnings, ...invalidDecisions.map((decision) => `INVALID_DECISION_${decision.index}:${decision.reason}`)]
      : warnings,
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function windowToCameraDecision(
  window: DominantTrackWindow,
  overlapKeys: Set<string>,
  videoTrackCount: number,
  cameraMap: Map<string, number>,
): PodcastCameraDecisionProofItem {
  const hasOverlap = overlapKeys.has(timeKey(window.timelineStartSec, window.timelineEndSec));
  if (hasOverlap) {
    const mappedWideTrackIndex = cameraMap.get("wide");
    const wideTrackIndex = typeof mappedWideTrackIndex === "number" ? Math.min(mappedWideTrackIndex, videoTrackCount - 1) : -1;
    return makeDecision(window.timelineStartSec, window.timelineEndSec, "wide", null, wideTrackIndex, wideTrackIndex >= 0 ? `V${wideTrackIndex + 1}` : "UNMAPPED", "overlap detected; using wide camera");
  }
  if (typeof window.audioTrackIndex === "number" && window.audioTrackIndex >= 0) {
    const speakerId = window.speakerId ?? `speaker_${window.audioTrackIndex + 1}`;
    const mappedVideoTrackIndex = cameraMap.get(speakerId);
    const videoTrackIndex = Math.min(mappedVideoTrackIndex ?? -1, videoTrackCount - 1);
    return makeDecision(
      window.timelineStartSec,
      window.timelineEndSec,
      speakerId,
      window.audioTrackIndex,
      videoTrackIndex,
      videoTrackIndex >= 0 ? `V${videoTrackIndex + 1}` : "UNMAPPED",
      "dominant microphone mapped to matching camera track",
    );
  }
  return makeDecision(
    window.timelineStartSec,
    window.timelineEndSec,
    null,
    null,
    -1,
    "KEEP_PREVIOUS",
    "no dominant speaker; keep previous camera",
  );
}

function decisionsFromSpeakingSegments(
  segments: TrackSpeakingSegment[],
  videoTrackCount: number,
  cameraMap: Map<string, number>,
): PodcastCameraDecisionProofItem[] {
  const validSegments = segments
    .filter((segment) =>
      Number.isFinite(segment.startSec)
      && Number.isFinite(segment.endSec)
      && segment.endSec > segment.startSec
      && segment.audioTrackIndex >= 0,
    )
    .sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
  if (!validSegments.length) return [];

  const boundaries = Array.from(new Set(
    validSegments.flatMap((segment) => [roundTime(Math.max(0, segment.startSec)), roundTime(Math.max(0, segment.endSec))]),
  )).sort((a, b) => a - b);

  const decisions: PodcastCameraDecisionProofItem[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startSec = boundaries[i];
    const endSec = boundaries[i + 1];
    if (!(endSec > startSec)) continue;

    const active = validSegments.filter((segment) => segment.startSec < endSec && segment.endSec > startSec);
    if (!active.length) {
      continue;
    }

    if (active.length > 1) {
      const mappedWideTrackIndex = cameraMap.get("wide");
      const wideTrackIndex = typeof mappedWideTrackIndex === "number" ? Math.min(mappedWideTrackIndex, videoTrackCount - 1) : -1;
      decisions.push(makeDecision(startSec, endSec, "wide", null, wideTrackIndex, wideTrackIndex >= 0 ? `V${wideTrackIndex + 1}` : "UNMAPPED", "overlapping speaking segments; using wide camera"));
      continue;
    }

    const segment = active[0];
    const mappedVideoTrackIndex = cameraMap.get(segment.speakerId);
    const videoTrackIndex = Math.min(mappedVideoTrackIndex ?? -1, videoTrackCount - 1);
    decisions.push(makeDecision(
      startSec,
      endSec,
      segment.speakerId,
      segment.audioTrackIndex,
      videoTrackIndex,
      videoTrackIndex >= 0 ? `V${videoTrackIndex + 1}` : "UNMAPPED",
      "speaking segment mapped to matching camera track",
    ));
  }

  return decisions;
}

function buildCameraMap(mappings: CameraMapping[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const mapping of mappings) {
    if (!mapping.speakerId || !Number.isFinite(mapping.videoTrackIndex)) continue;
    map.set(mapping.speakerId, mapping.videoTrackIndex);
  }
  return map;
}

function usedSpeakerIdsFromInput(input: CameraDecisionPlanProofInput): string[] {
  const ids = new Set<string>();
  for (const segment of input.trackSpeakingSegments ?? []) {
    if (segment.speakerId) ids.add(segment.speakerId);
  }
  if (ids.size === 0) {
    for (const window of input.dominantTrackAtTime) {
      if (window.speakerId) ids.add(window.speakerId);
    }
  }
  return [...ids].filter((speakerId) => speakerId !== "wide");
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
  const safeEndSec = Number.isFinite(endSec) ? Math.max(0, endSec) : endSec;
  return {
    startSec: safeStartSec,
    endSec: safeEndSec,
    durationSec: roundTime(safeEndSec - safeStartSec),
    speakerId,
    audioTrackIndex,
    videoTrackIndex,
    cameraLabel,
    reason,
  };
}

function mergeAdjacentDecisions(decisions: PodcastCameraDecisionProofItem[]): PodcastCameraDecisionProofItem[] {
  const merged: PodcastCameraDecisionProofItem[] = [];
  for (const decision of sortDecisions(decisions)) {
    if (!isValidDecisionTiming(decision)) continue;
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(normalizeKeepPrevious(decision, null));
      continue;
    }
    const normalized = normalizeKeepPrevious(decision, previous);
    const gap = normalized.startSec - previous.endSec;
    if (sameCamera(previous, normalized) && gap >= 0 && gap <= MERGE_GAP_SEC && normalized.endSec > previous.endSec) {
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
  const ordered = sortDecisions(decisions).filter(isValidDecisionTiming);
  for (const decision of ordered) {
    const previous = output[output.length - 1];
    if (!previous) {
      output.push({ ...decision });
      if (decision.durationSec < MINIMUM_SHOT_LENGTH_SEC) {
        droppedShortDecisions += 1;
        output[0].reason = "absorbed leading short decision below minimum shot length";
      }
      continue;
    }

    if (decision.durationSec < MINIMUM_SHOT_LENGTH_SEC) {
      droppedShortDecisions += 1;
      if (decision.startSec >= previous.endSec && decision.endSec > previous.endSec) {
        previous.endSec = decision.endSec;
        previous.durationSec = roundTime(previous.endSec - previous.startSec);
        previous.reason = "absorbed short decision below minimum shot length";
      }
      continue;
    }

    if (previous.durationSec < MINIMUM_SHOT_LENGTH_SEC && decision.startSec >= previous.endSec) {
      previous.endSec = decision.endSec;
      previous.durationSec = roundTime(previous.endSec - previous.startSec);
      previous.speakerId = decision.speakerId;
      previous.audioTrackIndex = decision.audioTrackIndex;
      previous.videoTrackIndex = decision.videoTrackIndex;
      previous.cameraLabel = decision.cameraLabel;
      previous.reason = "absorbed leading short decision below minimum shot length";
      continue;
    }

    if (decision.startSec >= previous.endSec) {
      output.push({ ...decision });
      continue;
    }

    if (decision.endSec > previous.endSec) {
      const trimmed = {
        ...decision,
        startSec: previous.endSec,
        durationSec: roundTime(decision.endSec - previous.endSec),
      };
      if (isValidDecisionTiming(trimmed)) output.push(trimmed);
    }
  }
  return { decisions: output.filter(isValidDecisionTiming), droppedShortDecisions };
}

function sortDecisions(decisions: PodcastCameraDecisionProofItem[]): PodcastCameraDecisionProofItem[] {
  return decisions
    .map((decision) => ({ ...decision }))
    .sort((a, b) => {
      if (a.startSec !== b.startSec) return a.startSec - b.startSec;
      return a.endSec - b.endSec;
    });
}

function isValidDecisionTiming(decision: PodcastCameraDecisionProofItem): boolean {
  return Number.isFinite(decision.startSec)
    && Number.isFinite(decision.endSec)
    && Number.isFinite(decision.durationSec)
    && decision.startSec >= 0
    && decision.endSec > decision.startSec
    && decision.durationSec > 0
    && decision.videoTrackIndex >= 0;
}

function findInvalidDecisions(decisions: PodcastCameraDecisionProofItem[]): Array<{ index: number; reason: string }> {
  return decisions.flatMap((decision, index) => {
    const reasons: string[] = [];
    if (!Number.isFinite(decision.startSec)) reasons.push("START_NOT_FINITE");
    if (!Number.isFinite(decision.endSec)) reasons.push("END_NOT_FINITE");
    if (!Number.isFinite(decision.durationSec)) reasons.push("DURATION_NOT_FINITE");
    if (decision.startSec < 0) reasons.push("START_BELOW_ZERO");
    if (decision.endSec <= decision.startSec) reasons.push("END_NOT_GREATER_THAN_START");
    if (decision.durationSec <= 0) reasons.push("DURATION_NOT_POSITIVE");
    return reasons.length ? [{ index, reason: reasons.join("|") }] : [];
  });
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
