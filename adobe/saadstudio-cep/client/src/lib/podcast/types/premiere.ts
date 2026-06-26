import type {
  AudioSourceInspectionResult,
  AudioTrackSpeakerMapping,
  CameraMapping,
  PodcastCameraDecisionProofItem,
  SpeakerSegment,
} from "./index";

export interface PodcastSequenceInfo {
  active: boolean;
  sequenceId?: string | null;
  sequenceName?: string | null;
  premiereVersion?: string | null;
  videoTrackCount: number;
  audioTrackCount: number;
}

export interface PodcastTrackInfo {
  kind: "video" | "audio";
  index: number;
  name?: string | null;
  clipCount?: number;
  firstClipStartSec?: number | null;
  firstClipEndSec?: number | null;
}

export interface PodcastWorkAreaInfo {
  startSec?: number | null;
  endSec?: number | null;
}

export interface PodcastTimelineLayout {
  status: "ready" | "no-sequence" | "unsupported" | "error";
  sequenceId?: string | null;
  sequenceName?: string | null;
  sequenceDurationSec?: number | null;
  workArea?: PodcastWorkAreaInfo | null;
  videoTracks: PodcastTrackInfo[];
  audioTracks: PodcastTrackInfo[];
  supportedExecutionStrategies: string[];
  unsupportedApis: string[];
  recommendedStrategy: "decision-plan-only";
  messages: string[];
}

export interface PodcastTimelineClipInfo {
  kind: "video" | "audio";
  trackIndex: number;
  clipIndex: number;
  trackName?: string | null;
  clipName?: string | null;
  projectItemName?: string | null;
  sourcePath?: string | null;
  mediaAvailable: boolean;
  timelineStartSec: number | null;
  timelineEndSec: number | null;
  sourceInPointSec: number | null;
  sourceOutPointSec: number | null;
  durationSec: number | null;

  // New fields for full timeline synchronization
  clipId?: string;
  linkedClipId?: string | null;
  linkedClipKind?: string | null;
  isStandaloneAudio?: boolean;
  hasEmbeddedAudio?: boolean;
  isMulticamClip?: boolean;
  projectItemId?: string | null;
  mediaType?: string | null;
  isMuted?: boolean;
  isEnabled?: boolean;
}

export interface PodcastSynchronizationSnapshot {
  status: "ready" | "no-sequence" | "unsupported" | "error";
  sequenceId?: string | null;
  sequenceName?: string | null;
  sequenceDurationSec?: number | null;
  videoTrackCount: number;
  audioTrackCount: number;
  videoClips: PodcastTimelineClipInfo[];
  audioClips: PodcastTimelineClipInfo[];
  messages: string[];
  blockers: string[];
  timelineMutation: "none";
  sequenceMutation: "none";
}

export interface CreatePodcastSequenceInput {
  name: string;
  sourceSequenceId?: string | null;
}

export interface DuplicatePodcastSequenceInput {
  newName: string;
}

export interface ApplyPodcastCutsInput {
  sequenceId?: string | null;
  segments: SpeakerSegment[];
  dryRun?: boolean;
}

export interface ApplyCameraSwitchesInput {
  sequenceId?: string | null;
  segments: SpeakerSegment[];
  cameraMappings: CameraMapping[];
  dryRun?: boolean;
}

export interface PodcastAdapterResult {
  ok: boolean;
  message?: string;
  reason?: string;
  dryRun?: boolean;
  originalSequenceName?: string | null;
  newSequenceName?: string | null;
  originalSequenceId?: string | null;
  newSequenceId?: string | null;
  mutation?: "duplicate-only";
  duplicateProof?: PodcastDuplicateProof;
}

export interface PodcastExecutionResearchResult {
  ok: boolean;
  test: string;
  label?: string;
  originalSequenceName?: string | null;
  originalSequenceID?: string | null;
  newSequenceName?: string | null;
  newSequenceID?: string | null;
  cloneResult?: boolean;
  renameResult?: boolean;
  duplicateValidationPassed?: boolean;
  activeSequenceAfterCloneID?: string | null;
  activeSequenceAfterCloneName?: string | null;
  workingSequenceID?: string | null;
  workingSequenceName?: string | null;
  workingSequenceVideoTrackCount?: number | null;
  workingSequenceAudioTrackCount?: number | null;
  timelineMutation: string;
  originalTouched?: boolean;
  disabledPropertyExists?: boolean;
  disableAttempted?: boolean;
  disableResult?: boolean;
  enableResult?: boolean;
  targetClipName?: string | null;
  insertClipExists?: boolean;
  overwriteClipExists?: boolean;
  trackItemCloneExists?: boolean;
  timeRangeDisableApiFound?: boolean;
  wholeClipDisableObserved?: boolean;
  requestedDecision?: Record<string, number>;
  targetClipStartSec?: number | null;
  targetClipEndSec?: number | null;
  targetClipDurationSec?: number | null;
  disabledBefore?: boolean | null;
  disabledAfterTrue?: boolean | null;
  disabledAfterRestore?: boolean | null;
  provenApi?: string | null;
  reason?: string;
  insertAttempted?: boolean;
  overwriteAttempted?: boolean;
  insertResult?: unknown;
  overwriteResult?: unknown;
  targetTrackIndex?: number;
  strategy?: string;
  decisionsTested?: number;
  segmentsAttempted?: number;
  segmentsInserted?: number;
  methodUsed?: string | null;
  segmentResults?: unknown[];
  errors?: string[];
  blockers?: string[];
}

