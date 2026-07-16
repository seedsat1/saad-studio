import { evalES, loadExtendScript } from "../../cep";
import { getPodcastDiagnostics } from "./diagnostics-service";
import { applyCameraDecisionsVisualOnly } from "./execution-research-service";

import { runPodcastAutoCaptions, CaptionLanguage, CaptionModel } from "./auto-captions-service";
import { generateCameraDecisionPlanProof } from "./camera-decision-plan-service";
import type { CameraMapping, TrackSpeakingSegment, DominantTrackWindow, TrackOverlapWindow } from "../types";

export interface OneClickPodcastEditSettings {
  // Multi-Cam Auto Switch settings
  dominantTrackAtTime: DominantTrackWindow[];
  overlaps: TrackOverlapWindow[];
  trackSpeakingSegments: TrackSpeakingSegment[];
  cameraMappings: CameraMapping[];
  minimumShotLengthSec: number;
  selectedAudioStreamIndex?: number | null;
  timelineDurationSec?: number;
  videoTrackCount?: number;
  
  // Auto Captions settings
  autoCaptionsLanguage: CaptionLanguage;
  autoCaptionsModel: CaptionModel;
  
  // Excluded Wide camera
  excludedSourceVideoTrackIndex?: number | null;
  
  // Transitional Wide shot settings
  enableTransitionalWide?: boolean;
  transitionalWideDurationSec?: number;

  maxSingleCameraRunSec?: number;
  wideCutawayDurationSec?: number;
  skipCaptions?: boolean;
  fastMode?: boolean;
}

export interface OneClickPodcastEditResult {
  success: boolean;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps?: string[];
  skipReason?: string;
  switchesApplied: number;
  captionsCreated: number;
  totalRuntime: number;
  originalTouched: boolean;
  sequenceName: string;
  errorMessages: Record<string, string>;
  captionDiagnostics?: any;
}

