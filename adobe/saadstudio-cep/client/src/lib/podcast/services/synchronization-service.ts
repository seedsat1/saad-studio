import { evalES } from "../../cep";
import type {
  PodcastSynchronizationSnapshot,
  PodcastTimelineClipInfo,
} from "../types/premiere";

export interface SynchronizationTrackReadiness {
  kind: "video" | "audio";
  trackIndex: number;
  label: string;
  clipCount: number;
  firstStartSec: number | null;
  mediaAvailableCount: number;
}

export interface SynchronizationPlan {
  ok: boolean;
  sequenceId?: string | null;
  sequenceName?: string | null;
  sequenceDurationSec?: number | null;
  referenceAudioTrackIndex: number | null;
  videoTrackCount: number;
  audioTrackCount: number;
  videoClipCount: number;
  audioClipCount: number;
  alignedStartTracks: number;
  offsetCandidateTracks: number;
  waveformOffsets: SynchronizationOffsetResult[];
  offsetsComputed: number;
  offsetsReady: boolean;
  trackReadiness: SynchronizationTrackReadiness[];
  blockers: string[];
  warnings: string[];
  messages: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export async function analyzeSynchronizationPlan(): Promise<SynchronizationPlan> {
  const snapshot = await evalES<PodcastSynchronizationSnapshot>("getPodcastSynchronizationSnapshot");
  const plan = buildSynchronizationPlan(snapshot);
  if (plan.blockers.length > 0) return plan;
  return analyzeWaveformOffsets(snapshot, plan);
}

export function buildSynchronizationPlan(snapshot: PodcastSynchronizationSnapshot): SynchronizationPlan {
  const blockers = [...(snapshot.blockers ?? [])];
  const warnings: string[] = [];

  if (snapshot.status !== "ready") {
    blockers.push("ACTIVE_SEQUENCE_REQUIRED");
  }

  const audioWithMedia = snapshot.audioClips.filter((clip) => clip.mediaAvailable);
  const videoWithMedia = snapshot.videoClips.filter((clip) => clip.mediaAvailable);
  if (audioWithMedia.length === 0) blockers.push("NO_AUDIO_CLIPS_FOR_SYNC");
  if (videoWithMedia.length === 0) blockers.push("NO_VIDEO_CLIPS_FOR_SYNC");

  const referenceAudioTrackIndex = firstTrackWithMedia(audioWithMedia);
  const referenceStart = referenceAudioTrackIndex === null
    ? null
    : firstClipStartForTrack(audioWithMedia, referenceAudioTrackIndex);

  const trackReadiness = [
    ...trackReadinessFor("video", snapshot.videoTrackCount, snapshot.videoClips),
    ...trackReadinessFor("audio", snapshot.audioTrackCount, snapshot.audioClips),
  ];

  let alignedStartTracks = 0;
  let offsetCandidateTracks = 0;
  if (referenceStart !== null) {
    for (const track of trackReadiness) {
      if (track.firstStartSec === null || track.clipCount === 0) continue;
      const delta = Math.abs(track.firstStartSec - referenceStart);
      if (delta <= 0.02) alignedStartTracks++;
      else offsetCandidateTracks++;
    }
  }

  if (offsetCandidateTracks > 0) {
    warnings.push("OFFSET_CANDIDATES_REQUIRE_WAVEFORM_PROOF");
  }
  if (snapshot.audioClips.length === 0 || snapshot.videoClips.length === 0) {
    warnings.push("TIMELINE_HAS_EMPTY_SYNC_SIDE");
  }

  return {
    ok: blockers.length === 0,
    sequenceId: snapshot.sequenceId ?? null,
    sequenceName: snapshot.sequenceName ?? null,
    sequenceDurationSec: snapshot.sequenceDurationSec ?? null,
    referenceAudioTrackIndex,
    videoTrackCount: snapshot.videoTrackCount,
    audioTrackCount: snapshot.audioTrackCount,
    videoClipCount: snapshot.videoClips.length,
    audioClipCount: snapshot.audioClips.length,
    alignedStartTracks,
    offsetCandidateTracks,
    waveformOffsets: [],
    offsetsComputed: 0,
    offsetsReady: false,
    trackReadiness,
    blockers,
    warnings,
    messages: snapshot.messages ?? [],
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

export interface SynchronizationOffsetResult {
  audioTrackIndex: number;
  audioClipIndex: number | null;
  pairedVideoTrackIndex: number | null;
  pairedVideoClipIndex: number | null;
  audioClipName: string | null;
  videoClipName: string | null;
  sourcePath: string | null;
  currentTimelineStartSec: number | null;
  referenceTimelineStartSec: number | null;
  estimatedLagSec: number | null;
  suggestedMoveSec: number | null;
  suggestedTimelineStartSec: number | null;
  confidence: number;
  status: "ready" | "reference" | "blocked";
  blockers: string[];
  warnings: string[];
}

export interface SynchronizationApplyResult {
  ok: boolean;
  sequenceName?: string | null;
  sequenceId?: string | null;
  offsetsApplied: number;
  clipsMoved: number;
  movedItems: Array<{
    kind: "video" | "audio";
    trackIndex: number;
    clipIndex: number;
    clipName: string | null;
    moveSec: number;
    beforeStartSec: number | null;
    afterStartSec: number | null;
    result: unknown;
  }>;
  blockers: string[];
  warnings: string[];
  timelineMutation: "move current timeline clips";
  sequenceMutation: "none";
}

export async function applySynchronizationOffsets(plan: SynchronizationPlan): Promise<SynchronizationApplyResult> {
  const offsets = plan.waveformOffsets.filter((offset) =>
    (offset.status === "ready" || offset.status === "reference")
    && typeof offset.suggestedMoveSec === "number"
    && typeof offset.suggestedTimelineStartSec === "number"
    && Number.isFinite(offset.suggestedTimelineStartSec)
    && offset.suggestedTimelineStartSec >= 0
    && offset.confidence >= 0.08
    && Math.abs(offset.suggestedMoveSec) > 0.001
  );
  if (!plan.offsetsReady || offsets.length === 0) {
    return {
      ok: false,
      sequenceName: plan.sequenceName ?? null,
      sequenceId: plan.sequenceId ?? null,
      offsetsApplied: 0,
      clipsMoved: 0,
      movedItems: [],
      blockers: ["SYNC_OFFSETS_REQUIRED_BEFORE_APPLY"],
      warnings: [],
      timelineMutation: "move current timeline clips",
      sequenceMutation: "none",
    };
  }
  return evalES<SynchronizationApplyResult>("applyPodcastSynchronizationOffsets", offsets);
}

async function analyzeWaveformOffsets(
  snapshot: PodcastSynchronizationSnapshot,
  plan: SynchronizationPlan,
): Promise<SynchronizationPlan> {
  if (!window.cep_node) {
    return {
      ...plan,
      blockers: [...plan.blockers, "CEP_NODE_UNAVAILABLE"],
    };
  }
  const audioClips = firstMediaClipByTrack(snapshot.audioClips);
  const videoClips = snapshot.videoClips.filter((clip) => clip.mediaAvailable && clip.sourcePath);
  const referenceTrack = plan.referenceAudioTrackIndex;
  const referenceClip = referenceTrack == null ? null : audioClips.get(referenceTrack) ?? null;
  if (referenceTrack == null || !referenceClip?.sourcePath) {
    return {
      ...plan,
      blockers: [...plan.blockers, "REFERENCE_AUDIO_SOURCE_REQUIRED"],
    };
  }
  const referenceTrackIndex: number = referenceTrack;
  const referenceVideo = findPairedVideoClip(referenceClip, videoClips);

  const runtime = getSyncNodeRuntime();
  const ffmpegPath = resolveSyncFfmpegPath(runtime);
  if (!ffmpegPath) {
    return {
      ...plan,
      blockers: [...plan.blockers, "FFMPEG_EXECUTABLE_NOT_FOUND"],
    };
  }

  const referenceEnvelope = await extractSyncEnvelope(runtime, ffmpegPath, referenceClip);
  const offsets: SynchronizationOffsetResult[] = [];
  offsets.push({
    audioTrackIndex: referenceTrackIndex,
    audioClipIndex: referenceClip.clipIndex,
    pairedVideoTrackIndex: referenceVideo?.trackIndex ?? null,
    pairedVideoClipIndex: referenceVideo?.clipIndex ?? null,
    audioClipName: referenceClip.clipName ?? referenceClip.projectItemName ?? null,
    videoClipName: referenceVideo?.clipName ?? referenceVideo?.projectItemName ?? null,
    sourcePath: referenceClip.sourcePath ?? null,
    currentTimelineStartSec: referenceClip.timelineStartSec,
    referenceTimelineStartSec: referenceClip.timelineStartSec,
    estimatedLagSec: 0,
    suggestedMoveSec: 0,
    suggestedTimelineStartSec: referenceClip.timelineStartSec ?? 0,
    confidence: 1,
    status: "reference",
    blockers: [],
    warnings: [],
  });

  for (const [trackIndex, clip] of audioClips) {
    if (trackIndex === referenceTrack) continue;
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (!clip.sourcePath) blockers.push("AUDIO_SOURCE_PATH_REQUIRED");
    if (!isUsableSyncClip(clip)) blockers.push("INVALID_CLIP_TIMING");
    const pairedVideo = findPairedVideoClip(clip, videoClips);
    if (!pairedVideo) warnings.push("PAIRED_VIDEO_TRACK_NOT_FOUND");

    let estimatedLagSec: number | null = null;
    let suggestedMoveSec: number | null = null;
    let suggestedTimelineStartSec: number | null = null;
    let confidence = 0;

    if (blockers.length === 0) {
      const targetEnvelope = await extractSyncEnvelope(runtime, ffmpegPath, clip);
      const match = correlateEnvelopes(referenceEnvelope, targetEnvelope);
      estimatedLagSec = roundTime(match.lagSec);
      confidence = roundConfidence(match.confidence);
      const currentStart = clip.timelineStartSec ?? 0;
      const referenceStart = referenceClip.timelineStartSec ?? 0;
      suggestedTimelineStartSec = roundTime(referenceStart - estimatedLagSec);
      suggestedMoveSec = roundTime(suggestedTimelineStartSec - currentStart);
      if (confidence < 0.08) blockers.push("LOW_WAVEFORM_CORRELATION_CONFIDENCE");
      if (!Number.isFinite(suggestedTimelineStartSec)) {
        blockers.push("INVALID_SUGGESTED_TIMELINE_START");
      }
    }

    offsets.push({
      audioTrackIndex: trackIndex,
      audioClipIndex: clip.clipIndex,
      pairedVideoTrackIndex: pairedVideo?.trackIndex ?? null,
      pairedVideoClipIndex: pairedVideo?.clipIndex ?? null,
      audioClipName: clip.clipName ?? clip.projectItemName ?? null,
      videoClipName: pairedVideo?.clipName ?? pairedVideo?.projectItemName ?? null,
      sourcePath: clip.sourcePath ?? null,
      currentTimelineStartSec: clip.timelineStartSec,
      referenceTimelineStartSec: referenceClip.timelineStartSec,
      estimatedLagSec,
      suggestedMoveSec,
      suggestedTimelineStartSec,
      confidence,
      status: blockers.length === 0 ? "ready" : "blocked",
      blockers,
      warnings,
    });
  }

  normalizeSynchronizationStarts(offsets);

  const computed = offsets.filter((offset) => offset.status === "ready").length;
  const finalBlockers = unique([...plan.blockers, ...offsets.flatMap((offset) => offset.blockers)]);
  return {
    ...plan,
    ok: finalBlockers.length === 0,
    waveformOffsets: offsets,
    offsetsComputed: computed,
    offsetsReady: offsets.length > 1 && offsets.every((offset) => offset.status === "reference" || offset.status === "ready"),
    blockers: finalBlockers,
    warnings: unique([...plan.warnings, ...offsets.flatMap((offset) => offset.warnings)]),
  };
}

function firstTrackWithMedia(clips: PodcastTimelineClipInfo[]): number | null {
  const sorted = [...clips].sort((a, b) => a.trackIndex - b.trackIndex || a.clipIndex - b.clipIndex);
  return sorted[0]?.trackIndex ?? null;
}

function firstClipStartForTrack(clips: PodcastTimelineClipInfo[], trackIndex: number): number | null {
  const sorted = clips
    .filter((clip) => clip.trackIndex === trackIndex && typeof clip.timelineStartSec === "number")
    .sort((a, b) => (a.timelineStartSec ?? 0) - (b.timelineStartSec ?? 0));
  return sorted[0]?.timelineStartSec ?? null;
}

function trackReadinessFor(
  kind: "video" | "audio",
  count: number,
  clips: PodcastTimelineClipInfo[],
): SynchronizationTrackReadiness[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const trackClips = clips.filter((clip) => clip.trackIndex === index);
    const first = [...trackClips]
      .filter((clip) => typeof clip.timelineStartSec === "number")
      .sort((a, b) => (a.timelineStartSec ?? 0) - (b.timelineStartSec ?? 0))[0];
    return {
      kind,
      trackIndex: index,
      label: `${kind === "video" ? "V" : "A"}${index + 1}`,
      clipCount: trackClips.length,
      firstStartSec: first?.timelineStartSec ?? null,
      mediaAvailableCount: trackClips.filter((clip) => clip.mediaAvailable).length,
    };
  });
}

function firstMediaClipByTrack(clips: PodcastTimelineClipInfo[]): Map<number, PodcastTimelineClipInfo> {
  const out = new Map<number, PodcastTimelineClipInfo>();
  const sorted = clips
    .filter((clip) => clip.mediaAvailable && clip.sourcePath)
    .sort((a, b) => a.trackIndex - b.trackIndex || (a.timelineStartSec ?? 0) - (b.timelineStartSec ?? 0));
  for (const clip of sorted) {
    if (!out.has(clip.trackIndex)) out.set(clip.trackIndex, clip);
  }
  return out;
}

function isUsableSyncClip(clip: PodcastTimelineClipInfo): boolean {
  return typeof clip.timelineStartSec === "number"
    && typeof clip.timelineEndSec === "number"
    && typeof clip.sourceInPointSec === "number"
    && typeof clip.sourceOutPointSec === "number"
    && clip.timelineEndSec > clip.timelineStartSec
    && clip.sourceOutPointSec > clip.sourceInPointSec;
}

function getSyncNodeRuntime() {
  const nodeRequire = window.cep_node?.require;
  if (!nodeRequire) throw new Error("CEP Node is not available.");
  return {
    fs: nodeRequire("fs") as typeof import("fs"),
    os: nodeRequire("os") as typeof import("os"),
    path: nodeRequire("path") as typeof import("path"),
    cp: nodeRequire("child_process") as typeof import("child_process"),
    process: nodeRequire("process") as NodeJS.Process,
  };
}

function resolveSyncFfmpegPath(runtime: ReturnType<typeof getSyncNodeRuntime>): string | null {
  const candidates: string[] = [];
  try {
    const ext = window.__adobe_cep__?.getSystemPath("extension");
    if (ext) {
      candidates.push(runtime.path.join(ext, "tools", "ffmpeg", "ffmpeg.exe"));
    }
  } catch {}
  candidates.push("ffmpeg");
  for (const candidate of candidates) {
    if (candidate === "ffmpeg") return candidate;
    try {
      if (runtime.fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return null;
}

async function extractSyncEnvelope(
  runtime: ReturnType<typeof getSyncNodeRuntime>,
  ffmpegPath: string,
  clip: PodcastTimelineClipInfo,
): Promise<number[]> {
  const sourceIn = Math.max(0, clip.sourceInPointSec ?? 0);
  const duration = Math.min(900, Math.max(0.5, (clip.sourceOutPointSec ?? sourceIn + 900) - sourceIn));
  const args = [
    "-hide_banner",
    "-nostdin",
    "-ss",
    String(sourceIn),
    "-t",
    String(duration),
    "-i",
    clip.sourcePath ?? "",
    "-vn",
    "-ac",
    "1",
    "-ar",
    "8000",
    "-f",
    "s16le",
    "pipe:1",
  ];
  const buffer = await execFileBuffer(runtime.cp, ffmpegPath, args);
  return pcm16ToEnvelope(buffer, 8000, 0.1);
}

function execFileBuffer(
  cp: typeof import("child_process"),
  command: string,
  args: string[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    cp.execFile(command, args, { encoding: "buffer", maxBuffer: 80 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}: ${Buffer.isBuffer(stderr) ? stderr.toString("utf8") : String(stderr ?? "")}`));
        return;
      }
      resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout ?? ""));
    });
  });
}

function pcm16ToEnvelope(buffer: Buffer, sampleRate: number, windowSec: number): number[] {
  const samplesPerWindow = Math.max(1, Math.floor(sampleRate * windowSec));
  const totalSamples = Math.floor(buffer.length / 2);
  const envelope: number[] = [];
  for (let start = 0; start < totalSamples; start += samplesPerWindow) {
    let sum = 0;
    let count = 0;
    const end = Math.min(totalSamples, start + samplesPerWindow);
    for (let i = start; i < end; i++) {
      const sample = buffer.readInt16LE(i * 2) / 32768;
      sum += sample * sample;
      count++;
    }
    envelope.push(Math.sqrt(sum / Math.max(1, count)));
  }
  return normalize(envelope);
}

function correlateEnvelopes(reference: number[], target: number[]): { lagSec: number; confidence: number } {
  const stepSec = 0.1;
  const coarseFactor = 10;
  const coarseReference = downsampleEnvelope(reference, coarseFactor);
  const coarseTarget = downsampleEnvelope(target, coarseFactor);
  const minCoarseOverlap = Math.max(10, Math.floor(10 / (stepSec * coarseFactor)));
  const coarseMaxLag = Math.max(0, Math.max(coarseReference.length, coarseTarget.length) - minCoarseOverlap);
  let coarseBestLag = 0;
  let coarseBestScore = Number.NEGATIVE_INFINITY;
  for (let lag = -coarseMaxLag; lag <= coarseMaxLag; lag++) {
    const score = normalizedCorrelationAtLag(coarseReference, coarseTarget, lag, minCoarseOverlap);
    if (score > coarseBestScore) {
      coarseBestScore = score;
      coarseBestLag = lag;
    }
  }

  const fineCenter = coarseBestLag * coarseFactor;
  const fineRadius = coarseFactor * 2;
  const minFineOverlap = Math.max(100, Math.floor(10 / stepSec));
  let bestLag = fineCenter;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let lag = fineCenter - fineRadius; lag <= fineCenter + fineRadius; lag++) {
    const score = normalizedCorrelationAtLag(reference, target, lag, minFineOverlap);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return {
    lagSec: bestLag * stepSec,
    confidence: Number.isFinite(bestScore) ? Math.max(0, bestScore) : 0,
  };
}

function downsampleEnvelope(values: number[], factor: number): number[] {
  const out: number[] = [];
  for (let start = 0; start < values.length; start += factor) {
    const end = Math.min(values.length, start + factor);
    let sum = 0;
    for (let index = start; index < end; index++) sum += values[index];
    out.push(sum / Math.max(1, end - start));
  }
  return normalize(out);
}

function normalizedCorrelationAtLag(
  reference: number[],
  target: number[],
  lag: number,
  minimumOverlap: number,
): number {
  const referenceStart = Math.max(0, -lag);
  const targetStart = Math.max(0, lag);
  const count = Math.min(reference.length - referenceStart, target.length - targetStart);
  if (count < minimumOverlap) return Number.NEGATIVE_INFINITY;
  let product = 0;
  let referenceEnergy = 0;
  let targetEnergy = 0;
  for (let offset = 0; offset < count; offset++) {
    const a = reference[referenceStart + offset];
    const b = target[targetStart + offset];
    product += a * b;
    referenceEnergy += a * a;
    targetEnergy += b * b;
  }
  const denominator = Math.sqrt(referenceEnergy * targetEnergy);
  return denominator > 0 ? product / denominator : Number.NEGATIVE_INFINITY;
}

function findPairedVideoClip(
  audioClip: PodcastTimelineClipInfo,
  videoClips: PodcastTimelineClipInfo[],
): PodcastTimelineClipInfo | null {
  const audioPath = normalizeSourcePath(audioClip.sourcePath);
  if (audioPath) {
    const pathMatch = videoClips.find((clip) => normalizeSourcePath(clip.sourcePath) === audioPath);
    if (pathMatch) return pathMatch;
  }
  const audioProjectItem = (audioClip.projectItemName ?? "").trim().toLowerCase();
  if (audioProjectItem) {
    const itemMatch = videoClips.find((clip) =>
      (clip.projectItemName ?? "").trim().toLowerCase() === audioProjectItem
    );
    if (itemMatch) return itemMatch;
  }
  return null;
}

function normalizeSourcePath(value: string | null | undefined): string {
  return (value ?? "").replace(/\\/g, "/").trim().toLowerCase();
}

function normalizeSynchronizationStarts(offsets: SynchronizationOffsetResult[]): void {
  const usable = offsets.filter((offset) =>
    (offset.status === "reference" || offset.status === "ready")
    && typeof offset.suggestedTimelineStartSec === "number"
    && Number.isFinite(offset.suggestedTimelineStartSec)
  );
  if (!usable.length) return;
  const minimumStart = Math.min(...usable.map((offset) => offset.suggestedTimelineStartSec ?? 0));
  const shiftSec = minimumStart < 0 ? -minimumStart : 0;
  for (const offset of usable) {
    const currentStart = offset.currentTimelineStartSec ?? 0;
    const normalizedStart = roundTime((offset.suggestedTimelineStartSec ?? 0) + shiftSec);
    offset.suggestedTimelineStartSec = normalizedStart;
    offset.suggestedMoveSec = roundTime(normalizedStart - currentStart);
  }
}

function normalize(values: number[]): number[] {
  if (!values.length) return values;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance) || 1;
  return values.map((value) => (value - mean) / std);
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundConfidence(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