export interface ApplyCameraDecisionsVisualOnlyInput {
  cameraDecisions: PodcastCameraDecisionProofItem[];
  minimumShotLengthSec: number;
}

export interface ApplyCameraDecisionSegmentResult {
  decisionIndex: number;
  cameraLabel: string;
  videoTrackIndex?: number | null;
  matchType: "FULL_MATCH" | "PARTIAL_MATCH" | "SKIPPED_NO_OVERLAP";
  decisionStartSec: number;
  decisionEndSec: number;
  durationSec?: number;
  isValidTiming?: boolean;
  invalidReason?: string | null;
  matchingSourceClipFound?: boolean;
  clipName: string | null;
  matchingClipName?: string | null;
  clipStartSec: number | null;
  clipEndSec: number | null;
  matchingClipStartSec?: number | null;
  matchingClipEndSec?: number | null;
  overlapStartSec: number | null;
  overlapEndSec: number | null;
  overlapDurationSec?: number | null;
  sourceInSec: number | null;
  sourceOutSec: number | null;
  subclipCreated: boolean;
  overwriteResult: boolean;
  blockers: string[];
  errors: string[];
}

export interface ApplyCameraDecisionsVisualOnlyResult {
  ok: boolean;
  strategy: "apply-camera-decisions-overlap-aware-visual-only";
  sourceSequenceId?: string | null;
  sourceSequenceName?: string | null;
  originalSequenceID: string | null;
  duplicateSequenceID: string | null;
  decisionsCount: number;
  segmentsAttempted: number;
  segmentsInserted: number;
  segmentsSkipped: number;
  generatedTargetTrackName: "Saad Auto Switch";
  segmentResults: ApplyCameraDecisionSegmentResult[];
  blockers: string[];
  warnings: string[];
  errors: string[];
  originalTouched: false;
  timelineMutation: "duplicate + visual-only reconstructed segments on duplicate only";
}

export interface PodcastSequenceSnapshot {
  name: string | null;
  sequenceID: string | null;
}

export interface PodcastDuplicateProof {
  originalSequenceName?: string | null;
  originalSequenceID?: string | null;
  sequencesCountBefore?: number;
  sequencesCountAfter?: number;
  sequenceNamesBefore?: string[];
  sequenceNamesAfter?: string[];
  sequenceIDsBefore?: Array<string | null>;
  sequenceIDsAfter?: Array<string | null>;
  cloneResult?: boolean;
  newSequenceDetected?: boolean;
  detectedNewSequenceID?: string | null;
  detectedNewSequenceNameBeforeRename?: string | null;
  renameAttempted?: boolean;
  renameResult?: boolean;
  finalNewSequenceName?: string | null;
  activeSequenceAfterCloneName?: string | null;
  activeSequenceAfterCloneID?: string | null;
  errors?: string[];
  blockers?: string[];
}

export interface PremierePodcastAdapterContract {
  getActiveSequence(): Promise<PodcastSequenceInfo | null>;
  getVideoTracks(): Promise<PodcastTrackInfo[]>;
  getAudioTracks(): Promise<PodcastTrackInfo[]>;
  getTimelineLayout(): Promise<PodcastTimelineLayout>;
  inspectAudioSources(mappings: AudioTrackSpeakerMapping[]): Promise<AudioSourceInspectionResult>;
  createSequence(input: CreatePodcastSequenceInput): Promise<PodcastAdapterResult>;
  duplicateSequence(input: DuplicatePodcastSequenceInput): Promise<PodcastAdapterResult>;
  testSafeDuplicateSequence(): Promise<PodcastExecutionResearchResult>;
  testDisableEnableOnDuplicate(): Promise<PodcastExecutionResearchResult>;
  testDisableTimeRangeOnDuplicate(): Promise<PodcastExecutionResearchResult>;
  testInsertOverwriteOnDuplicate(): Promise<PodcastExecutionResearchResult>;
  testReconstructInsertOverwriteOnDuplicate(): Promise<PodcastExecutionResearchResult>;
  applyCameraDecisionsVisualOnly(input: ApplyCameraDecisionsVisualOnlyInput): Promise<ApplyCameraDecisionsVisualOnlyResult>;
  applyCuts(input: ApplyPodcastCutsInput): Promise<PodcastAdapterResult>;
  applyCameraSwitches(input: ApplyCameraSwitchesInput): Promise<PodcastAdapterResult>;
}
