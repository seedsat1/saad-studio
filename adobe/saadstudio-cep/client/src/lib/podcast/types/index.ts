export type PodcastProviderStatus = "available" | "unknown" | "unsupported" | "error";
export type PodcastAdapterStatus = "ready" | "unsupported" | "error";
export type PodcastExecutionStrategy =
  | "decision-plan-only"
  | "duplicate-sequence-disabled-clips"
  | "duplicate-sequence-cuts"
  | "duplicate-sequence-reconstructed-segments"
  | "track-enable-disable"
  | "unsupported-multicam-angle-switching";

export const PREMIERE_TICKS_PER_SECOND = 254016000000;

export interface SpeakerSegment {
  id: string;
  speakerId: string;
  startSec: number;
  endSec: number;
  confidence?: number;
  source?: "reap" | "manual" | "unknown";
  raw?: unknown;
}

export interface CameraMapping {
  speakerId: string;
  videoTrackIndex: number;
  cameraLabel?: string;
  fallback?: boolean;
}

export interface PodcastSettings {
  speakerDetectionSource: "reap-transcription" | "manual" | "none";
  minimumShotLengthSec: number;
  overlapThresholdDb?: number;
  wideCameraTrackIndex?: number;
  enableWideCamera: boolean;
}

export interface PodcastEditJob {
  id: string;
  sequenceId?: string | null;
  sequenceName?: string | null;
  settings: PodcastSettings;
  cameraMappings: CameraMapping[];
  speakerSegments: SpeakerSegment[];
  status: "draft" | "diagnostics" | "ready" | "blocked";
}

export interface CameraDecision {
  id: string;
  speakerId: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  videoTrackIndex?: number;
  strategy: PodcastExecutionStrategy;
  reason: string;
  sourceSegmentIds: string[];
}

export interface AudioActivitySegment {
  audioTrackIndex: number;
  speakerId: string;
  startSec: number;
  endSec: number;
  confidence?: number;
  source: "timeline-audio-analysis";
}

export interface PodcastDiagnostics {
  activeSequence: boolean;
  sequenceName?: string | null;
  premiereVersion?: string | null;
  videoTrackCount: number;
  audioTrackCount: number;
  adapterStatus: PodcastAdapterStatus;
  reapProviderStatus: PodcastProviderStatus;
  messages: string[];
}

export interface PodcastSpeaker {
  id: string;
  label: string;
}

export interface AudioTrackSpeakerMapping {
  speakerId: string;
  audioTrackIndex: number;
  audioTrackLabel?: string;
}

export interface AudioSourceInfo {
  audioTrackIndex: number;
  speakerId?: string;
  trackItemIndex?: number;
  clipName?: string | null;
  projectItemName?: string | null;
  sourcePath?: string | null;
  timelineStartSec?: number;
  timelineEndSec?: number;
  sourceInPointSec?: number;
  sourceOutPointSec?: number;
  durationSec?: number;
  mediaAvailable: boolean;
  sourceKind:
    | "independent-audio"
    | "audio-inside-video"
    | "nested-sequence"
    | "multiple-clips"
    | "mixed-audio"
    | "unknown";
  audioStreamIndex?: number;
  audioStreamCount?: number;
  audioCodec?: string;
  sampleRate?: number;
  channels?: number;
  reason?: string;
}

export interface AudioStreamInfo {
  index: number;
  codec?: string;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
  duration?: string | null;
  language?: string | null;
  title?: string | null;
  raw: string;
}

export interface FfprobeAudioStreamInfo {
  streamIndex: number;
  audioStreamIndex: number;
  codecName?: string | null;
  sampleRate?: number | null;
  channels?: number | null;
  channelLayout?: string | null;
  duration?: string | null;
  language?: string | null;
  title?: string | null;
}

