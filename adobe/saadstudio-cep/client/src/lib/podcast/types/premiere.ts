import type {
  AudioSourceInspectionResult,
  AudioTrackSpeakerMapping,
  CameraMapping,
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
  applyCuts(input: ApplyPodcastCutsInput): Promise<PodcastAdapterResult>;
  applyCameraSwitches(input: ApplyCameraSwitchesInput): Promise<PodcastAdapterResult>;
}