export async function runOneClickPodcastEditService(
  settings: OneClickPodcastEditSettings,
  onProgress: (progress: { stage: string; message: string; percent: number | null }) => void,
): Promise<OneClickPodcastEditResult> {
  const startTime = Date.now();
  const completedSteps: string[] = [];
  const failedSteps: string[] = [];
  const skippedSteps: string[] = [];
  let skipReason: string | undefined = undefined;
  const errorMessages: Record<string, string> = {};
  
  let switchesApplied = 0;
  let captionsCreated = 0;
  let captionDiagnostics: any = null;
  
  let originalSeqId: string | null = null;
  let duplicateSequenceID: string | null = null;
  let duplicateSequenceName = "";
  
  try {
    // Force reload JSX script to clear memory caching issues in Premiere Pro
    await loadExtendScript();

    // 0. Pre-checks & Setup
    const diagnostics = await getPodcastDiagnostics();
    if (!diagnostics.activeSequence || !diagnostics.sequenceId) {
      throw new Error("ACTIVE_SEQUENCE_REQUIRED");
    }
    originalSeqId = diagnostics.sequenceId;
    
    // Duplicate active sequence immediately to ensure original sequence is never touched
    console.log("[Saad One Click Edit] Duplicate Active Sequence | Status: STARTED");
    onProgress({ stage: "setup", message: "Duplicating active sequence...", percent: 5 });
    
    const baseSequenceName = cleanOneClickBaseSequenceName(diagnostics.sequenceName || "Sequence");
    const draftName = baseSequenceName + " - Saad Auto Switch Draft";
    const dupResult = await evalES<any>("duplicateActiveSequence", "Auto Switch Draft", draftName);
    if (!dupResult || !dupResult.ok || !dupResult.newSequenceID) {
      const errMsg = dupResult?.blockers?.join(" | ") || "Could not duplicate sequence.";
      console.log(`[Saad One Click Edit] Duplicate Active Sequence | Status: FAILED | Error: ${errMsg}`);
      throw new Error(`DUPLICATE_FAILED: ${errMsg}`);
    }
    
    duplicateSequenceID = dupResult.newSequenceID;
    duplicateSequenceName = draftName;
    console.log(`[Saad One Click Edit] Duplicate Active Sequence | Status: COMPLETED | ID: ${duplicateSequenceID}`);
    
    // Get active sequence name before activation
    const beforeInfo = await evalES<any>("getActiveSequenceInfo");
    const activeNameBefore = beforeInfo?.name || "unknown";

    // Set duplicate active explicitly
    const setActiveResult = await evalES<boolean>("setActiveSequenceById", duplicateSequenceID);

    // Get active sequence name after activation
    const afterInfo = await evalES<any>("getActiveSequenceInfo");
    const activeNameAfter = afterInfo?.name || "unknown";

    // Explicit runtime proof logging
    console.log(`[Saad Runtime Proof] duplicateSequenceID: ${duplicateSequenceID}`);
    console.log(`[Saad Runtime Proof] duplicateSequenceName: ${duplicateSequenceName}`);
    console.log(`[Saad Runtime Proof] setActiveSequenceById result: ${setActiveResult}`);
    console.log(`[Saad Runtime Proof] active sequence name before activation: ${activeNameBefore}`);
    console.log(`[Saad Runtime Proof] active sequence name after activation: ${activeNameAfter}`);

    if (!setActiveResult) {
      throw new Error(`ACTIVATION_FAILED: setActiveSequenceById returned false for sequence ID ${duplicateSequenceID}`);
    }

    // Ensure duplicate remains active
    await evalES<boolean>("setActiveSequenceById", duplicateSequenceID);
    
    // Step 1: Multi-Cam Auto Switch on duplicate
    const step2Start = Date.now();
    console.log("[Saad One Click Edit] Step 1: Multi-Cam Auto Switch | Status: STARTED");
    onProgress({ stage: "multi-cam-switch", message: "[1/2] Auto Switch: Switching angles in-place...", percent: 45 });
    
    let planResult;
    try {
      planResult = generateCameraDecisionPlanProof({
        dominantTrackAtTime: settings.dominantTrackAtTime,
        overlaps: settings.overlaps,
        trackSpeakingSegments: settings.trackSpeakingSegments,
        cameraMappings: settings.cameraMappings,
        timelineDurationSec: settings.timelineDurationSec,
        videoTrackCount: settings.videoTrackCount,
        minimumShotLengthSec: settings.minimumShotLengthSec,
        enableTransitionalWide: settings.enableTransitionalWide,
        transitionalWideDurationSec: settings.transitionalWideDurationSec,
        maxSingleCameraRunSec: settings.maxSingleCameraRunSec,
        wideCutawayDurationSec: settings.wideCutawayDurationSec,
      });
      
      if (planResult.blockers && planResult.blockers.length > 0) {
        throw new Error(`CAMERA_PLAN_BLOCKED: ${planResult.blockers.join(" | ")}`);
      }
    } catch (planErr) {
      const step2Duration = Date.now() - step2Start;
      console.log(`[Saad One Click Edit] Step 1: Multi-Cam Auto Switch | Status: FAILED | Duration: ${step2Duration}ms | Error: ${(planErr as Error).message}`);
      throw planErr;
    }
    
    const switchResult = await applyCameraDecisionsVisualOnly({
      cameraDecisions: planResult.cameraDecisions,
      minimumShotLengthSec: settings.minimumShotLengthSec,
    });
    
    if (!switchResult.ok) {
      const errMsg = switchResult.blockers.join(" | ") || "Camera switching execution failed.";
      const step2Duration = Date.now() - step2Start;
      console.log(`[Saad One Click Edit] Step 1: Multi-Cam Auto Switch | Status: FAILED | Duration: ${step2Duration}ms | Error: ${errMsg}`);
      throw new Error(`Auto Switch failed: ${errMsg}`);
    }
    
    switchesApplied = switchResult.segmentsInserted ?? 0;
    completedSteps.push("multi-cam-switch");
    
    const step2Duration = Date.now() - step2Start;
    console.log(`[Saad One Click Edit] Step 1: Multi-Cam Auto Switch | Status: COMPLETED | Duration: ${step2Duration}ms`);
    
    // Ensure duplicate remains active
    await evalES<boolean>("setActiveSequenceById", duplicateSequenceID);
    
    // Step 2: Auto Captions on duplicate
    const step3Start = Date.now();
    if (settings.skipCaptions || settings.fastMode) {
      console.log("[Saad One Click Edit] Step 2: Auto Captions | Status: SKIPPED");
      onProgress({ stage: "auto-captions", message: "[2/2] Auto Captions: SKIPPED (Generate later)...", percent: null as any });
      skippedSteps.push("auto-captions");
      if (!skipReason) {
        skipReason = settings.fastMode ? "FAST_MODE_ENABLED" : "USER_SKIPPED_CAPTIONS";
      }
    } else {
      console.log("[Saad One Click Edit] Step 2: Auto Captions | Status: STARTED");
      onProgress({ stage: "auto-captions", message: "[2/2] Auto Captions: Preparing...", percent: null as any });
      
      try {
        const captionResult = await runPodcastAutoCaptions(
          settings.autoCaptionsLanguage,
          settings.autoCaptionsModel,
          (p) => {
            onProgress({
              stage: "auto-captions",
              message: `[2/2] Auto Captions: ${p.message}`,
              percent: null as any,
            });
          }
        );
        
        const step3Duration = Date.now() - step3Start;
        captionDiagnostics = captionResult.diagnostics;
        if (captionResult.ok) {
          captionsCreated = captionResult.captionCount;
          completedSteps.push("auto-captions");
          console.log(`[Saad One Click Edit] Step 2: Auto Captions | Status: COMPLETED | Duration: ${step3Duration}ms`);
        } else {
          failedSteps.push("auto-captions");
          const errMsg = captionResult.blockers.join(" | ") || "Failed to create caption track.";
          errorMessages["auto-captions"] = errMsg;
          console.log(`[Saad One Click Edit] Step 2: Auto Captions | Status: FAILED | Duration: ${step3Duration}ms | Error: ${errMsg}`);
        }
      } catch (capErr) {
        const step3Duration = Date.now() - step3Start;
        failedSteps.push("auto-captions");
        const errMsg = (capErr as Error).message;
        errorMessages["auto-captions"] = errMsg;
        console.log(`[Saad One Click Edit] Step 2: Auto Captions | Status: FAILED | Duration: ${step3Duration}ms | Error: ${errMsg}`);
      }
    }
    
    // Ensure duplicate remains active
    await evalES<boolean>("setActiveSequenceById", duplicateSequenceID);
    
    // Final Rename: [Original Name] - Saad One Click Edit
    const finalCleanName = baseSequenceName + " - Saad One Click Edit";
    try {
      await evalES<boolean>("renameSequenceById", duplicateSequenceID, finalCleanName);
      duplicateSequenceName = finalCleanName;
    } catch (renameErr) {
      console.warn("Failed to rename final sequence:", renameErr);
    }
    
    onProgress({ stage: "completed", message: "One Click Edit complete!", percent: 100 });
    
    return {
      success: true,
      completedSteps,
      failedSteps,
      skippedSteps,
      skipReason,
      switchesApplied,
      captionsCreated,
      totalRuntime: Date.now() - startTime,
      originalTouched: false,
      sequenceName: duplicateSequenceName,
      errorMessages,
      captionDiagnostics,
    };
    
  } catch (err) {
    console.error("One Click Edit pipeline failed:", err);
    if (duplicateSequenceID && originalSeqId) {
      try {
        await evalES<boolean>("setActiveSequenceById", originalSeqId);
        await evalES<boolean>("deleteSequenceById", duplicateSequenceID);
      } catch (cleanErr) {
        console.error("Failed to cleanup duplicate sequence after failure:", cleanErr);
      }
    }
    
    const errMessage = (err as Error).message;
    return {
      success: false,
      completedSteps,
      failedSteps: ["multi-cam-switch", "auto-captions"].filter(s => !completedSteps.includes(s) && !skippedSteps.includes(s)),
      skippedSteps,
      skipReason,
      switchesApplied,
      captionsCreated,
      totalRuntime: Date.now() - startTime,
      originalTouched: false,
      sequenceName: "Failed Pipeline",
      errorMessages: {
        ...errorMessages,
        pipeline: errMessage,
      },
      captionDiagnostics,
    };
  }
}

function cleanOneClickBaseSequenceName(name: string): string {
  return name
    .replace(/\s+-\s+Saad One Click Edit$/i, "")
    .replace(/\s+-\s+Saad Auto Switch Draft$/i, "")
    .replace(/\s+-\s+Saad Sync Draft$/i, "")
    .trim() || "Sequence";
}
