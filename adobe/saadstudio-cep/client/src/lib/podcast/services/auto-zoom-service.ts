import { evalES, loadExtendScript } from "../../cep";

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
  overlaysRequested?: number;
  overlaysInserted?: number;
  overlaysFailed?: number;
  originalTouched?: boolean;
  previewTimeSec?: number | null;
  createdProjectItemName: string | null;
  executionMode: "adjustment-layer" | "direct-transform" | "overlay-based" | null;
  candidates?: Array<{
    cutIndex: number;
    sourceTrackIndex: number;
    sourceClipName: string;
    sourceClipStartSec: number;
    sourceClipEndSec: number;
    zoomStartSec: number;
    zoomEndSec: number;
    zoomDurationSec: number;
    selectedForZoom: boolean;
    rejectionReason: string;
    overlayTrackIndex: number;
    overlayClipName: string | null;
    overlayInserted: boolean;
    overlayStartVerified: boolean;
    overlayEndVerified: boolean;
    sourceVerified: boolean;
    audioSuppressed: boolean;
    originalTouched: boolean;
    finalStatus: "OVERLAY_INSERTED_AND_VERIFIED" | "SKIPPED" | "FAILED";
  }>;
  blockers: string[];
  warnings: string[];
  timelineMutation: string;

  // Deterministic logging fields
  totalClipsFound?: number;
  validCutEvents?: number;
  rejectedEvents?: Array<{ timeSec: number; reason: string }>;
  rhythmSelectedEvents?: number;

  // Legacy fields for backward compatibility
  adjustmentLayersInserted?: number;
  effectsApplied?: number;
  failedEvents?: number;
  eventResults: Array<{
    timeSec: number;
    endSec: number;
    style: AutoZoomStyle;
    inserted: boolean;
    effectApplied: boolean;
    error?: string | null;
  }>;
}

export async function inspectAutoZoomTimeline(settings: AutoZoomInspectionSettings): Promise<AutoZoomTimelineResult> {
  try {
    await loadExtendScript();
  } catch (e) {
    console.error("Failed to load ExtendScript before inspectAutoZoomTimeline", e);
  }
  return evalES<AutoZoomTimelineResult>("inspectAutoZoomTimeline", settings);
}

/**
 * Applies Auto Zoom to the active sequence.
 * 
 * Returns deterministic logs including:
 * - totalClipsFound
 * - validCutEvents
 * - rejectedEvents (with timeSec and reason)
 * - rhythmSelectedEvents
 * - overlaysInserted
 */
export async function applyAutoZoom(settings: AutoZoomApplySettings): Promise<AutoZoomApplyResult> {
  console.log("[auto-zoom] Client service calling applyAutoZoom with settings:", JSON.stringify(settings));
  try {
    await loadExtendScript();
  } catch (e) {
    console.error("Failed to load ExtendScript before applyAutoZoom", e);
  }
  return evalES<AutoZoomApplyResult>("applyAutoZoom", settings);
}
