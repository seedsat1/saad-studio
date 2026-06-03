import type {
  CameraDecision,
  CameraMapping,
  PodcastExecutionStrategy,
  PodcastEditJob,
  PodcastSettings,
  SpeakerSegment,
} from "../types";

export interface SpeakerSegmentsParseResult {
  segments: SpeakerSegment[];
  errors: string[];
}

export interface SpeakerSegmentsValidationResult {
  validSegments: SpeakerSegment[];
  invalidSegments: Array<{ index: number; reason: string; raw: unknown }>;
}

export interface MergedSpeakerSegment extends SpeakerSegment {
  reason: string;
  sourceSegmentIds: string[];
}

export interface MergeSpeakerSegmentsResult {
  segments: MergedSpeakerSegment[];
  mergedCount: number;
  blockers: string[];
}

export interface CameraDecisionPlanResult {
  decisions: CameraDecision[];
  parsedSegmentsCount: number;
  validSegmentsCount: number;
  invalidSegmentsCount: number;
  shortSegmentsMergedCount: number;
  selectedExecutionStrategy: PodcastExecutionStrategy;
  blockers: string[];
}

export function createDraftPodcastEditJob(input: {
  sequenceId?: string | null;
  sequenceName?: string | null;
  settings: PodcastSettings;
  cameraMappings?: CameraMapping[];
  speakerSegments?: SpeakerSegment[];
}): PodcastEditJob {
  return {
    id: `podcast-${Date.now()}`,
    sequenceId: input.sequenceId ?? null,
    sequenceName: input.sequenceName ?? null,
    settings: input.settings,
    cameraMappings: input.cameraMappings ?? [],
    speakerSegments: input.speakerSegments ?? [],
    status: "draft",
  };
}

export function parseSpeakerSegmentsJson(value: string): SpeakerSegmentsParseResult {
  if (!value.trim()) return { segments: [], errors: ["Speaker Segments JSON is empty."] };
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return { segments: [], errors: ["Speaker Segments JSON must be an array."] };
    }
    return {
      segments: parsed.map((item, index) => coerceSpeakerSegment(item, index)),
      errors: [],
    };
  } catch (err) {
    return { segments: [], errors: [`Invalid JSON: ${(err as Error).message}`] };
  }
}

export function validateSpeakerSegments(segments: SpeakerSegment[]): SpeakerSegmentsValidationResult {
  const validSegments: SpeakerSegment[] = [];
  const invalidSegments: Array<{ index: number; reason: string; raw: unknown }> = [];

  segments.forEach((segment, index) => {
    const reason = invalidSegmentReason(segment);
    if (reason) invalidSegments.push({ index, reason, raw: segment.raw ?? segment });
    else validSegments.push(segment);
  });

  return { validSegments, invalidSegments };
}

export function normalizeSpeakerSegments(segments: SpeakerSegment[]): SpeakerSegment[] {
  return segments
    .map((segment, index) => ({
      ...segment,
      id: segment.id || `segment_${index + 1}`,
      speakerId: segment.speakerId.trim(),
      startSec: roundTime(segment.startSec),
      endSec: roundTime(segment.endSec),
      source: segment.source ?? "manual",
    }))
    .sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
}