export interface AudioStreamSelectionProof {
  ok: boolean;
  analyzedSourcePath?: string | null;
  ffprobePath?: string | null;
  ffprobeAudioStreams: FfprobeAudioStreamInfo[];
  autoSelectedAudioStreamIndex?: number | null;
  selectedAudioStreamIndex?: number | null;
  blockers: string[];
  warnings: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface AudioSourceInspectionResult {
  ok: boolean;
  sources: AudioSourceInfo[];
  blockers: string[];
  messages: string[];
}

export interface RmsPreviewPoint {
  sourceTimeSec: number;
  windowStartSec?: number;
  windowEndSec?: number;
  timelineStartSec: number;
  timelineEndSec: number;
  rmsDb: number;
}

export interface RmsTimestampInterpretation {
  analysisWindowSec: number;
  ffmpegPtsTimeMeaning: "window-end";
  windowStartFormula: "sourceTimeSec - analysisWindowSec";
  windowEndFormula: "sourceTimeSec";
  timelineFormula: "clip.timelineStartSec + (sourceTimeSec - clip.sourceInPointSec)";
}

export interface FfmpegRmsRuntimeProof {
  ffmpegAvailable: boolean;
  ffmpegVersion?: string | null;
  analyzedSourcePath?: string | null;
  selectedAudioTrackIndex?: number | null;
  selectedClipIndex?: number | null;
  selectedAudioStreamIndex?: number | null;
  ffprobeAudioStreams?: FfprobeAudioStreamInfo[];
  analysisWindowSec: number;
  rmsPreview: RmsPreviewPoint[];
  timestampInterpretation: RmsTimestampInterpretation;
  blockers: string[];
  warnings: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface SpeechActivityWindow {
  sourceTimeSec: number;
  timelineStartSec: number;
  timelineEndSec: number;
  rmsDb: number;
  active: boolean;
  reason: string;
}

export interface SpeakingSegment {
  id: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  sourceWindowCount: number;
  speakerId: "speaker_1";
  source: "rms-threshold";
}

export interface SpeakerActivityProof {
  speechActivityWindows: SpeechActivityWindow[];
  speakingSegments: SpeakingSegment[];
  thresholdUsed: number;
  silenceThresholdUsed: number;
  minimumSpeechDurationSec: number;
  blockers: string[];
  warnings: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface DroppedShortSegment {
  startSec: number;
  endSec: number;
  durationSec: number;
  sourceWindowCount: number;
  reason: string;
}

export interface FullAudioActivityProof {
  analyzedDurationSec: 30;
  analysisWindowSec: 0.2;
  totalRmsWindows: number;
  activeWindowsCount: number;
  inactiveWindowsCount: number;
  longestActiveRunSec: number;
  rmsPreviewFirst20: RmsPreviewPoint[];
  speakingSegments: SpeakingSegment[];
  droppedShortSegments: DroppedShortSegment[];
  thresholdUsed: -35;
  minimumSpeechDurationSec: 0.4;
  selectedAudioStreamIndex: number | null;
  blockers: string[];
  warnings: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface TrackActivityWindow {
  audioTrackIndex: number;
  speakerId: string;
  sourcePath: string;
  selectedAudioStreamIndex: number;
  sourceTimeSec: number;
  timelineStartSec: number;
  timelineEndSec: number;
  rmsDb: number;
  active: boolean;
}

export interface TrackActivity {
  audioTrackIndex: number;
  speakerId: string;
  sourcePath?: string | null;
  selectedAudioStreamIndex?: number | null;
  totalRmsWindows: number;
  activeWindowsCount: number;
  inactiveWindowsCount: number;
  windows: TrackActivityWindow[];
  blockers: string[];
  warnings: string[];
}

export interface TrackSpeakingSegment {
  id: string;
  audioTrackIndex: number;
  speakerId: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  sourceWindowCount: number;
  source: "rms-threshold";
}

export interface TrackOverlapWindow {
  timelineStartSec: number;
  timelineEndSec: number;
  activeAudioTrackIndexes: number[];
  activeSpeakerIds: string[];
}

export interface DominantTrackWindow {
  timelineStartSec: number;
  timelineEndSec: number;
  audioTrackIndex: number | null;
  speakerId: string | null;
  rmsDb: number | null;
  reason: string;
}

export interface SpeakerSourceAttributionProof {
  trackActivity: TrackActivity[];
  trackSpeakingSegments: TrackSpeakingSegment[];
  overlaps: TrackOverlapWindow[];
  dominantTrackAtTime: DominantTrackWindow[];
  analyzedDurationSec: 30;
  analysisWindowSec: 0.2;
  thresholdUsed: -35;
  minimumSpeechDurationSec: 0.4;
  blockers: string[];
  warnings: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface PodcastCameraDecisionProofItem {
  startSec: number;
  endSec: number;
  durationSec: number;
  speakerId: string | null;
  audioTrackIndex: number | null;
  videoTrackIndex: number;
  cameraLabel: string;
  reason: string;
}

export interface PodcastCameraDecisionProofSummary {
  totalDecisions: number;
  speaker1CameraTimeSec: number;
  speaker2CameraTimeSec: number;
  wideCameraTimeSec: number;
  keptPreviousCameraEvents: number;
  droppedShortDecisions: number;
}

export interface PodcastCameraDecisionPlanProof {
  cameraDecisions: PodcastCameraDecisionProofItem[];
  summary: PodcastCameraDecisionProofSummary;
  blockers: string[];
  warnings: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface FfmpegFeasibilityResult {
  available: boolean;
  path?: string | null;
  version?: string | null;
  versionSupported: boolean;
  minimumVersion: string;
  audioStreamCount?: number;
  audioStreams?: AudioStreamInfo[];
  rmsPreview: RmsPreviewPoint[];
  blockers: string[];
  messages: string[];
}

export interface FfmpegPathCheck {
  label: string;
  path: string;
  exists: boolean;
  source: "cep-bundled" | "node-module" | "system-path" | "path-env-candidate";
}

export interface FfmpegLaunchResult {
  attemptedPath: string;
  method: "execFile";
  ok: boolean;
  exitError?: string | null;
  stdout?: string;
  stderr?: string;
  versionOutput?: string;
}

export interface FfmpegDetectionDiagnostics {
  ok: boolean;
  cepNodeAvailable: boolean;
  extensionPath?: string | null;
  searchedPaths: FfmpegPathCheck[];
  selectedPath?: string | null;
  pathEnvironmentVisible: boolean;
  pathEnvironmentLength: number;
  pathEnvironmentPreview: string[];
  whereFfmpegOutput?: string | null;
  whereFfmpegError?: string | null;
  spawnResult?: FfmpegLaunchResult | null;
  version?: string | null;
  versionSupported: boolean;
  minimumVersion: string;
  blockers: string[];
  messages: string[];
}

export interface AudioSourceProofResult {
  ok: boolean;
  ffmpeg: FfmpegFeasibilityResult;
  inspection: AudioSourceInspectionResult;
  rmsPreview: RmsPreviewPoint[];
  blockers: string[];
  messages: string[];
  timelineMutation: "none";
}
