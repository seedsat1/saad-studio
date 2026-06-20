import { evalES } from "../../cep";

export type AutoZoomStyle = "jump" | "smooth" | "snap";

export interface AutoZoomTimelineResult {
  ok: boolean;
  sequenceName: string | null;
  sequenceId: string | null;
  durationSec: number;
  videoTrackCount: number;
  analyzedVideoTrackIndexes: number[];
  cutEventsSec: number[];
  adjustmentLayerCount: number;
  qeAvailable: boolean;
  newAdjustmentLayerAvailable: boolean;
  directTransformAvailable: boolean;
  executionMode: "adjustment-layer" | "direct-transform" | null;
  blockers: string[];
  warnings: string[];
}

export interface AutoZoomInspectionSettings {
  analyzedVideoTrackIndexes: number[];
  autoDetectAnalyzedTrack?: boolean;
  excludedSourceVideoTrackIndex?: number | null;
}

export interface AutoZoomApplySettings {
  targetVideoTrackIndex: number;
  analyzedVideoTrackIndexes: number[];
  rhythmPercentage: number;
  maxZoomPercentage: number;
  zoomDurationSec: number;
  styles: AutoZoomStyle[];
  excludedSourceVideoTrackIndex?: number | null;
}

export interface AutoZoomApplyResult {
  ok: boolean;
  sequenceName: string | null;
  eventsDetected: number;
  eventsSelected: number;
  adjustmentLayersInserted: number;
  effectsApplied: number;
  failedEvents: number;
  createdProjectItemName: string | null;
  executionMode: "adjustment-layer" | "direct-transform" | null;
  eventResults: Array<{
    timeSec: number;
    endSec: number;
    style: AutoZoomStyle;
    inserted: boolean;
    effectApplied: boolean;
    error?: string | null;
  }>;
  candidates?: Array<{
    clipName: string;
    clipStart: number;
    clipEnd: number;
    cutIndex: number;
    selectedForZoom: boolean;
    rejectionReason: string;
    scaleResolved: boolean;
    keyframesCreated: number;
    readBackKeyframes: number;
    readBackScaleValues: number[];
    verificationMethod: string;
    diagnostics?: {
      setTimeVarying: boolean;
      addKey: boolean;
      setValueAtKey: boolean;
      removeKeyRange: boolean;
      getKeys: boolean;
      getValueAtKey: boolean;
      getValueAtTime: boolean;
    };
    finalStatus: "APPLIED_AND_VERIFIED" | "APPLIED_BUT_UNVERIFIED" | "SKIPPED" | "FAILED";
  }>;
  blockers: string[];
  warnings: string[];
  timelineMutation: string;
}

export async function inspectAutoZoomTimeline(settings: AutoZoomInspectionSettings): Promise<AutoZoomTimelineResult> {
  return evalES<AutoZoomTimelineResult>("inspectAutoZoomTimeline", settings);
}

export async function applyAutoZoom(settings: AutoZoomApplySettings): Promise<AutoZoomApplyResult> {
  return evalES<AutoZoomApplyResult>("applyAutoZoom", settings);
}
