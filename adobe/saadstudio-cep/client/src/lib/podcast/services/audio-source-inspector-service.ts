import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import type {
  AudioSourceInfo,
  AudioSourceProofResult,
  FfmpegDetectionDiagnostics,
  FfmpegPathCheck,
  FfmpegRmsRuntimeProof,
  AudioStreamInfo,
  AudioStreamSelectionProof,
  AudioTrackSpeakerMapping,
  FfprobeAudioStreamInfo,
  FfmpegFeasibilityResult,
  FullAudioActivityProof,
  RmsPreviewPoint,
  SpeakingSegment,
  DroppedShortSegment,
  SpeakerSourceAttributionProof,
  TrackActivity,
  TrackActivityWindow,
  TrackSpeakingSegment,
  TrackOverlapWindow,
  DominantTrackWindow,
  KeepSegment,
  SilenceRemovalAnalysisResult,
  SilenceRemovalSettings,
  SilenceSegment,
  SilenceDetectionDiagnosticSegment,
} from "../types";

const MINIMUM_FFMPEG_MAJOR_VERSION = 6;
const MINIMUM_FFMPEG_VERSION = "6.0";
const RMS_PREVIEW_WINDOW_SEC = 0.2;
const RMS_PREVIEW_DURATION_SEC = 3;
const RMS_PREVIEW_LIMIT = 12;
const RMS_PROOF_PREVIEW_LIMIT = 20;
const RMS_PROOF_DURATION_SEC = 5;
const FULL_ACTIVITY_DURATION_SEC = 30;
const FULL_ACTIVITY_THRESHOLD_DB = -45;
const FULL_ACTIVITY_MIN_SPEECH_SEC = 0.4;
const MAX_SUPPORTED_TIMELINE_DURATION_SEC = 4 * 60 * 60;
const DEFAULT_MINIMUM_CUT_GAP_SEC = 0.7;
const DEFAULT_MINIMUM_KEEP_SEGMENT_SEC = 1.5;
const DEFAULT_MERGE_ADJACENT_KEEP_GAP_SEC = 0.7;

type NodeRequire = <T = unknown>(moduleName: string) => T;

interface NodeRuntime {
  nodeRequire: NodeRequire;
  fs: typeof import("fs");
  path: typeof import("path");
  cp: typeof import("child_process");
  process: NodeJS.Process;
}

export async function inspectAudioSourcesAndFfmpeg(
  mappings: AudioTrackSpeakerMapping[],
): Promise<AudioSourceProofResult> {
  const inspection = await premierePodcastAdapter.inspectAudioSources(mappings);
  const blockers = [...inspection.blockers];
  const messages = [...inspection.messages];
  const firstInspectableSource = inspection.sources.find((source) => source.mediaAvailable && source.sourcePath);
  const ffmpeg = await runFfmpegFeasibility(firstInspectableSource ?? null);

  blockers.push(...ffmpeg.blockers);
  messages.push(...ffmpeg.messages);

  return {
    ok: blockers.length === 0 && ffmpeg.available && ffmpeg.versionSupported,
    ffmpeg,
    inspection,
    rmsPreview: ffmpeg.rmsPreview,
    blockers,
    messages,
    timelineMutation: "none",
  };
}

export async function diagnoseFfmpegDetection(): Promise<FfmpegDetectionDiagnostics> {
  if (!window.cep_node) {
    return emptyFfmpegDiagnostics({
      cepNodeAvailable: false,
      blockers: ["CEP_NODE_UNAVAILABLE"],
      messages: ["CEP Node is not available, so the panel cannot launch FFmpeg."],
    });
  }

  const runtime = getNodeRuntime();
  const pathEnv = readPathEnvironment(runtime.process);
  const searchedPaths = collectFfmpegSearchPaths(runtime);
  const whereRun = await execFileCapture(runtime.cp, "where.exe", ["ffmpeg"]);
  const selectedPath = selectFfmpegPath(searchedPaths);
  const blockers: string[] = [];
  const messages: string[] = [];

  if (!selectedPath) blockers.push("FFMPEG_EXECUTABLE_NOT_FOUND");

  const launchResult = selectedPath
    ? await execFileLaunch(runtime.cp, selectedPath, ["-version"])
    : null;
  const version = parseFfmpegVersion(launchResult?.versionOutput ?? "");
  const versionSupported = isFfmpegVersionSupported(version);

  if (selectedPath && !launchResult?.ok) blockers.push("FFMPEG_SPAWN_FAILED");
  if (selectedPath && launchResult?.ok && !versionSupported) blockers.push("FFMPEG_VERSION_UNSUPPORTED");

  messages.push(`PATH entries visible to CEP: ${pathEnv.entries.length}`);
  if (whereRun.ok && whereRun.output.trim()) messages.push("where ffmpeg succeeded.");
  if (!whereRun.ok) messages.push("where ffmpeg did not find an executable on PATH.");

  return {
    ok: blockers.length === 0 && !!launchResult?.ok && versionSupported,
    cepNodeAvailable: true,
    extensionPath: getExtensionPath(),
    searchedPaths,
    selectedPath,
    pathEnvironmentVisible: pathEnv.raw.length > 0,
    pathEnvironmentLength: pathEnv.raw.length,
    pathEnvironmentPreview: pathEnv.entries.slice(0, 12),
    whereFfmpegOutput: whereRun.ok ? whereRun.output.trim() : null,
    whereFfmpegError: whereRun.ok ? null : whereRun.output.trim(),
    spawnResult: launchResult,
    version,
    versionSupported,
    minimumVersion: MINIMUM_FFMPEG_VERSION,
    blockers,
    messages,
  };
}

