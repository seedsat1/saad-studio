import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
import { loadExtendScript } from "../lib/cep";
import { getPodcastDiagnostics } from "../lib/podcast/services/diagnostics-service";
import {
  generateCameraDecisionPlan,
  parseSpeakerSegmentsJson,
} from "../lib/podcast/services/podcast-edit-service";
import { analyzeTimelineLayout } from "../lib/podcast/services/timeline-layout-service";
import { createSafeEditCopy, draftSequenceName } from "../lib/podcast/services/safe-execution-service";
import {
  diagnoseFfmpegDetection,
  inspectAudioSourcesAndFfmpeg,
  inspectAudioStreamsForRmsSource,
  runFullAudioActivityProof,
  runSpeakerSourceAttributionProof,
  runFfmpegRmsRuntimeProof,
} from "../lib/podcast/services/audio-source-inspector-service";
import { generateSpeakerActivityProof } from "../lib/podcast/services/speaker-activity-service";
import { generateCameraDecisionPlanProof } from "../lib/podcast/services/camera-decision-plan-service";
import {
  analyzeSynchronizationPlan,
  applySynchronizationOffsets,
  type SynchronizationApplyResult,
  type SynchronizationPlan,
} from "../lib/podcast/services/synchronization-service";
// Auto Zoom imports removed
import {
  discoverCaptionRuntime,
  installCaptionRuntime,
  repairCaptionRuntime,
  type RuntimeDiscoveryResult,
  type RuntimeProgress,
} from "../lib/podcast/services/runtime-manager-service";
import {
  runPodcastAutoCaptions,
  modelTiers,
  type AutoCaptionsResult,
  type CaptionLanguage,
  type CaptionModel,
} from "../lib/podcast/services/auto-captions-service";
import {
  runOneClickPodcastEditService,
} from "../lib/podcast/services/one-click-podcast-edit-service";

import {
  applyCameraDecisionsVisualOnly,
  testDisableEnableOnDuplicate,
  testDisableTimeRangeOnDuplicate,
  testInsertOverwriteOnDuplicate,
  testReconstructInsertOverwriteOnDuplicate,
  testSafeDuplicateSequence,
} from "../lib/podcast/services/execution-research-service";
import type {
  AudioSourceInfo,
  AudioSourceProofResult,
  AudioTrackSpeakerMapping,
  AudioStreamSelectionProof,
  CameraDecision,
  FfmpegDetectionDiagnostics,
  FfmpegRmsRuntimeProof,
  FullAudioActivityProof,
  SpeakerActivityProof,
  SpeakerSourceAttributionProof,
  PodcastCameraDecisionPlanProof,
  CameraMapping,
  PodcastDiagnostics,
  PodcastExecutionStrategy,
} from "../lib/podcast/types";
import type { PodcastTimelineLayout, PodcastTrackInfo } from "../lib/podcast/types/premiere";
import type {
  ApplyCameraDecisionsVisualOnlyResult,
  PodcastAdapterResult,
  PodcastExecutionResearchResult,
} from "../lib/podcast/types/premiere";

const DEFAULT_DIAGNOSTICS: PodcastDiagnostics = {
  activeSequence: false,
  sequenceId: null,
  sequenceName: null,
  premiereVersion: null,
  videoTrackCount: 0,
  audioTrackCount: 0,
  adapterStatus: "unsupported",
  reapProviderStatus: "unknown",
  messages: ["Diagnostics have not been refreshed yet."],
};

const EXAMPLE_SEGMENTS_JSON = `[
  { "speakerId": "speaker_1", "startSec": 0, "endSec": 4.5 },
  { "speakerId": "speaker_2", "startSec": 4.5, "endSec": 9.2 },
  { "speakerId": "speaker_1", "startSec": 9.2, "endSec": 13.8 }
]`;

const STRATEGY_OPTIONS: PodcastExecutionStrategy[] = [
  "decision-plan-only",
  "track-enable-disable",
  "duplicate-sequence-cuts",
  "unsupported-multicam-angle-switching",
];

type ApplyCheckpoint =
  | "NOT_STARTED"
  | "APPLY_CLICKED"
  | "DECISIONS_AVAILABLE"
  | "EXECUTION_STRATEGY_SELECTED"
  | "DUPLICATE_SEQUENCE_START"
  | "DUPLICATE_SEQUENCE_SUCCESS"
  | "DUPLICATE_SEQUENCE_FAILED"
  | "APPLY_DECISIONS_START"
  | "APPLY_DECISIONS_SUCCESS"
  | "APPLY_DECISIONS_FAILED"
  | "RETURN_TO_UI";

interface ApplyTrace {
  lastCheckpoint: ApplyCheckpoint;
  checkpoints: ApplyCheckpoint[];
  decisionCountPassedToApply: number;
  executionStrategyUsed: string | null;
  duplicateSequenceCalled: boolean;
  duplicateSequenceResult: string;
  applyCameraDecisionsCalled: boolean;
  applyCameraDecisionsResult: string;
  error: string | null;
}

const DEFAULT_CAMERA_ROLES = ["CAM WIDE", "CAM HOST", "CAM GUEST", "CAM GUESTS", "CAM DRONE / CRANE"];

export function MultiCamAutoSwitchPage(): HTMLElement {
  const state = {
    loading: false,
    timelineLoading: false,
    duplicateLoading: false,
    audioProofLoading: false,
    ffmpegDiagnosticsLoading: false,
    rmsProofLoading: false,
    fullActivityProofLoading: false,
    sourceAttributionProofLoading: false,
    previewAutoSwitchLoading: false,
    applyCameraDecisionsLoading: false,
    synchronizationLoading: false,
    synchronizationApplyLoading: false,
    executionResearchLoading: null as null | "duplicate" | "disable" | "range" | "insert" | "reconstruct",
    streamProofLoading: false,
    safeCopyConfirmed: false,
    duplicateResult: null as PodcastAdapterResult | null,
    audioProof: null as AudioSourceProofResult | null,
    ffmpegDiagnostics: null as FfmpegDetectionDiagnostics | null,
    rmsProof: null as FfmpegRmsRuntimeProof | null,
    fullActivityProof: null as FullAudioActivityProof | null,
    sourceAttributionProof: null as SpeakerSourceAttributionProof | null,
    cameraDecisionPlanProof: null as PodcastCameraDecisionPlanProof | null,
    applyCameraDecisionsResult: null as ApplyCameraDecisionsVisualOnlyResult | null,
    applyTrace: createEmptyApplyTrace(),
    synchronizationPlan: null as SynchronizationPlan | null,
    synchronizationApplyResult: null as SynchronizationApplyResult | null,
    executionResearchResult: null as PodcastExecutionResearchResult | null,
    streamProof: null as AudioStreamSelectionProof | null,
    selectedAudioStreamIndex: null as number | null,
    speakerActivityProof: null as SpeakerActivityProof | null,
    rmsSpeechThresholdDb: -35,
    minimumSpeechDurationSec: 0.4,
    diagnostics: DEFAULT_DIAGNOSTICS,
    timelineLayout: null as PodcastTimelineLayout | null,
    segmentsJson: EXAMPLE_SEGMENTS_JSON,
    minimumShotLengthSec: 2,
    maxSingleCameraRunSec: 20,
    wideCutawayDurationSec: 4,
    enableTransitionalWide: true,
    transitionalWideDurationSec: 2.0,
    mergeAdjacentKeepGapSec: 0.7,
    executionStrategy: "decision-plan-only" as PodcastExecutionStrategy,
    mappings: {} as Record<string, number>,
    cameraLabels: {} as Record<number, string>,
    cameraMappingTouched: false,
    audioMappings: {
      speaker_1: 0,
      speaker_2: 1,
      speaker_3: 2,
    } as Record<string, number>,
    developerDiagnosticsOpen: false,
    captionRuntime: null as RuntimeDiscoveryResult | null,
    captionRuntimeLoading: false,
    captionRuntimeProgress: null as (RuntimeProgress | { stage: string; message: string; percent?: number | null }) | null,
    autoCaptionsResult: null as AutoCaptionsResult | null,
    autoCaptionsLoading: false,
    autoCaptionsLanguage: "ar" as CaptionLanguage,
    autoCaptionsModel: "medium" as CaptionModel,
    oneClickSkipCaptions: false,
    oneClickFastMode: false,
    oneClickLoading: false,
    oneClickProgress: null as { stage: string, message: string, percent: number | null } | null,
    oneClickResult: null as any | null,
  };

  const page = el("div.app-main");
  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Podcast Automation"),
    page,
  );
  let sequencePollInFlight = false;
  let sequenceWatcherSawPageMounted = false;

  render();
  void refreshDiagnostics();
  void refreshCaptionRuntime();
  startActiveSequenceWatcher();
  return root;

  function render() {
    page.replaceChildren(
      el("div.podcast-page", null,
      el("div.podcast-hero", null,
          el("div.podcast-hero__icon", null, icon("video", 24)),
          el("div", null,
            el("h2", null, "Podcast Automation"),
            el("p", null, "Automate podcast edits with clean controls and draft-safe timeline output."),
          ),
        ),
        renderProductionToolCards(),
        renderProductionWorkflow(),
        renderDeveloperDiagnostics(),
      ),
    );
  }

  function renderProductionWorkflow(): HTMLElement {
    return el("div.podcast-workflow", null,
      renderSynchronizeTool(),
      renderMultiCamProductionTool(),
      renderAutoCaptionsTool(),
      renderOneClickTool(),
      renderProductionSummary(),
    );
  }

  function renderProductionToolCards(): HTMLElement {
    const captionStatus = state.captionRuntime?.status === "ready" ? "Ready" : "Setup";
    return el("div.podcast-tool-grid", null,
      renderPodcastToolCard("Synchronize", "Ready", "Check timeline sync before camera switching.", true),
      renderPodcastToolCard("Multi-Cam Auto Switch", "Ready", "Switch cameras from speaker activity.", true),
      renderPodcastToolCard("Auto Captions", captionStatus, "Generate captions for podcast clips.", true),
      renderPodcastToolCard("One Click Podcast Edit", "Ready", "Combine camera switching and captions.", true),
    );
  }

  function renderPodcastToolCard(title: string, status: string, description: string, active: boolean): HTMLElement {
    const targetId = title === "Multi-Cam Auto Switch"
      ? "podcast-multicam-tool"
      : title === "Synchronize"
        ? "podcast-synchronize-tool"
      : title === "Auto Captions"
        ? "podcast-auto-captions-tool"
      : title === "One Click Podcast Edit"
        ? "podcast-one-click-tool"
        : null;
    return el("button.podcast-tool-card" + (active ? ".is-active" : ""), {
      type: "button",
      disabled: !targetId,
      onClick: () => {
        if (!targetId) return;
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
      el("div.podcast-tool-card__top", null,
        el("strong", null, title),
        el("span", null, status),
      ),
      el("p", null, description),
    );
  }

  function renderSynchronizeTool(): HTMLElement {
    const plan = state.synchronizationPlan;
    const busy = isProductionBusy();
    return el("div.podcast-production-card", { id: "podcast-synchronize-tool" },
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "Synchronize"),
          el("p", null, "Inspect timeline audio/video alignment before running Multi-Cam. This step is read-only."),
        ),
      ),
      el("div.podcast-action-row", null,
        el("button.btn-secondary", {
          disabled: busy,
          onClick: analyzeSynchronization,
        }, state.synchronizationLoading ? "Analyzing sync..." : "Analyze Sync"),
        el("button.btn-primary", {
          disabled: busy || !plan?.offsetsReady,
          onClick: applySynchronization,
        }, state.synchronizationApplyLoading ? "Applying sync..." : "Apply Sync"),
      ),
      state.synchronizationLoading || state.synchronizationApplyLoading
        ? renderProcessingLoader(state.synchronizationApplyLoading ? "Applying synchronization" : "Analyzing synchronization")
        : null,
      el("div.podcast-summary-grid.podcast-summary-grid--compact", null,
        renderSummaryTile("Status", !plan ? "Not analyzed" : plan.offsetsReady ? "Offsets ready" : plan.ok ? "Analyzed" : "Blocked"),
        renderSummaryTile("Sequence", plan?.sequenceName || state.diagnostics.sequenceName || "No active sequence"),
        renderSummaryTile("Tracks", plan ? `${plan.videoTrackCount} video / ${plan.audioTrackCount} audio` : "Waiting"),
        renderSummaryTile("Clips", plan ? `${plan.videoClipCount} video / ${plan.audioClipCount} audio` : "Waiting"),
        renderSummaryTile("Reference", plan?.referenceAudioTrackIndex !== null && plan?.referenceAudioTrackIndex !== undefined
          ? `A${plan.referenceAudioTrackIndex + 1}`
          : "Not selected"),
        renderSummaryTile("Offsets", plan ? `${plan.offsetsComputed}/${Math.max(0, plan.waveformOffsets.length - 1)} ready` : "Waiting"),
        renderSummaryTile("Largest move", plan ? formatLargestSyncMove(plan) : "Waiting"),
        renderSummaryTile("Applied", state.synchronizationApplyResult?.ok
          ? `${countSynchronizedClips(plan)} clips`
          : "Not applied"),
      ),
      renderSynchronizationMessages(plan),
      plan ? renderSynchronizePreviewTable(plan) : null,
    );
  }

  function renderSynchronizePreviewTable(plan: SynchronizationPlan): HTMLElement {
    if (!plan.waveformOffsets || !plan.waveformOffsets.length) {
      return el("div.podcast-empty-plan", null, "No waveform offsets calculated.");
    }
    
    return el("div.podcast-table-wrap", { style: { marginTop: "15px" } },
      el("table.podcast-plan-table", null,
        el("thead", null,
          el("tr", null,
            el("th", null, "track"),
            el("th", null, "suggestedMoveSec"),
            el("th", null, "confidence"),
            el("th", null, "overlap duration used"),
            el("th", null, "referenceTrack"),
            el("th", null, "candidate peaks"),
            el("th", null, "reason"),
          ),
        ),
        el("tbody", null, ...plan.waveformOffsets.map((offset) => {
          const trackLabel = `A${offset.audioTrackIndex + 1}` + (offset.pairedVideoTrackIndex !== null ? ` (V${offset.pairedVideoTrackIndex + 1})` : "");
          const isRef = offset.audioTrackIndex === plan.referenceAudioTrackIndex;
          
          const moveLabel = isRef 
            ? "0.0s (Reference)" 
            : typeof offset.suggestedMoveSec === "number"
              ? `${offset.suggestedMoveSec > 0 ? "+" : ""}${offset.suggestedMoveSec}s`
              : "N/A";
              
          const confLabel = isRef
            ? "1.0 (100%)"
            : typeof offset.confidence === "number"
              ? `${offset.confidence} (${Math.round(offset.confidence * 100)}%)`
              : "0.0 (0%)";
              
          const refLabel = plan.referenceAudioTrackIndex !== null ? `A${plan.referenceAudioTrackIndex + 1}` : "None";
          
          const overlapLabel = typeof offset.overlapDurationSec === "number"
            ? `${offset.overlapDurationSec}s`
            : "N/A";
            
          const candidatesLabel = offset.candidatePeaks && offset.candidatePeaks.length > 0
            ? `[${offset.candidatePeaks.length}] ` + offset.candidatePeaks.map(p => `${p.lagSec > 0 ? "+" : ""}${p.lagSec}s (${p.score})`).join(", ")
            : "None [0]";
            
          const reasonLabel = offset.selectionReason || "Ready";
          
          let rowStyle: any = null;
          if (isRef) {
            rowStyle = { opacity: "0.8" };
          } else if (offset.status === "blocked") {
            rowStyle = { color: "#ff6b6b", fontWeight: "bold" };
          }
          
          return el("tr", rowStyle ? { style: rowStyle } : null,
            el("td", null, trackLabel),
            el("td", null, moveLabel),
            el("td", null, confLabel),
            el("td", null, overlapLabel),
            el("td", null, refLabel),
            el("td", null, candidatesLabel),
            el("td", null, reasonLabel),
          );
        })),
      ),
    );
  }

  function renderSynchronizationMessages(plan: SynchronizationPlan | null): HTMLElement {
    const messages: string[] = [];
    if (!plan) {
      messages.push("Run Analyze Sync first. No clips will be moved.");
    } else {
      if (plan.knownLagTest) {
        if (plan.knownLagTest.ok) {
          messages.push(`✔ Known Lag Self-Test: PASSED (all simulated offsets +2s, +5s, -10s successfully recovered)`);
        } else {
          messages.push(`❌ Known Lag Self-Test: FAILED (${plan.knownLagTest.errors.join("; ")})`);
        }
      }
      if (plan.blockers.length) messages.push(`Sync blocked: ${plan.blockers.join(", ")}`);
      if (plan.warnings.length) messages.push(`Warnings: ${plan.warnings.join(", ")}`);
      if (!plan.blockers.length && plan.offsetsReady) {
        messages.push("Waveform offsets were calculated automatically from the timeline audio. No clips were moved yet.");
      }
      if (!plan.blockers.length && !plan.offsetsReady) {
        messages.push("Timeline was read, but waveform offsets are not ready yet.");
      }
      if (state.synchronizationApplyResult?.ok) {
        const res = state.synchronizationApplyResult;
        messages.push(`✔ Sync applied on duplicate sequence: ${res.duplicateSequenceName || res.sequenceName || "Saad Sync Draft"}.`);
        messages.push(`  • Original untouched: ${res.originalSequenceName || plan.sequenceName || "source sequence"}`);
        messages.push(`  • Tracks synchronized: ${countSynchronizedClips(plan)}`);
        messages.push(`  • Clips moved on duplicate: ${res.clipsMoved}`);
        messages.push(`  • Largest offset before: ${res.largestOffsetBefore != null ? res.largestOffsetBefore.toFixed(3) + "s" : "N/A"}`);
        messages.push(`  • Largest offset after: ${res.largestOffsetAfter != null ? res.largestOffsetAfter.toFixed(3) + "s" : "N/A"} (Proof of alignment)`);
        
        console.log(`[Saad Sync Apply Proof] Synchronization completed:`);
        console.log(`  largestOffsetBefore: ${res.largestOffsetBefore}s`);
        console.log(`  largestOffsetAfter: ${res.largestOffsetAfter}s`);
        console.log(`  clipsMoved: ${res.clipsMoved}`);
        console.log(`  Moved items:`, res.movedItems);
      }
      if (state.synchronizationApplyResult && !state.synchronizationApplyResult.ok) {
        messages.push(`Apply Sync blocked: ${state.synchronizationApplyResult.blockers.join(", ")}`);
      }
    }
    return el("div.podcast-human-messages", null,
      ...messages.map((message) => el("div.podcast-human-message", null, message)),
    );
  }

  function formatLargestSyncMove(plan: SynchronizationPlan): string {
    const moves = plan.waveformOffsets
      .filter((offset) => offset.status === "ready" && typeof offset.suggestedMoveSec === "number")
      .map((offset) => Math.abs(offset.suggestedMoveSec ?? 0));
    if (!moves.length) return "0s";
    return formatSeconds(Math.max(...moves));
  }

  function countSynchronizedClips(plan: SynchronizationPlan | null): number {
    if (!plan) return 0;
    return plan.waveformOffsets.filter((offset) =>
      offset.status === "reference" || offset.status === "ready"
    ).length;
  }

  function renderMultiCamProductionTool(): HTMLElement {
    return el("div.podcast-production-card", { id: "podcast-multicam-tool" },
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "Multi-Cam Auto Switch"),
          el("p", null, "Analyze the active Premiere timeline, preview the camera plan, then create a visual-only draft."),
        ),
      ),
      renderProductionSetup(),
      renderProductionActions(),
    );
  }

  function renderProductionSetup(): HTMLElement {
    return el("div.podcast-production-block", null,
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "Camera Mapping"),
          el("p", null, "Match each speaker microphone to the camera track that should appear on screen."),
        ),
      ),
      el("div.podcast-camera-map", null,
        ...getCameraMappingSpeakerIds().map((speakerId) => renderMappingRow(speakerId)),
      ),
      el("div.podcast-settings.podcast-settings--compact", null,
        renderField("Camera Names",
          renderCameraNameFields(), true),
        renderField("Wide Camera Settings",
          el("div.podcast-camera-map", null, renderMappingRow("wide")), true),
        renderField("Minimum Shot Length (s)",
          el("input.podcast-input", {
            type: "number",
            min: "0.5",
            step: "0.5",
            value: String(state.minimumShotLengthSec),
            onInput: (event: Event) => {
              state.minimumShotLengthSec = Number((event.currentTarget as HTMLInputElement).value) || 2;
              state.cameraDecisionPlanProof = null;
              state.applyCameraDecisionsResult = null;
              render();
            },
          })),
        renderField("Max Camera Run (s)",
          el("input.podcast-input", {
            type: "number",
            min: "5",
            step: "1",
            value: String(state.maxSingleCameraRunSec),
            onInput: (event: Event) => {
              state.maxSingleCameraRunSec = Number((event.currentTarget as HTMLInputElement).value) || 20;
              state.cameraDecisionPlanProof = null;
              state.applyCameraDecisionsResult = null;
              render();
            },
          })),
        renderField("Wide Cutaway Duration (s)",
          el("input.podcast-input", {
            type: "number",
            min: "1",
            step: "0.5",
            value: String(state.wideCutawayDurationSec),
            onInput: (event: Event) => {
              state.wideCutawayDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 4;
              state.cameraDecisionPlanProof = null;
              state.applyCameraDecisionsResult = null;
              render();
            },
          })),
        renderField("Transitional Wide",
          el("label.podcast-toggle", null,
            el("input", {
              type: "checkbox",
              checked: state.enableTransitionalWide,
              onChange: (event: Event) => {
                state.enableTransitionalWide = (event.currentTarget as HTMLInputElement).checked;
                state.cameraDecisionPlanProof = null;
                state.applyCameraDecisionsResult = null;
                render();
              },
            }),
            el("span", null, "Enable transitional wide shots"),
          )),
        state.enableTransitionalWide ? renderField("Transitional Duration (s)",
          el("input.podcast-input", {
            type: "number",
            min: "0.5",
            step: "0.5",
            value: String(state.transitionalWideDurationSec),
            onInput: (event: Event) => {
              state.transitionalWideDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 2.0;
              state.cameraDecisionPlanProof = null;
              state.applyCameraDecisionsResult = null;
              render();
            },
          })) : null,
      ),
    );
  }

  function renderProductionActions(): HTMLElement {
    const currentPlan = getCurrentCameraDecisionPlan();
    const hasPlan = (currentPlan?.cameraDecisions.length ?? 0) > 0
      && (currentPlan?.blockers.length ?? 0) === 0;
    const busy = isProductionBusy();
    const draftSelected = isAutoSwitchDraftName(state.timelineLayout?.sequenceName);
    return el("div.podcast-production-block.podcast-production-block--actions", null,
      el("div.podcast-action-row", null,
        el("button.btn-secondary", { disabled: busy || draftSelected, onClick: analyzeLayout },
          state.timelineLoading ? "Analyzing..." : "Analyze Timeline"),
        el("button.btn-secondary", { disabled: busy || draftSelected, onClick: previewAutoSwitch },
          state.previewAutoSwitchLoading ? "Previewing..." : "Preview Auto Switch"),
        el("button.btn-primary", {
          disabled: !hasPlan
            || busy
            || state.applyCameraDecisionsResult !== null
            || draftSelected,
          onClick: runApplyCameraDecisionsPrototype,
        }, state.applyCameraDecisionsLoading ? "Applying..." : "Apply Auto Switch"),
      ),
      state.timelineLoading || state.previewAutoSwitchLoading || state.applyCameraDecisionsLoading
        ? renderProcessingLoader(
          state.applyCameraDecisionsLoading
            ? "Creating Auto Switch draft"
            : state.previewAutoSwitchLoading
              ? "Building camera preview"
              : "Analyzing timeline",
        )
        : null,
      el("div.podcast-status-strip", null,
        renderStatusPill("Timeline", state.timelineLayout ? readableTimelineStatus() : "Not analyzed"),
        renderStatusPill("Preview", readablePreviewStatus()),
        renderStatusPill("Output", state.applyCameraDecisionsResult?.ok ? "Draft created" : "Waiting"),
      ),
    );
  }