export function mergeTooShortSegments(
  segments: SpeakerSegment[],
  minimumShotLengthSec: number,
): MergeSpeakerSegmentsResult {
  const min = Math.max(0, minimumShotLengthSec);
  const normalized = normalizeSpeakerSegments(segments);
  const result: MergedSpeakerSegment[] = [];
  const blockers: string[] = [];
  let mergedCount = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    const segment = normalized[index];
    const duration = segmentDuration(segment);
    if (duration >= min || min === 0) {
      result.push({
        ...segment,
        reason: "Segment meets minimum shot length.",
        sourceSegmentIds: [segment.id],
      });
      continue;
    }

    const shortReason = `Segment ${segment.id} duration ${formatSeconds(duration)} is below minimum ${formatSeconds(min)}.`;
    const previous = result[result.length - 1];
    const next = normalized[index + 1];

    if (previous) {
      previous.endSec = Math.max(previous.endSec, segment.endSec);
      previous.reason = `${previous.reason} Merged ${segment.id} into previous decision. ${shortReason}`;
      previous.sourceSegmentIds.push(segment.id);
      mergedCount += 1;
      continue;
    }

    if (next) {
      const merged: MergedSpeakerSegment = {
        ...next,
        id: next.id,
        startSec: segment.startSec,
        endSec: Math.max(segment.endSec, next.endSec),
        reason: `Merged ${segment.id} into next decision ${next.id}. ${shortReason}`,
        sourceSegmentIds: [segment.id, next.id],
      };
      result.push(merged);
      mergedCount += 1;
      index += 1;
      continue;
    }

    blockers.push(`Cannot merge ${segment.id}; it is the only segment and is shorter than the minimum shot length.`);
    result.push({
      ...segment,
      reason: `${shortReason} No neighboring segment exists, so it remains as a blocked decision.`,
      sourceSegmentIds: [segment.id],
    });
  }

  return { segments: result, mergedCount, blockers };
}

export function generateCameraDecisionPlan(input: {
  speakerSegments: SpeakerSegment[];
  cameraMappings: CameraMapping[];
  minimumShotLengthSec: number;
  strategy: PodcastExecutionStrategy;
}): CameraDecisionPlanResult {
  const validation = validateSpeakerSegments(input.speakerSegments);
  const normalized = normalizeSpeakerSegments(validation.validSegments);
  const merged = mergeTooShortSegments(normalized, input.minimumShotLengthSec);
  const blockers = [...merged.blockers];
  const mappingBySpeaker = new Map(input.cameraMappings.map((mapping) => [mapping.speakerId, mapping]));

  const decisions = merged.segments.map((segment, index): CameraDecision => {
    const mapping = mappingBySpeaker.get(segment.speakerId);
    if (!mapping) blockers.push(`No camera mapping for ${segment.speakerId}.`);
    return {
      id: `decision_${index + 1}`,
      speakerId: segment.speakerId,
      startSec: segment.startSec,
      endSec: segment.endSec,
      durationSec: roundTime(segment.endSec - segment.startSec),
      videoTrackIndex: mapping?.videoTrackIndex,
      strategy: input.strategy,
      reason: mapping
        ? segment.reason
        : `${segment.reason} No mapped camera track; decision is plan-only.`,
      sourceSegmentIds: segment.sourceSegmentIds,
    };
  });

  return {
    decisions,
    parsedSegmentsCount: input.speakerSegments.length,
    validSegmentsCount: validation.validSegments.length,
    invalidSegmentsCount: validation.invalidSegments.length,
    shortSegmentsMergedCount: merged.mergedCount,
    selectedExecutionStrategy: input.strategy,
    blockers,
  };
}

function coerceSpeakerSegment(item: unknown, index: number): SpeakerSegment {
  const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `segment_${index + 1}`,
    speakerId: typeof raw.speakerId === "string" ? raw.speakerId : "",
    startSec: typeof raw.startSec === "number" ? raw.startSec : Number(raw.startSec),
    endSec: typeof raw.endSec === "number" ? raw.endSec : Number(raw.endSec),
    confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
    source: "manual",
    raw: item,
  };
}

function invalidSegmentReason(segment: SpeakerSegment): string | null {
  if (!segment.speakerId.trim()) return "speakerId is required.";
  if (!Number.isFinite(segment.startSec)) return "startSec must be a number.";
  if (!Number.isFinite(segment.endSec)) return "endSec must be a number.";
  if (segment.startSec < 0) return "startSec cannot be negative.";
  if (segment.endSec <= segment.startSec) return "endSec must be greater than startSec.";
  return null;
}

function segmentDuration(segment: SpeakerSegment): number {
  return roundTime(segment.endSec - segment.startSec);
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatSeconds(value: number): string {
  return `${roundTime(value)}s`;
}
