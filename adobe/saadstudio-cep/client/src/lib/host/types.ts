export type HostKind = "premiere" | "aftereffects" | "browser";

export type HostSelectionKind = "video" | "audio" | "any";

export interface HostSelection {
  type?: string;
  path?: string;
  name?: string;
  inSec?: number;
  outSec?: number;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
  trackKind?: "video" | "audio";
  trackIndex?: number;
  startTicks?: string | null;
  endTicks?: string | null;
}

export interface HostContext {
  host: HostKind | string;
  hasSequence: boolean;
  sequenceName?: string | null;
  sequenceId?: string | null;
  playheadTicks?: string | null;
  playheadSeconds?: number | null;
  captionTracksCount?: number;
  videoTracksCount?: number;
  selectedClip?: HostSelection | null;
}

export interface HostCapabilityLayer {
  readContext: boolean;
  readSelection: boolean;
  importAsset: boolean;
  importSrt: boolean;
  placeCaption: boolean;
  placeMedia: boolean;
  createSequence: boolean;
  duplicateSequence: boolean;
  autoReframe: boolean;
  createCuts: boolean;
  replaceClip: boolean;
  addToTimeline: boolean;
  createCaptionTrack: boolean;
}

export interface HostOperationResult {
  ok: boolean;
  message?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface PlaceCaptionInput {
  srtPath: string;
  sourcePath?: string;
}

export interface PlaceMediaInput {
  assetPath: string;
  afterSelected?: boolean;
}

export interface CreateSequenceInput {
  name: string;
  presetPath?: string;
}

export interface DuplicateSequenceInput {
  sequenceId?: string | null;
  newName?: string;
}

export interface AutoReframeInput {
  sequenceName?: string;
  preset?: string;
  useNestedSequences?: boolean;
}

export interface CreateCutsInput {
  cuts: Array<{ atTicks: string }>;
}

export interface ReplaceClipInput {
  assetPath: string;
}

export interface AddToTimelineInput {
  assetPath: string;
  targetTrackIndex?: number;
}

export interface HostAdapter {
  readonly host: HostKind;
  readonly capabilities: HostCapabilityLayer;
  getContext(): Promise<HostContext | null>;
  getSelection(kind?: HostSelectionKind): Promise<HostSelection | null>;
  importAsset(path: string): Promise<HostOperationResult>;
  importSrt(path: string): Promise<HostOperationResult>;
  placeCaption(input: PlaceCaptionInput): Promise<HostOperationResult>;
  placeMedia(input: PlaceMediaInput): Promise<HostOperationResult>;
  createSequence(input: CreateSequenceInput): Promise<HostOperationResult>;
  duplicateSequence(input?: DuplicateSequenceInput): Promise<HostOperationResult>;
  autoReframe(input?: AutoReframeInput): Promise<HostOperationResult>;
  createCuts(input: CreateCutsInput): Promise<HostOperationResult>;
  replaceClip(input: ReplaceClipInput): Promise<HostOperationResult>;
  addToTimeline(input: AddToTimelineInput): Promise<HostOperationResult>;
}