// Auto Zoom render functions removed

  function isProductionBusy(): boolean {
    return state.timelineLoading
      || state.previewAutoSwitchLoading
      || state.applyCameraDecisionsLoading
      || state.synchronizationLoading
      || state.synchronizationApplyLoading
      || state.captionRuntimeLoading
      || state.autoCaptionsLoading
      || state.oneClickLoading;
  }

  function renderProductionSummary(): HTMLElement {
    const plan = getCurrentCameraDecisionPlan();
    const apply = getCurrentApplyCameraDecisionsResult();
    return el("div.podcast-production-card", null,
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "Auto Switch Summary"),
          el("p", null, "A clean overview for the edit draft. Detailed logs are in Developer Diagnostics."),
        ),
      ),
      el("div.podcast-summary-grid", null,
        renderSummaryTile("Sequence", state.diagnostics.sequenceName || "No active sequence"),
        renderSummaryTile("Tracks", state.timelineLayout?.status === "ready"
          ? `${getActiveVideoTracks().length} video / ${getActiveAudioTracks().length} audio`
          : `${state.diagnostics.videoTrackCount || 0} video / ${state.diagnostics.audioTrackCount || 0} audio`),
        renderSummaryTile("Decisions", plan ? `${plan.summary.totalDecisions} camera cuts` : "Not previewed"),
        renderSummaryTile("Wide Camera", plan ? `${formatSeconds(plan.summary.wideCameraTimeSec)}` : formatMappedCameraLabel("wide")),
        renderSummaryTile("Inserted", apply ? `${apply.segmentsInserted} visual segments` : "Not applied"),
        renderSummaryTile("Draft", apply?.ok ? "Created on duplicate sequence" : "Original untouched"),
      ),
      renderHumanMessages(),
    );
  }

  function renderHumanMessages(): HTMLElement {
    const messages: string[] = [];
    const plan = getCurrentCameraDecisionPlan();
    const apply = getCurrentApplyCameraDecisionsResult();
    if (isAutoSwitchDraftName(state.timelineLayout?.sequenceName)) {
      messages.push("An Auto Switch Draft is selected. Open the source sequence (for example, Synced Sequence) before Analyze Timeline.");
    } else if (plan?.blockers.length) {
      messages.push(`Preview blocked: ${plan.blockers.join(", ")}`);
    }
    if (apply?.blockers.length) messages.push(`Apply blocked: ${apply.blockers.join(", ")}`);
    if (apply?.warnings.length) messages.push(`Warnings: ${apply.warnings.length} partial source ranges were handled.`);
    if (apply?.ok) messages.push("A visual-only draft was created on a duplicate sequence. The original sequence was not changed.");
    if (!messages.length) messages.push("Analyze the timeline, preview the camera plan, then apply a draft when ready.");
    return el("div.podcast-human-messages", null,
      ...messages.map((message) => el("div.podcast-human-message", null, message)),
    );
  }

  function renderDeveloperDiagnostics(): HTMLElement {
    return el("div.podcast-diagnostics-shell", null,
      el("button.podcast-diagnostics-toggle", {
        onClick: () => {
          state.developerDiagnosticsOpen = !state.developerDiagnosticsOpen;
          render();
        },
      },
        el("span", null, "Developer Diagnostics"),
        el("strong", null, state.developerDiagnosticsOpen ? "Hide" : "Show"),
      ),
      state.developerDiagnosticsOpen
        ? el("div.podcast-diagnostics-body", null,
            renderDebugPanel(),
            renderExistingRuntimeJsonPanel(),
            ...renderRuntimeProofPanelsIfEnabled(),
          )
        : null,
    );
  }

  function renderExistingRuntimeJsonPanel(): HTMLElement {
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Runtime Proof JSON"),
          el("p", null, "Read-only current runtime objects. No analysis is run here."),
        ),
      ),
      renderReadOnlyJsonBlock("sourceAttributionProof JSON", state.sourceAttributionProof),
      renderReadOnlyJsonBlock("cameraDecisionPlanProof JSON", state.cameraDecisionPlanProof),
    );
  }

  function renderReadOnlyJsonBlock(label: string, value: unknown): HTMLElement {
    const json = value ? JSON.stringify(value, null, 2) : "null";
    return el("div.podcast-proof", null,
      el("div.podcast-messages__title", null, label),
      el("button.btn-secondary", {
        type: "button",
        onClick: () => void navigator.clipboard?.writeText(json),
      }, "Copy JSON"),
      el("textarea.podcast-pre.podcast-pre--json", {
        readonly: "true",
        rows: "12",
        spellcheck: "false",
      }, json),
    );
  }

  function renderRuntimeProofPanelsIfEnabled(): HTMLElement[] {
    if (!shouldRenderRuntimeProofPanels()) return [];
    return [
      renderControls(),
      renderTimelineLayoutPanel(),
      renderAudioSourceInspectorPanel(),
      renderFullAudioActivityProofPanel(),
      renderSpeakerSourceAttributionProofPanel(),
      renderCameraDecisionPlanProofPanel(),
      renderApplyCameraDecisionsPrototypePanel(),
      renderSafeTimelineExecutionResearchPanel(),
      renderSpeakerActivityProofPanel(),
      renderSafeExecutionPanel(),
      renderPlanPreview(),
    ];
  }

  function shouldRenderRuntimeProofPanels(): boolean {
    return false;
  }

  function renderSafeExecutionPanel(): HTMLElement {
    const plan = buildPlan();
    const canDuplicate = state.diagnostics.activeSequence
      && plan.decisions.length > 0
      && state.safeCopyConfirmed
      && !state.duplicateLoading;
    const draftName = draftSequenceName(state.diagnostics.sequenceName);
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Safe Execution Prototype"),
          el("p", null, "Creates a duplicate sequence only. No cuts are applied."),
        ),
        el("button.btn-primary", { disabled: !canDuplicate, onClick: createDraftCopy },
          state.duplicateLoading ? "Creating..." : "Create Safe Edit Copy"),
      ),
      el("label.podcast-toggle.podcast-safe-confirm", null,
        el("input", {
          type: "checkbox",
          checked: state.safeCopyConfirmed,
          onChange: (event: Event) => {
            state.safeCopyConfirmed = (event.currentTarget as HTMLInputElement).checked;
            render();
          },
        }),
        el("span", null, "I confirm safe copy mode: duplicate the sequence only, do not edit the original."),
      ),
      el("div.podcast-debug__grid", null,
        row("Original Sequence Name", state.diagnostics.sequenceName || "Not detected"),
        row("New Sequence Name", draftName),
        row("Duplicate Result", duplicateResultText(state.duplicateResult)),
        row("Execution Strategy", state.duplicateResult?.ok ? "duplicate-sequence-cuts" : "not-started"),
        row("Timeline Mutation", state.duplicateResult ? "duplicate only" : "none"),
        row("Blockers", safeCopyBlockers(state.diagnostics.activeSequence, plan.decisions.length, state.safeCopyConfirmed).join(" | ") || "None"),
      ),
      renderDuplicateProof(),
    );
  }

  function renderDuplicateProof(): HTMLElement | null {
    const proof = state.duplicateResult?.duplicateProof;
    if (!proof) return null;
    return el("div.podcast-proof", null,
      el("div.podcast-messages__title", null, "Duplicate Runtime Proof"),
      el("div.podcast-debug__grid", null,
        row("originalSequenceName", proof.originalSequenceName ?? "null"),
        row("originalSequenceID", proof.originalSequenceID ?? "null"),
        row("sequencesCountBefore", String(proof.sequencesCountBefore ?? 0)),
        row("sequencesCountAfter", String(proof.sequencesCountAfter ?? 0)),
        row("cloneResult", String(proof.cloneResult === true)),
        row("newSequenceDetected", String(proof.newSequenceDetected === true)),
        row("detectedNewSequenceID", proof.detectedNewSequenceID ?? "null"),
        row("detectedNewSequenceNameBeforeRename", proof.detectedNewSequenceNameBeforeRename ?? "null"),
        row("renameAttempted", String(proof.renameAttempted === true)),
        row("renameResult", String(proof.renameResult === true)),
        row("finalNewSequenceName", proof.finalNewSequenceName ?? "null"),
        row("activeSequenceAfterCloneName", proof.activeSequenceAfterCloneName ?? "null"),
        row("activeSequenceAfterCloneID", proof.activeSequenceAfterCloneID ?? "null"),
        row("errors", proof.errors?.join(" | ") || "None"),
        row("blockers", proof.blockers?.join(" | ") || "None"),
        row("sequenceIDsBefore", compactList(proof.sequenceIDsBefore)),
        row("sequenceIDsAfter", compactList(proof.sequenceIDsAfter)),
        row("sequenceNamesBefore", compactList(proof.sequenceNamesBefore)),
        row("sequenceNamesAfter", compactList(proof.sequenceNamesAfter)),
      ),
    );
  }

  function renderTimelineLayoutPanel(): HTMLElement {
    const layout = state.timelineLayout;
    const videoTracks = layout?.videoTracks ?? [];
    const audioTracks = layout?.audioTracks ?? [];
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Timeline Layout Panel"),
          el("p", null, "Read-only camera and microphone track layout from Premiere."),
        ),
        el("button.btn-secondary", { disabled: state.timelineLoading, onClick: analyzeLayout },
          state.timelineLoading ? "Analyzing..." : "Analyze Timeline Layout"),
      ),
      layout
        ? el("div.podcast-layout", null,
            renderTrackGroup("Video Tracks", videoTracks),
            renderTrackGroup("Audio Tracks", audioTracks),
            renderTimelineMapping(videoTracks, audioTracks),
          )
        : el("div.podcast-empty-plan", null, "Timeline layout has not been analyzed yet."),
    );
  }

  function renderAudioSourceInspectorPanel(): HTMLElement {
    const proof = state.audioProof;
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Audio Source Inspector + FFmpeg Proof"),
          el("p", null, "Read audio source paths, verify FFmpeg 6.0+, and preview RMS. No timeline edits."),
        ),
        el("div.podcast-actions", null,
          el("button.btn-secondary", { disabled: state.ffmpegDiagnosticsLoading, onClick: diagnoseFfmpeg },
            state.ffmpegDiagnosticsLoading ? "Diagnosing..." : "Diagnose FFmpeg Detection"),
          el("button.btn-secondary", { disabled: state.streamProofLoading, onClick: inspectAudioStreams },
            state.streamProofLoading ? "Reading Streams..." : "Inspect Audio Streams"),
          el("button.btn-secondary", { disabled: state.rmsProofLoading, onClick: runRmsProof },
            state.rmsProofLoading ? "Running RMS..." : "Run FFmpeg RMS Runtime Proof"),
          el("button.btn-secondary", { disabled: state.audioProofLoading, onClick: inspectAudioProof },
            state.audioProofLoading ? "Inspecting..." : "Inspect Audio Sources + FFmpeg Proof"),
        ),
      ),
      el("div.podcast-audio-map", null,
        ...getAudioMappingSpeakerIds().map((speakerId) => renderAudioMappingRow(speakerId)),
      ),
      proof
        ? el("div.podcast-proof", null,
            el("div.podcast-debug__grid", null,
              row("FFmpeg Availability", proof.ffmpeg.available ? "available" : "unavailable"),
              row("FFmpeg Path", proof.ffmpeg.path || "not detected"),
              row("FFmpeg Version", proof.ffmpeg.version || "unknown"),
              row("FFmpeg Version Supported", proof.ffmpeg.versionSupported ? "Yes" : `No, requires ${proof.ffmpeg.minimumVersion}+`),
              row("Audio Stream Count", String(proof.ffmpeg.audioStreamCount ?? 0)),
              row("Audio Source Paths", sourcePathSummary(proof.inspection.sources)),
              row("RMS Preview Count", String(proof.rmsPreview.length)),
              row("Timeline Mutation", proof.timelineMutation),
            ),
            renderAudioSourcesTable(proof.inspection.sources),
            renderAudioStreams(proof),
            renderRmsPreview(proof),
            el("div.podcast-messages", null,
              el("div.podcast-messages__title", null, "Blockers"),
              proof.blockers.length
                ? proof.blockers.map((blocker) => el("div.podcast-message", null, blocker))
                : el("div.podcast-message", null, "None"),
            ),
            el("div.podcast-messages", null,
              el("div.podcast-messages__title", null, "Messages"),
              proof.messages.length
                ? proof.messages.map((message) => el("div.podcast-message", null, message))
                : el("div.podcast-message", null, "No messages."),
            ),
          )
        : el("div.podcast-empty-plan", null, "Audio Source Inspector has not been run yet."),
      renderFfmpegDiagnosticsPanel(),
      renderAudioStreamSelectionPanel(),
      renderRmsProofPanel(),
    );
  }

  function renderAudioStreamSelectionPanel(): HTMLElement | null {
    const proof = state.streamProof;
    if (!proof) return null;
    const streams = proof.ffprobeAudioStreams;
    return el("div.podcast-proof", null,
      el("div.podcast-messages__title", null, "Audio Stream Selection Proof"),
      el("div.podcast-debug__grid", null,
        row("Analyzed Source Path", proof.analyzedSourcePath || "none"),
        row("FFprobe Path", proof.ffprobePath || "not detected"),
        row("Audio Streams", String(streams.length)),
        row("Selected Audio Stream", state.selectedAudioStreamIndex == null ? "not selected" : `0:a:${state.selectedAudioStreamIndex}`),
      ),
      streams.length
        ? renderAudioStreamSelect(streams)
        : el("div.podcast-empty-plan", null, "No audio streams available."),
      renderFfprobeStreamsTable(proof),
      el("div.podcast-messages", null,
        el("div.podcast-messages__title", null, "Blockers"),
        proof.blockers.length
          ? proof.blockers.map((blocker) => el("div.podcast-message", null, blocker))
          : el("div.podcast-message", null, "None"),
      ),
      el("div.podcast-messages", null,
        el("div.podcast-messages__title", null, "Warnings"),
        proof.warnings.length
          ? proof.warnings.map((warning) => el("div.podcast-message", null, warning))
          : el("div.podcast-message", null, "None"),
      ),
    );
  }

  function renderAudioStreamSelect(streams: AudioStreamSelectionProof["ffprobeAudioStreams"]): HTMLElement {
    return el("label.podcast-field.podcast-field--wide.podcast-stream-select", null,
      el("span", null, "Select Audio Stream"),
      el("select.podcast-select", {
        value: state.selectedAudioStreamIndex == null ? "" : String(state.selectedAudioStreamIndex),
        onChange: (event: Event) => {
          const value = (event.currentTarget as HTMLSelectElement).value;
          state.selectedAudioStreamIndex = value === "" ? null : Number(value);
          render();
        },
      },
        el("option", { value: "" }, streams.length > 1 ? "Select manually" : "Auto selected"),
        ...streams.map((stream) => el("option", { value: String(stream.audioStreamIndex) },
          `0:a:${stream.audioStreamIndex} | stream ${stream.streamIndex} | ${stream.codecName || "unknown"} | ${stream.sampleRate || "?"} Hz | ${stream.channels || "?"} ch`)),
      ),
    );
  }

  function renderFfprobeStreamsTable(proof: AudioStreamSelectionProof): HTMLElement {
    if (!proof.ffprobeAudioStreams.length) return el("div.podcast-empty-plan", null, "No ffprobe stream rows.");
    return el("div.podcast-table-wrap", null,
      el("table.podcast-plan-table", null,
        el("thead", null,
          el("tr", null,
            el("th", null, "Audio Index"),
            el("th", null, "Stream Index"),
            el("th", null, "Codec"),
            el("th", null, "Sample Rate"),
            el("th", null, "Channels"),
            el("th", null, "Layout"),
            el("th", null, "Duration"),
            el("th", null, "Language"),
            el("th", null, "Title"),
          ),
        ),
        el("tbody", null, ...proof.ffprobeAudioStreams.map((stream) =>
          el("tr", null,
            el("td", null, `0:a:${stream.audioStreamIndex}`),
            el("td", null, String(stream.streamIndex)),
            el("td", null, stream.codecName || "unknown"),
            el("td", null, stream.sampleRate == null ? "unknown" : String(stream.sampleRate)),
            el("td", null, stream.channels == null ? "unknown" : String(stream.channels)),
            el("td", null, stream.channelLayout || "unknown"),
            el("td", null, stream.duration || "unknown"),
            el("td", null, stream.language || "none"),
            el("td", null, stream.title || "none"),
          ))),
      ),
    );
  }

  function renderRmsProofPanel(): HTMLElement | null {
    if (!state.rmsProof) return null;
    return el("div.podcast-proof", null,
      el("div.podcast-messages__title", null, "FFmpeg RMS Runtime Proof JSON"),
      el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.rmsProof, null, 2)),
    );
  }

  function renderSpeakerActivityProofPanel(): HTMLElement {
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Speaker Activity Engine Proof"),
          el("p", null, "Converts RMS windows into speaking segments. No diarization, no camera decisions."),
        ),
        el("button.btn-secondary", { onClick: runSpeakerActivityProof },
          "Generate Speaker Activity JSON"),
      ),
      el("div.podcast-settings.podcast-settings--inner", null,
        renderField("RMS Threshold",
          el("input.podcast-input", {
            type: "number",
            step: "1",
            value: String(state.rmsSpeechThresholdDb),
            onInput: (event: Event) => {
              state.rmsSpeechThresholdDb = Number((event.currentTarget as HTMLInputElement).value);
              render();
            },
          })),
        renderField("Minimum Speech Duration",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.1",
            value: String(state.minimumSpeechDurationSec),
            onInput: (event: Event) => {
              state.minimumSpeechDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
      ),
      state.speakerActivityProof
        ? el("div.podcast-proof", null,
            el("div.podcast-messages__title", null, "Speaker Activity Runtime Proof JSON"),
            el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.speakerActivityProof, null, 2)),
          )
        : el("div.podcast-empty-plan", null, "Run RMS proof first, then generate speaker activity JSON."),
    );
  }

  function renderFullAudioActivityProofPanel(): HTMLElement {
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Full Audio Activity Proof"),
          el("p", null, "Runs 30 seconds of RMS windows and builds speaking segments from the full window set."),
        ),
        el("button.btn-secondary", { disabled: state.fullActivityProofLoading, onClick: runFullActivityProof },
          state.fullActivityProofLoading ? "Running 30s..." : "Run Full Audio Activity Proof"),
      ),
      state.fullActivityProof
        ? el("div.podcast-proof", null,
            el("div.podcast-messages__title", null, "Full Audio Activity Proof JSON"),
            el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.fullActivityProof, null, 2)),
          )
        : el("div.podcast-empty-plan", null, "Select an audio stream, then run the 30 second proof."),
    );
  }

  function renderSpeakerSourceAttributionProofPanel(): HTMLElement {
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Speaker Source Attribution Proof"),
          el("p", null, "Analyzes A1, A2, A3 independently and identifies active/dominant audio tracks."),
        ),
        el("button.btn-secondary", { disabled: state.sourceAttributionProofLoading, onClick: runSourceAttributionProof },
          state.sourceAttributionProofLoading ? "Analyzing Tracks..." : "Run Speaker Source Attribution Proof"),
      ),
      state.sourceAttributionProof
        ? el("div.podcast-proof", null,
            el("div.podcast-messages__title", null, "Speaker Source Attribution Proof JSON"),
            el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.sourceAttributionProof, null, 2)),
          )
        : el("div.podcast-empty-plan", null, "Select an audio stream, then run per-track attribution proof."),
    );
  }

  function renderCameraDecisionPlanProofPanel(): HTMLElement {
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Camera Decision Plan Proof"),
          el("p", null, "Builds a plan from dominantTrackAtTime only. No timeline operations."),
        ),
        el("button.btn-secondary", { onClick: runCameraPlanProof },
          "Generate Camera Decision Plan JSON"),
      ),
      state.cameraDecisionPlanProof
        ? el("div.podcast-proof", null,
            el("div.podcast-messages__title", null, "Camera Decision Plan Proof JSON"),
            el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.cameraDecisionPlanProof, null, 2)),
          )
        : el("div.podcast-empty-plan", null, "Run Speaker Source Attribution Proof first, then generate the camera plan."),
    );
  }

  function renderApplyCameraDecisionsPrototypePanel(): HTMLElement {
    const decisionCount = state.cameraDecisionPlanProof?.cameraDecisions.length ?? 0;
    const blockers = state.cameraDecisionPlanProof?.blockers ?? [];
    const canApply = decisionCount > 0 && blockers.length === 0 && !state.applyCameraDecisionsLoading;
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Apply Camera Decisions Prototype"),
          el("p", null, "Visual-only reconstruction on a duplicated sequence. Original sequence is not touched."),
        ),
        el("button.btn-primary", {
          disabled: !canApply,
          onClick: runApplyCameraDecisionsPrototype,
        }, state.applyCameraDecisionsLoading ? "Applying..." : "Apply Camera Decisions Prototype"),
      ),
      state.applyCameraDecisionsResult
        ? el("div.podcast-proof", null,
            el("div.podcast-messages__title", null, "Apply Camera Decisions Runtime JSON"),
            el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.applyCameraDecisionsResult, null, 2)),
          )
        : el("div.podcast-empty-plan", null,
            decisionCount > 0
              ? "Ready. This duplicates the sequence first and writes visual segments only to the duplicate."
              : "Generate Camera Decision Plan JSON first.",
          ),
    );
  }

  function renderSafeTimelineExecutionResearchPanel(): HTMLElement {
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Safe Timeline Execution Research"),
          el("p", null, "Runtime API proofs on duplicated sequences only. No camera decisions are applied."),
        ),
        el("div.podcast-actions", null,
          el("button.btn-secondary", {
            disabled: state.executionResearchLoading != null,
            onClick: () => runExecutionResearch("duplicate"),
          }, state.executionResearchLoading === "duplicate" ? "Testing..." : "Test Safe Duplicate Sequence"),
          el("button.btn-secondary", {
            disabled: state.executionResearchLoading != null,
            onClick: () => runExecutionResearch("disable"),
          }, state.executionResearchLoading === "disable" ? "Testing..." : "Test Disable/Enable Clip on Duplicate"),
          el("button.btn-secondary", {
            disabled: state.executionResearchLoading != null,
            onClick: () => runExecutionResearch("range"),
          }, state.executionResearchLoading === "range" ? "Testing..." : "Test Time-Range Disable on Duplicate"),
          el("button.btn-secondary", {
            disabled: state.executionResearchLoading != null,
            onClick: () => runExecutionResearch("insert"),
          }, state.executionResearchLoading === "insert" ? "Testing..." : "Test Insert/Overwrite on Duplicate"),
          el("button.btn-secondary", {
            disabled: state.executionResearchLoading != null,
            onClick: () => runExecutionResearch("reconstruct"),
          }, state.executionResearchLoading === "reconstruct" ? "Testing..." : "Test Reconstruct Two Segments"),
        ),
      ),
      state.executionResearchResult
        ? el("div.podcast-proof", null,
            el("div.podcast-messages__title", null, "Execution Research Runtime JSON"),
            el("pre.podcast-pre.podcast-pre--json", null, JSON.stringify(state.executionResearchResult, null, 2)),
          )
        : el("div.podcast-empty-plan", null, "Run one proof at a time. Each test duplicates the sequence first."),
    );
  }

  function renderFfmpegDiagnosticsPanel(): HTMLElement | null {
    const diagnostics = state.ffmpegDiagnostics;
    if (!diagnostics) return null;
    return el("div.podcast-proof", null,
      el("div.podcast-messages__title", null, "FFmpeg Detection Diagnostics"),
      el("div.podcast-debug__grid", null,
        row("CEP Node Available", diagnostics.cepNodeAvailable ? "Yes" : "No"),
        row("Extension Path", diagnostics.extensionPath || "not visible"),
        row("Selected Path", diagnostics.selectedPath || "none"),
        row("PATH Visible", diagnostics.pathEnvironmentVisible ? "Yes" : "No"),
        row("PATH Length", String(diagnostics.pathEnvironmentLength)),
        row("where ffmpeg output", diagnostics.whereFfmpegOutput || "none"),
        row("where ffmpeg error", diagnostics.whereFfmpegError || "none"),
        row("Spawn OK", diagnostics.spawnResult?.ok ? "Yes" : "No"),
        row("Spawn Error", diagnostics.spawnResult?.exitError || "none"),
        row("Version", diagnostics.version || "unknown"),
        row("Version Supported", diagnostics.versionSupported ? "Yes" : `No, requires ${diagnostics.minimumVersion}+`),
      ),
      renderFfmpegSearchTable(diagnostics),
      renderPathPreview(diagnostics),
      el("div.podcast-messages", null,
        el("div.podcast-messages__title", null, "Version Output"),
        el("pre.podcast-pre", null, compactText(diagnostics.spawnResult?.versionOutput || "No version output.")),
      ),
      el("div.podcast-messages", null,
        el("div.podcast-messages__title", null, "Blockers"),
        diagnostics.blockers.length
          ? diagnostics.blockers.map((blocker) => el("div.podcast-message", null, blocker))
          : el("div.podcast-message", null, "None"),
      ),
    );
  }

  function renderFfmpegSearchTable(diagnostics: FfmpegDetectionDiagnostics): HTMLElement {
    return el("div.podcast-table-wrap", null,
      el("table.podcast-plan-table", null,
        el("thead", null,
          el("tr", null,
            el("th", null, "Label"),
            el("th", null, "Source"),
            el("th", null, "Path"),
            el("th", null, "Exists"),
          ),
        ),
        el("tbody", null, ...diagnostics.searchedPaths.map((check) =>
          el("tr", null,
            el("td", null, check.label),
            el("td", null, check.source),
            el("td", null, check.path),
            el("td", null, check.exists ? "Yes" : "No"),
          ))),
      ),
    );
  }

  function renderPathPreview(diagnostics: FfmpegDetectionDiagnostics): HTMLElement {
    return el("div.podcast-messages", null,
      el("div.podcast-messages__title", null, "PATH Environment Preview"),
      diagnostics.pathEnvironmentPreview.length
        ? diagnostics.pathEnvironmentPreview.map((entry) => el("div.podcast-message", null, entry))
        : el("div.podcast-message", null, "PATH is not visible to CEP Node."),
    );
  }

  function renderAudioMappingRow(speakerId: string): HTMLElement {
    return el("label.podcast-map-row", null,
      el("strong", null, speakerId),
      renderAudioTrackSelect(speakerId),
    );
  }

  function renderAudioTrackSelect(speakerId: string): HTMLElement {
    const count = Math.max(1, state.diagnostics.audioTrackCount || 3);
    return el("select.podcast-select", {
      value: String(state.audioMappings[speakerId] ?? 0),
      onChange: (event: Event) => {
        state.audioMappings[speakerId] = Number((event.currentTarget as HTMLSelectElement).value);
        render();
      },
    }, ...Array.from({ length: count }, (_, index) =>
      el("option", { value: String(index) }, `A${index + 1}`)));
  }

  function renderAudioSourcesTable(sources: AudioSourceInfo[]): HTMLElement {
    if (!sources.length) return el("div.podcast-empty-plan", null, "No audio sources returned.");
    return el("div.podcast-table-wrap", null,
      el("table.podcast-plan-table", null,
        el("thead", null,
          el("tr", null,
            el("th", null, "Speaker"),
            el("th", null, "Track"),
            el("th", null, "Clip"),
            el("th", null, "Project Item"),
            el("th", null, "Source Path"),
            el("th", null, "Timeline"),
            el("th", null, "Source In/Out"),
            el("th", null, "Kind"),
            el("th", null, "Reason"),
          ),
        ),
        el("tbody", null, ...sources.map((source) =>
          el("tr", null,
            el("td", null, source.speakerId || "unknown"),
            el("td", null, `A${source.audioTrackIndex + 1}`),
            el("td", null, source.clipName || `clip ${source.trackItemIndex ?? 0}`),
            el("td", null, source.projectItemName || "null"),
            el("td", null, source.sourcePath || "unavailable"),
            el("td", null, `${formatOptionalSeconds(source.timelineStartSec)}-${formatOptionalSeconds(source.timelineEndSec)}`),
            el("td", null, `${formatOptionalSeconds(source.sourceInPointSec)}-${formatOptionalSeconds(source.sourceOutPointSec)}`),
            el("td", null, source.sourceKind),
            el("td", null, source.reason || "OK"),
          ))),
      ),
    );
  }

  function renderAudioStreams(proof: AudioSourceProofResult): HTMLElement {
    const streams = proof.ffmpeg.audioStreams ?? [];
    if (!streams.length) return el("div.podcast-empty-plan", null, "No audio stream metadata available.");
    return el("div.podcast-table-wrap", null,
      el("table.podcast-plan-table", null,
        el("thead", null,
          el("tr", null,
            el("th", null, "Stream"),
            el("th", null, "Codec"),
            el("th", null, "Sample Rate"),
            el("th", null, "Channels"),
            el("th", null, "Raw"),
          ),
        ),
        el("tbody", null, ...streams.map((stream) =>
          el("tr", null,
            el("td", null, String(stream.index)),
            el("td", null, stream.codec || "unknown"),
            el("td", null, stream.sampleRate == null ? "unknown" : String(stream.sampleRate)),
            el("td", null, stream.channels == null ? "unknown" : String(stream.channels)),
            el("td", null, stream.raw),
          ))),
      ),
    );
  }

  function renderRmsPreview(proof: AudioSourceProofResult): HTMLElement {
    if (!proof.rmsPreview.length) return el("div.podcast-empty-plan", null, "No RMS preview generated.");
    return el("div.podcast-table-wrap", null,
      el("table.podcast-plan-table", null,
        el("thead", null,
          el("tr", null,
            el("th", null, "Source Time"),
            el("th", null, "Timeline Start"),
            el("th", null, "Timeline End"),
            el("th", null, "RMS dB"),
          ),
        ),
        el("tbody", null, ...proof.rmsPreview.map((point) =>
          el("tr", null,
            el("td", null, formatSeconds(point.sourceTimeSec)),
            el("td", null, formatSeconds(point.timelineStartSec)),
            el("td", null, formatSeconds(point.timelineEndSec)),
            el("td", null, Number.isFinite(point.rmsDb) ? String(Math.round(point.rmsDb * 100) / 100) : "-inf"),
          ))),
      ),
    );
  }

  function renderTrackGroup(title: string, tracks: PodcastTrackInfo[]): HTMLElement {
    return el("div.podcast-track-group", null,
      el("h4", null, title),
      tracks.length
        ? tracks.map((track) => el("div.podcast-track-row", null,
            el("strong", null, `${track.kind === "video" ? "V" : "A"}${track.index + 1}`),
            el("span", null, track.name || `${track.kind === "video" ? "Video" : "Audio"} ${track.index + 1}`),
            el("small", null,
              `${track.clipCount ?? 0} clips`
              + (track.firstClipStartSec == null ? "" : ` | first ${formatSeconds(track.firstClipStartSec)}-${formatSeconds(track.firstClipEndSec ?? track.firstClipStartSec)}`)),
          ))
        : el("div.podcast-track-row", null, el("span", null, "No tracks found.")),
    );
  }

  function renderTimelineMapping(videoTracks: PodcastTrackInfo[], audioTracks: PodcastTrackInfo[]): HTMLElement {
    const rows = getCameraMappingSpeakerIds().map((speakerId) => {
      const audioIndex = state.audioMappings[speakerId] ?? speakerIndexFromId(speakerId);
      const audio = audioTracks[audioIndex];
      const videoIndex = getExplicitVideoTrackIndexForSpeaker(speakerId, Math.max(1, videoTracks.length));
      const video = videoIndex == null ? null : videoTracks[videoIndex];
      return `${audio ? `A${audio.index + 1}` : `A${audioIndex + 1}`} ${speakerId} -> ${video ? getVideoTrackOptionLabel(video.index) : "Unmapped"}`;
    });
    rows.push(`Wide -> ${formatMappedCameraLabel("wide")}`);
    return el("div.podcast-track-group.podcast-track-group--wide", null,
      el("h4", null, "Mapping"),
      ...rows.map((line) => el("div.podcast-track-row", null, el("span", null, line))),
    );
  }

  function renderControls(): HTMLElement {
    const plan = buildPlan();
    return el("div.podcast-settings", null,
      renderField("Speaker Detection Source",
        el("button.form-select", { disabled: true }, "Manual Speaker Segments JSON")),
      renderField("Camera Mapping Section",
        el("div.podcast-camera-map", null,
          ...getCameraMappingSpeakerIds().map((speakerId) => renderMappingRow(speakerId)),
          renderMappingRow("wide"),
        ), true),
      renderField("Minimum Shot Length (s)",
        el("input.podcast-input", {
          type: "number",
          min: "0.5",
          step: "0.5",
          value: String(state.minimumShotLengthSec),
          onInput: (event: Event) => {
            state.minimumShotLengthSec = Number((event.currentTarget as HTMLInputElement).value) || 2;
            state.cameraDecisionPlanProof = null;
            state.applyCameraDecisionsResult = null;
            render();
          },
        })),
      renderField("Max Camera Run (s)",
        el("input.podcast-input", {
          type: "number",
          min: "5",
          step: "1",
          value: String(state.maxSingleCameraRunSec),
          onInput: (event: Event) => {
            state.maxSingleCameraRunSec = Number((event.currentTarget as HTMLInputElement).value) || 20;
            state.cameraDecisionPlanProof = null;
            state.applyCameraDecisionsResult = null;
            render();
          },
        })),
      renderField("Wide Cutaway Duration (s)",
        el("input.podcast-input", {
          type: "number",
          min: "1",
          step: "0.5",
          value: String(state.wideCutawayDurationSec),
          onInput: (event: Event) => {
            state.wideCutawayDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 4;
            state.cameraDecisionPlanProof = null;
            state.applyCameraDecisionsResult = null;
            render();
          },
        })),
      renderField("Transitional Wide",
        el("label.podcast-toggle", null,
          el("input", {
            type: "checkbox",
            checked: state.enableTransitionalWide,
            onChange: (event: Event) => {
              state.enableTransitionalWide = (event.currentTarget as HTMLInputElement).checked;
              state.cameraDecisionPlanProof = null;
              state.applyCameraDecisionsResult = null;
              render();
            },
          }),
          el("span", null, "Enable transitional wide shots"),
        )),
      state.enableTransitionalWide ? renderField("Transitional Duration (s)",
        el("input.podcast-input", {
          type: "number",
          min: "0.5",
          step: "0.5",
          value: String(state.transitionalWideDurationSec),
          onInput: (event: Event) => {
            state.transitionalWideDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 2.0;
            state.cameraDecisionPlanProof = null;
            state.applyCameraDecisionsResult = null;
            render();
          },
        })) : null,
      renderField("Wide Camera Option",
        el("label.podcast-toggle", null,
          el("input", { type: "checkbox", checked: true, disabled: true }),
          el("span", null, "Reserve a wide camera track"),
        )),
      renderField("Execution Strategy",
        renderStrategySelect()),
      renderField("Speaker Segments JSON",
        el("textarea.podcast-json-input", {
          spellcheck: "false",
          value: state.segmentsJson,
          onInput: (event: Event) => {
            state.segmentsJson = (event.currentTarget as HTMLTextAreaElement).value;
            render();
          },
        }), true),
      plan.parseErrors.length
        ? el("div.podcast-parse-error", null, plan.parseErrors.join(" "))
        : null,
    );
  }

  function renderField(label: string, control: HTMLElement, wide = false): HTMLElement {
    return el("label.podcast-field" + (wide ? ".podcast-field--wide" : ""), null,
      el("span", null, label),
      control,
    );
  }

  function renderMappingRow(speakerId: string): HTMLElement {
    return el("label.podcast-map-row", null,
      el("strong", null, getSpeakerMappingLabel(speakerId)),
      renderTrackSelect(speakerId),
    );
  }

  function renderCameraNameFields(): HTMLElement {
    const tracks = getSelectableVideoTracks();
    return el("div.podcast-camera-map", null,
      ...tracks.map((track) =>
        el("label.podcast-map-row", null,
          el("strong", null, `V${track.index + 1}`),
          el("input.podcast-input", {
            type: "text",
            value: getCameraRoleLabel(track.index),
            placeholder: defaultCameraRoleLabel(track.index),
            onInput: (event: Event) => {
              const value = (event.currentTarget as HTMLInputElement).value.trim();
              if (value) {
                state.cameraLabels[track.index] = value;
              } else {
                delete state.cameraLabels[track.index];
              }
              state.cameraDecisionPlanProof = null;
              state.applyCameraDecisionsResult = null;
            },
          }),
        ),
      ),
    );
  }

  function renderTrackSelect(speakerId: string): HTMLElement {
    const videoTracks = getSelectableVideoTracks();
    const count = Math.max(1, state.timelineLayout?.videoTracks.length ?? state.diagnostics.videoTrackCount ?? 4);
    const selectedTrackIndex = getExplicitVideoTrackIndexForSpeaker(speakerId, count);
    const onSelectCamera = (event: Event) => {
      state.cameraMappingTouched = true;
      const value = (event.currentTarget as HTMLSelectElement).value;
      if (value === "") {
        delete state.mappings[speakerId];
      } else {
        state.mappings[speakerId] = Number(value);
      }
      state.cameraDecisionPlanProof = null;
      state.applyCameraDecisionsResult = null;
      render();
    };
    const select = el("select.podcast-select", {
      dataset: { cameraSpeakerId: speakerId },
      value: selectedTrackIndex == null ? "" : String(selectedTrackIndex),
      onInput: onSelectCamera,
      onChange: onSelectCamera,
    },
    el("option", { value: "", selected: selectedTrackIndex == null }, speakerId === "wide" ? "No wide camera" : "Ignore / not mapped"),
    ...videoTracks.map((track) =>
      el("option", { value: String(track.index), selected: selectedTrackIndex === track.index }, getVideoTrackOptionLabel(track.index))));
    (select as HTMLSelectElement).value = selectedTrackIndex == null ? "" : String(selectedTrackIndex);
    return select;
  }

  function getSpeakerMappingLabel(speakerId: string): string {
    if (speakerId === "wide") return "Wide";
    const audioTrackIndex = state.audioMappings[speakerId] ?? speakerIndexFromId(speakerId);
    const track = state.timelineLayout?.audioTracks[audioTrackIndex];
    const trackLabel = `A${audioTrackIndex + 1}`;
    const name = track?.name?.trim();
    return name ? `${trackLabel} - ${name} (${speakerId})` : `${trackLabel} - ${speakerId}`;
  }

  function getVideoTrackOptionLabel(videoTrackIndex: number): string {
    const trackLabel = `V${videoTrackIndex + 1}`;
    return `${getCameraRoleLabel(videoTrackIndex)} (${trackLabel})`;
  }

  function getCameraRoleLabel(videoTrackIndex: number): string {
    const customLabel = state.cameraLabels[videoTrackIndex]?.trim();
    return customLabel || defaultCameraRoleLabel(videoTrackIndex);
  }

  function defaultCameraRoleLabel(videoTrackIndex: number): string {
    return DEFAULT_CAMERA_ROLES[videoTrackIndex] ?? `CAM ${videoTrackIndex + 1}`;
  }

  function renderStrategySelect(): HTMLElement {
    return el("select.podcast-select", {
      value: state.executionStrategy,
      onChange: (event: Event) => {
        state.executionStrategy = (event.currentTarget as HTMLSelectElement).value as PodcastExecutionStrategy;
        render();
      },
    }, ...STRATEGY_OPTIONS.map((strategy) =>
      el("option", { value: strategy }, strategy)));
  }

  function renderPlanPreview(): HTMLElement {
    const plan = buildPlan();
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Camera Decision Plan"),
          el("p", null, "Plan-only preview. No timeline operation is executed."),
        ),
      ),
      plan.decisions.length
        ? el("div.podcast-table-wrap", null,
            el("table.podcast-plan-table", null,
              el("thead", null,
                el("tr", null,
                  el("th", null, "Speaker"),
                  el("th", null, "Start"),
                  el("th", null, "End"),
                  el("th", null, "Duration"),
                  el("th", null, "Camera Track"),
                  el("th", null, "Strategy"),
                  el("th", null, "Reason"),
                ),
              ),
              el("tbody", null, ...plan.decisions.map(renderDecisionRow)),
            ),
          )
        : el("div.podcast-empty-plan", null, plan.parseErrors[0] ?? "No camera decisions yet."),
    );
  }

  function renderDecisionRow(decision: CameraDecision): HTMLElement {
    return el("tr", null,
      el("td", null, decision.speakerId),
      el("td", null, formatSeconds(decision.startSec)),
      el("td", null, formatSeconds(decision.endSec)),
      el("td", null, formatSeconds(decision.durationSec)),
      el("td", null, decision.videoTrackIndex == null ? "Unmapped" : `V${decision.videoTrackIndex + 1}`),
      el("td", null, decision.strategy),
      el("td", null, decision.reason),
    );
  }

  function renderDebugPanel(): HTMLElement {
    const d = state.diagnostics;
    const plan = buildPlan();
    const layout = state.timelineLayout;
    return el("div.podcast-debug", null,
      el("div.podcast-debug__head", null,
        el("div", null,
          el("h3", null, "Debug Panel"),
          el("p", null, "Read-only Premiere and provider diagnostics."),
        ),
        el("button.btn-secondary", { disabled: state.loading, onClick: refreshDiagnostics },
          state.loading ? "Refreshing..." : "Refresh Diagnostics"),
      ),
      el("div.podcast-debug__grid", null,
        row("Active Sequence", d.activeSequence ? "Yes" : "No"),
        row("Sequence Name", d.sequenceName || "Not detected"),
        row("Premiere Version", d.premiereVersion || "Unknown"),
        row("Video Track Count", String(d.videoTrackCount)),
        row("Audio Track Count", String(d.audioTrackCount)),
        row("Adapter Status", d.adapterStatus),
        row("Reap Provider Status", d.reapProviderStatus),
        row("Parsed Segments Count", String(plan.parsedSegmentsCount)),
        row("Valid Segments Count", String(plan.validSegmentsCount)),
        row("Invalid Segments Count", String(plan.invalidSegmentsCount)),
        row("Camera Decisions Count", String(plan.decisions.length)),
        row("Short Segments Merged Count", String(plan.shortSegmentsMergedCount)),
        row("Selected Execution Strategy", plan.selectedExecutionStrategy),
        row("Total Detected Speaker Segments", String(state.cameraDecisionPlanProof?.diagnostics?.totalDetectedSpeakerSegments ?? state.sourceAttributionProof?.trackSpeakingSegments.length ?? 0)),
        row("Speaker Segments Per Microphone", formatSpeakerSegmentsPerMic(state.cameraDecisionPlanProof?.diagnostics?.speakerSegmentsPerMicrophone)),
        row("Dominant Windows Count", String(state.cameraDecisionPlanProof?.diagnostics?.dominantWindowsCount ?? state.sourceAttributionProof?.dominantTrackAtTime.length ?? 0)),
        row("Camera Decisions Before Merge", String(state.cameraDecisionPlanProof?.diagnostics?.cameraDecisionsBeforeMerge ?? 0)),
        row("Camera Decisions After Adjacent Merge", String(state.cameraDecisionPlanProof?.diagnostics?.cameraDecisionsAfterAdjacentMerge ?? 0)),
        row("Camera Decisions After Short Merge", String(state.cameraDecisionPlanProof?.diagnostics?.cameraDecisionsAfterShortMerge ?? 0)),
        row("Merged Segments Count", String(state.cameraDecisionPlanProof?.diagnostics?.mergedSegmentsCount ?? 0)),
        row("Total Timeline Duration", formatSeconds(state.cameraDecisionPlanProof?.diagnostics?.totalTimelineDurationSec ?? state.timelineLayout?.sequenceDurationSec ?? state.sourceAttributionProof?.analyzedDurationSec ?? 0)),
        row("Single Decision Reason", state.cameraDecisionPlanProof?.diagnostics?.singleDecisionReason || "None"),
        row("Attribution Blockers", state.sourceAttributionProof?.blockers.join(" | ") || "None"),
        row("Attribution Warnings", state.sourceAttributionProof?.warnings.slice(0, 8).join(" | ") || "None"),
        row("Camera Plan Blockers", state.cameraDecisionPlanProof?.blockers.join(" | ") || "None"),
        row("Camera Plan Warnings", state.cameraDecisionPlanProof?.warnings.join(" | ") || "None"),
        row("Video Tracks Found", String(layout?.videoTracks.length ?? 0)),
        row("Audio Tracks Found", String(layout?.audioTracks.length ?? 0)),
        row("Clip Counts", clipCountsSummary(layout)),
        row("Timeline Read Status", layout?.status ?? "not-analyzed"),
        row("Supported Execution Strategies", layout?.supportedExecutionStrategies.join(", ") ?? "decision-plan-only"),
        row("Unsupported APIs", layout?.unsupportedApis.join(", ") ?? "set/get active multicam camera angle"),
        row("Recommended Strategy", layout?.recommendedStrategy ?? "decision-plan-only"),
        row("Audio Inspector Status", state.audioProof ? (state.audioProof.ok ? "ready" : "blocked") : "not-run"),
        row("FFmpeg Availability", state.audioProof?.ffmpeg.available ? "available" : "not-proven"),
        row("FFmpeg Version", state.audioProof?.ffmpeg.version || "unknown"),
        row("Audio Source Paths", state.audioProof ? sourcePathSummary(state.audioProof.inspection.sources) : "not-run"),
        row("RMS Preview Count", String(state.audioProof?.rmsPreview.length ?? 0)),
        row("Original Sequence Name", d.sequenceName || "Not detected"),
        row("New Sequence Name", draftSequenceName(d.sequenceName)),
        row("Duplicate Result", duplicateResultText(state.duplicateResult)),
        row("Apply Last Checkpoint", state.applyTrace.lastCheckpoint),
        row("Apply Checkpoints", state.applyTrace.checkpoints.join(" > ") || "None"),
        row("decisionCountPassedToApply", String(state.applyTrace.decisionCountPassedToApply)),
        row("executionStrategyUsed", state.applyTrace.executionStrategyUsed || "None"),
        row("duplicateSequenceCalled", state.applyTrace.duplicateSequenceCalled ? "Yes" : "No"),
        row("duplicateSequenceResult", state.applyTrace.duplicateSequenceResult),
        row("applyCameraDecisionsCalled", state.applyTrace.applyCameraDecisionsCalled ? "Yes" : "No"),
        row("applyCameraDecisionsResult", state.applyTrace.applyCameraDecisionsResult),
        row("Apply Trace Error", state.applyTrace.error || "None"),
        row("Apply Result Duplicate Sequence ID", state.applyCameraDecisionsResult?.duplicateSequenceID || "null"),
        row("Apply Result Segments Inserted", String(state.applyCameraDecisionsResult?.segmentsInserted ?? 0)),
        row("Apply Result Blockers", state.applyCameraDecisionsResult?.blockers.join(" | ") || "None"),
        row("Apply Decision Diagnostics", formatApplyDecisionDiagnostics(state.applyCameraDecisionsResult?.segmentResults)),
        row("Execution Strategy", state.duplicateResult?.ok ? "duplicate-sequence-cuts" : plan.selectedExecutionStrategy),
        row("Timeline Mutation", state.duplicateResult ? "duplicate only" : "none"),
        row("cloneResult", String(state.duplicateResult?.duplicateProof?.cloneResult === true)),
        row("newSequenceDetected", String(state.duplicateResult?.duplicateProof?.newSequenceDetected === true)),
        row("renameResult", String(state.duplicateResult?.duplicateProof?.renameResult === true)),
      ),
      el("div.podcast-messages", null,
        el("div.podcast-messages__title", null, "Messages"),
        [...d.messages, ...plan.blockers, ...safeCopyBlockers(d.activeSequence, plan.decisions.length, state.safeCopyConfirmed)].length
          ? [...d.messages, ...plan.blockers, ...safeCopyBlockers(d.activeSequence, plan.decisions.length, state.safeCopyConfirmed)].map((message) => el("div.podcast-message", null, message))
          : el("div.podcast-message", null, "No messages."),
      ),
    );
  }

  function row(label: string, value: string): HTMLElement {
    return el("div.podcast-debug__row", null,
      el("span", null, label),
      el("strong", null, value),
    );
  }

  function renderStatusPill(label: string, value: string): HTMLElement {
    return el("div.podcast-status-pill", null,
      el("span", null, label),
      el("strong", null, value),
    );
  }

  function renderSummaryTile(label: string, value: string): HTMLElement {
    return el("div.podcast-summary-tile", null,
      el("span", null, label),
      el("strong", null, value),
    );
  }

  function renderProcessingLoader(label: string): HTMLElement {
    const traces = [
      ["M18 24H170Q205 24 205 54H280", "yellow"],
      ["M18 54H145Q180 54 180 76H280", "blue"],
      ["M18 106H145Q180 106 180 84H280", "green"],
      ["M18 136H170Q205 136 205 106H280", "purple"],
      ["M782 24H630Q595 24 595 54H520", "red"],
      ["M782 54H655Q620 54 620 76H520", "purple"],
      ["M782 106H655Q620 106 620 84H520", "blue"],
      ["M782 136H630Q595 136 595 106H520", "green"],
    ];
    const traceMarkup = traces.map(([path, color], index) =>
      `<path class="podcast-process-trace-bg" d="${path}"/><path class="podcast-process-trace-flow podcast-process-${color}" style="animation-delay:-${index * 0.18}s" d="${path}"/>`,
    ).join("");
    const pins = Array.from({ length: 6 }, (_, index) => {
      const y = 49 + index * 13;
      return `<rect class="podcast-process-chip-pin" x="270" y="${y}" width="10" height="5" rx="1"/><rect class="podcast-process-chip-pin" x="520" y="${y}" width="10" height="5" rx="1"/>`;
    }).join("");
    return el("div.podcast-process-loader", { role: "status", "aria-live": "polite" },
      el("div.podcast-process-loader__label", null,
        el("span.podcast-process-loader__pulse", { "aria-hidden": "true" }),
        label,
      ),
      el("div.podcast-process-loader__graphic", {
        "aria-hidden": "true",
        html: `<svg viewBox="0 0 800 160" preserveAspectRatio="xMidYMid meet" focusable="false">${traceMarkup}${pins}<rect class="podcast-process-chip-body" x="280" y="34" width="240" height="92" rx="20"/><rect class="podcast-process-chip-core" x="300" y="52" width="200" height="56" rx="12"/><text class="podcast-process-chip-text" x="400" y="76" text-anchor="middle">SAAD STUDIO</text><text class="podcast-process-chip-subtext" x="400" y="96" text-anchor="middle">PROCESSING</text></svg>`,
      }),
    );
  }

  function readableTimelineStatus(): string {
    if (!state.timelineLayout) return "Not analyzed";
    if (isAutoSwitchDraftName(state.timelineLayout.sequenceName)) return "Draft selected";
    if (state.timelineLayout.status === "ready") {
      return `${getActiveVideoTracks().length} cameras / ${getActiveAudioTracks().length} mics`;
    }
    return state.timelineLayout.status;
  }

  function readablePreviewStatus(): string {
    if (state.previewAutoSwitchLoading || state.sourceAttributionProofLoading) return "Working";
    if (!state.timelineLayout) return "Waiting";
    const plan = getCurrentCameraDecisionPlan();
    if (!plan) return "Not previewed";
    if (plan.blockers.length) return "Blocked";
    return `${plan.summary.totalDecisions} decisions`;
  }

  async function refreshDiagnostics() {
    state.loading = true;
    render();
    try {
      const previousIdentity = sequenceIdentityFromDiagnostics(state.diagnostics);
      const nextDiagnostics = await getPodcastDiagnostics();
      const nextIdentity = sequenceIdentityFromDiagnostics(nextDiagnostics);
      if (sequenceIdentityChanged(previousIdentity, nextIdentity)) {
        const isDraftOfPrevious = !!(nextIdentity.sequenceName && previousIdentity.sequenceName &&
          nextIdentity.sequenceName === (previousIdentity.sequenceName + " - Saad Auto Switch Draft"));
        if (!isDraftOfPrevious) {
          state.mappings = {};
          state.cameraMappingTouched = false;
        }
        clearSequenceRuntimeState();
      }
      state.diagnostics = nextDiagnostics;
    } catch (err) {
      state.diagnostics = {
        ...DEFAULT_DIAGNOSTICS,
        adapterStatus: "error",
        reapProviderStatus: "error",
        messages: [(err as Error).message],
      };
    } finally {
      state.loading = false;
      render();
    }
  }

  function startActiveSequenceWatcher() {
    const intervalId = window.setInterval(async () => {
      if (root.isConnected) {
        sequenceWatcherSawPageMounted = true;
      } else if (sequenceWatcherSawPageMounted) {
        window.clearInterval(intervalId);
        return;
      }
      if (!root.isConnected || sequencePollInFlight || state.loading || isProductionBusy()) return;

      sequencePollInFlight = true;
      try {
        const nextDiagnostics = await getPodcastDiagnostics();
        const previousIdentity = sequenceIdentityFromDiagnostics(state.diagnostics);
        const nextIdentity = sequenceIdentityFromDiagnostics(nextDiagnostics);
        if (sequenceIdentityChanged(previousIdentity, nextIdentity)) {
          const isDraftOfPrevious = !!(nextIdentity.sequenceName && previousIdentity.sequenceName &&
            nextIdentity.sequenceName === (previousIdentity.sequenceName + " - Saad Auto Switch Draft"));
          if (!isDraftOfPrevious) {
            state.mappings = {};
            state.cameraMappingTouched = false;
          }
          clearSequenceRuntimeState();
          state.diagnostics = nextDiagnostics;
          render();
        }
      } catch {
        // Premiere can be briefly unavailable while changing sequence tabs.
        // Keep the current state and retry on the next lightweight poll.
      } finally {
        sequencePollInFlight = false;
      }
    }, 1000);
  }

  async function analyzeSynchronization() {
    if (isProductionBusy()) return;
    state.synchronizationLoading = true;
    render();
    try {
      state.synchronizationPlan = await analyzeSynchronizationPlan();
      state.synchronizationApplyResult = null;
    } catch (err) {
      state.synchronizationPlan = {
        ok: false,
        sequenceId: null,
        sequenceName: state.diagnostics.sequenceName ?? null,
        sequenceDurationSec: null,
        referenceAudioTrackIndex: null,
        videoTrackCount: 0,
        audioTrackCount: 0,
        videoClipCount: 0,
        audioClipCount: 0,
        alignedStartTracks: 0,
        offsetCandidateTracks: 0,
        waveformOffsets: [],
        offsetsComputed: 0,
        offsetsReady: false,
        trackReadiness: [],
        blockers: ["SYNCHRONIZATION_ANALYSIS_FAILED", (err as Error).message],
        warnings: [],
        messages: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
    } finally {
      state.synchronizationLoading = false;
      render();
    }
  }

  async function applySynchronization() {
    if (isProductionBusy() || !state.synchronizationPlan) return;
    state.synchronizationApplyLoading = true;
    render();
    try {
      state.synchronizationApplyResult = await applySynchronizationOffsets(state.synchronizationPlan);
      if (state.synchronizationApplyResult.ok) {
        state.timelineLayout = null;
        clearAutoSwitchRuntimeState();
      }
    } catch (err) {
      state.synchronizationApplyResult = {
        ok: false,
        sequenceName: state.synchronizationPlan.sequenceName ?? null,
        sequenceId: state.synchronizationPlan.sequenceId ?? null,
        originalSequenceName: state.synchronizationPlan.sequenceName ?? null,
        originalSequenceId: state.synchronizationPlan.sequenceId ?? null,
        duplicateSequenceName: null,
        duplicateSequenceId: null,
        offsetsApplied: 0,
        clipsMoved: 0,
        movedItems: [],
        blockers: ["APPLY_SYNC_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "duplicate + move synchronized clips on duplicate only",
        sequenceMutation: "duplicate-only",
      };
    } finally {
      state.synchronizationApplyLoading = false;
      render();
    }
  }

  async function analyzeLayout() {
    if (isProductionBusy()) return;
    state.timelineLoading = true;
    clearAutoSwitchRuntimeState();
    render();
    try {
      state.timelineLayout = await analyzeTimelineLayout();
      if (isAutoSwitchDraftName(state.timelineLayout.sequenceName)) {
        state.sourceAttributionProof = null;
        state.cameraDecisionPlanProof = blockedCameraDecisionPlan(
          ["ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT_SELECT_SOURCE_SEQUENCE"],
          state.timelineLayout,
        );
        state.applyCameraDecisionsResult = null;
        return;
      }
      const videoCount = state.timelineLayout.videoTracks.length;
      ensureAudioMappingsForTimeline();
      ensureDefaultCameraMappings();
      if (videoCount > 0) {
        ensureCameraMappingsForAudioTracks();
        for (const key of Object.keys(state.mappings)) {
          state.mappings[key] = Math.min(state.mappings[key] ?? 0, videoCount - 1);
        }
      }
    } finally {
      state.timelineLoading = false;
      render();
    }
  }

// Auto Zoom action handlers removed

  async function previewAutoSwitch() {
    if (isProductionBusy()) return;
    syncCameraMappingsFromDom();
    const layout = state.timelineLayout;
    if (!layout || layout.status !== "ready") {
      state.sourceAttributionProof = null;
      state.cameraDecisionPlanProof = blockedCameraDecisionPlan(["TIMELINE_LAYOUT_REQUIRED_BEFORE_PREVIEW"], layout);
      state.applyCameraDecisionsResult = null;
      render();
      return;
    }
    if (isAutoSwitchDraftName(layout.sequenceName)) {
      state.sourceAttributionProof = null;
      state.cameraDecisionPlanProof = blockedCameraDecisionPlan(
        ["ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT_SELECT_SOURCE_SEQUENCE"],
        layout,
      );
      state.applyCameraDecisionsResult = null;
      render();
      return;
    }
    state.previewAutoSwitchLoading = true;
    state.sourceAttributionProofLoading = true;
    render();
    try {
      const audioMappings = getAudioMappings();
      if (audioMappings.length === 0) {
        state.sourceAttributionProof = null;
        state.cameraDecisionPlanProof = blockedCameraDecisionPlan(["AUDIO_TRACK_CAMERA_MAPPING_REQUIRED"], layout);
        state.applyCameraDecisionsResult = null;
        return;
      }
      const sourceProof = await runSpeakerSourceAttributionProof(audioMappings, state.selectedAudioStreamIndex);
      state.sourceAttributionProof = bindSourceAttributionToTimeline(sourceProof, layout);
      ensureCameraMappingsForAudioTracks();
      const sourceBlockers = getMappedTrackSourceBlockers(state.sourceAttributionProof);
      if (sourceBlockers.length > 0) {
        state.cameraDecisionPlanProof = blockedCameraDecisionPlan(sourceBlockers, layout);
        state.applyCameraDecisionsResult = null;
        return;
      }
      state.cameraDecisionPlanProof = {
        ...generateCameraDecisionPlanProof({
        dominantTrackAtTime: state.sourceAttributionProof.dominantTrackAtTime,
        overlaps: state.sourceAttributionProof.overlaps,
        trackSpeakingSegments: state.sourceAttributionProof.trackSpeakingSegments,
        cameraMappings: getCameraMappings(),
        timelineDurationSec: layout.sequenceDurationSec ?? state.sourceAttributionProof.analyzedDurationSec,
        videoTrackCount: layout.videoTracks.length,
        minimumShotLengthSec: state.minimumShotLengthSec,
        maxSingleCameraRunSec: state.maxSingleCameraRunSec,
        wideCutawayDurationSec: state.wideCutawayDurationSec,
        enableTransitionalWide: state.enableTransitionalWide,
        transitionalWideDurationSec: state.transitionalWideDurationSec,
        }),
        sequenceId: layout.sequenceId ?? null,
        sequenceName: layout.sequenceName ?? null,
        decisionSource: "ffmpeg-rms",
      };
      state.applyCameraDecisionsResult = null;
    } catch (err) {
      state.sourceAttributionProof = {
        sequenceId: layout.sequenceId ?? null,
        sequenceName: layout.sequenceName ?? null,
        decisionSource: "ffmpeg-rms",
        trackActivity: [],
        trackSpeakingSegments: [],
        overlaps: [],
        dominantTrackAtTime: [],
        analyzedDurationSec: 30,
        analysisWindowSec: 0.2,
        thresholdUsed: -35,
        minimumSpeechDurationSec: 0.4,
        blockers: ["AUTO_SWITCH_PREVIEW_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
      state.cameraDecisionPlanProof = {
        sequenceId: layout.sequenceId ?? null,
        sequenceName: layout.sequenceName ?? null,
        decisionSource: "ffmpeg-rms",
        cameraDecisions: [],
        summary: {
          totalDecisions: 0,
          speaker1CameraTimeSec: 0,
          speaker2CameraTimeSec: 0,
          wideCameraTimeSec: 0,
          keptPreviousCameraEvents: 0,
          droppedShortDecisions: 0,
        },
        blockers: state.sourceAttributionProof.blockers,
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
    } finally {
      state.previewAutoSwitchLoading = false;
      state.sourceAttributionProofLoading = false;
      render();
    }
  }

  async function createDraftCopy() {
    const plan = buildPlan();
    state.duplicateLoading = true;
    render();
    try {
      state.duplicateResult = await createSafeEditCopy({
        activeSequence: state.diagnostics.activeSequence,
        originalSequenceName: state.diagnostics.sequenceName,
        hasDecisionPlan: plan.decisions.length > 0,
        confirmedSafeCopyMode: state.safeCopyConfirmed,
      });
    } catch (err) {
      state.duplicateResult = {
        ok: false,
        reason: (err as Error).message,
        mutation: "duplicate-only",
      };
    } finally {
      state.duplicateLoading = false;
      render();
    }
  }

  async function inspectAudioProof() {
    state.audioProofLoading = true;
    render();
    try {
      state.audioProof = await inspectAudioSourcesAndFfmpeg(getAudioMappings());
    } catch (err) {
      state.audioProof = {
        ok: false,
        ffmpeg: {
          available: false,
          path: null,
          version: null,
          versionSupported: false,
          minimumVersion: "6.0",
          audioStreamCount: 0,
          audioStreams: [],
          rmsPreview: [],
          blockers: ["AUDIO_SOURCE_PROOF_FAILED"],
          messages: [(err as Error).message],
        },
        inspection: {
          ok: false,
          sources: [],
          blockers: ["AUDIO_SOURCE_PROOF_FAILED"],
          messages: [(err as Error).message],
        },
        rmsPreview: [],
        blockers: ["AUDIO_SOURCE_PROOF_FAILED"],
        messages: [(err as Error).message],
        timelineMutation: "none",
      };
    } finally {
      state.audioProofLoading = false;
      render();
    }
  }

  async function diagnoseFfmpeg() {
    state.ffmpegDiagnosticsLoading = true;
    render();
    try {
      state.ffmpegDiagnostics = await diagnoseFfmpegDetection();
    } catch (err) {
      state.ffmpegDiagnostics = {
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
        minimumVersion: "6.0",
        blockers: ["FFMPEG_DIAGNOSTICS_FAILED"],
        messages: [(err as Error).message],
      };
    } finally {
      state.ffmpegDiagnosticsLoading = false;
      render();
    }
  }

  async function runRmsProof() {
    state.rmsProofLoading = true;
    render();
    try {
      state.rmsProof = await runFfmpegRmsRuntimeProof(getAudioMappings(), state.selectedAudioStreamIndex);
    } catch (err) {
      state.rmsProof = {
        ffmpegAvailable: false,
        ffmpegVersion: null,
        analyzedSourcePath: null,
        selectedAudioTrackIndex: null,
        selectedClipIndex: null,
        selectedAudioStreamIndex: state.selectedAudioStreamIndex,
        ffprobeAudioStreams: [],
        analysisWindowSec: 0.2,
        rmsPreview: [],
        timestampInterpretation: {
          analysisWindowSec: 0.2,
          ffmpegPtsTimeMeaning: "window-end",
          windowStartFormula: "sourceTimeSec - analysisWindowSec",
          windowEndFormula: "sourceTimeSec",
          timelineFormula: "clip.timelineStartSec + (sourceTimeSec - clip.sourceInPointSec)",
        },
        blockers: ["FFMPEG_RMS_RUNTIME_PROOF_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
    } finally {
      state.rmsProofLoading = false;
      render();
    }
  }

  function runSpeakerActivityProof() {
    state.speakerActivityProof = generateSpeakerActivityProof({
      rmsProof: state.rmsProof,
      thresholdDb: state.rmsSpeechThresholdDb,
      minimumSpeechDurationSec: state.minimumSpeechDurationSec,
    });
    render();
  }

  async function runFullActivityProof() {
    state.fullActivityProofLoading = true;
    render();
    try {
      state.fullActivityProof = await runFullAudioActivityProof(getAudioMappings(), state.selectedAudioStreamIndex);
    } catch (err) {
      state.fullActivityProof = {
        analyzedDurationSec: 30,
        analysisWindowSec: 0.2,
        totalRmsWindows: 0,
        activeWindowsCount: 0,
        inactiveWindowsCount: 0,
        longestActiveRunSec: 0,
        rmsPreviewFirst20: [],
        speakingSegments: [],
        droppedShortSegments: [],
        thresholdUsed: -35,
        minimumSpeechDurationSec: 0.4,
        selectedAudioStreamIndex: state.selectedAudioStreamIndex,
        blockers: ["FULL_AUDIO_ACTIVITY_PROOF_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
    } finally {
      state.fullActivityProofLoading = false;
      render();
    }
  }

  async function runSourceAttributionProof() {
    state.sourceAttributionProofLoading = true;
    render();
    try {
      const sourceProof = await runSpeakerSourceAttributionProof(getAudioMappings(), state.selectedAudioStreamIndex);
      state.sourceAttributionProof = state.timelineLayout
        ? bindSourceAttributionToTimeline(sourceProof, state.timelineLayout)
        : sourceProof;
    } catch (err) {
      state.sourceAttributionProof = {
        trackActivity: [],
        trackSpeakingSegments: [],
        overlaps: [],
        dominantTrackAtTime: [],
        analyzedDurationSec: 30,
        analysisWindowSec: 0.2,
        thresholdUsed: -35,
        minimumSpeechDurationSec: 0.4,
        blockers: ["SPEAKER_SOURCE_ATTRIBUTION_PROOF_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
    } finally {
      state.sourceAttributionProofLoading = false;
      render();
    }
  }

  function runCameraPlanProof() {
    const layout = state.timelineLayout;
    if (!layout || layout.status !== "ready") {
      state.cameraDecisionPlanProof = blockedCameraDecisionPlan(["TIMELINE_LAYOUT_REQUIRED_BEFORE_PREVIEW"], layout);
      render();
      return;
    }
    if (!state.sourceAttributionProof) {
      state.cameraDecisionPlanProof = blockedCameraDecisionPlan(["SPEAKER_SOURCE_ATTRIBUTION_PROOF_REQUIRED"], layout);
      render();
      return;
    }
    const sourceBlockers = getMappedTrackSourceBlockers(state.sourceAttributionProof);
    if (sourceBlockers.length > 0 || !sourceProofMatchesTimeline(state.sourceAttributionProof, layout)) {
      state.cameraDecisionPlanProof = blockedCameraDecisionPlan(
        sourceBlockers.length ? sourceBlockers : ["STALE_OR_UNBOUND_SOURCE_ATTRIBUTION_PROOF"],
        layout,
      );
      render();
      return;
    }
    state.cameraDecisionPlanProof = {
      ...generateCameraDecisionPlanProof({
      dominantTrackAtTime: state.sourceAttributionProof.dominantTrackAtTime,
      overlaps: state.sourceAttributionProof.overlaps,
      trackSpeakingSegments: state.sourceAttributionProof.trackSpeakingSegments,
      cameraMappings: getCameraMappings(),
      timelineDurationSec: layout.sequenceDurationSec ?? state.sourceAttributionProof.analyzedDurationSec,
      videoTrackCount: layout.videoTracks.length,
      minimumShotLengthSec: state.minimumShotLengthSec,
      maxSingleCameraRunSec: state.maxSingleCameraRunSec,
      wideCutawayDurationSec: state.wideCutawayDurationSec,
      enableTransitionalWide: state.enableTransitionalWide,
      transitionalWideDurationSec: state.transitionalWideDurationSec,
      }),
      sequenceId: layout.sequenceId ?? null,
      sequenceName: layout.sequenceName ?? null,
      decisionSource: "ffmpeg-rms",
    };
    state.applyCameraDecisionsResult = null;
    render();
  }

  async function runApplyCameraDecisionsPrototype() {
    if (isProductionBusy()) return;
    const applyBlockers = getApplyCameraDecisionBlockers();
    const cameraDecisions = applyBlockers.length ? [] : (state.cameraDecisionPlanProof?.cameraDecisions ?? []);
    state.applyTrace = createEmptyApplyTrace();
    pushApplyCheckpoint(state.applyTrace, "APPLY_CLICKED");
    state.applyTrace.decisionCountPassedToApply = cameraDecisions.length;
    if (applyBlockers.length > 0) {
      state.applyTrace.error = applyBlockers.join(" | ");
      state.applyCameraDecisionsResult = blockedApplyCameraDecisionsResult(applyBlockers, state.cameraDecisionPlanProof?.cameraDecisions.length ?? 0);
      pushApplyCheckpoint(state.applyTrace, "RETURN_TO_UI");
      render();
      return;
    }
    if (cameraDecisions.length <= 0) {
      state.applyTrace.error = "NO_CAMERA_DECISIONS_TO_APPLY";
      pushApplyCheckpoint(state.applyTrace, "RETURN_TO_UI");
      render();
      return;
    }
    pushApplyCheckpoint(state.applyTrace, "DECISIONS_AVAILABLE");
    state.applyTrace.executionStrategyUsed = "apply-camera-decisions-overlap-aware-visual-only";
    pushApplyCheckpoint(state.applyTrace, "EXECUTION_STRATEGY_SELECTED");
    state.applyCameraDecisionsLoading = true;
    state.applyTrace.duplicateSequenceCalled = true;
    pushApplyCheckpoint(state.applyTrace, "DUPLICATE_SEQUENCE_START");
    render();
    try {
      await loadExtendScript();
      state.applyTrace.applyCameraDecisionsCalled = true;
      pushApplyCheckpoint(state.applyTrace, "APPLY_DECISIONS_START");
      state.applyCameraDecisionsResult = bindApplyResultToTimeline(
        await applyCameraDecisionsVisualOnly({
          cameraDecisions,
          minimumShotLengthSec: state.minimumShotLengthSec,
        }),
        state.timelineLayout,
      );
      if (state.applyCameraDecisionsResult.duplicateSequenceID) {
        state.applyTrace.duplicateSequenceResult = `success:${state.applyCameraDecisionsResult.duplicateSequenceID}`;
        pushApplyCheckpoint(state.applyTrace, "DUPLICATE_SEQUENCE_SUCCESS");
      } else {
        state.applyTrace.duplicateSequenceResult = state.applyCameraDecisionsResult.blockers.join(" | ") || "missing duplicateSequenceID";
        pushApplyCheckpoint(state.applyTrace, "DUPLICATE_SEQUENCE_FAILED");
      }
      if (state.applyCameraDecisionsResult.ok) {
        state.applyTrace.applyCameraDecisionsResult = `success:${state.applyCameraDecisionsResult.segmentsInserted} segments`;
        pushApplyCheckpoint(state.applyTrace, "APPLY_DECISIONS_SUCCESS");
      } else {
        state.applyTrace.applyCameraDecisionsResult = state.applyCameraDecisionsResult.blockers.join(" | ") || "failed";
        pushApplyCheckpoint(state.applyTrace, "APPLY_DECISIONS_FAILED");
      }
    } catch (err) {
      state.applyTrace.duplicateSequenceResult = state.applyTrace.duplicateSequenceResult === "not-started"
        ? "exception before duplicate result"
        : state.applyTrace.duplicateSequenceResult;
      state.applyTrace.applyCameraDecisionsResult = "exception";
      state.applyTrace.error = (err as Error).message;
      pushApplyCheckpoint(state.applyTrace, "APPLY_DECISIONS_FAILED");
      state.applyCameraDecisionsResult = {
        ok: false,
        strategy: "apply-camera-decisions-overlap-aware-visual-only",
        originalSequenceID: null,
        duplicateSequenceID: null,
        decisionsCount: cameraDecisions.length,
        segmentsAttempted: cameraDecisions.length,
        segmentsInserted: 0,
        segmentsSkipped: 0,
        generatedTargetTrackName: "Saad Auto Switch",
        segmentResults: [],
        blockers: ["APPLY_CAMERA_DECISIONS_PROTOTYPE_FAILED"],
        warnings: [],
        errors: [(err as Error).message],
        originalTouched: false,
        timelineMutation: "duplicate + visual-only reconstructed segments on duplicate only",
      };
    } finally {
      state.applyCameraDecisionsLoading = false;
      pushApplyCheckpoint(state.applyTrace, "RETURN_TO_UI");
      render();
    }
  }

  function clearAutoSwitchRuntimeState() {
    state.sourceAttributionProof = null;
    state.cameraDecisionPlanProof = null;
    state.applyCameraDecisionsResult = null;
    state.applyTrace = createEmptyApplyTrace();
  }

  function clearSynchronizationRuntimeState() {
    state.synchronizationPlan = null;
    state.synchronizationApplyResult = null;
  }

  function clearSequenceRuntimeState() {
    state.timelineLayout = null;
    clearSynchronizationRuntimeState();
    clearAutoSwitchRuntimeState();
    state.audioProof = null;
    state.rmsProof = null;
    state.fullActivityProof = null;
    state.streamProof = null;
    state.speakerActivityProof = null;
  }

  function getCurrentCameraDecisionPlan(): PodcastCameraDecisionPlanProof | null {
    const plan = state.cameraDecisionPlanProof;
    if (!plan || !state.timelineLayout) return null;
    if (plan.decisionSource !== "ffmpeg-rms") return null;
    return planMatchesTimeline(plan, state.timelineLayout) ? plan : null;
  }

  function getCurrentApplyCameraDecisionsResult(): ApplyCameraDecisionsVisualOnlyResult | null {
    const result = state.applyCameraDecisionsResult;
    if (!result || !state.timelineLayout) return null;
    return sequenceIdentityMatches(
      result.sourceSequenceId ?? result.originalSequenceID,
      result.sourceSequenceName ?? null,
      state.timelineLayout.sequenceId ?? null,
      state.timelineLayout.sequenceName ?? null,
    ) ? result : null;
  }

  function blockedCameraDecisionPlan(blockers: string[], layout: PodcastTimelineLayout | null): PodcastCameraDecisionPlanProof {
    return {
      sequenceId: layout?.sequenceId ?? null,
      sequenceName: layout?.sequenceName ?? null,
      decisionSource: "ffmpeg-rms",
      cameraDecisions: [],
      summary: {
        totalDecisions: 0,
        speaker1CameraTimeSec: 0,
        speaker2CameraTimeSec: 0,
        wideCameraTimeSec: 0,
        keptPreviousCameraEvents: 0,
        droppedShortDecisions: 0,
      },
      blockers,
      warnings: [],
      timelineMutation: "none",
      sequenceMutation: "none",
    };
  }

  function blockedApplyCameraDecisionsResult(blockers: string[], decisionCount: number): ApplyCameraDecisionsVisualOnlyResult {
    return {
      ok: false,
      strategy: "apply-camera-decisions-overlap-aware-visual-only",
      sourceSequenceId: state.timelineLayout?.sequenceId ?? null,
      sourceSequenceName: state.timelineLayout?.sequenceName ?? null,
      originalSequenceID: state.timelineLayout?.sequenceId ?? null,
      duplicateSequenceID: null,
      decisionsCount: decisionCount,
      segmentsAttempted: decisionCount,
      segmentsInserted: 0,
      segmentsSkipped: 0,
      generatedTargetTrackName: "Saad Auto Switch",
      segmentResults: [],
      blockers,
      warnings: [],
      errors: [],
      originalTouched: false,
      timelineMutation: "duplicate + visual-only reconstructed segments on duplicate only",
    };
  }

  function bindSourceAttributionToTimeline(
    proof: SpeakerSourceAttributionProof,
    layout: PodcastTimelineLayout,
  ): SpeakerSourceAttributionProof {
    return {
      ...proof,
      sequenceId: layout.sequenceId ?? null,
      sequenceName: layout.sequenceName ?? null,
      decisionSource: "ffmpeg-rms",
    };
  }

  function bindApplyResultToTimeline(
    result: ApplyCameraDecisionsVisualOnlyResult,
    layout: PodcastTimelineLayout | null,
  ): ApplyCameraDecisionsVisualOnlyResult {
    return {
      ...result,
      sourceSequenceId: layout?.sequenceId ?? null,
      sourceSequenceName: layout?.sequenceName ?? null,
    };
  }

  function getApplyCameraDecisionBlockers(): string[] {
    const blockers: string[] = [];
    const layout = state.timelineLayout;
    const plan = state.cameraDecisionPlanProof;
    if (!layout || layout.status !== "ready") blockers.push("TIMELINE_LAYOUT_REQUIRED_BEFORE_APPLY");
    if (isAutoSwitchDraftName(layout?.sequenceName)) blockers.push("ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT");
    if (state.applyCameraDecisionsResult) blockers.push("AUTO_SWITCH_ALREADY_APPLIED_REANALYZE_REQUIRED");
    if (!plan) blockers.push("CAMERA_DECISION_PLAN_REQUIRED");
    if (plan && plan.decisionSource !== "ffmpeg-rms") blockers.push("CAMERA_DECISION_PLAN_SOURCE_NOT_FFMPEG_RMS");
    if (plan && layout && !planMatchesTimeline(plan, layout)) blockers.push("STALE_CAMERA_DECISION_PLAN");
    if (plan?.blockers.length) blockers.push(...plan.blockers);
    if (state.sourceAttributionProof && layout && !sourceProofMatchesTimeline(state.sourceAttributionProof, layout)) {
      blockers.push("STALE_OR_UNBOUND_SOURCE_ATTRIBUTION_PROOF");
    }
    if (state.sourceAttributionProof) {
      blockers.push(...getMappedTrackSourceBlockers(state.sourceAttributionProof));
    }
    return uniqueStrings(blockers);
  }

  function isAutoSwitchDraftName(name: string | null | undefined): boolean {
    return String(name ?? "").includes("Saad Auto Switch Draft");
  }

  function getMappedTrackSourceBlockers(proof: SpeakerSourceAttributionProof): string[] {
    const blockers: string[] = [];
    const globalBlockers = proof.blockers.filter(isGlobalSourceBlocker);
    if (globalBlockers.length > 0) blockers.push(...globalBlockers);

    const requiredTrackIndexes = new Set<number>();
    for (const window of proof.dominantTrackAtTime) {
      if (typeof window.audioTrackIndex === "number" && window.audioTrackIndex >= 0) {
        requiredTrackIndexes.add(window.audioTrackIndex);
      }
    }

    for (const track of proof.trackActivity) {
      if (!requiredTrackIndexes.has(track.audioTrackIndex)) continue;
      if (!track.sourcePath) blockers.push(`A${track.audioTrackIndex + 1}:NO_VALID_RMS_SOURCE_PATH`);
      const mappedBlockers = track.blockers.filter(isMappedTrackSourceBlocker);
      blockers.push(...mappedBlockers.map((blocker) => `A${track.audioTrackIndex + 1}:${blocker}`));
      if (track.windows.some((window) =>
        !Number.isFinite(window.sourceTimeSec)
        || !Number.isFinite(window.timelineStartSec)
        || !Number.isFinite(window.timelineEndSec)
        || !(window.timelineEndSec > window.timelineStartSec)
      )) {
        blockers.push(`A${track.audioTrackIndex + 1}:INCOMPLETE_TIMELINE_SOURCE_TIME_MAPPING`);
      }
    }

    return uniqueStrings(blockers);
  }

  function isGlobalSourceBlocker(blocker: string): boolean {
    return [
      "CEP_NODE_UNAVAILABLE",
      "FFMPEG_NOT_READY",
      "FFMPEG_UNAVAILABLE",
      "FFMPEG_VERSION_UNSUPPORTED",
      "FFMPEG_DIAGNOSTICS_FAILED",
    ].includes(blocker);
  }

  function isMappedTrackSourceBlocker(blocker: string): boolean {
    const code = blocker.split(":")[0];
    return [
      "NO_VALID_RMS_SOURCE_PATH",
      "INVALID_CLIP_TIMING",
      "AUDIO_STREAM_SELECTION_REQUIRED",
      "SELECTED_AUDIO_STREAM_NOT_FOUND",
      "NO_AUDIO_STREAM_DETECTED",
    ].includes(code);
  }

  function planMatchesTimeline(plan: PodcastCameraDecisionPlanProof, layout: PodcastTimelineLayout): boolean {
    return sequenceIdentityMatches(
      plan.sequenceId ?? null,
      plan.sequenceName ?? null,
      layout.sequenceId ?? null,
      layout.sequenceName ?? null,
    );
  }

  function sourceProofMatchesTimeline(proof: SpeakerSourceAttributionProof, layout: PodcastTimelineLayout): boolean {
    return proof.decisionSource === "ffmpeg-rms"
      && sequenceIdentityMatches(
        proof.sequenceId ?? null,
        proof.sequenceName ?? null,
        layout.sequenceId ?? null,
        layout.sequenceName ?? null,
      );
  }

  function sequenceIdentityFromDiagnostics(diagnostics: PodcastDiagnostics): { sequenceId: string | null; sequenceName: string | null } {
    return {
      sequenceId: diagnostics.sequenceId ?? null,
      sequenceName: diagnostics.sequenceName ?? null,
    };
  }

  function sequenceIdentityChanged(
    previous: { sequenceId: string | null; sequenceName: string | null },
    next: { sequenceId: string | null; sequenceName: string | null },
  ): boolean {
    return !sequenceIdentityMatches(previous.sequenceId, previous.sequenceName, next.sequenceId, next.sequenceName);
  }

  function sequenceIdentityMatches(
    leftId: string | null,
    leftName: string | null,
    rightId: string | null,
    rightName: string | null,
  ): boolean {
    if (leftId && rightId) return leftId === rightId;
    if (leftName && rightName) return leftName === rightName;
    return !leftId && !rightId && !leftName && !rightName;
  }

  function uniqueStrings(items: string[]): string[] {
    return Array.from(new Set(items));
  }

  async function runExecutionResearch(kind: "duplicate" | "disable" | "range" | "insert" | "reconstruct") {
    state.executionResearchLoading = kind;
    render();
    try {
      if (kind === "duplicate") state.executionResearchResult = await testSafeDuplicateSequence();
      if (kind === "disable") state.executionResearchResult = await testDisableEnableOnDuplicate();
      if (kind === "range") state.executionResearchResult = await testDisableTimeRangeOnDuplicate();
      if (kind === "insert") state.executionResearchResult = await testInsertOverwriteOnDuplicate();
      if (kind === "reconstruct") state.executionResearchResult = await testReconstructInsertOverwriteOnDuplicate();
    } catch (err) {
      state.executionResearchResult = {
        ok: false,
        test: kind,
        timelineMutation: "none",
        errors: [(err as Error).message],
        blockers: ["EXECUTION_RESEARCH_TEST_FAILED"],
      };
    } finally {
      state.executionResearchLoading = null;
      render();
    }
  }

  async function inspectAudioStreams() {
    state.streamProofLoading = true;
    render();
    try {
      state.streamProof = await inspectAudioStreamsForRmsSource(getAudioMappings());
      const streams = state.streamProof.ffprobeAudioStreams;
      state.selectedAudioStreamIndex = streams.length === 1 ? 0 : null;
    } catch (err) {
      state.streamProof = {
        ok: false,
        analyzedSourcePath: null,
        ffprobePath: null,
        ffprobeAudioStreams: [],
        autoSelectedAudioStreamIndex: null,
        selectedAudioStreamIndex: null,
        blockers: ["AUDIO_STREAM_SELECTION_PROOF_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
      state.selectedAudioStreamIndex = null;
    } finally {
      state.streamProofLoading = false;
      render();
    }
  }

  function buildPlan() {
    const parsed = parseSpeakerSegmentsJson(state.segmentsJson);
    if (parsed.errors.length) {
      return {
        decisions: [] as CameraDecision[],
        parsedSegmentsCount: 0,
        validSegmentsCount: 0,
        invalidSegmentsCount: 0,
        shortSegmentsMergedCount: 0,
        selectedExecutionStrategy: state.executionStrategy,
        blockers: parsed.errors,
        parseErrors: parsed.errors,
      };
    }
    const plan = generateCameraDecisionPlan({
      speakerSegments: parsed.segments,
      cameraMappings: getCameraMappings(),
      minimumShotLengthSec: state.minimumShotLengthSec,
      strategy: state.executionStrategy,
    });
    return { ...plan, parseErrors: [] as string[] };
  }

  function getCameraMappings(): CameraMapping[] {
    const visibleSpeakerIds = new Set([...getCameraMappingSpeakerIds(), "wide"]);
    const videoCount = Math.max(1, state.timelineLayout?.videoTracks.length ?? 0);
    return [...visibleSpeakerIds].flatMap((speakerId) => {
      const videoTrackIndex = getExplicitVideoTrackIndexForSpeaker(speakerId, videoCount);
      if (videoTrackIndex == null) return [];
      return [{
        speakerId,
        videoTrackIndex,
        cameraLabel: getCameraRoleLabel(videoTrackIndex),
        fallback: speakerId === "wide",
      }];
    });
  }

  function getCameraMappingSpeakerIds(): string[] {
    const activeSpeakerIds = new Set<string>();
    for (const segment of state.sourceAttributionProof?.trackSpeakingSegments ?? []) {
      if (segment.speakerId) activeSpeakerIds.add(segment.speakerId);
    }
    for (const window of state.sourceAttributionProof?.dominantTrackAtTime ?? []) {
      if (window.speakerId) activeSpeakerIds.add(window.speakerId);
    }
    if (activeSpeakerIds.size > 0) {
      return [...activeSpeakerIds].filter((speakerId) => speakerId !== "wide").sort(compareSpeakerIds);
    }
    return getAudioMappingSpeakerIds();
  }

  function ensureCameraMappingsForAudioTracks() {
    const videoCount = state.timelineLayout?.videoTracks.length ?? 0;
    if (videoCount <= 0) return;
    for (const [speakerId, videoTrackIndex] of Object.entries(state.mappings)) {
      if (!Number.isFinite(videoTrackIndex) || videoTrackIndex < 0 || videoTrackIndex >= videoCount) {
        delete state.mappings[speakerId];
      }
    }
  }

  function ensureDefaultCameraMappings() {
    if (state.cameraMappingTouched) return;
    const layout = state.timelineLayout;
    if (!layout) return;

    state.mappings = {};

    const videoTracks = layout.videoTracks ?? [];
    const audioTracks = layout.audioTracks ?? [];

    let wideTrackIndex: number | null = null;
    for (const track of videoTracks) {
      if (track.name && track.name.toLowerCase().includes("wide")) {
        wideTrackIndex = track.index;
        break;
      }
    }

    const activeVideoTracks = videoTracks.filter(trackHasClips);

    if (wideTrackIndex === null && videoTracks.length > 0) {
      if (activeVideoTracks.length > 0) {
        wideTrackIndex = activeVideoTracks[0].index;
      } else {
        wideTrackIndex = videoTracks[0].index;
      }
    }

    if (wideTrackIndex !== null) {
      state.mappings.wide = wideTrackIndex;
    }

    const activeAudioTracks = audioTracks.filter(trackHasClips);

    for (const aTrack of activeAudioTracks) {
      if (wideTrackIndex !== null && aTrack.index === wideTrackIndex) {
        continue;
      }
      const speakerId = `speaker_${aTrack.index + 1}`;
      const hasCorrespondingVideoWithClips = activeVideoTracks.some(vTrack => vTrack.index === aTrack.index);
      if (hasCorrespondingVideoWithClips) {
        state.mappings[speakerId] = aTrack.index;
      }
    }
  }

  function syncCameraMappingsFromDom() {
    const selects = page.querySelectorAll<HTMLSelectElement>("select[data-camera-speaker-id]");
    for (const select of selects) {
      const speakerId = select.dataset.cameraSpeakerId;
      if (!speakerId) continue;
      if (select.value === "") {
        delete state.mappings[speakerId];
        continue;
      }
      const videoTrackIndex = Number(select.value);
      if (Number.isFinite(videoTrackIndex)) {
        state.mappings[speakerId] = videoTrackIndex;
      }
    }
  }

  function getExplicitVideoTrackIndexForSpeaker(speakerId: string, videoTrackCount: number): number | null {
    if (typeof state.mappings[speakerId] === "number") {
      return Math.max(0, Math.min(state.mappings[speakerId], videoTrackCount - 1));
    }
    return null;
  }

  function formatMappedCameraLabel(speakerId: string): string {
    const videoTrackIndex = getExplicitVideoTrackIndexForSpeaker(
      speakerId,
      Math.max(1, state.timelineLayout?.videoTracks.length ?? state.diagnostics.videoTrackCount ?? 4),
    );
    return videoTrackIndex == null ? "Unmapped" : `V${videoTrackIndex + 1}`;
  }

  function getAudioMappings(): AudioTrackSpeakerMapping[] {
    return getCameraMappingSpeakerIds().filter((speakerId) =>
      typeof state.mappings[speakerId] === "number"
    ).map((speakerId) => {
      const fallbackAudioTrackIndex = speakerIndexFromId(speakerId);
      const audioTrackIndex = state.audioMappings[speakerId] ?? fallbackAudioTrackIndex;
      return {
        speakerId,
        audioTrackIndex,
        audioTrackLabel: `A${audioTrackIndex + 1}`,
      };
    });
  }

  function getAudioMappingSpeakerIds(): string[] {
    const activeAudioTracks = getActiveAudioTracks();
    if (activeAudioTracks.length > 0) {
      return activeAudioTracks.map((track) => `speaker_${track.index + 1}`);
    }
    const count = Math.max(
      state.timelineLayout?.audioTracks.length ?? 0,
      state.diagnostics.audioTrackCount ?? 0,
      Object.keys(state.audioMappings).length,
    );
    return Array.from({ length: count }, (_, index) => `speaker_${index + 1}`);
  }

  function ensureAudioMappingsForTimeline() {
    for (const speakerId of getAudioMappingSpeakerIds()) {
      if (typeof state.audioMappings[speakerId] === "number") continue;
      state.audioMappings[speakerId] = speakerIndexFromId(speakerId);
    }
  }

  function getActiveVideoTracks(): PodcastTrackInfo[] {
    return (state.timelineLayout?.videoTracks ?? []).filter(trackHasClips);
  }

  function getActiveAudioTracks(): PodcastTrackInfo[] {
    return (state.timelineLayout?.audioTracks ?? []).filter(trackHasClips);
  }

  function getSelectableVideoTracks(): PodcastTrackInfo[] {
    const activeTracks = getActiveVideoTracks();
    if (activeTracks.length > 0) return activeTracks;
    const tracks = state.timelineLayout?.videoTracks ?? [];
    if (tracks.length > 0) return tracks;
    const count = Math.max(1, state.diagnostics.videoTrackCount ?? 4);
    return Array.from({ length: count }, (_, index) => ({
      kind: "video",
      index,
      name: `Video ${index + 1}`,
      clipCount: 0,
    }));
  }

  async function refreshCaptionRuntime() {
    if (isProductionBusy()) return;
    state.captionRuntimeLoading = true;
    state.captionRuntimeProgress = { stage: "manifest", message: "Discovering the local runtime", percent: null };
    render();
    try {
      state.captionRuntime = await discoverCaptionRuntime();
    } catch (err) {
      state.captionRuntime = {
        status: "unsupported",
        manifest: null,
        manifestDigest: null,
        layout: null,
        selfTest: null,
        blockers: ["RUNTIME_DISCOVERY_FAILED", (err as Error).message],
        warnings: [],
      };
    } finally {
      state.captionRuntimeLoading = false;
      state.captionRuntimeProgress = null;
      render();
    }
  }

  async function provisionCaptionRuntime() {
    if (isProductionBusy()) return;
    state.captionRuntimeLoading = true;
    state.captionRuntimeProgress = { stage: "manifest", message: "Loading the runtime lock manifest", percent: null };
    render();
    try {
      const progress = (value: RuntimeProgress) => {
        state.captionRuntimeProgress = value;
        render();
      };
      
      const runtime = state.captionRuntime;
      if (runtime?.status === "repair-required") {
        state.captionRuntime = await repairCaptionRuntime(progress);
      } else {
        state.captionRuntime = await installCaptionRuntime(progress);
      }
    } catch (err) {
      state.captionRuntime = {
        status: "unsupported",
        manifest: null,
        manifestDigest: null,
        layout: null,
        selfTest: null,
        blockers: ["RUNTIME_PROVISION_FAILED", (err as Error).message],
        warnings: [],
      };
    } finally {
      state.captionRuntimeLoading = false;
      state.captionRuntimeProgress = null;
      render();
    }
  }

  async function runAutoCaptions() {
    if (isProductionBusy()) return;
    state.autoCaptionsLoading = true;
    state.autoCaptionsResult = null;
    render();
    try {
      state.autoCaptionsResult = await runPodcastAutoCaptions(
        state.autoCaptionsLanguage,
        state.autoCaptionsModel,
        (progress) => {
          state.captionRuntimeProgress = {
            stage: progress.stage,
            message: progress.message,
            percent: null,
          };
          render();
        }
      );
    } catch (err) {
      state.autoCaptionsResult = {
        ok: false,
        language: state.autoCaptionsLanguage,
        captionCount: 0,
        device: null,
        model: state.autoCaptionsModel,
        srtPath: null,
        captionTracksBefore: null,
        captionTracksAfter: null,
        blockers: [(err as Error).message],
      };
    } finally {
      state.autoCaptionsLoading = false;
      state.captionRuntimeProgress = null;
      render();
    }
  }

  function renderRuntimeDiagnosticsBox(runtime: RuntimeDiscoveryResult | null): HTMLElement | null {
    if (!runtime || !runtime.selfTest) return null;
    const st = runtime.selfTest;
    const loadFailed = st.whisperCudaLoadOk === false;
    const cudaWarnStyle = loadFailed || !st.cudaAvailable;
    
    return el("div.podcast-runtime-diagnostics", {
      style: {
        marginTop: "12px",
        padding: "10px",
        border: `1px solid ${cudaWarnStyle ? "#ffe0b2" : "#c8e6c9"}`,
        borderRadius: "6px",
        backgroundColor: cudaWarnStyle ? "#fff8e1" : "#e8f5e9",
        fontSize: "13px",
        color: "#333",
        width: "100%"
      }
    },
      el("strong", { style: { color: cudaWarnStyle ? "#e65100" : "#2e7d32", display: "block", marginBottom: "6px" } }, 
        cudaWarnStyle ? "⚠ Runtime Diagnostics (Limited CUDA / CPU Mode)" : "✓ Runtime Diagnostics (CUDA Acceleration Ready)"
      ),
      el("ul", { style: { margin: "0", paddingLeft: "16px", listStyleType: "square", lineHeight: "1.6" } },
        el("li", null, `GPU Name: ${st.gpuName || "Not Detected"}`),
        el("li", null, `GPU Vendor: ${st.gpuVendor || "Not Detected"}`),
        el("li", null, `CUDA Available: ${st.cudaAvailable ? "Yes" : "No"}`),
        el("li", null, `CUDA Version: ${st.cudaVersion || "Not Detected"}`),
        el("li", null, `cuDNN Version: ${st.cuDNNVersion || "Not Detected"}`),
        el("li", null, `CTranslate2 Device Detection: ${st.ctranslate2DeviceDetection || "N/A"}`),
        el("li", null, `Faster Whisper Device Detection: ${st.fasterWhisperDeviceDetection || "N/A"}`),
        el("li", null, `ctranslate2 CUDA DLL Load: ${st.whisperCudaLoadOk === true ? "Success" : (st.whisperCudaLoadOk === false ? "Failed (Fallback active)" : "N/A")}`),
        st.exactCudaError ? el("li", { style: { color: "#e65100", wordBreak: "break-all" } }, `CUDA Load Error: ${st.exactCudaError}`) : null,
        el("li", null, `Supported CUDA Precision: ${st.cudaComputeTypes?.join(", ") || "None"}`),
        el("li", null, `Supported CPU Precision: ${st.cpuComputeTypes?.join(", ") || "None"}`),
        el("li", null, `Python Engine: ${runtime.layout?.pythonPath || "N/A"}`),
        el("li", null, `Library Versions: faster-whisper v${st.fasterWhisperVersion || "N/A"} / ctranslate2 v${st.ctranslate2Version || "N/A"}`)
      )
    );
  }

  function renderAutoCaptionsTool(): HTMLElement {
    const runtime = state.captionRuntime;
    const progress = state.captionRuntimeProgress;
    const result = state.autoCaptionsResult;
    
    const statusLabel = runtime?.status === "ready"
      ? "Ready"
      : runtime?.status === "repair-required"
        ? "Repair required"
        : runtime?.status === "not-installed"
          ? "Not installed"
          : "Unavailable";
          
    const actionLabel = runtime?.status === "ready"
      ? "Runtime Installed ✓"
      : runtime?.status === "repair-required"
        ? "Repair Runtime"
        : "Install Runtime";
        
    const languageSelect = el("select.podcast-input", {
      disabled: isProductionBusy(),
      onChange: (event: Event) => {
        state.autoCaptionsLanguage = (event.currentTarget as HTMLSelectElement).value as CaptionLanguage;
        render();
      },
    },
      el("option", { value: "auto" }, "Auto Detect"),
      el("option", { value: "ar" }, "العربية"),
      el("option", { value: "en" }, "English"),
    );
    (languageSelect as HTMLSelectElement).value = state.autoCaptionsLanguage;
    
    const modelSelect = el("select.podcast-input", {
      disabled: isProductionBusy(),
      onChange: (event: Event) => {
        state.autoCaptionsModel = (event.currentTarget as HTMLSelectElement).value as CaptionModel;
        render();
      },
    },
      el("option", { value: "medium" }, "Standard (متوازن)"),
      el("option", { value: "large-v3-turbo" }, "Fast (سريع)"),
      el("option", { value: "large-v3" }, "Professional (احترافي)"),
    );
    (modelSelect as HTMLSelectElement).value = state.autoCaptionsModel;
    
    const busy = isProductionBusy();
    const runtimeReady = runtime?.status === "ready";
    
    const st = runtime?.selfTest;
    let preflightWarning: HTMLElement | null = null;
    if (st) {
      const isCudaMissing = !st.cudaAvailable || st.whisperCudaLoadOk === false;
      const gpuNameUpper = (st.gpuName || "").toUpperCase();
      const lowEndKeywords = [
        "GTX 1050", "GTX 1060", "GTX 1650", "GTX 1660", 
        "RTX 2050", "RTX 2060", "RTX 3050", 
        "MX150", "MX250", "MX350", "MX450", "MX550",
        "INTEL", "AMD", "RADEON", "UHD GRAPHICS", "IRIS"
      ];
      const isWeak = lowEndKeywords.some(keyword => gpuNameUpper.includes(keyword));
      
      if (state.autoCaptionsModel === "large-v3") {
        if (isCudaMissing) {
          preflightWarning = el("div.podcast-warning-box", {
            style: {
              marginTop: "8px",
              padding: "10px",
              border: "1px solid #ffccd5",
              borderRadius: "6px",
              backgroundColor: "#fff5f6",
              color: "#c62828",
              fontSize: "13px",
              lineHeight: "1.5",
              width: "100%"
            }
          }, 
            el("strong", { style: { display: "block", marginBottom: "4px" } }, "⚠ Warning: CPU Fallback Speed Alert"),
            "Running the Professional level (large-v3) model on CPU will be extremely slow. CUDA acceleration is not functional."
          );
        } else if (isWeak) {
          preflightWarning = el("div.podcast-warning-box", {
            style: {
              marginTop: "8px",
              padding: "10px",
              border: "1px solid #ffe0b2",
              borderRadius: "6px",
              backgroundColor: "#fff8e1",
              color: "#e65100",
              fontSize: "13px",
              lineHeight: "1.5",
              width: "100%"
            }
          },
            el("strong", { style: { display: "block", marginBottom: "4px" } }, "⚠ Warning: Low-Spec GPU Alert"),
            "Running the Professional level model on a lower-spec GPU may freeze or crash Premiere Pro due to high VRAM usage. Standard or Fast is recommended."
          );
        }
      } else if (state.autoCaptionsModel === "medium") {
        if (isCudaMissing) {
          preflightWarning = el("div.podcast-warning-box", {
            style: {
              marginTop: "8px",
              padding: "10px",
              border: "1px solid #ffccd5",
              borderRadius: "6px",
              backgroundColor: "#fff5f6",
              color: "#c62828",
              fontSize: "13px",
              lineHeight: "1.5",
              width: "100%"
            }
          },
            el("strong", { style: { display: "block", marginBottom: "4px" } }, "⚠ Warning: CPU Fallback Speed Alert"),
            "Running the Standard level (medium) model on CPU will be slow. CUDA acceleration is not functional."
          );
        }
      }
    }
    
    return el("div.podcast-production-card", { id: "podcast-auto-captions-tool" },
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "Auto Captions"),
          el("p", null, "Create editable Arabic subtitles locally with faster-whisper. Reap is not used."),
        ),
      ),
      el("div.podcast-settings-grid", null,
        el("label.podcast-field", null, el("span", null, "Language"), languageSelect),
        el("label.podcast-field", null, el("span", null, "Subtitles Level"), modelSelect),
      ),
      preflightWarning,
      el("div.podcast-summary-grid.podcast-summary-grid--compact", null,
        renderSummaryTile("Language", state.autoCaptionsLanguage === "ar" ? "Arabic" : state.autoCaptionsLanguage === "en" ? "English" : "Auto Detect"),
        renderSummaryTile("Engine", "faster-whisper"),
        renderSummaryTile("Level", modelTiers[state.autoCaptionsModel] || state.autoCaptionsModel),
        renderSummaryTile("Audio", "Automatic (A1)"),
        renderSummaryTile("Captions", result ? String(result.captionCount) : "Waiting"),
        renderSummaryTile("Runtime Status", statusLabel),
      ),
      el("div.podcast-action-row", null,
        el("button.btn-secondary", {
          disabled: busy || runtimeReady,
          onClick: provisionCaptionRuntime,
        }, (state.captionRuntimeLoading && progress && progress.stage !== "self-test") ? `${progress.message} (${progress.percent || 0}%)` : actionLabel),
        el("button.btn-primary", {
          disabled: busy || !runtimeReady,
          onClick: runAutoCaptions,
        }, state.autoCaptionsLoading ? "Generating Arabic Captions..." : "Generate Arabic Captions"),
      ),
      renderRuntimeDiagnosticsBox(runtime),
      state.autoCaptionsLoading && progress
        ? el("div", { style: { width: "100%" } },
            progress.percent !== null
              ? el("div.podcast-progress-container", { style: { marginTop: "12px", width: "100%" } },
                  el("div.podcast-progress-bar", { style: { height: "6px", backgroundColor: "#ddd", borderRadius: "3px", overflow: "hidden", width: "100%" } },
                    el("div.podcast-progress-fill", { style: { height: "100%", width: `${progress.percent}%`, backgroundColor: "#0070f3", transition: "width 0.3s ease" } })
                  ),
                  el("div.podcast-message", { style: { marginTop: "8px", fontSize: "14px", fontWeight: "bold" } }, `${progress.message} (${progress.percent}%)`)
                )
              : el("div.podcast-progress-container", { style: { marginTop: "12px", width: "100%" } },
                  el("div.podcast-message", { style: { marginTop: "8px", fontSize: "14px", fontWeight: "bold" } }, progress.message)
                ),
            renderProcessingLoader(progress.message)
          )
        : null,
      state.captionRuntimeLoading && progress && progress.stage !== "self-test"
        ? el("div", { style: { width: "100%" } },
            el("div.podcast-progress-container", { style: { marginTop: "12px", width: "100%" } },
              el("div.podcast-progress-bar", { style: { height: "6px", backgroundColor: "#ddd", borderRadius: "3px", overflow: "hidden", width: "100%" } },
                el("div.podcast-progress-fill", { style: { height: "100%", width: `${progress.percent || 0}%`, backgroundColor: "#0070f3", transition: "width 0.3s ease" } })
              ),
              el("div.podcast-message", { style: { marginTop: "8px", fontSize: "14px", fontWeight: "bold" } }, `${progress.message} (${progress.percent || 0}%)`)
            ),
            renderProcessingLoader(progress.message)
          )
        : null,
      result ? el("div", null,
        el("div.podcast-message", {
          style: {
            marginTop: "8px",
            color: !result.ok
              ? "#c62828"
              : (result.diagnostics?.fallbackOccurred ? "#d65d00" : "#2e7d32")
          }
        },
          !result.ok
            ? `Failed to create captions: ${result.blockers.join(" | ")}`
            : (result.diagnostics?.fallbackOccurred
                ? `Captions created with CPU Fallback! Count: ${result.captionCount} (CUDA failed)`
                : `Captions created successfully! Count: ${result.captionCount}`)
        ),
        result.diagnostics?.fallbackOccurred
          ? el("div.podcast-warning-box", { style: { marginTop: "12px", padding: "8px", border: "1px solid #ffe0b2", borderRadius: "4px", backgroundColor: "#fff8e1", color: "#d65d00", fontSize: "13px", lineHeight: "1.5" } },
              el("strong", { style: { color: "#e65100" } }, "⚠ Warning: Running on CPU Fallback!"),
              el("div", { style: { marginTop: "4px" } }, `Whisper CUDA execution failed. Fallback to CPU occurred.`),
              el("div", { style: { fontSize: "12px", color: "#666", marginTop: "2px" } }, `Reason: ${result.diagnostics.fallbackReason}`)
            )
          : null,
        result.diagnostics
          ? el("div.podcast-one-click-diagnostics", { style: { marginTop: "12px", padding: "8px", border: "1px solid #ffe0b2", borderRadius: "4px", backgroundColor: "#fff8e1", fontSize: "13px", color: "#333" } },
              el("strong", null, "Caption Diagnostics Timing:"),
              el("ul", { style: { margin: "4px 0 0 0", paddingLeft: "16px", listStyleType: "square", lineHeight: "1.6" } },
                el("li", null, `Selected Tier: ${result.diagnostics.selectedTier || "N/A"}`),
                el("li", null, `Selected Model: ${result.diagnostics.selectedModel || "N/A"}`),
                el("li", null, `Selected Model Path: ${result.diagnostics.selectedModelPath || "N/A"}`),
                el("li", null, `Device: ${result.diagnostics.device || "N/A"}`),
                el("li", null, `Compute Type: ${result.diagnostics.computeType || "N/A"}`),
                el("li", null, `Audio Duration: ${result.diagnostics.audioDurationSec !== undefined ? result.diagnostics.audioDurationSec.toFixed(2) + "s" : "N/A"}`),
                el("li", null, `Transcription Duration: ${result.diagnostics.transcriptionDurationSec !== undefined ? result.diagnostics.transcriptionDurationSec.toFixed(2) + "s" : "N/A"}`),
                el("li", null, `Realtime Factor: ${result.diagnostics.realtimeFactor !== undefined ? result.diagnostics.realtimeFactor.toFixed(3) : "N/A"}`),
                el("li", null, `CPU/GPU Fallback: ${result.diagnostics.fallbackOccurred ? "Yes (" + (result.diagnostics.fallbackReason || "unknown") + ")" : "No"}`),
                el("li", null, `GPU Name: ${result.diagnostics.gpuName || "Unknown"}`),
                el("li", null, `CUDA Available: ${result.diagnostics.cudaAvailable ? "Yes" : "No"}`),
                el("li", null, `CUDA Version: ${result.diagnostics.cudaVersion || "N/A"}`),
                el("li", null, `CTranslate2 Version: ${result.diagnostics.ctranslate2Version || "N/A"}`),
                el("li", null, `Faster Whisper Version: ${result.diagnostics.fasterWhisperVersion || "N/A"}`),
                result.diagnostics.exactCudaError ? el("li", { style: { color: "#c62828", wordBreak: "break-all" } }, `Exact CUDA Error: ${result.diagnostics.exactCudaError}`) : null,
                el("li", null, `Audio Extraction Time: ${result.diagnostics.audioExtractionTimeMs}ms`),
                el("li", null, `WAV Duration: ${result.diagnostics.wavDurationSec?.toFixed(2)}s`),
                el("li", null, `WAV Size: ${(result.diagnostics.wavSizeBytes / 1024).toFixed(2)} KB`),
                el("li", null, `Whisper Start: ${result.diagnostics.whisperStartTime}`),
                el("li", null, `Whisper End: ${result.diagnostics.whisperEndTime}`),
                el("li", null, `Whisper Duration: ${(result.diagnostics.whisperDurationMs / 1000).toFixed(2)}s`),
                el("li", null, `SRT Write Time: ${result.diagnostics.srtWriteTimeMs}ms`),
                el("li", null, `JSON Write Time: ${result.diagnostics.jsonWriteTimeMs}ms`),
                el("li", null, `Caption Import Start: ${result.diagnostics.captionImportStartTime}`),
                el("li", null, `Caption Import End: ${result.diagnostics.captionImportEndTime}`),
                el("li", null, `Caption Import Duration: ${result.diagnostics.captionImportDurationMs}ms`),
                el("li", null, `Verification Start: ${result.diagnostics.verificationStartTime}`),
                el("li", null, `Verification End: ${result.diagnostics.verificationEndTime}`),
                el("li", null, `Verification Duration: ${result.diagnostics.verificationDurationMs}ms`)
              )
            )
          : null
      ) : null
    );
  }

  function renderOneClickTool(): HTMLElement {
    const busy = isProductionBusy();
    const progress = state.oneClickProgress;
    const result = state.oneClickResult;
    
    return el("div.podcast-production-card", { id: "podcast-one-click-tool" },
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "One Click Podcast Edit"),
          el("p", null, "Run the podcast editing pipeline (Multi-Cam Switch → Auto Captions) in a single click."),
        ),
      ),
      el("div.podcast-settings-grid", { style: { marginBottom: "12px" } },
        renderField("Auto Captions",
          el("label.podcast-toggle", null,
            el("input", {
              type: "checkbox",
              checked: !state.oneClickSkipCaptions,
              disabled: state.oneClickFastMode || busy,
              onChange: (event: Event) => {
                state.oneClickSkipCaptions = !(event.currentTarget as HTMLInputElement).checked;
                render();
              },
            }),
            el("span", null, "Generate Auto Captions (توليد الكابشنز)"),
          )
        ),
        renderField("Fast Mode",
          el("label.podcast-toggle", null,
            el("input", {
              type: "checkbox",
              checked: state.oneClickFastMode,
              disabled: busy,
              onChange: (event: Event) => {
                state.oneClickFastMode = (event.currentTarget as HTMLInputElement).checked;
                render();
              },
            }),
            el("span", null, "Fast Mode (الوضع السريع)"),
          )
        )
      ),
      renderRuntimeDiagnosticsBox(state.captionRuntime),
      el("div.podcast-action-row", null,
        el("button.btn-primary", {
          disabled: busy,
          onClick: runOneClickPodcastEdit,
        }, state.oneClickLoading ? "Processing Pipeline..." : "Run One Click Edit"),
      ),
      state.oneClickLoading && progress
        ? el("div", { style: { width: "100%" } },
            progress.percent !== null
              ? el("div.podcast-progress-container", { style: { marginTop: "12px", width: "100%" } },
                  el("div.podcast-progress-bar", { style: { height: "6px", backgroundColor: "#ddd", borderRadius: "3px", overflow: "hidden", width: "100%" } },
                    el("div.podcast-progress-fill", { style: { height: "100%", width: `${progress.percent}%`, backgroundColor: "#0070f3", transition: "width 0.3s ease" } })
                  ),
                  el("div.podcast-message", { style: { marginTop: "8px", fontSize: "14px", fontWeight: "bold" } }, `${progress.message} (${progress.percent}%)`)
                )
              : el("div.podcast-progress-container", { style: { marginTop: "12px", width: "100%" } },
                  el("div.podcast-message", { style: { marginTop: "8px", fontSize: "14px", fontWeight: "bold" } }, progress.message)
                ),
            renderProcessingLoader(progress.message)
          )
        : null,
      result
        ? el("div.podcast-one-click-results", { style: { marginTop: "16px", padding: "12px", border: "1px solid #eaeaea", borderRadius: "8px", backgroundColor: "#fafafa", width: "100%" } },
            el("h4", {
              style: {
                margin: "0 0 8px 0",
                color: !result.success
                  ? "#c62828"
                  : (result.captionDiagnostics?.fallbackOccurred ? "#d65d00" : "#2e7d32")
              }
            },
              !result.success
                ? "One Click Edit Failed ✗"
                : (result.captionDiagnostics?.fallbackOccurred ? "One Click Edit Complete (with CPU Fallback) ⚠" : "One Click Edit Complete ✓")
            ),
            el("ul", { style: { margin: "0", paddingLeft: "20px", fontSize: "14px", lineHeight: "1.6" } },
              el("li", null, `Target Sequence: ${result.sequenceName}`),
              el("li", null, `Total Time: ${Math.round(result.totalRuntime / 1000)}s`),
              el("li", null, `Steps Completed: ${result.completedSteps.join(", ") || "none"}`),
              result.skippedSteps && result.skippedSteps.length ? el("li", { style: { color: "#e65100" } }, `Steps Skipped: ${result.skippedSteps.join(", ")} (${result.skipReason || ""})`) : null,
              result.failedSteps.length ? el("li", { style: { color: "#c62828" } }, `Steps Failed: ${result.failedSteps.join(", ")}`) : null,
              el("li", null, `Camera switch cuts made: ${result.switchesApplied}`),
              el("li", null, `Captions created: ${result.captionsCreated}`)
            ),
            result.captionDiagnostics?.fallbackOccurred
              ? el("div.podcast-warning-box", { style: { marginTop: "12px", padding: "8px", border: "1px solid #ffe0b2", borderRadius: "4px", backgroundColor: "#fff8e1", color: "#d65d00", fontSize: "13px", lineHeight: "1.5" } },
                  el("strong", { style: { color: "#e65100" } }, "⚠ Warning: Running on CPU Fallback!"),
                  el("div", { style: { marginTop: "4px" } }, `Whisper CUDA execution failed. Fallback to CPU occurred.`),
                  el("div", { style: { fontSize: "12px", color: "#666", marginTop: "2px" } }, `Reason: ${result.captionDiagnostics.fallbackReason}`)
                )
              : null,
            Object.keys(result.errorMessages).length
              ? el("div.podcast-one-click-errors", { style: { marginTop: "12px", padding: "8px", border: "1px solid #ffccd5", borderRadius: "4px", backgroundColor: "#fff5f6", color: "#d9383a", fontSize: "13px" } },
                  el("strong", null, "Errors/Warnings:"),
                  el("ul", { style: { margin: "4px 0 0 0", paddingLeft: "16px" } },
                    ...Object.entries(result.errorMessages).map(([step, msg]) => el("li", null, `[${step}] ${msg}`))
                  )
                )
              : null,
            result.captionDiagnostics
              ? el("div.podcast-one-click-diagnostics", { style: { marginTop: "12px", padding: "8px", border: "1px solid #ffe0b2", borderRadius: "4px", backgroundColor: "#fff8e1", fontSize: "13px", color: "#333", width: "100%" } },
                  el("strong", null, "Caption Diagnostics Timing:"),
                  el("ul", { style: { margin: "4px 0 0 0", paddingLeft: "16px", listStyleType: "square", lineHeight: "1.6" } },
                    el("li", null, `Selected Tier: ${result.captionDiagnostics.selectedTier || "N/A"}`),
                    el("li", null, `Selected Model: ${result.captionDiagnostics.selectedModel || "N/A"}`),
                    el("li", null, `Selected Model Path: ${result.captionDiagnostics.selectedModelPath || "N/A"}`),
                    el("li", null, `Device: ${result.captionDiagnostics.device || "N/A"}`),
                    el("li", null, `Compute Type: ${result.captionDiagnostics.computeType || "N/A"}`),
                    el("li", null, `Audio Duration: ${result.captionDiagnostics.audioDurationSec !== undefined ? result.captionDiagnostics.audioDurationSec.toFixed(2) + "s" : "N/A"}`),
                    el("li", null, `Audio Extraction Time: ${result.captionDiagnostics.audioExtractionTimeMs}ms`),
                    el("li", null, `WAV Duration: ${result.captionDiagnostics.wavDurationSec?.toFixed(2)}s`),
                    el("li", null, `WAV Size: ${(result.captionDiagnostics.wavSizeBytes / 1024).toFixed(2)} KB`),
                    el("li", null, `Whisper Start: ${result.captionDiagnostics.whisperStartTime}`),
                    el("li", null, `Whisper End: ${result.captionDiagnostics.whisperEndTime}`),
                    el("li", null, `Whisper Duration: ${(result.captionDiagnostics.whisperDurationMs / 1000).toFixed(2)}s`),
                    el("li", null, `Transcription Duration: ${result.captionDiagnostics.transcriptionDurationSec !== undefined ? result.captionDiagnostics.transcriptionDurationSec.toFixed(2) + "s" : "N/A"}`),
                    el("li", null, `Realtime Factor: ${result.captionDiagnostics.realtimeFactor !== undefined ? result.captionDiagnostics.realtimeFactor.toFixed(3) : "N/A"}`),
                    el("li", null, `CPU/GPU Fallback: ${result.captionDiagnostics.fallbackOccurred ? "Yes (" + (result.captionDiagnostics.fallbackReason || "unknown") + ")" : "No"}`),
                    el("li", null, `GPU Name: ${result.captionDiagnostics.gpuName || "Unknown"}`),
                    el("li", null, `CUDA Available: ${result.captionDiagnostics.cudaAvailable ? "Yes" : "No"}`),
                    el("li", null, `CUDA Version: ${result.captionDiagnostics.cudaVersion || "N/A"}`),
                    el("li", null, `CTranslate2 Version: ${result.captionDiagnostics.ctranslate2Version || "N/A"}`),
                    el("li", null, `Faster Whisper Version: ${result.captionDiagnostics.fasterWhisperVersion || "N/A"}`),
                    result.captionDiagnostics.exactCudaError ? el("li", { style: { color: "#c62828", wordBreak: "break-all" } }, `Exact CUDA Error: ${result.captionDiagnostics.exactCudaError}`) : null,
                    el("li", null, `SRT Write Time: ${result.captionDiagnostics.srtWriteTimeMs}ms`),
                    el("li", null, `JSON Write Time: ${result.captionDiagnostics.jsonWriteTimeMs}ms`),
                    el("li", null, `Caption Import Start: ${result.captionDiagnostics.captionImportStartTime}`),
                    el("li", null, `Caption Import End: ${result.captionDiagnostics.captionImportEndTime}`),
                    el("li", null, `Caption Import Duration: ${result.captionDiagnostics.captionImportDurationMs}ms`),
                    el("li", null, `Verification Start: ${result.captionDiagnostics.verificationStartTime}`),
                    el("li", null, `Verification End: ${result.captionDiagnostics.verificationEndTime}`),
                    el("li", null, `Verification Duration: ${result.captionDiagnostics.verificationDurationMs}ms`)
                  )
                )
              : null
          )
        : null
    );
  }

  async function runOneClickPodcastEdit() {
    if (isProductionBusy()) return;
    
    state.oneClickLoading = true;
    state.oneClickProgress = { stage: "setup", message: "Preparing pipeline settings...", percent: 0 };
    state.oneClickResult = null;
    render();
    
    try {
      const nextDiagnostics = await getPodcastDiagnostics();
      state.diagnostics = nextDiagnostics;
      if (!state.diagnostics.activeSequence) {
        throw new Error("No active sequence found in Premiere Pro.");
      }
      
      const layout = await analyzeTimelineLayout();
      state.timelineLayout = layout;
      
      const activeSeqName = layout.sequenceName || "";
      if (isAutoSwitchDraftName(activeSeqName) || activeSeqName.includes("Saad Studio Draft")) {
        throw new Error("Cannot run One Click Edit on an existing draft sequence. Please select your original source sequence.");
      }
      
      ensureAudioMappingsForTimeline();
      ensureDefaultCameraMappings();
      
      const audioMappings = getAudioMappings();
      if (audioMappings.length === 0) {
        throw new Error("Audio track speaker mappings are required for camera switching.");
      }
      
      state.oneClickProgress = { stage: "attribution", message: "Analyzing speaker activity...", percent: 2 };
      render();
      const sourceProof = await runSpeakerSourceAttributionProof(audioMappings, state.selectedAudioStreamIndex);
      const boundProof = bindSourceAttributionToTimeline(sourceProof, layout);
      ensureCameraMappingsForAudioTracks();
      const sourceBlockers = getMappedTrackSourceBlockers(boundProof);
      if (sourceBlockers.length > 0) {
        throw new Error(`Speaker source attribution failed: ${sourceBlockers.join(" | ")}`);
      }
      
      const result = await runOneClickPodcastEditService({
        dominantTrackAtTime: boundProof.dominantTrackAtTime,
        overlaps: boundProof.overlaps,
        trackSpeakingSegments: boundProof.trackSpeakingSegments,
        cameraMappings: getCameraMappings(),
        minimumShotLengthSec: state.minimumShotLengthSec,
        selectedAudioStreamIndex: state.selectedAudioStreamIndex,
        timelineDurationSec: layout.sequenceDurationSec ?? boundProof.analyzedDurationSec,
        videoTrackCount: layout.videoTracks.length,
        autoCaptionsLanguage: state.autoCaptionsLanguage,
        autoCaptionsModel: state.autoCaptionsModel,
        skipCaptions: state.oneClickSkipCaptions || state.oneClickFastMode,
        fastMode: state.oneClickFastMode,
        
        excludedSourceVideoTrackIndex: state.mappings.wide !== undefined ? state.mappings.wide : null,
        enableTransitionalWide: state.enableTransitionalWide,
        transitionalWideDurationSec: state.transitionalWideDurationSec,
        maxSingleCameraRunSec: state.maxSingleCameraRunSec,
        wideCutawayDurationSec: state.wideCutawayDurationSec,
      }, (progress) => {
        state.oneClickProgress = progress;
        render();
      });
      
      state.oneClickResult = result;
    } catch (err) {
      state.oneClickProgress = null;
      state.oneClickResult = {
        success: false,
        sequenceName: "Failed Pipeline",
        completedSteps: [],
        failedSteps: ["multi-cam-switch", "auto-captions"],
        skippedSteps: [],
        skipReason: "",
        switchesApplied: 0,
        captionsCreated: 0,
        totalRuntime: 0,
        errorMessages: {
          pipeline: (err as Error).message,
        },
      };
    } finally {
      state.oneClickLoading = false;
      try {
        state.timelineLayout = await analyzeTimelineLayout();
      } catch (eLayout) {}
      render();
    }
  }
}

function trackHasClips(track: PodcastTrackInfo): boolean {
  return (track.clipCount ?? 0) > 0;
}

function compareSpeakerIds(a: string, b: string): number {
  return speakerIndexFromId(a) - speakerIndexFromId(b) || a.localeCompare(b);
}

function speakerIndexFromId(speakerId: string): number {
  const match = speakerId.match(/speaker_(\d+)/);
  return match ? Math.max(0, Number(match[1]) - 1) : 0;
}

function formatSeconds(value: number): string {
  return `${Math.round(value * 1000) / 1000}s`;
}

function formatOptionalSeconds(value: number | undefined): string {
  return value == null ? "null" : formatSeconds(value);
}

function createEmptyApplyTrace(): ApplyTrace {
  return {
    lastCheckpoint: "NOT_STARTED",
    checkpoints: [],
    decisionCountPassedToApply: 0,
    executionStrategyUsed: null,
    duplicateSequenceCalled: false,
    duplicateSequenceResult: "not-started",
    applyCameraDecisionsCalled: false,
    applyCameraDecisionsResult: "not-started",
    error: null,
  };
}

function pushApplyCheckpoint(trace: ApplyTrace, checkpoint: ApplyCheckpoint) {
  trace.lastCheckpoint = checkpoint;
  trace.checkpoints.push(checkpoint);
}

function formatSpeakerSegmentsPerMic(
  items: NonNullable<PodcastCameraDecisionPlanProof["diagnostics"]>["speakerSegmentsPerMicrophone"] | undefined,
): string {
  if (!Array.isArray(items) || !items.length) return "None";
  return items.map((item) => `A${item.audioTrackIndex + 1}:${item.segments}`).join(", ");
}

function formatApplyDecisionDiagnostics(
  items: ApplyCameraDecisionsVisualOnlyResult["segmentResults"] | undefined,
): string {
  if (!Array.isArray(items) || !items.length) return "None";
  return items.slice(0, 8).map((item) => {
    const valid = item.isValidTiming === false ? `invalid:${item.invalidReason || "unknown"}` : "valid";
    const clip = item.matchingSourceClipFound ? `${item.matchingClipName || item.clipName}` : "no-clip";
    return `#${item.decisionIndex} ${item.cameraLabel} V${(item.videoTrackIndex ?? -1) + 1} ${formatSeconds(item.decisionStartSec)}-${formatSeconds(item.decisionEndSec)} ${valid} ${clip} overlap=${formatSeconds(item.overlapDurationSec ?? 0)}`;
  }).join(" | ");
}

function sourcePathSummary(sources: AudioSourceInfo[]): string {
  const paths = sources.map((source) => source.sourcePath).filter(Boolean);
  return paths.length ? paths.join(" | ") : "none";
}

function compactText(value: string): string {
  return value.length > 6000 ? `${value.slice(0, 6000)}\n... output truncated ...` : value;
}

function clipCountsSummary(layout: PodcastTimelineLayout | null): string {
  if (!layout) return "not-analyzed";
  const video = layout.videoTracks.map((track) => `V${track.index + 1}:${track.clipCount ?? 0}`);
  const audio = layout.audioTracks.map((track) => `A${track.index + 1}:${track.clipCount ?? 0}`);
  return [...video, ...audio].join(", ") || "0";
}

function duplicateResultText(result: PodcastAdapterResult | null): string {
  if (!result) return "Not run";
  if (result.ok) return result.message ?? "Safe edit copy created.";
  return result.reason ?? "Duplicate failed.";
}

function compactList(values: Array<string | null> | undefined): string {
  if (!values || values.length === 0) return "[]";
  return values.map((value) => value ?? "null").join(", ");
}

function safeCopyBlockers(activeSequence: boolean, decisionCount: number, confirmed: boolean): string[] {
  const blockers: string[] = [];
  if (!activeSequence) blockers.push("No active sequence.");
  if (decisionCount === 0) blockers.push("Camera Decision Plan is empty.");
  if (!confirmed) blockers.push("Safe copy mode is not confirmed.");
  return blockers;
}