export async function runFfmpegRmsRuntimeProof(
  mappings: AudioTrackSpeakerMapping[],
  selectedAudioStreamIndex?: number | null,
): Promise<FfmpegRmsRuntimeProof> {
  const interpretation = rmsTimestampInterpretation();
  const inspection = await premierePodcastAdapter.inspectAudioSources(mappings);
  const diagnostics = await diagnoseFfmpegDetection();
  const blockers = [...diagnostics.blockers];
  const warnings = [...inspection.blockers];
  const source = inspection.sources.find(isValidRmsProofSource) ?? null;
  const streamProof = source?.sourcePath
    ? await inspectAudioStreamsForRmsSource(mappings)
    : emptyAudioStreamSelectionProof();

  if (!source?.sourcePath) blockers.push("NO_VALID_RMS_SOURCE_PATH");
  if (source && !isValidClipTiming(source)) blockers.push("INVALID_CLIP_TIMING");
  if (!diagnostics.ok || !diagnostics.selectedPath) blockers.push("FFMPEG_NOT_READY");
  blockers.push(...streamProof.blockers);
  warnings.push(...streamProof.warnings);

  const streamCount = streamProof.ffprobeAudioStreams.length;
  const effectiveStreamIndex = streamCount === 1
    ? 0
    : typeof selectedAudioStreamIndex === "number"
      ? selectedAudioStreamIndex
      : null;
  if (streamCount > 1 && effectiveStreamIndex == null) blockers.push("AUDIO_STREAM_SELECTION_REQUIRED");
  if (effectiveStreamIndex != null && !streamProof.ffprobeAudioStreams.some((stream) => stream.audioStreamIndex === effectiveStreamIndex)) {
    blockers.push("SELECTED_AUDIO_STREAM_NOT_FOUND");
  }

  if (blockers.length > 0 || !source?.sourcePath || !diagnostics.selectedPath) {
    return {
      ffmpegAvailable: diagnostics.ok,
      ffmpegVersion: diagnostics.version,
      analyzedSourcePath: source?.sourcePath ?? null,
      selectedAudioTrackIndex: source?.audioTrackIndex ?? null,
      selectedClipIndex: source?.trackItemIndex ?? null,
      selectedAudioStreamIndex: effectiveStreamIndex,
      ffprobeAudioStreams: streamProof.ffprobeAudioStreams,
      analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
      rmsPreview: [],
      timestampInterpretation: interpretation,
      blockers: uniqueBlockers(blockers),
      warnings: uniqueBlockers(warnings),
      timelineMutation: "none",
      sequenceMutation: "none",
    };
  }

  const runtime = getNodeRuntime();

  return {
    ffmpegAvailable: true,
    ffmpegVersion: diagnostics.version,
    analyzedSourcePath: source.sourcePath,
    selectedAudioTrackIndex: source.audioTrackIndex,
    selectedClipIndex: source.trackItemIndex ?? null,
    selectedAudioStreamIndex: effectiveStreamIndex,
    ffprobeAudioStreams: streamProof.ffprobeAudioStreams,
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    rmsPreview: await runRmsPreview(runtime.cp, diagnostics.selectedPath, source, RMS_PROOF_DURATION_SEC, RMS_PROOF_PREVIEW_LIMIT, effectiveStreamIndex),
    timestampInterpretation: interpretation,
    blockers: [],
    warnings: uniqueBlockers(warnings),
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

export async function inspectAudioStreamsForRmsSource(
  mappings: AudioTrackSpeakerMapping[],
): Promise<AudioStreamSelectionProof> {
  const inspection = await premierePodcastAdapter.inspectAudioSources(mappings);
  const warnings = [...inspection.blockers];
  const source = inspection.sources.find(isValidRmsProofSource) ?? null;
  if (!source?.sourcePath) {
    return {
      ...emptyAudioStreamSelectionProof(),
      blockers: ["NO_VALID_RMS_SOURCE_PATH"],
      warnings: uniqueBlockers(warnings),
    };
  }
  if (!window.cep_node) {
    return {
      ...emptyAudioStreamSelectionProof(source.sourcePath),
      blockers: ["CEP_NODE_UNAVAILABLE"],
      warnings: uniqueBlockers(warnings),
    };
  }

  const runtime = getNodeRuntime();
  return inspectAudioStreamsForSingleSource(runtime, source, warnings);
}

async function inspectAudioStreamsForSingleSource(
  runtime: NodeRuntime,
  source: AudioSourceInfo,
  warnings: string[] = [],
): Promise<AudioStreamSelectionProof> {
  const ffprobePath = resolveFfprobePath(runtime);
  const probeRun = await execFileCapture(runtime.cp, ffprobePath, [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=index,codec_name,sample_rate,channels,channel_layout,duration:stream_tags=language,title",
    "-of",
    "json",
    source.sourcePath ?? "",
  ]);
  if (!probeRun.ok) {
    const fallbackStream: FfprobeAudioStreamInfo = {
      streamIndex: 0,
      audioStreamIndex: 0,
      codecName: null,
      sampleRate: null,
      channels: null,
      channelLayout: null,
      duration: null,
      language: null,
      title: null,
    };
    return {
      ok: true,
      analyzedSourcePath: source.sourcePath,
      ffprobePath,
      ffprobeAudioStreams: [fallbackStream],
      autoSelectedAudioStreamIndex: 0,
      selectedAudioStreamIndex: 0,
      blockers: [],
      warnings: uniqueBlockers([...warnings, "FFPROBE_UNAVAILABLE_USING_AUDIO_STREAM_0"]),
      timelineMutation: "none",
      sequenceMutation: "none",
    };
  }

  const streams = parseFfprobeAudioStreams(probeRun.output);
  const blockers: string[] = [];
  if (streams.length === 0) blockers.push("NO_AUDIO_STREAM_DETECTED");
  if (streams.length > 1) blockers.push("AUDIO_STREAM_SELECTION_REQUIRED");
  return {
    ok: blockers.length === 0,
    analyzedSourcePath: source.sourcePath,
    ffprobePath,
    ffprobeAudioStreams: streams,
    autoSelectedAudioStreamIndex: streams.length === 1 ? 0 : null,
    selectedAudioStreamIndex: streams.length === 1 ? 0 : null,
    blockers,
    warnings: uniqueBlockers(warnings),
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

export async function runFullAudioActivityProof(
  mappings: AudioTrackSpeakerMapping[],
  selectedAudioStreamIndex?: number | null,
): Promise<FullAudioActivityProof> {
  const inspection = await premierePodcastAdapter.inspectAudioSources(mappings);
  const diagnostics = await diagnoseFfmpegDetection();
  const blockers = [...diagnostics.blockers];
  const warnings = [...inspection.blockers];
  const source = inspection.sources.find(isValidRmsProofSource) ?? null;
  const streamProof = source?.sourcePath
    ? await inspectAudioStreamsForRmsSource(mappings)
    : emptyAudioStreamSelectionProof();
  const streamCount = streamProof.ffprobeAudioStreams.length;
  const effectiveStreamIndex = streamCount === 1
    ? 0
    : typeof selectedAudioStreamIndex === "number"
      ? selectedAudioStreamIndex
      : null;

  if (!source?.sourcePath) blockers.push("NO_VALID_RMS_SOURCE_PATH");
  if (source && !isValidClipTiming(source)) blockers.push("INVALID_CLIP_TIMING");
  if (!diagnostics.ok || !diagnostics.selectedPath) blockers.push("FFMPEG_NOT_READY");
  blockers.push(...streamProof.blockers.filter((blocker) => blocker !== "AUDIO_STREAM_SELECTION_REQUIRED"));
  warnings.push(...streamProof.warnings);
  if (streamCount > 1 && effectiveStreamIndex == null) blockers.push("AUDIO_STREAM_SELECTION_REQUIRED");
  if (effectiveStreamIndex != null && !streamProof.ffprobeAudioStreams.some((stream) => stream.audioStreamIndex === effectiveStreamIndex)) {
    blockers.push("SELECTED_AUDIO_STREAM_NOT_FOUND");
  }

  if (blockers.length > 0 || !source?.sourcePath || !diagnostics.selectedPath || effectiveStreamIndex == null) {
    return emptyFullAudioActivityProof(effectiveStreamIndex, uniqueBlockers(blockers), uniqueBlockers(warnings));
  }

  const runtime = getNodeRuntime();
  const allWindows = await runRmsPreview(
    runtime.cp,
    diagnostics.selectedPath,
    source,
    FULL_ACTIVITY_DURATION_SEC,
    Number.POSITIVE_INFINITY,
    effectiveStreamIndex,
  );
  const activity = buildFullActivitySegments(allWindows);

  return {
    analyzedDurationSec: FULL_ACTIVITY_DURATION_SEC,
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    totalRmsWindows: allWindows.length,
    activeWindowsCount: activity.activeWindowsCount,
    inactiveWindowsCount: activity.inactiveWindowsCount,
    longestActiveRunSec: activity.longestActiveRunSec,
    rmsPreviewFirst20: allWindows.slice(0, 20),
    speakingSegments: activity.speakingSegments,
    droppedShortSegments: activity.droppedShortSegments,
    thresholdUsed: FULL_ACTIVITY_THRESHOLD_DB,
    minimumSpeechDurationSec: FULL_ACTIVITY_MIN_SPEECH_SEC,
    selectedAudioStreamIndex: effectiveStreamIndex,
    blockers: [],
    warnings: uniqueBlockers(warnings),
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

export async function analyzeSilenceRemovalAudio(
  settings: SilenceRemovalSettings,
): Promise<SilenceRemovalAnalysisResult> {
  const mapping: AudioTrackSpeakerMapping = {
    speakerId: "silence_source",
    audioTrackIndex: settings.audioTrackIndex,
  };
  const inspection = await premierePodcastAdapter.inspectAudioSources([mapping]);
  const layout = await premierePodcastAdapter.getTimelineLayout();
  const diagnostics = await diagnoseFfmpegDetection();
  const blockers = [...diagnostics.blockers];
  const warnings = [...inspection.blockers];
  const sources = inspection.sources.filter((item) =>
    item.audioTrackIndex === settings.audioTrackIndex && isValidRmsProofSource(item)
  );
  const source = sources[0] ?? null;
  const streamProof = source?.sourcePath
    ? await inspectAudioStreamsForRmsSource([mapping])
    : emptyAudioStreamSelectionProof();
  const streamCount = streamProof.ffprobeAudioStreams.length;
  const effectiveStreamIndex = streamCount === 1
    ? 0
    : typeof settings.selectedAudioStreamIndex === "number"
      ? settings.selectedAudioStreamIndex
      : null;

  if (!source?.sourcePath) blockers.push("NO_VALID_RMS_SOURCE_PATH");
  for (const validSource of sources) {
    if (!isValidClipTiming(validSource)) blockers.push("INVALID_CLIP_TIMING");
  }
  if (!diagnostics.ok || !diagnostics.selectedPath) blockers.push("FFMPEG_NOT_READY");
  blockers.push(...streamProof.blockers.filter((blocker) => blocker !== "AUDIO_STREAM_SELECTION_REQUIRED"));
  warnings.push(...streamProof.warnings);
  if (streamCount > 1 && effectiveStreamIndex == null) blockers.push("AUDIO_STREAM_SELECTION_REQUIRED");
  if (effectiveStreamIndex != null && !streamProof.ffprobeAudioStreams.some((stream) => stream.audioStreamIndex === effectiveStreamIndex)) {
    blockers.push("SELECTED_AUDIO_STREAM_NOT_FOUND");
  }

  const sequenceDurationSec = typeof layout.sequenceDurationSec === "number" ? Math.max(0, layout.sequenceDurationSec) : null;
  const audioSourceDurationSec = sources.reduce((sum, item) => sum + Math.max(0, item.durationSec ?? 0), 0);
  const lastSourceTimelineEndSec = sources.reduce((max, item) => Math.max(max, item.timelineEndSec ?? 0), 0);
  const analyzedDurationSec = sequenceDurationSec ?? lastSourceTimelineEndSec;
  if (sources.length > 1) warnings.push(`SILENCE_MASTER_TRACK_SOURCES_ANALYZED:${sources.length}`);
  if (sequenceDurationSec != null && lastSourceTimelineEndSec > 0 && lastSourceTimelineEndSec + RMS_PREVIEW_WINDOW_SEC < sequenceDurationSec) {
    warnings.push("AUDIO_SOURCE_SHORTER_THAN_SEQUENCE");
  }
  if (!(analyzedDurationSec > 0)) blockers.push("INVALID_ANALYSIS_DURATION");

  if (blockers.length > 0 || !source?.sourcePath || !diagnostics.selectedPath || effectiveStreamIndex == null) {
    return emptySilenceRemovalAnalysis(settings, analyzedDurationSec, source?.sourcePath ?? null, effectiveStreamIndex, uniqueBlockers(blockers), uniqueBlockers(warnings), sequenceDurationSec, audioSourceDurationSec);
  }

  const runtime = getNodeRuntime();
  const windows: RmsPreviewPoint[] = [];
  for (const validSource of sources) {
    const sourceDurationSec = Math.max(0, validSource.durationSec ?? 0);
    if (!(sourceDurationSec > 0)) continue;
    const sourceWindows = await runRmsPreview(
      runtime.cp,
      diagnostics.selectedPath,
      validSource,
      sourceDurationSec,
      Number.POSITIVE_INFINITY,
      effectiveStreamIndex,
    );
    windows.push(...sourceWindows);
  }
  windows.sort((a, b) => a.timelineStartSec - b.timelineStartSec);
  const effectiveSettings = settings.autoMode
    ? buildAutomaticSilenceSettings(settings, windows)
    : settings;
  const segments = buildSilenceAndKeepSegments(windows, analyzedDurationSec, effectiveSettings);
  return {
    ok: segments.keepSegments.length > 0,
    audioTrackIndex: settings.audioTrackIndex,
    analyzedSourcePath: sources.length === 1 ? (source?.sourcePath ?? null) : `${sources.length} timeline sources`,
    selectedAudioStreamIndex: effectiveStreamIndex,
    sequenceDurationSec: sequenceDurationSec == null ? null : roundTime(sequenceDurationSec),
    audioSourceDurationSec: roundTime(audioSourceDurationSec),
    analyzedDurationSec: roundTime(analyzedDurationSec),
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    totalRmsWindows: windows.length,
    silenceSegments: segments.silenceSegments,
    droppedSilenceSegments: segments.droppedSilenceSegments,
    longestDroppedSilenceSec: segments.droppedSilenceSegments.reduce((max, segment) => Math.max(max, segment.durationSec), 0),
    silenceDetectionDiagnostics: {
      thresholdUsed: effectiveSettings.silenceThresholdDb,
      minimumDurationUsed: effectiveSettings.minimumSilenceDurationSec,
      detectedSilenceSegments: segments.silenceSegments.map((segment) =>
        toSilenceDiagnosticSegment(segment, "ACCEPTED_SILENCE", effectiveSettings)
      ),
      rejectedSilenceSegments: segments.rejectedSilenceSegments,
    },
    keepSegments: segments.keepSegments,
    totalRemovedDurationSec: segments.totalRemovedDurationSec,
    blockers: segments.keepSegments.length > 0 ? [] : ["NO_KEEP_SEGMENTS_GENERATED"],
    warnings: uniqueBlockers(settings.autoMode
      ? [...warnings, `AUTO_SILENCE_SETTINGS:${effectiveSettings.silenceThresholdDb}dB/${effectiveSettings.minimumSilenceDurationSec}s/${effectiveSettings.minimumCutGapSec}s`]
      : warnings),
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

export async function runSpeakerSourceAttributionProof(
  mappings: AudioTrackSpeakerMapping[],
  selectedAudioStreamIndex?: number | null,
): Promise<SpeakerSourceAttributionProof> {
  const inspection = await premierePodcastAdapter.inspectAudioSources(mappings);
  const diagnostics = await diagnoseFfmpegDetection();
  const blockers = [...diagnostics.blockers];
  const warnings = [...inspection.blockers];

  if (!diagnostics.ok || !diagnostics.selectedPath) blockers.push("FFMPEG_NOT_READY");
  if (blockers.length > 0 || !diagnostics.selectedPath) {
    return emptySpeakerSourceAttributionProof(uniqueBlockers(blockers), uniqueBlockers(warnings));
  }

  const runtime = getNodeRuntime();
  const trackActivity: TrackActivity[] = [];
  const trackSpeakingSegments: TrackSpeakingSegment[] = [];
  let analyzedDurationSec = 0;

  const normalizedTrackWindowsMap = new Map<number, TrackActivityWindow[]>();
  const trackBlockersMap = new Map<number, string[]>();
  const trackWarningsMap = new Map<number, string[]>();
  const trackFirstSourcePathMap = new Map<number, string | null>();
  const trackFirstStreamIndexMap = new Map<number, number | null>();

  const results = await Promise.all(
    mappings.map(async (mapping) => {
      const sources = inspection.sources.filter((item) =>
        item.audioTrackIndex === mapping.audioTrackIndex && isValidRmsProofSource(item)
      ).sort((a, b) => (a.timelineStartSec ?? 0) - (b.timelineStartSec ?? 0));

      if (sources.length === 0) {
        return {
          mapping,
          empty: true,
          trackActivity: emptyTrackActivity(mapping, ["NO_VALID_RMS_SOURCE_PATH"], []),
        };
      }

      const trackBlockers: string[] = [];
      const trackWarnings: string[] = [];
      const rawWindows: TrackActivityWindow[] = [];
      let firstSourcePath: string | null = null;
      let firstStreamIndex: number | null = null;
      let localAnalyzedDurationSec = 0;

      for (const source of sources) {
        if (!source.sourcePath) continue;
        firstSourcePath ??= source.sourcePath;
        const sourceDurationSec = Math.max(0, source.durationSec ?? 0);
        if (sourceDurationSec <= 0) {
          trackBlockers.push(`INVALID_CLIP_TIMING:A${mapping.audioTrackIndex + 1}:clip_${source.trackItemIndex ?? 0}`);
          continue;
        }
        if ((source.timelineEndSec ?? sourceDurationSec) > MAX_SUPPORTED_TIMELINE_DURATION_SEC) {
          trackBlockers.push("SYSTEM_LIMIT_REACHED");
          continue;
        }

        const streamProof = await inspectAudioStreamsForSingleSource(runtime, source);
        trackWarnings.push(...streamProof.warnings);
        const sourceBlockers = streamProof.blockers.filter((blocker) => blocker !== "AUDIO_STREAM_SELECTION_REQUIRED");
        const effectiveStreamIndex = streamProof.ffprobeAudioStreams.length === 1
          ? 0
          : typeof selectedAudioStreamIndex === "number"
            ? selectedAudioStreamIndex
            : null;
        firstStreamIndex ??= effectiveStreamIndex;

        if (streamProof.ffprobeAudioStreams.length > 1 && effectiveStreamIndex == null) {
          sourceBlockers.push("AUDIO_STREAM_SELECTION_REQUIRED");
        }
        if (effectiveStreamIndex != null && !streamProof.ffprobeAudioStreams.some((stream) => stream.audioStreamIndex === effectiveStreamIndex)) {
          sourceBlockers.push("SELECTED_AUDIO_STREAM_NOT_FOUND");
        }
        if (sourceBlockers.length > 0 || effectiveStreamIndex == null) {
          trackBlockers.push(...sourceBlockers.map((blocker) =>
            `${blocker}:A${mapping.audioTrackIndex + 1}:clip_${source.trackItemIndex ?? 0}`
          ));
          continue;
        }

        localAnalyzedDurationSec = Math.max(localAnalyzedDurationSec, source.timelineEndSec ?? sourceDurationSec);
        const rmsWindows = await runRmsPreview(
          runtime.cp,
          diagnostics.selectedPath!,
          source,
          sourceDurationSec,
          Number.POSITIVE_INFINITY,
          effectiveStreamIndex,
        );
        rawWindows.push(...rmsWindows.map((window): TrackActivityWindow => ({
          audioTrackIndex: mapping.audioTrackIndex,
          speakerId: mapping.speakerId,
          sourcePath: source.sourcePath ?? "",
          selectedAudioStreamIndex: effectiveStreamIndex,
          sourceTimeSec: window.sourceTimeSec,
          timelineStartSec: window.timelineStartSec,
          timelineEndSec: window.timelineEndSec,
          rmsDb: window.rmsDb,
          active: Number.isFinite(window.rmsDb) && window.rmsDb >= FULL_ACTIVITY_THRESHOLD_DB,
        })));
      }

      const windows = normalizeTrackWindows(rawWindows);
      return {
        mapping,
        empty: false,
        windows,
        trackBlockers,
        trackWarnings,
        firstSourcePath,
        firstStreamIndex,
        localAnalyzedDurationSec,
      };
    })
  );

  for (const res of results) {
    if (res.empty) {
      if (res.trackActivity) {
        trackActivity.push(res.trackActivity);
      }
      continue;
    }
    normalizedTrackWindowsMap.set(res.mapping.audioTrackIndex, res.windows ?? []);
    trackBlockersMap.set(res.mapping.audioTrackIndex, res.trackBlockers ?? []);
    trackWarningsMap.set(res.mapping.audioTrackIndex, res.trackWarnings ?? []);
    trackFirstSourcePathMap.set(res.mapping.audioTrackIndex, res.firstSourcePath ?? null);
    trackFirstStreamIndexMap.set(res.mapping.audioTrackIndex, res.firstStreamIndex ?? null);
    analyzedDurationSec = Math.max(analyzedDurationSec, res.localAnalyzedDurationSec ?? 0);
  }

  // --- CROSSTALK MITIGATION ---
  const crosstalkMarginDb = 6.0;
  const absoluteFloorDb = -55.0;

  const windowsByBucket = new Map<number, Map<number, TrackActivityWindow>>();
  for (const [trackIndex, windows] of normalizedTrackWindowsMap.entries()) {
    for (const window of windows) {
      const bucket = timelineBucketIndex(window);
      const bucketMap = windowsByBucket.get(bucket) ?? new Map<number, TrackActivityWindow>();
      bucketMap.set(trackIndex, window);
      windowsByBucket.set(bucket, bucketMap);
    }
  }

  for (const bucketMap of windowsByBucket.values()) {
    let maxRmsDb = -999;
    for (const window of bucketMap.values()) {
      if (Number.isFinite(window.rmsDb) && window.rmsDb > maxRmsDb) {
        maxRmsDb = window.rmsDb;
      }
    }

    for (const window of bucketMap.values()) {
      if (!Number.isFinite(window.rmsDb)) {
        window.active = false;
        continue;
      }
      const meetsRelativeMargin = window.rmsDb >= maxRmsDb - crosstalkMarginDb;
      const meetsAbsoluteFloor = window.rmsDb >= absoluteFloorDb;
      window.active = meetsRelativeMargin && meetsAbsoluteFloor;
    }
  }

  // --- SECOND PASS: BUILD SEGMENTS AND ACTIVITY ---
  for (const mapping of mappings) {
    const windows = normalizedTrackWindowsMap.get(mapping.audioTrackIndex) ?? [];
    const trackBlockers = trackBlockersMap.get(mapping.audioTrackIndex) ?? [];
    const trackWarnings = trackWarningsMap.get(mapping.audioTrackIndex) ?? [];
    const firstSourcePath = trackFirstSourcePathMap.get(mapping.audioTrackIndex) ?? null;
    const firstStreamIndex = trackFirstStreamIndexMap.get(mapping.audioTrackIndex) ?? null;

    if (windows.length === 0) {
      trackActivity.push(emptyTrackActivity(
        mapping,
        uniqueBlockers(trackBlockers.length > 0 ? trackBlockers : ["NO_VALID_RMS_SOURCE_PATH"]),
        uniqueBlockers(trackWarnings),
        firstSourcePath,
        firstStreamIndex,
      ));
      continue;
    }

    const segmentResult = buildTrackSpeakingSegments(windows, mapping);
    warnings.push(...segmentResult.warnings);
    trackSpeakingSegments.push(...segmentResult.speakingSegments);
    trackActivity.push({
      audioTrackIndex: mapping.audioTrackIndex,
      speakerId: mapping.speakerId,
      sourcePath: firstSourcePath,
      selectedAudioStreamIndex: firstStreamIndex,
      totalRmsWindows: windows.length,
      activeWindowsCount: windows.filter((window) => window.active).length,
      inactiveWindowsCount: windows.filter((window) => !window.active).length,
      windows,
      blockers: uniqueBlockers(trackBlockers),
      warnings: uniqueBlockers(trackWarnings),
    });
  }

  const overlaps = buildOverlapWindows(trackActivity);
  const dominantTrackAtTime = buildDominantTrackWindows(trackActivity);
  const returnedTrackActivity = trackActivity.map((track) => ({
    ...track,
    windows: track.windows.slice(0, 20),
    warnings: track.windows.length > 20
      ? uniqueBlockers([...track.warnings, `TRACK_ACTIVITY_WINDOWS_TRUNCATED:${track.windows.length}`])
      : track.warnings,
  }));
  return {
    trackActivity: returnedTrackActivity,
    trackSpeakingSegments: trackSpeakingSegments.map((segment, index) => ({ ...segment, id: `track_speech_${index + 1}` })),
    overlaps,
    dominantTrackAtTime,
    analyzedDurationSec: roundTime(analyzedDurationSec || FULL_ACTIVITY_DURATION_SEC),
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    thresholdUsed: FULL_ACTIVITY_THRESHOLD_DB,
    minimumSpeechDurationSec: FULL_ACTIVITY_MIN_SPEECH_SEC,
    blockers: uniqueBlockers(blockers),
    warnings: uniqueBlockers(warnings),
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

async function runFfmpegFeasibility(source: AudioSourceInfo | null): Promise<FfmpegFeasibilityResult> {
  const base = emptyFfmpegResult();
  if (!window.cep_node) {
    return {
      ...base,
      blockers: ["CEP_NODE_UNAVAILABLE"],
      messages: ["FFmpeg proof must run inside the CEP panel with Node enabled."],
    };
  }
  if (!source?.sourcePath) {
    return {
      ...base,
      blockers: ["NO_CONFIRMED_AUDIO_SOURCE_PATH"],
      messages: ["No confirmed audio source path was available for FFmpeg proof."],
    };
  }
  if (!isValidClipTiming(source)) {
    return {
      ...base,
      blockers: ["INVALID_CLIP_TIMING"],
      messages: ["clip.start/end or clip.inPoint/outPoint timing is invalid."],
    };
  }

  const runtime = getNodeRuntime();
  const diagnostics = await diagnoseFfmpegDetection();
  const ffmpegPath = diagnostics.selectedPath ?? "ffmpeg";

  if (!diagnostics.ok) {
    return {
      ...base,
      path: ffmpegPath,
      version: diagnostics.version,
      versionSupported: diagnostics.versionSupported,
      blockers: diagnostics.blockers.length ? diagnostics.blockers : ["FFMPEG_UNAVAILABLE"],
      messages: diagnostics.messages,
    };
  }

  const version = diagnostics.version ?? null;
  const versionSupported = isFfmpegVersionSupported(version);
  const streamRun = await execFileCapture(runtime.cp, ffmpegPath, ["-hide_banner", "-i", source.sourcePath ?? ""]);
  const streams = parseAudioStreams(streamRun.output);
  const streamBlockers: string[] = [];
  const streamMessages: string[] = [];

  if (streams.length === 0) {
    streamBlockers.push("NO_AUDIO_STREAM_DETECTED");
  }
  if (streams.length > 1) {
    streamBlockers.push("MULTIPLE_AUDIO_STREAMS_DETECTED");
    streamMessages.push("Multiple audio streams detected. Version 1 does not choose streams automatically.");
  }
  if (!versionSupported) {
    streamBlockers.push("FFMPEG_VERSION_UNSUPPORTED");
  }

  const canRunRms = versionSupported && streams.length === 1 && streamBlockers.length === 0;
  const rmsPreview = canRunRms ? await runRmsPreview(runtime.cp, ffmpegPath, source, RMS_PREVIEW_DURATION_SEC, RMS_PREVIEW_LIMIT) : [];

  return {
    available: true,
    path: ffmpegPath,
    version,
    versionSupported,
    minimumVersion: MINIMUM_FFMPEG_VERSION,
    audioStreamCount: streams.length,
    audioStreams: streams,
    rmsPreview,
    blockers: streamBlockers,
    messages: [
      `FFmpeg executable: ${ffmpegPath}`,
      version ? `FFmpeg version: ${version}` : "FFmpeg version could not be parsed.",
      ...streamMessages,
    ],
  };
}

function emptyFfmpegResult(): FfmpegFeasibilityResult {
  return {
    available: false,
    path: null,
    version: null,
    versionSupported: false,
    minimumVersion: MINIMUM_FFMPEG_VERSION,
    audioStreamCount: 0,
    audioStreams: [],
    rmsPreview: [],
    blockers: [],
    messages: [],
  };
}

function getNodeRuntime(): NodeRuntime {
  const nodeRequire = window.cep_node?.require as NodeRequire;
  return {
    nodeRequire,
    fs: nodeRequire<typeof import("fs")>("fs"),
    path: nodeRequire<typeof import("path")>("path"),
    cp: nodeRequire<typeof import("child_process")>("child_process"),
    process: nodeRequire<NodeJS.Process>("process"),
  };
}

function normalizeCepPath(value: string): string {
  if (!value) return "";
  let path = decodeURIComponent(value.replace(/^file:\/\//i, ""));
  if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
  return path.replace(/\//g, "\\");
}

function collectFfmpegSearchPaths(runtime: NodeRuntime): FfmpegPathCheck[] {
  const checks: FfmpegPathCheck[] = [];
  try {
    const ext = getExtensionPath();
    if (ext) {
      const bundled1 = runtime.path.join(ext, "tools", "ffmpeg", "ffmpeg.exe");
      checks.push({
        label: "CEP bundled ffmpeg",
        path: bundled1,
        exists: runtime.fs.existsSync(bundled1),
        source: "cep-bundled",
      });
      const bundled2 = runtime.path.join(ext, "ffmpeg.exe");
      checks.push({
        label: "CEP root ffmpeg",
        path: bundled2,
        exists: runtime.fs.existsSync(bundled2),
        source: "cep-bundled",
      });
    }
  } catch { /* ignore */ }

  const staticSys86 = "C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\app.saadstudio.cep\\tools\\ffmpeg\\ffmpeg.exe";
  checks.push({
    label: "System 86 CEP ffmpeg",
    path: staticSys86,
    exists: runtime.fs.existsSync(staticSys86),
    source: "cep-bundled",
  });

  const staticSys64 = "C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions\\app.saadstudio.cep\\tools\\ffmpeg\\ffmpeg.exe";
  checks.push({
    label: "System 64 CEP ffmpeg",
    path: staticSys64,
    exists: runtime.fs.existsSync(staticSys64),
    source: "cep-bundled",
  });

  try {
    const staticPath = runtime.nodeRequire<string>("ffmpeg-static");
    if (staticPath) {
      checks.push({
        label: "ffmpeg-static module",
        path: staticPath,
        exists: runtime.fs.existsSync(staticPath),
        source: "node-module",
      });
    }
  } catch { /* ignore */ }
  checks.push({
    label: "System PATH command",
    path: "ffmpeg",
    exists: false,
    source: "system-path",
  });
  return checks;
}

function selectFfmpegPath(checks: FfmpegPathCheck[]): string | null {
  const fileMatch = checks.find((check) => check.source !== "system-path" && check.exists);
  if (fileMatch) return fileMatch.path;
  return "ffmpeg";
}

function readPathEnvironment(processRef: NodeJS.Process): { raw: string; entries: string[] } {
  const raw = processRef.env.Path || processRef.env.PATH || "";
  return {
    raw,
    entries: raw.split(";").filter(Boolean),
  };
}

function getExtensionPath(): string | null {
  try {
    const raw = window.__adobe_cep__?.getSystemPath("extension");
    return raw ? normalizeCepPath(raw) : null;
  } catch {
    return null;
  }
}

function execFileCapture(
  cp: typeof import("child_process"),
  file: string,
  args: string[],
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    cp.execFile(file, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        output: `${stdout || ""}${stderr || ""}${error?.message ? `\n${error.message}` : ""}`,
      });
    });
  });
}

function execFileLaunch(
  cp: typeof import("child_process"),
  file: string,
  args: string[],
): Promise<NonNullable<FfmpegDetectionDiagnostics["spawnResult"]>> {
  return new Promise((resolve) => {
    cp.execFile(file, args, { windowsHide: true }, (error, stdout, stderr) => {
      const output = `${stdout || ""}${stderr || ""}`;
      resolve({
        attemptedPath: file,
        method: "execFile",
        ok: !error,
        exitError: error?.message ?? null,
        stdout: stdout || "",
        stderr: stderr || "",
        versionOutput: output,
      });
    });
  });
}

function emptyFfmpegDiagnostics(
  overrides: Partial<FfmpegDetectionDiagnostics> = {},
): FfmpegDetectionDiagnostics {
  return {
    ok: false,
    cepNodeAvailable: false,
    extensionPath: null,
    searchedPaths: [],
    selectedPath: null,
    pathEnvironmentVisible: false,
    pathEnvironmentLength: 0,
    pathEnvironmentPreview: [],
    whereFfmpegOutput: null,
    whereFfmpegError: null,
    spawnResult: null,
    version: null,
    versionSupported: false,
    minimumVersion: MINIMUM_FFMPEG_VERSION,
    blockers: [],
    messages: [],
    ...overrides,
  };
}

function parseFfmpegVersion(output: string): string | null {
  const match = output.match(/ffmpeg version\s+([^\s]+)/i);
  return match?.[1] ?? null;
}

function isFfmpegVersionSupported(version: string | null): boolean {
  if (!version) return false;
  const major = Number(version.match(/(\d+)/)?.[1] ?? 0);
  return major >= MINIMUM_FFMPEG_MAJOR_VERSION;
}

function parseAudioStreams(output: string): AudioStreamInfo[] {
  const lines = output.split(/\r?\n/);
  const streams: AudioStreamInfo[] = [];
  for (const line of lines) {
    if (!/Stream #\d+:\d+/.test(line) || !/Audio:/i.test(line)) continue;
    const indexMatch = line.match(/Stream #\d+:(\d+)/);
    const audioPart = line.split(/Audio:/i)[1] ?? "";
    const pieces = audioPart.split(",").map((piece) => piece.trim());
    const sampleRateMatch = line.match(/(\d+)\s*Hz/i);
    streams.push({
      index: Number(indexMatch?.[1] ?? streams.length),
      codec: pieces[0] || undefined,
      sampleRate: sampleRateMatch ? Number(sampleRateMatch[1]) : undefined,
      channels: parseChannelCount(line),
      raw: line.trim(),
    });
  }
  return streams;
}

function parseChannelCount(line: string): number | undefined {
  if (/\bmono\b/i.test(line)) return 1;
  if (/\bstereo\b/i.test(line)) return 2;
  const match = line.match(/(\d+(?:\.\d+)?)\s*channels?/i);
  return match ? Number(match[1]) : undefined;
}

async function runRmsPreview(
  cp: typeof import("child_process"),
  ffmpegPath: string,
  source: AudioSourceInfo,
  durationSec: number,
  limit: number,
  selectedAudioStreamIndex?: number | null,
): Promise<RmsPreviewPoint[]> {
  const sourceInPointSec = Math.max(0, source.sourceInPointSec ?? 0);
  const args = [
    "-hide_banner",
    "-vn",
    "-i",
    source.sourcePath ?? "",
  ];
  if (typeof selectedAudioStreamIndex === "number") {
    args.push("-map", `0:a:${selectedAudioStreamIndex}`);
  }
  args.push(
    "-ss",
    String(sourceInPointSec),
    "-t",
    String(durationSec),
    "-af",
    `astats=metadata=1:reset=1:length=${RMS_PREVIEW_WINDOW_SEC},ametadata=print:key=lavfi.astats.Overall.RMS_level`,
    "-f",
    "null",
    "-",
  );
  const run = await execFileCapture(cp, ffmpegPath, args);
  return parseRmsPreview(run.output, source, sourceInPointSec, limit);
}

function parseRmsPreview(output: string, source: AudioSourceInfo, sourceOffsetSec: number, limit: number): RmsPreviewPoint[] {
  const points: RmsPreviewPoint[] = [];
  let pendingSourceTime: number | null = null;
  for (const line of output.split(/\r?\n/)) {
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    if (timeMatch) pendingSourceTime = Number(timeMatch[1]);
    const rmsMatch = line.match(/lavfi\.astats\.Overall\.RMS_level=([^\s]+)/);
    if (!rmsMatch || pendingSourceTime == null) continue;
    const sourceTimeSec = pendingSourceTime + sourceOffsetSec;
    if (!isSourceTimeInsideClip(source, sourceTimeSec)) continue;
    const rmsDb = rmsMatch[1] === "-inf" ? -Infinity : Number(rmsMatch[1]);
    const timelineEndSec = (source.timelineStartSec ?? 0) + (sourceTimeSec - (source.sourceInPointSec ?? 0));
    const timelineStartSec = timelineEndSec - RMS_PREVIEW_WINDOW_SEC;
    points.push({
      sourceTimeSec,
      windowStartSec: roundTime(sourceTimeSec - RMS_PREVIEW_WINDOW_SEC),
      windowEndSec: roundTime(sourceTimeSec),
      timelineStartSec: roundTime(timelineStartSec),
      timelineEndSec: roundTime(timelineEndSec),
      rmsDb,
    });
    if (points.length >= limit) break;
  }
  return points;
}

function buildFullActivitySegments(windows: RmsPreviewPoint[]): {
  activeWindowsCount: number;
  inactiveWindowsCount: number;
  longestActiveRunSec: number;
  speakingSegments: SpeakingSegment[];
  droppedShortSegments: DroppedShortSegment[];
} {
  let activeWindowsCount = 0;
  let inactiveWindowsCount = 0;
  let longestActiveRunSec = 0;
  const speakingSegments: SpeakingSegment[] = [];
  const droppedShortSegments: DroppedShortSegment[] = [];
  let current: SpeakingSegment | null = null;

  for (const window of windows) {
    const active = Number.isFinite(window.rmsDb) && window.rmsDb >= FULL_ACTIVITY_THRESHOLD_DB;
    if (active) activeWindowsCount += 1;
    else inactiveWindowsCount += 1;

    if (!active) {
      if (current) {
        finishFullActivitySegment(current, speakingSegments, droppedShortSegments);
        longestActiveRunSec = Math.max(longestActiveRunSec, current.durationSec);
        current = null;
      }
      continue;
    }

    if (!current) {
      current = {
        id: `speech_${speakingSegments.length + droppedShortSegments.length + 1}`,
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

  if (current) {
    finishFullActivitySegment(current, speakingSegments, droppedShortSegments);
    longestActiveRunSec = Math.max(longestActiveRunSec, current.durationSec);
  }

  return {
    activeWindowsCount,
    inactiveWindowsCount,
    longestActiveRunSec: roundTime(longestActiveRunSec),
    speakingSegments: speakingSegments.map((segment, index) => ({ ...segment, id: `speech_${index + 1}` })),
    droppedShortSegments,
  };
}

function buildSilenceAndKeepSegments(
  windows: RmsPreviewPoint[],
  durationSec: number,
  settings: SilenceRemovalSettings,
): {
  silenceSegments: SilenceSegment[];
  droppedSilenceSegments: SilenceSegment[];
  rejectedSilenceSegments: SilenceDetectionDiagnosticSegment[];
  keepSegments: KeepSegment[];
  totalRemovedDurationSec: number;
} {
  const rawSilenceSegments: SilenceSegment[] = [];
  const droppedSilenceSegments: SilenceSegment[] = [];
  const rejectedSilenceSegments: SilenceDetectionDiagnosticSegment[] = [];
  let current: SilenceSegment | null = null;
  let activeCurrent: SilenceSegment | null = null;

  for (const window of windows) {
    const silent = !Number.isFinite(window.rmsDb) || window.rmsDb < settings.silenceThresholdDb;
    if (!silent) {
      if (current) {
        pushSilenceSegment(current, rawSilenceSegments, droppedSilenceSegments, rejectedSilenceSegments, settings);
        current = null;
      }
      activeCurrent = extendSilenceDiagnosticSegment(activeCurrent, window);
      continue;
    }
    if (activeCurrent) {
      rejectedSilenceSegments.push(toSilenceDiagnosticSegment(activeCurrent, "ABOVE_THRESHOLD", settings));
      activeCurrent = null;
    }
    if (!current) {
      current = extendSilenceDiagnosticSegment(null, window);
      continue;
    }
    current = extendSilenceDiagnosticSegment(current, window);
  }
  if (current) pushSilenceSegment(current, rawSilenceSegments, droppedSilenceSegments, rejectedSilenceSegments, settings);
  if (activeCurrent) rejectedSilenceSegments.push(toSilenceDiagnosticSegment(activeCurrent, "ABOVE_THRESHOLD", settings));

  const silenceSegments: SilenceSegment[] = [];
  const minimumCutGapSec = settings.minimumCutGapSec ?? DEFAULT_MINIMUM_CUT_GAP_SEC;
  for (const segment of rawSilenceSegments) {
    const classified = classifyPodcastPause(segment, minimumCutGapSec);
    if (!classified.cutEligible) {
      const rejected = { ...classified, reason: "MERGED_WITH_ACTIVITY" as const };
      droppedSilenceSegments.push(rejected);
      rejectedSilenceSegments.push(toSilenceDiagnosticSegment(rejected, "MERGED_WITH_ACTIVITY", settings));
      continue;
    }
    const paddedStartSec = Math.max(0, segment.startSec + settings.paddingBeforeSec);
    const paddedEndSec = Math.min(durationSec, segment.endSec - settings.paddingAfterSec);
    if (paddedEndSec <= paddedStartSec) continue;
    silenceSegments.push({
      ...classified,
      paddedStartSec: roundTime(paddedStartSec),
      paddedEndSec: roundTime(paddedEndSec),
    });
  }

  const keepSegments = mergeShortKeepSegments(
    buildKeepSegmentsFromCutSilences(silenceSegments, durationSec),
    settings.minimumKeepSegmentDurationSec ?? DEFAULT_MINIMUM_KEEP_SEGMENT_SEC,
    settings.mergeAdjacentKeepGapSec ?? DEFAULT_MERGE_ADJACENT_KEEP_GAP_SEC,
  );
  const totalRemovedDurationSec = totalRemovedDurationFromKeepSegments(keepSegments, durationSec);

  return {
    silenceSegments,
    droppedSilenceSegments,
    rejectedSilenceSegments,
    keepSegments,
    totalRemovedDurationSec: roundTime(totalRemovedDurationSec),
  };
}

function buildAutomaticSilenceSettings(
  settings: SilenceRemovalSettings,
  windows: RmsPreviewPoint[],
): SilenceRemovalSettings {
  const rmsValues = windows
    .map((window) => window.rmsDb)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!rmsValues.length) {
    return {
      ...settings,
      silenceThresholdDb: settings.silenceThresholdDb,
      minimumSilenceDurationSec: 0.25,
      minimumCutGapSec: 0.35,
      minimumKeepSegmentDurationSec: 0.8,
      mergeAdjacentKeepGapSec: 0.2,
    };
  }

  const quietFloor = percentile(rmsValues, 0.15);
  const median = percentile(rmsValues, 0.5);
  const adaptiveThreshold = clamp(roundDb(Math.min(median - 6, quietFloor + 16)), -38, -28);
  return {
    ...settings,
    silenceThresholdDb: adaptiveThreshold,
    minimumSilenceDurationSec: 0.2,
    minimumCutGapSec: 0.25,
    minimumKeepSegmentDurationSec: 0.6,
    mergeAdjacentKeepGapSec: 0.12,
    paddingBeforeSec: 0.03,
    paddingAfterSec: 0.05,
  };
}

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const index = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * ratio)));
  return values[index];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildKeepSegmentsFromCutSilences(silenceSegments: SilenceSegment[], durationSec: number): KeepSegment[] {
  const keepSegments: KeepSegment[] = [];
  let cursor = 0;
  for (const silence of silenceSegments) {
    const silenceStart = silence.paddedStartSec ?? silence.startSec;
    const silenceEnd = silence.paddedEndSec ?? silence.endSec;
    if (silenceStart > cursor) {
      pushKeepSegment(keepSegments, cursor, silenceStart, "before silence");
    }
    cursor = Math.max(cursor, silenceEnd);
  }
  if (durationSec > cursor) pushKeepSegment(keepSegments, cursor, durationSec, "after silence");
  return keepSegments;
}

function mergeShortKeepSegments(
  keepSegments: KeepSegment[],
  minimumKeepSegmentDurationSec: number,
  mergeAdjacentKeepGapSec: number,
): KeepSegment[] {
  const boundaryKeepMinSec = Math.min(0.5, minimumKeepSegmentDurationSec);
  const editableKeepSegments = keepSegments.filter((segment, index) => {
    const isBoundary = index === 0 || index === keepSegments.length - 1;
    return !isBoundary || segment.durationSec >= boundaryKeepMinSec;
  });
  const merged: KeepSegment[] = [];
  for (const segment of editableKeepSegments) {
    const previous = merged[merged.length - 1];
    if (previous && shouldMergeKeepSegment(previous, segment, minimumKeepSegmentDurationSec, mergeAdjacentKeepGapSec)) {
      previous.endSec = segment.endSec;
      previous.durationSec = roundTime(previous.endSec - previous.startSec);
      previous.reason = "merged for conversational flow";
      continue;
    }
    merged.push({ ...segment });
  }
  return merged;
}

function shouldMergeKeepSegment(
  previous: KeepSegment,
  current: KeepSegment,
  minimumKeepSegmentDurationSec: number,
  mergeAdjacentKeepGapSec: number,
): boolean {
  const gapSec = Math.max(0, current.startSec - previous.endSec);
  if (gapSec >= mergeAdjacentKeepGapSec) return false;
  return previous.durationSec < minimumKeepSegmentDurationSec
    || current.durationSec < minimumKeepSegmentDurationSec
    || gapSec < mergeAdjacentKeepGapSec;
}

function totalRemovedDurationFromKeepSegments(keepSegments: KeepSegment[], durationSec: number): number {
  const keptDurationSec = keepSegments.reduce((sum, segment) => sum + Math.max(0, segment.endSec - segment.startSec), 0);
  return Math.max(0, durationSec - keptDurationSec);
}

function pushSilenceSegment(
  segment: SilenceSegment,
  segments: SilenceSegment[],
  droppedSegments: SilenceSegment[],
  rejectedSegments: SilenceDetectionDiagnosticSegment[],
  settings: SilenceRemovalSettings,
) {
  segment.durationSec = roundTime(segment.endSec - segment.startSec);
  const classified = classifyPodcastPause(segment, settings.minimumCutGapSec ?? DEFAULT_MINIMUM_CUT_GAP_SEC);
  if (segment.durationSec >= settings.minimumSilenceDurationSec) {
    segments.push({ ...classified, reason: "ACCEPTED_SILENCE" });
  } else {
    const dropped = { ...classified, reason: "BELOW_MIN_DURATION" as const };
    droppedSegments.push(dropped);
    rejectedSegments.push(toSilenceDiagnosticSegment(dropped, "BELOW_MIN_DURATION", settings));
  }
}

function classifyPodcastPause(segment: SilenceSegment, minimumCutGapSec: number): SilenceSegment {
  const duration = roundTime(segment.endSec - segment.startSec);
  const naturalPauseFloorSec = Math.min(0.5, minimumCutGapSec);
  if (duration < naturalPauseFloorSec) {
    return {
      ...segment,
      durationSec: duration,
      pauseClassification: "Natural breathing pause",
      cutEligible: false,
      cutDecisionReason: `pause shorter than ${naturalPauseFloorSec}s`,
    };
  }
  if (duration < minimumCutGapSec) {
    return {
      ...segment,
      durationSec: duration,
      pauseClassification: "Thinking pause",
      cutEligible: false,
      cutDecisionReason: `pause shorter than minimum cut gap ${minimumCutGapSec}s`,
    };
  }
  if (duration < 1.2) {
    return {
      ...segment,
      durationSec: duration,
      pauseClassification: "Thinking pause",
      cutEligible: true,
      cutDecisionReason: "pause exceeds the configured minimum cut gap",
    };
  }
  if (duration < 2) {
    return {
      ...segment,
      durationSec: duration,
      pauseClassification: "Sentence break",
      cutEligible: true,
      cutDecisionReason: "sentence break long enough for a clean cut",
    };
  }
  return {
    ...segment,
    durationSec: duration,
    pauseClassification: "Real silence",
    cutEligible: true,
    cutDecisionReason: "real silence",
  };
}

function extendSilenceDiagnosticSegment(segment: SilenceSegment | null, window: RmsPreviewPoint): SilenceSegment {
  const rms = Number.isFinite(window.rmsDb) ? window.rmsDb : -Infinity;
  if (!segment) {
    return {
      startSec: Math.max(0, window.timelineStartSec),
      endSec: Math.max(0, window.timelineEndSec),
      durationSec: roundTime(Math.max(0, window.timelineEndSec - window.timelineStartSec)),
      sourceWindowCount: 1,
      rmsMinDb: rms,
      rmsMaxDb: rms,
      rmsAvgDb: rms,
    };
  }
  const count = segment.sourceWindowCount + 1;
  const prevAvg = typeof segment.rmsAvgDb === "number" ? segment.rmsAvgDb : rms;
  segment.endSec = Math.max(segment.endSec, window.timelineEndSec);
  segment.durationSec = roundTime(segment.endSec - segment.startSec);
  segment.sourceWindowCount = count;
  segment.rmsMinDb = Math.min(typeof segment.rmsMinDb === "number" ? segment.rmsMinDb : rms, rms);
  segment.rmsMaxDb = Math.max(typeof segment.rmsMaxDb === "number" ? segment.rmsMaxDb : rms, rms);
  segment.rmsAvgDb = roundDb(((prevAvg * (count - 1)) + rms) / count);
  return segment;
}

function toSilenceDiagnosticSegment(
  segment: SilenceSegment,
  reason: SilenceDetectionDiagnosticSegment["reason"],
  settings: SilenceRemovalSettings,
): SilenceDetectionDiagnosticSegment {
  return {
    startSec: roundTime(segment.startSec),
    endSec: roundTime(segment.endSec),
    durationSec: roundTime(segment.durationSec),
    sourceWindowCount: segment.sourceWindowCount,
    reason,
    thresholdUsed: settings.silenceThresholdDb,
    minimumDurationUsed: settings.minimumSilenceDurationSec,
    rmsMinDb: segment.rmsMinDb,
    rmsMaxDb: segment.rmsMaxDb,
    rmsAvgDb: segment.rmsAvgDb,
    pauseClassification: segment.pauseClassification,
    cutEligible: segment.cutEligible,
    cutDecisionReason: segment.cutDecisionReason,
  };
}

function pushKeepSegment(segments: KeepSegment[], startSec: number, endSec: number, reason: string) {
  const start = roundTime(Math.max(0, startSec));
  const end = roundTime(Math.max(0, endSec));
  if (end <= start) return;
  segments.push({
    startSec: start,
    endSec: end,
    durationSec: roundTime(end - start),
    reason,
  });
}

function finishFullActivitySegment(
  segment: SpeakingSegment,
  speakingSegments: SpeakingSegment[],
  droppedShortSegments: DroppedShortSegment[],
) {
  if (segment.durationSec >= FULL_ACTIVITY_MIN_SPEECH_SEC) {
    speakingSegments.push(segment);
    return;
  }
  droppedShortSegments.push({
    startSec: segment.startSec,
    endSec: segment.endSec,
    durationSec: segment.durationSec,
    sourceWindowCount: segment.sourceWindowCount,
    reason: `duration ${segment.durationSec}s < minimumSpeechDurationSec ${FULL_ACTIVITY_MIN_SPEECH_SEC}s`,
  });
}

function buildTrackSpeakingSegments(
  windows: TrackActivityWindow[],
  mapping: AudioTrackSpeakerMapping,
): { speakingSegments: TrackSpeakingSegment[]; warnings: string[] } {
  const speakingSegments: TrackSpeakingSegment[] = [];
  const warnings: string[] = [];
  let current: TrackSpeakingSegment | null = null;

  for (const window of windows) {
    if (!window.active) {
      if (current) {
        pushTrackSegment(current, speakingSegments, warnings);
        current = null;
      }
      continue;
    }

    if (!current) {
      current = {
        id: `track_speech_${speakingSegments.length + 1}`,
        audioTrackIndex: mapping.audioTrackIndex,
        speakerId: mapping.speakerId,
        startSec: window.timelineStartSec,
        endSec: window.timelineEndSec,
        durationSec: roundTime(window.timelineEndSec - window.timelineStartSec),
        sourceWindowCount: 1,
        source: "rms-threshold",
      };
      continue;
    }

    current.endSec = window.timelineEndSec;
    current.durationSec = roundTime(current.endSec - current.startSec);
    current.sourceWindowCount += 1;
  }

  if (current) pushTrackSegment(current, speakingSegments, warnings);
  return { speakingSegments, warnings };
}

function pushTrackSegment(
  segment: TrackSpeakingSegment,
  speakingSegments: TrackSpeakingSegment[],
  warnings: string[],
) {
  if (segment.durationSec >= FULL_ACTIVITY_MIN_SPEECH_SEC) {
    speakingSegments.push(segment);
    return;
  }
  warnings.push(`SHORT_TRACK_SEGMENT_DROPPED A${segment.audioTrackIndex + 1} ${segment.startSec}-${segment.endSec}`);
}

function buildOverlapWindows(trackActivity: TrackActivity[]): TrackOverlapWindow[] {
  const windowsByTime = collectWindowsByTime(trackActivity);
  const overlaps: TrackOverlapWindow[] = [];
  for (const windows of windowsByTime.values()) {
    const active = windows.filter((window) => window.active);
    if (active.length < 2) continue;
    overlaps.push({
      timelineStartSec: active[0].timelineStartSec,
      timelineEndSec: active[0].timelineEndSec,
      activeAudioTrackIndexes: active.map((window) => window.audioTrackIndex),
      activeSpeakerIds: active.map((window) => window.speakerId),
    });
  }
  return overlaps;
}

function buildDominantTrackWindows(trackActivity: TrackActivity[]): DominantTrackWindow[] {
  const windowsByTime = collectWindowsByTime(trackActivity);
  const dominant: DominantTrackWindow[] = [];
  for (const windows of windowsByTime.values()) {
    const active = windows.filter((window) => window.active).sort((a, b) => b.rmsDb - a.rmsDb);
    const first = windows[0];
    if (!first) continue;
    if (active.length === 0) {
      dominant.push({
        timelineStartSec: first.timelineStartSec,
        timelineEndSec: first.timelineEndSec,
        audioTrackIndex: null,
        speakerId: null,
        rmsDb: null,
        reason: "no active track above threshold",
      });
      continue;
    }
    dominant.push({
      timelineStartSec: first.timelineStartSec,
      timelineEndSec: first.timelineEndSec,
      audioTrackIndex: active[0].audioTrackIndex,
      speakerId: active[0].speakerId,
      rmsDb: active[0].rmsDb,
      reason: active.length > 1 ? "highest RMS among active tracks" : "only active track",
    });
  }
  return dominant;
}

function collectWindowsByTime(trackActivity: TrackActivity[]): Map<string, TrackActivityWindow[]> {
  const windowsByBucket = new Map<number, Map<number, TrackActivityWindow>>();
  for (const track of trackActivity) {
    for (const window of track.windows) {
      const bucketIndex = timelineBucketIndex(window);
      const tracksInBucket = windowsByBucket.get(bucketIndex) ?? new Map<number, TrackActivityWindow>();
      const existing = tracksInBucket.get(window.audioTrackIndex);
      if (!existing || window.rmsDb > existing.rmsDb) {
        tracksInBucket.set(window.audioTrackIndex, toCanonicalTimelineWindow(window, bucketIndex));
      }
      windowsByBucket.set(bucketIndex, tracksInBucket);
    }
  }
  const sorted = new Map<string, TrackActivityWindow[]>();
  for (const bucketIndex of [...windowsByBucket.keys()].sort((a, b) => a - b)) {
    sorted.set(String(bucketIndex), [...(windowsByBucket.get(bucketIndex)?.values() ?? [])]);
  }
  return sorted;
}

function normalizeTrackWindows(windows: TrackActivityWindow[]): TrackActivityWindow[] {
  const byBucket = new Map<number, TrackActivityWindow>();
  for (const window of windows) {
    const bucketIndex = timelineBucketIndex(window);
    const existing = byBucket.get(bucketIndex);
    if (!existing || window.rmsDb > existing.rmsDb) {
      byBucket.set(bucketIndex, toCanonicalTimelineWindow(window, bucketIndex));
    }
  }
  return [...byBucket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, window]) => window);
}

function timelineBucketIndex(window: Pick<TrackActivityWindow, "timelineStartSec" | "timelineEndSec">): number {
  const midpointSec = (window.timelineStartSec + window.timelineEndSec) / 2;
  return Math.max(0, Math.floor((midpointSec + 0.000001) / RMS_PREVIEW_WINDOW_SEC));
}

function toCanonicalTimelineWindow(window: TrackActivityWindow, bucketIndex: number): TrackActivityWindow {
  const timelineStartSec = roundTime(bucketIndex * RMS_PREVIEW_WINDOW_SEC);
  return {
    ...window,
    timelineStartSec,
    timelineEndSec: roundTime(timelineStartSec + RMS_PREVIEW_WINDOW_SEC),
  };
}

function rmsTimestampInterpretation() {
  return {
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    ffmpegPtsTimeMeaning: "window-end" as const,
    windowStartFormula: "sourceTimeSec - analysisWindowSec" as const,
    windowEndFormula: "sourceTimeSec" as const,
    timelineFormula: "clip.timelineStartSec + (sourceTimeSec - clip.sourceInPointSec)" as const,
  };
}

function uniqueBlockers(blockers: string[]): string[] {
  return Array.from(new Set(blockers));
}

function resolveFfprobePath(runtime: NodeRuntime): string {
  const ffmpegChecks = collectFfmpegSearchPaths(runtime);
  const bundledFfmpeg = ffmpegChecks.find((check) => check.source === "cep-bundled" && check.exists);
  if (bundledFfmpeg) {
    const ffprobe = runtime.path.join(runtime.path.dirname(bundledFfmpeg.path), "ffprobe.exe");
    if (runtime.fs.existsSync(ffprobe)) return ffprobe;
  }
  try {
    const staticPath = runtime.nodeRequire<string>("ffprobe-static");
    if (staticPath && runtime.fs.existsSync(staticPath)) return staticPath;
  } catch { /* ignore */ }
  return "ffprobe";
}

function parseFfprobeAudioStreams(output: string): FfprobeAudioStreamInfo[] {
  try {
    const parsed = JSON.parse(output) as {
      streams?: Array<{
        index?: number;
        codec_name?: string;
        sample_rate?: string;
        channels?: number;
        channel_layout?: string;
        duration?: string;
        tags?: { language?: string; title?: string };
      }>;
    };
    return (parsed.streams ?? []).map((stream, audioStreamIndex) => ({
      streamIndex: stream.index ?? audioStreamIndex,
      audioStreamIndex,
      codecName: stream.codec_name ?? null,
      sampleRate: stream.sample_rate ? Number(stream.sample_rate) : null,
      channels: stream.channels ?? null,
      channelLayout: stream.channel_layout ?? null,
      duration: stream.duration ?? null,
      language: stream.tags?.language ?? null,
      title: stream.tags?.title ?? null,
    }));
  } catch {
    return [];
  }
}

function emptyAudioStreamSelectionProof(analyzedSourcePath: string | null = null): AudioStreamSelectionProof {
  return {
    ok: false,
    analyzedSourcePath,
    ffprobePath: null,
    ffprobeAudioStreams: [],
    autoSelectedAudioStreamIndex: null,
    selectedAudioStreamIndex: null,
    blockers: [],
    warnings: [],
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function emptyFullAudioActivityProof(
  selectedAudioStreamIndex: number | null,
  blockers: string[],
  warnings: string[],
): FullAudioActivityProof {
  return {
    analyzedDurationSec: FULL_ACTIVITY_DURATION_SEC,
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    totalRmsWindows: 0,
    activeWindowsCount: 0,
    inactiveWindowsCount: 0,
    longestActiveRunSec: 0,
    rmsPreviewFirst20: [],
    speakingSegments: [],
    droppedShortSegments: [],
    thresholdUsed: FULL_ACTIVITY_THRESHOLD_DB,
    minimumSpeechDurationSec: FULL_ACTIVITY_MIN_SPEECH_SEC,
    selectedAudioStreamIndex,
    blockers,
    warnings,
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function emptyTrackActivity(
  mapping: AudioTrackSpeakerMapping,
  blockers: string[],
  warnings: string[],
  sourcePath: string | null = null,
  selectedAudioStreamIndex: number | null = null,
): TrackActivity {
  return {
    audioTrackIndex: mapping.audioTrackIndex,
    speakerId: mapping.speakerId,
    sourcePath,
    selectedAudioStreamIndex,
    totalRmsWindows: 0,
    activeWindowsCount: 0,
    inactiveWindowsCount: 0,
    windows: [],
    blockers,
    warnings,
  };
}

function emptySilenceRemovalAnalysis(
  settings: SilenceRemovalSettings,
  analyzedDurationSec: number,
  sourcePath: string | null,
  selectedAudioStreamIndex: number | null,
  blockers: string[],
  warnings: string[],
  sequenceDurationSec: number | null = null,
  audioSourceDurationSec: number | null = null,
): SilenceRemovalAnalysisResult {
  return {
    ok: false,
    audioTrackIndex: settings.audioTrackIndex,
    analyzedSourcePath: sourcePath,
    selectedAudioStreamIndex,
    sequenceDurationSec: sequenceDurationSec == null ? null : roundTime(sequenceDurationSec),
    audioSourceDurationSec: audioSourceDurationSec == null ? null : roundTime(audioSourceDurationSec),
    analyzedDurationSec: roundTime(analyzedDurationSec),
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    totalRmsWindows: 0,
    silenceSegments: [],
    droppedSilenceSegments: [],
    longestDroppedSilenceSec: 0,
    silenceDetectionDiagnostics: {
      thresholdUsed: settings.silenceThresholdDb,
      minimumDurationUsed: settings.minimumSilenceDurationSec,
      detectedSilenceSegments: [],
      rejectedSilenceSegments: [],
    },
    keepSegments: [],
    totalRemovedDurationSec: 0,
    blockers,
    warnings,
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function emptySpeakerSourceAttributionProof(
  blockers: string[],
  warnings: string[],
): SpeakerSourceAttributionProof {
  return {
    trackActivity: [],
    trackSpeakingSegments: [],
    overlaps: [],
    dominantTrackAtTime: [],
    analyzedDurationSec: FULL_ACTIVITY_DURATION_SEC,
    analysisWindowSec: RMS_PREVIEW_WINDOW_SEC,
    thresholdUsed: FULL_ACTIVITY_THRESHOLD_DB,
    minimumSpeechDurationSec: FULL_ACTIVITY_MIN_SPEECH_SEC,
    blockers,
    warnings,
    timelineMutation: "none",
    sequenceMutation: "none",
  };
}

function isValidClipTiming(source: AudioSourceInfo): boolean {
  return typeof source.timelineStartSec === "number"
    && typeof source.timelineEndSec === "number"
    && typeof source.sourceInPointSec === "number"
    && typeof source.sourceOutPointSec === "number"
    && source.timelineEndSec > source.timelineStartSec
    && source.sourceOutPointSec > source.sourceInPointSec;
}

function isValidRmsProofSource(source: AudioSourceInfo): boolean {
  return !!source.sourcePath
    && (source.sourceKind === "independent-audio" || source.sourceKind === "audio-inside-video")
    && isValidClipTiming(source);
}

function isSourceTimeInsideClip(source: AudioSourceInfo, sourceTimeSec: number): boolean {
  const sourceIn = source.sourceInPointSec ?? 0;
  const sourceOut = source.sourceOutPointSec ?? Number.POSITIVE_INFINITY;
  return sourceIn <= sourceTimeSec && sourceTimeSec <= sourceOut;
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundDb(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 1000) / 1000;
}
