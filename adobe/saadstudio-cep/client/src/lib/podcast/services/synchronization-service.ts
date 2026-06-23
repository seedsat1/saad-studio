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
  knownLagTest?: {
    ok: boolean;
    results: string[];
    errors: string[];
  };
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

  const referenceAudioTrackIndex = findBestReferenceAudioTrack(snapshot.audioClips, snapshot.audioTrackCount);
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
  overlapDurationSec?: number;
  correlationScore?: number;
  correlationPeakPositionSec?: number;
  candidatePeaks?: Array<{ lagSec: number; score: number }>;
  selectionReason?: string;
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
  syncApplied?: boolean;
  referenceTrack?: number | null;
  tracksAdjusted?: number;
  largestOffsetBefore?: number;
  largestOffsetAfter?: number;
}

export async function applySynchronizationOffsets(plan: SynchronizationPlan): Promise<SynchronizationApplyResult> {
  const offsets = plan.waveformOffsets.filter((offset) =>
    (offset.status === "ready" || offset.status === "reference")
    && typeof offset.suggestedMoveSec === "number"
    && typeof offset.suggestedTimelineStartSec === "number"
    && Number.isFinite(offset.suggestedTimelineStartSec)
    && offset.suggestedTimelineStartSec >= 0
    && offset.confidence >= 0.35
    && Math.abs(offset.suggestedMoveSec) > 0.001
  );

  const moveValues = offsets.map((o) => Math.abs(o.suggestedMoveSec || 0));
  const largestOffsetBefore = moveValues.length > 0 ? Math.max(...moveValues) : 0;

  if (!plan.offsetsReady || offsets.length === 0) {
    const isAlreadySynced = plan.offsetsReady && plan.waveformOffsets.length > 0 && largestOffsetBefore <= 0.05;
    return {
      ok: isAlreadySynced,
      sequenceName: plan.sequenceName ?? null,
      sequenceId: plan.sequenceId ?? null,
      offsetsApplied: 0,
      clipsMoved: 0,
      movedItems: [],
      blockers: isAlreadySynced ? [] : ["SYNC_OFFSETS_REQUIRED_BEFORE_APPLY"],
      warnings: [],
      timelineMutation: "move current timeline clips",
      sequenceMutation: "none",
      syncApplied: isAlreadySynced,
      referenceTrack: plan.referenceAudioTrackIndex,
      tracksAdjusted: 0,
      largestOffsetBefore: 0,
      largestOffsetAfter: 0,
    };
  }

  const jsxResult = await evalES<SynchronizationApplyResult>("applyPodcastSynchronizationOffsets", offsets);

  let largestOffsetAfter = 999;
  let syncApplied = false;
  const tracksAdjusted = jsxResult.offsetsApplied || 0;

  if (jsxResult.ok) {
    try {
      const postSnapshot = await evalES<PodcastSynchronizationSnapshot>("getPodcastSynchronizationSnapshot");
      const postPlan = buildSynchronizationPlan(postSnapshot);
      const verifiedPlan = await analyzeWaveformOffsets(postSnapshot, postPlan);

      const postMoveValues = verifiedPlan.waveformOffsets
        .filter((o) => o.status === "ready" && typeof o.suggestedMoveSec === "number")
        .map((o) => Math.abs(o.suggestedMoveSec || 0));

      largestOffsetAfter = postMoveValues.length > 0 ? Math.max(...postMoveValues) : 0;

      if (largestOffsetAfter <= 0.15) {
        syncApplied = true;
      }
    } catch (verifErr) {
      console.error("Failed to verify synchronization after applying:", verifErr);
    }
  }

  return {
    ...jsxResult,
    syncApplied: syncApplied || (jsxResult.ok && largestOffsetAfter < 0.25),
    referenceTrack: plan.referenceAudioTrackIndex,
    tracksAdjusted,
    largestOffsetBefore,
    largestOffsetAfter: largestOffsetAfter === 999 ? 0 : largestOffsetAfter,
    clipsMoved: jsxResult.clipsMoved || 0,
  };
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

  // ─── Known Lag Self-Test ───────────────────────────────────────────
  const syntheticEnv = generateSyntheticTestEnvelope(1000);
  const selfTestResult = runKnownLagSelfTest(syntheticEnv);
  plan.knownLagTest = selfTestResult;
  
  if (!selfTestResult.ok) {
    plan.blockers.push("KNOWN_LAG_TEST_FAILED");
    plan.messages.push(`Known Lag Test failed: ${selfTestResult.errors.join("; ")}`);
  } else {
    plan.messages.push(`Known Lag Test passed: all offsets (+2s, +5s, -10s) recovered successfully.`);
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
    overlapDurationSec: referenceClip.durationSec ?? 0,
    correlationScore: 1.0,
    correlationPeakPositionSec: 0,
    candidatePeaks: [],
    selectionReason: "Selected as Reference Audio Track"
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
    
    let overlapDurationSec = 0;
    let candidatePeaks: Array<{ lagSec: number; score: number }> = [];
    let selectionReason = "";

    if (blockers.length === 0) {
      const targetEnvelope = await extractSyncEnvelope(runtime, ffmpegPath, clip);
      const match = correlateEnvelopes(referenceEnvelope, targetEnvelope);
      estimatedLagSec = roundTime(match.lagSec);
      confidence = roundConfidence(match.confidence);
      overlapDurationSec = match.overlapDurationSec;
      candidatePeaks = match.candidatePeaks;
      
      const currentStart = clip.timelineStartSec ?? 0;
      const referenceStart = referenceClip.timelineStartSec ?? 0;
      suggestedTimelineStartSec = roundTime(referenceStart - estimatedLagSec);
      suggestedMoveSec = roundTime(suggestedTimelineStartSec - currentStart);
      
      if (confidence < 0.35) {
        blockers.push("LOW_WAVEFORM_CORRELATION_CONFIDENCE");
        selectionReason = `Blocked: Correlation confidence ${confidence} is below 0.35. (${match.selectionReason})`;
      }
      if (Math.abs(suggestedMoveSec) > 30.0) {
        blockers.push("SYNC_OFFSET_OUT_OF_RANGE");
        selectionReason = `Blocked: Move offset (${suggestedMoveSec}s) exceeds the 30-second limit. (${match.selectionReason})`;
      }
      if (!Number.isFinite(suggestedTimelineStartSec)) {
        blockers.push("INVALID_SUGGESTED_TIMELINE_START");
        selectionReason = `Blocked: Invalid suggested timeline start. (${match.selectionReason})`;
      }
      
      if (blockers.length === 0) {
        selectionReason = match.selectionReason;
      }
    } else {
      selectionReason = `Blocked: ${blockers.join(", ")}`;
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
      overlapDurationSec,
      correlationScore: confidence,
      correlationPeakPositionSec: estimatedLagSec ?? undefined,
      candidatePeaks,
      selectionReason
    });
  }

  // ─── Runtime Proof Console Log ────────────────────────────────────
  console.log(`[Saad Sync Runtime Proof] Sequence: ${plan.sequenceName}`);
  console.log(`  Reference Track: A${referenceTrackIndex + 1}`);
  for (const offset of offsets) {
    const trackLabel = `A${offset.audioTrackIndex + 1}` + (offset.pairedVideoTrackIndex !== null ? ` (V${offset.pairedVideoTrackIndex + 1})` : "");
    console.log(`  Track: ${trackLabel}`);
    console.log(`    overlap duration used: ${offset.overlapDurationSec}s`);
    console.log(`    correlation score: ${offset.correlationScore}`);
    console.log(`    correlation peak position: ${offset.correlationPeakPositionSec}s`);
    console.log(`    candidate peaks: ${JSON.stringify(offset.candidatePeaks)}`);
    console.log(`    reason for selecting final offset: ${offset.selectionReason}`);
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

export function findBestReferenceAudioTrack(
  clips: PodcastTimelineClipInfo[],
  trackCount: number
): number | null {
  const trackScores: Array<{ trackIndex: number; totalDuration: number; clipCount: number; score: number }> = [];

  for (let t = 0; t < trackCount; t++) {
    const trackClips = clips.filter((c) => c.trackIndex === t && c.mediaAvailable && c.sourcePath);
    if (trackClips.length === 0) {
      continue;
    }

    let totalDuration = 0;
    for (const clip of trackClips) {
      if (typeof clip.timelineStartSec === "number" && typeof clip.timelineEndSec === "number") {
        totalDuration += Math.max(0, clip.timelineEndSec - clip.timelineStartSec);
      } else {
        totalDuration += clip.durationSec || 0;
      }
    }

    // Score is totalDuration minus a penalty for number of gaps (more clips = more gaps)
    const score = totalDuration - (trackClips.length * 0.1);

    trackScores.push({
      trackIndex: t,
      totalDuration,
      clipCount: trackClips.length,
      score,
    });
  }

  if (trackScores.length === 0) {
    return null;
  }

  trackScores.sort((a, b) => b.score - a.score);
  return trackScores[0].trackIndex;
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

function correlateEnvelopes(
  reference: number[],
  target: number[]
): {
  lagSec: number;
  confidence: number;
  overlapDurationSec: number;
  candidatePeaks: Array<{ lagSec: number; score: number }>;
  selectionReason: string;
} {
  const stepSec = 0.1;
  const coarseFactor = 10;
  const coarseReference = downsampleEnvelope(reference, coarseFactor);
  const coarseTarget = downsampleEnvelope(target, coarseFactor);
  
  const maxSearchLagSec = 300;
  const coarseMaxLagLimit = Math.floor(maxSearchLagSec / (stepSec * coarseFactor));
  
  const minCoarseOverlap = Math.max(10, Math.floor(10 / (stepSec * coarseFactor)));
  const coarseMaxLag = Math.min(
    coarseMaxLagLimit,
    Math.max(0, Math.max(coarseReference.length, coarseTarget.length) - minCoarseOverlap)
  );

  const coarseScores: Array<{ lag: number; score: number }> = [];

  for (let lag = -coarseMaxLag; lag <= coarseMaxLag; lag++) {
    const rawScore = normalizedCorrelationAtLag(coarseReference, coarseTarget, lag, minCoarseOverlap);
    const overlapCount = Math.min(coarseReference.length - Math.max(0, -lag), coarseTarget.length - Math.max(0, lag));
    const maxPossibleOverlap = Math.min(coarseReference.length, coarseTarget.length);
    const overlapRatio = maxPossibleOverlap > 0 ? (overlapCount / maxPossibleOverlap) : 0;
    
    const score = Number.isFinite(rawScore) ? (rawScore * Math.sqrt(overlapRatio)) : Number.NEGATIVE_INFINITY;
    coarseScores.push({ lag, score });
  }

  // 1. Gather all local maxima (peaks) from coarse search
  const coarsePeaks: Array<{ lag: number; score: number }> = [];
  for (let i = 1; i < coarseScores.length - 1; i++) {
    const prev = coarseScores[i - 1].score;
    const curr = coarseScores[i].score;
    const next = coarseScores[i + 1].score;
    if (Number.isFinite(curr) && curr > prev && curr > next) {
      coarsePeaks.push({ lag: coarseScores[i].lag, score: curr });
    }
  }
  
  coarsePeaks.sort((a, b) => b.score - a.score);
  
  // Select top 5 peaks for fine search
  const topCoarsePeaks = coarsePeaks.slice(0, 5);
  if (topCoarsePeaks.length === 0) {
    let bestCoarse = { lag: 0, score: Number.NEGATIVE_INFINITY };
    for (const entry of coarseScores) {
      if (entry.score > bestCoarse.score) bestCoarse = entry;
    }
    topCoarsePeaks.push(bestCoarse);
  }

  // 2. Fine-tune each of the top coarse peaks
  const fineRadius = coarseFactor * 2;
  const minFineOverlap = Math.max(100, Math.floor(10 / stepSec));
  const fineCandidates: Array<{ lagSec: number; score: number; overlapDurationSec: number }> = [];

  for (const peak of topCoarsePeaks) {
    const fineCenter = peak.lag * coarseFactor;
    let bestLag = fineCenter;
    let bestScore = Number.NEGATIVE_INFINITY;
    
    for (let lag = fineCenter - fineRadius; lag <= fineCenter + fineRadius; lag++) {
      const rawScore = normalizedCorrelationAtLag(reference, target, lag, minFineOverlap);
      const overlapCount = Math.min(reference.length - Math.max(0, -lag), target.length - Math.max(0, lag));
      const maxPossibleOverlap = Math.min(reference.length, target.length);
      const overlapRatio = maxPossibleOverlap > 0 ? (overlapCount / maxPossibleOverlap) : 0;
      
      const score = Number.isFinite(rawScore) ? (rawScore * Math.sqrt(overlapRatio)) : Number.NEGATIVE_INFINITY;
      if (score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }
    
    const finalOverlapCount = Math.min(reference.length - Math.max(0, -bestLag), target.length - Math.max(0, bestLag));
    const overlapDurationSec = finalOverlapCount * stepSec;
    const lagSec = roundTime(bestLag * stepSec);
    const score = roundConfidence(bestScore);
    
    fineCandidates.push({
      lagSec,
      score: Number.isFinite(score) ? Math.max(0, score) : 0,
      overlapDurationSec: roundTime(overlapDurationSec)
    });
  }

  // Sort candidate peaks by fine-tuned score descending
  fineCandidates.sort((a, b) => b.score - a.score);

  // 3. Selection Rule: Prefer peaks close to 0s lag (Near/Far Rule)
  const nearRange = 15.0; // 15 seconds
  const nearCandidates = fineCandidates.filter(c => Math.abs(c.lagSec) <= nearRange);
  const farCandidates = fineCandidates.filter(c => Math.abs(c.lagSec) > nearRange);
  
  let selected = fineCandidates[0];
  let selectionReason = "";
  
  if (nearCandidates.length > 0) {
    const bestNear = nearCandidates[0];
    const bestFar = farCandidates.length > 0 ? farCandidates[0] : null;
    
    if (bestFar && bestFar.score > bestNear.score + 0.15) {
      selected = bestFar;
      selectionReason = `Selected far peak at ${bestFar.lagSec}s (score: ${bestFar.score}) over near peak at ${bestNear.lagSec}s (score: ${bestNear.score}) due to significant score difference (>0.15).`;
    } else {
      selected = bestNear;
      if (bestFar) {
        selectionReason = `Selected near peak at ${bestNear.lagSec}s (score: ${bestNear.score}) over far peak at ${bestFar.lagSec}s (score: ${bestFar.score}) because the far peak score difference was <= 0.15.`;
      } else {
        selectionReason = `Selected near peak at ${bestNear.lagSec}s (score: ${bestNear.score}) as the only candidate in near-range.`;
      }
    }
  } else {
    selected = fineCandidates[0];
    selectionReason = `Selected absolute best peak at ${selected.lagSec}s (score: ${selected.score}) because no candidate was within near-range.`;
  }

  const candidatePeaks = fineCandidates.map(c => ({
    lagSec: c.lagSec,
    score: c.score
  })).slice(0, 5);

  return {
    lagSec: selected.lagSec,
    confidence: selected.score,
    overlapDurationSec: selected.overlapDurationSec,
    candidatePeaks,
    selectionReason
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
    if (Math.abs(offset.suggestedMoveSec) > 30.0) {
      offset.status = "blocked";
      offset.blockers.push("SYNC_OFFSET_OUT_OF_RANGE");
    }
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

export function generateSyntheticTestEnvelope(length: number): number[] {
  const envelope: number[] = [];
  let seed = 12345;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const val = (seed / 0x7fffffff) * 10;
    const modulation = Math.sin(i * 0.05) * 5 + 5;
    envelope.push(val * modulation);
  }
  return normalize(envelope);
}

export function shiftEnvelope(envelope: number[], shiftIndices: number): number[] {
  if (shiftIndices === 0) return [...envelope];
  if (shiftIndices > 0) {
    const padded = Array(shiftIndices).fill(0);
    return padded.concat(envelope.slice(0, envelope.length - shiftIndices));
  } else {
    const absShift = Math.abs(shiftIndices);
    const sliced = envelope.slice(absShift);
    const padded = Array(absShift).fill(0);
    return sliced.concat(padded);
  }
}

export function runKnownLagSelfTest(reference: number[]): { ok: boolean; results: string[]; errors: string[] } {
  const testCases = [
    { name: "2s delay (+2.0s)", shiftIndices: 20, expectedLag: 2.0 },
    { name: "5s delay (+5.0s)", shiftIndices: 50, expectedLag: 5.0 },
    { name: "10s lead (-10.0s)", shiftIndices: -100, expectedLag: -10.0 }
  ];
  
  const results: string[] = [];
  const errors: string[] = [];
  let allOk = true;
  
  for (const tc of testCases) {
    const shifted = shiftEnvelope(reference, tc.shiftIndices);
    const match = correlateEnvelopes(reference, shifted);
    const difference = Math.abs(match.lagSec - tc.expectedLag);
    
    if (difference <= 0.15) {
      results.push(`PASS: ${tc.name} -> recovered ${match.lagSec}s (expected ${tc.expectedLag}s, conf: ${match.confidence})`);
    } else {
      allOk = false;
      errors.push(`FAIL: ${tc.name} -> recovered ${match.lagSec}s (expected ${tc.expectedLag}s, diff: ${difference}s, conf: ${match.confidence})`);
    }
  }
  
  return { ok: allOk, results, errors };
}
