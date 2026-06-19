import { evalES } from "../../cep";

export type AutoZoomStyle = "jump" | "smooth" | "snap";

export interface AutoZoomTimelineResult {
  ok: boolean;
  sequenceName: string | null;
  sequenceId: string | null;
  durationSec: number;
  videoTrackCount: number;
  cutEventsSec: number[];
  adjustmentLayerCount: number;
  qeAvailable: boolean;
  newAdjustmentLayerAvailable: boolean;
  directTransformAvailable: boolean;
  executionMode: "adjustment-layer" | "direct-transform" | null;
  blockers: string[];
  warnings: string[];
}

export interface AutoZoomApplySettings {
  targetVideoTrackIndex: number;
  analyzedVideoTrackIndexes: number[];
  rhythmPercentage: number;
  maxZoomPercentage: number;
  zoomDurationSec: number;
  styles: AutoZoomStyle[];
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
  blockers: string[];
  warnings: string[];
  timelineMutation: string;
}

export async function inspectAutoZoomTimeline(): Promise<AutoZoomTimelineResult> {
  return evalES<AutoZoomTimelineResult>("inspectAutoZoomTimeline");
}

export async function applyAutoZoom(settings: AutoZoomApplySettings): Promise<AutoZoomApplyResult> {
  return evalES<AutoZoomApplyResult>("applyAutoZoom", settings);
}
