import type {
  FfmpegRmsRuntimeProof,
  SpeakerActivityProof,
  SpeakingSegment,
  SpeechActivityWindow,
} from "../types";

export interface SpeakerActivityProofInput {
  rmsProof: FfmpegRmsRuntimeProof | null;
  thresholdDb: number;
  minimumSpeechDurationSec: number;
}

export function generateSpeakerActivityProof(input: SpeakerActivityProofInput): SpeakerActivityProof {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const thresholdUsed = input.thresholdDb;
  const silenceThresholdUsed = input.thresholdDb;
  const minimumSpeechDurationSec = Math.max(0, input.minimumSpeechDurationSec);

  if (!input.rmsProof) blockers.push("RMS_PROOF_REQUIRED");
  if (input.rmsProof?.blockers.length) blockers.push("RMS_PROOF_HAS_BLOCKERS");
  if (!input.rmsProof?.rmsPreview.length) blockers.push("RMS_WINDOWS_REQUIRED");

  const speechActivityWindows = input.rmsProof?.rmsPreview.map((point): SpeechActivityWindow => {
    const active = Number.isFinite(point.rmsDb) && point.rmsDb >= thresholdUsed;
    return {
      sourceTimeSec: point.sourceTimeSec,
      timelineStartSec: point.timelineStartSec,
      timelineEndSec: point.timelineEndSec,
      rmsDb: point.rmsDb,
      active,
      reason: active
        ? `RMS ${formatDb(point.rmsDb)} >= threshold ${formatDb(thresholdUsed)}`
        : `RMS ${formatDb(point.rmsDb)} < threshold ${formatDb(thresholdUsed)}`,
    };
  }) ?? [];

  const speakingSegments = blockers.length
    ? []
    : mergeSpeakingWindows(speechActivityWindows, minimumSpeechDurationSec, warnings);

  return {
    speechActivityWindows,
    speakingSegments,
    thresholdUsed,
    silenceThresholdUsed,
    minimumSpeechDurationSec,
    blockers,
    warnings,
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function mergeSpeakingWindows(
  windows: SpeechActivityWindow[],
  minimumSpeechDurationSec: number,
  warnings: string[],
): SpeakingSegment[] {
  const segments: SpeakingSegment[] = [];
  let current: SpeakingSegment | null = null;

  for (const window of windows) {
    if (!window.active) {
      if (current) {
        pushIfLongEnough(segments, current, minimumSpeechDurationSec, warnings);
        current = null;
      }
      continue;
    }

    if (!current) {
      current = {
        id: `speech_${segments.length + 1}`,
        startSec: window.timelineStartSec,
        endSec: window.timelineEndSec,
        durationSec: roundTime(window.timelineEndSec - window.timelineStartSec),
        sourceWindowCount: 1,
        speakerId: "speaker_1",
        source: "rms-threshold",
      };
      continue;
    }

    current.endSec = window.timelineEndSec;
    current.durationSec = roundTime(current.endSec - current.startSec);
    current.sourceWindowCount += 1;
  }

  if (current) pushIfLongEnough(segments, current, minimumSpeechDurationSec, warnings);
  return segments.map((segment, index) => ({ ...segment, id: `speech_${index + 1}` }));
}

function pushIfLongEnough(
  segments: SpeakingSegment[],
  segment: SpeakingSegment,
  minimumSpeechDurationSec: number,
  warnings: string[],
) {
  if (segment.durationSec >= minimumSpeechDurationSec) {
    segments.push(segment);
    return;
  }
  warnings.push(`SHORT_SPEECH_SEGMENT_DROPPED ${segment.startSec}-${segment.endSec}`);
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatDb(value: number): string {
  return Number.isFinite(value) ? `${Math.round(value * 100) / 100}dB` : "-inf";
}
