import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
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
import { runSilenceRemovalDraft, type SilenceRemovalRunResult } from "../lib/podcast/services/silence-removal-service";
import {
  analyzeSynchronizationPlan,
  applySynchronizationOffsets,
  type SynchronizationApplyResult,
  type SynchronizationPlan,
} from "../lib/podcast/services/synchronization-service";
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

const SILENCE_PRESETS = [
  { id: "aggressive", label: "Aggressive", thresholdDb: -30, minimumDurationSec: 0.25, minimumCutGapSec: 0.5, minimumKeepSegmentDurationSec: 1 },
  { id: "normal", label: "Normal", thresholdDb: -35, minimumDurationSec: 0.4, minimumCutGapSec: 0.7, minimumKeepSegmentDurationSec: 1.5 },
  { id: "conservative", label: "Conservative", thresholdDb: -40, minimumDurationSec: 0.6, minimumCutGapSec: 0.9, minimumKeepSegmentDurationSec: 2 },
];

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
    silenceRemovalLoading: false,
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
    silenceRemovalResult: null as SilenceRemovalRunResult | null,
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
    silenceThresholdDb: -35,
    minimumSilenceDurationSec: 0.4,
    minimumCutGapSec: 0.7,
    minimumKeepSegmentDurationSec: 1.5,
    mergeAdjacentKeepGapSec: 0.7,
    silencePaddingBeforeSec: 0.08,
    silencePaddingAfterSec: 0.12,
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
  };

  const page = el("div.app-main");
  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Podcast Automation"),
    page,
  );

  render();
  void refreshDiagnostics();
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
      renderSilenceRemovalTool(),
      renderProductionSummary(),
    );
  }

  function renderProductionToolCards(): HTMLElement {
    return el("div.podcast-tool-grid", null,
      renderPodcastToolCard("Synchronize", "Ready", "Check timeline sync before camera switching.", true),
      renderPodcastToolCard("Multi-Cam Auto Switch", "Ready", "Switch cameras from speaker activity.", true),
      renderPodcastToolCard("Silence Removal", "Ready", "Detect pauses and prepare tighter podcast cuts.", true),
      renderPodcastToolCard("Auto Zoom", "Coming soon", "Add subtle zoom moments for emphasis.", false),
      renderPodcastToolCard("Auto Captions", "Coming soon", "Generate captions for podcast clips.", false),
      renderPodcastToolCard("One Click Podcast Edit", "Coming soon", "Combine switching, silence cleanup, captions, and zoom.", false),
    );
  }

  function renderPodcastToolCard(title: string, status: string, description: string, active: boolean): HTMLElement {
    const targetId = title === "Multi-Cam Auto Switch"
      ? "podcast-multicam-tool"
      : title === "Synchronize"
        ? "podcast-synchronize-tool"
      : title === "Silence Removal"
        ? "podcast-silence-tool"
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
        renderSummaryTile("Applied", state.synchronizationApplyResult
          ? `${state.synchronizationApplyResult.clipsMoved} clips`
          : "Not applied"),
      ),
      renderSynchronizationMessages(plan),
    );
  }

  function renderSynchronizationMessages(plan: SynchronizationPlan | null): HTMLElement {
    const messages: string[] = [];
    if (!plan) {
      messages.push("Run Analyze Sync first. No clips will be moved.");
    } else {
      if (plan.blockers.length) messages.push(`Sync blocked: ${plan.blockers.join(", ")}`);
      if (plan.warnings.length) messages.push(`Warnings: ${plan.warnings.join(", ")}`);
      if (!plan.blockers.length && plan.offsetsReady) {
        messages.push("Waveform offsets were calculated automatically from the timeline audio. No clips were moved yet.");
      }
      if (!plan.blockers.length && !plan.offsetsReady) {
        messages.push("Timeline was read, but waveform offsets are not ready yet.");
      }
      if (state.synchronizationApplyResult?.ok) {
        messages.push(`Sync applied on the current sequence: ${state.synchronizationApplyResult.clipsMoved} clips moved.`);
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

  function renderSilenceSummary(): HTMLElement | null {
    const result = state.silenceRemovalResult;
    if (!result) return null;
    const diagnostics = result.analysis.silenceDetectionDiagnostics;
    return el("div.podcast-summary-grid.podcast-summary-grid--compact", null,
      renderSummaryTile("Sequence duration", formatSeconds(result.analysis.sequenceDurationSec ?? 0)),
      renderSummaryTile("Analyzed duration", formatSeconds(result.analysis.analyzedDurationSec)),
      renderSummaryTile("Detected pauses", String(diagnostics?.detectedSilenceSegments.length ?? result.analysis.silenceSegments.length)),
      renderSummaryTile("Rejected pauses", String(diagnostics?.rejectedSilenceSegments.length ?? result.analysis.droppedSilenceSegments?.length ?? 0)),
      renderSummaryTile("Cut pauses", String(result.analysis.silenceSegments.filter((segment) => segment.cutEligible !== false).length)),
      renderSummaryTile("Removed duration", formatSeconds(result.analysis.totalRemovedDurationSec)),
      renderSummaryTile("Kept segments", String(result.analysis.keepSegments.length)),
      renderSummaryTile("Threshold", `${diagnostics?.thresholdUsed ?? state.silenceThresholdDb} dB`),
      renderSummaryTile("Min duration", formatSeconds(diagnostics?.minimumDurationUsed ?? state.minimumSilenceDurationSec)),
      renderSummaryTile("Timeline", result.apply?.ok ? "Current sequence updated" : "Waiting"),
    );
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
        renderField("Minimum Shot Length",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.5",
            value: String(state.minimumShotLengthSec),
            onInput: (event: Event) => {
              state.minimumShotLengthSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
      ),
    );
  }

  function renderProductionActions(): HTMLElement {
    const currentPlan = getCurrentCameraDecisionPlan();
    const hasPlan = (currentPlan?.cameraDecisions.length ?? 0) > 0
      && (currentPlan?.blockers.length ?? 0) === 0;
    const busy = isProductionBusy();
    return el("div.podcast-production-block.podcast-production-block--actions", null,
      el("div.podcast-action-row", null,
        el("button.btn-secondary", { disabled: busy, onClick: analyzeLayout },
          state.timelineLoading ? "Analyzing..." : "Analyze Timeline"),
        el("button.btn-secondary", { disabled: busy, onClick: previewAutoSwitch },
          state.previewAutoSwitchLoading ? "Previewing..." : "Preview Auto Switch"),
        el("button.btn-primary", {
          disabled: !hasPlan || busy,
          onClick: runApplyCameraDecisionsPrototype,
        }, state.applyCameraDecisionsLoading ? "Applying..." : "Apply Auto Switch"),
      ),
      el("div.podcast-status-strip", null,
        renderStatusPill("Timeline", state.timelineLayout ? readableTimelineStatus() : "Not analyzed"),
        renderStatusPill("Preview", readablePreviewStatus()),
        renderStatusPill("Output", state.applyCameraDecisionsResult?.ok ? "Draft created" : "Waiting"),
      ),
    );
  }

  function renderSilenceRemovalTool(): HTMLElement {
    const busy = isProductionBusy();
    return el("div.podcast-production-card", { id: "podcast-silence-tool" },
      el("div.podcast-section-head", null,
        el("div", null,
          el("h3", null, "Silence Removal"),
          el("p", null, "Automatically detect pauses and rebuild the current timeline without internal silence."),
        ),
      ),
      renderSilencePresetButtons(),
      el("div.podcast-settings.podcast-settings--compact", null,
        renderField("Silence Threshold dB",
          el("input.podcast-input", {
            type: "number",
            step: "1",
            value: String(state.silenceThresholdDb),
            onInput: (event: Event) => {
              state.silenceThresholdDb = Number((event.currentTarget as HTMLInputElement).value);
              render();
            },
          })),
        renderField("Minimum Silence Duration",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.1",
            value: String(state.minimumSilenceDurationSec),
            onInput: (event: Event) => {
              state.minimumSilenceDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
        renderField("Minimum Cut Gap",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.1",
            value: String(state.minimumCutGapSec),
            onInput: (event: Event) => {
              state.minimumCutGapSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
        renderField("Minimum Keep Segment",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.1",
            value: String(state.minimumKeepSegmentDurationSec),
            onInput: (event: Event) => {
              state.minimumKeepSegmentDurationSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
        renderField("Padding Before",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.01",
            value: String(state.silencePaddingBeforeSec),
            onInput: (event: Event) => {
              state.silencePaddingBeforeSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
        renderField("Padding After",
          el("input.podcast-input", {
            type: "number",
            min: "0",
            step: "0.01",
            value: String(state.silencePaddingAfterSec),
            onInput: (event: Event) => {
              state.silencePaddingAfterSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
              render();
            },
          })),
      ),
      el("div.podcast-action-row.podcast-action-row--single", null,
        el("button.btn-primary", {
          disabled: busy,
          onClick: removeSilence,
        }, state.silenceRemovalLoading ? "Removing..." : "Remove Silence"),
      ),
      renderSilenceSummary(),
    );
  }

  function renderSilencePresetButtons(): HTMLElement {
    const busy = isProductionBusy();
    return el("div.podcast-action-row.podcast-action-row--presets", null,
      ...SILENCE_PRESETS.map((preset) =>
        el("button.btn-secondary", {
          type: "button",
          disabled: busy,
          onClick: () => {
            state.silenceThresholdDb = preset.thresholdDb;
            state.minimumSilenceDurationSec = preset.minimumDurationSec;
            state.minimumCutGapSec = preset.minimumCutGapSec;
            state.minimumKeepSegmentDurationSec = preset.minimumKeepSegmentDurationSec;
            render();
          },
        }, preset.label),
      ),
    );
  }

  function isProductionBusy(): boolean {
    return state.timelineLoading
      || state.previewAutoSwitchLoading
      || state.applyCameraDecisionsLoading
      || state.silenceRemovalLoading
      || state.synchronizationLoading
      || state.synchronizationApplyLoading;
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
    if (plan?.blockers.length) messages.push(`Preview blocked: ${plan.blockers.join(", ")}`);
    if (apply?.blockers.length) messages.push(`Apply blocked: ${apply.blockers.join(", ")}`);
    if (apply?.warnings.length) messages.push(`Warnings: ${apply.warnings.length} partial source ranges were handled.`);
    if (apply?.ok) messages.push("A visual-only draft was created on a duplicate sequence. The original sequence was not changed.");
    if (state.silenceRemovalResult?.ok) messages.push("Silence Removal created a cleaned audio/video draft. The original sequence was not changed.");
    if (state.silenceRemovalResult && !state.silenceRemovalResult.ok) messages.push(`Silence Removal blocked: ${state.silenceRemovalResult.blockers.join(", ")}`);
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
      renderField("Minimum Shot Length",
        el("input.podcast-input", {
          type: "number",
          min: "0",
          step: "0.5",
          value: String(state.minimumShotLengthSec),
          onInput: (event: Event) => {
            state.minimumShotLengthSec = Number((event.currentTarget as HTMLInputElement).value) || 0;
            render();
          },
        })),
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
        row("Silence Analysis Windows", String(state.silenceRemovalResult?.analysis.totalRmsWindows ?? 0)),
        row("Silence Sequence Duration", formatSeconds(state.silenceRemovalResult?.analysis.sequenceDurationSec ?? 0)),
        row("Silence Analyzed Duration", formatSeconds(state.silenceRemovalResult?.analysis.analyzedDurationSec ?? 0)),
        row("Silence Audio Source Duration", formatSeconds(state.silenceRemovalResult?.analysis.audioSourceDurationSec ?? 0)),
        row("Threshold Used", String(state.silenceRemovalResult?.analysis.silenceDetectionDiagnostics?.thresholdUsed ?? state.silenceThresholdDb)),
        row("Minimum Duration Used", formatSeconds(state.silenceRemovalResult?.analysis.silenceDetectionDiagnostics?.minimumDurationUsed ?? state.minimumSilenceDurationSec)),
        row("Detected Silence Segments Count", String(state.silenceRemovalResult?.analysis.silenceDetectionDiagnostics?.detectedSilenceSegments.length ?? 0)),
        row("Detected Silence Start/End", formatSilenceDiagnosticSegments(state.silenceRemovalResult?.analysis.silenceDetectionDiagnostics?.detectedSilenceSegments)),
        row("Rejected Silence Segments Count", String(state.silenceRemovalResult?.analysis.silenceDetectionDiagnostics?.rejectedSilenceSegments.length ?? 0)),
        row("Rejected Silence Reasons", formatSilenceDiagnosticSegments(state.silenceRemovalResult?.analysis.silenceDetectionDiagnostics?.rejectedSilenceSegments)),
        row("Silence Segments", String(state.silenceRemovalResult?.analysis.silenceSegments.length ?? 0)),
        row("Dropped Silence Candidates", String(state.silenceRemovalResult?.analysis.droppedSilenceSegments?.length ?? 0)),
        row("Longest Dropped Silence", formatSeconds(state.silenceRemovalResult?.analysis.longestDroppedSilenceSec ?? 0)),
        row("First Dropped Silences", formatSilenceSegments(state.silenceRemovalResult?.analysis.droppedSilenceSegments)),
        row("Keep Segments", String(state.silenceRemovalResult?.analysis.keepSegments.length ?? 0)),
        row("Keep Segments Processed", String(state.silenceRemovalResult?.apply?.keepSegmentsProcessed ?? 0)),
        row("Keep Segments Skipped", String(state.silenceRemovalResult?.apply?.keepSegmentsSkipped ?? 0)),
        row("Last Processed Keep Index", String(state.silenceRemovalResult?.apply?.lastProcessedKeepSegmentIndex ?? "none")),
        row("Last Keep Segment End", formatSeconds(state.silenceRemovalResult?.apply?.lastKeepSegmentEndTime ?? 0)),
        row("Operation Plan Build Called", state.silenceRemovalResult?.apply?.operationPlanBuildCalled ? "Yes" : "No"),
        row("Timeline Clips V1/A1", formatTimelineV1A1(state.silenceRemovalResult?.apply?.timelineClipDiscovery)),
        row("Timeline Video Clip Counts", state.silenceRemovalResult?.apply?.timelineClipDiscovery?.videoClipCounts?.join(", ") || "None"),
        row("Timeline Audio Clip Counts", state.silenceRemovalResult?.apply?.timelineClipDiscovery?.audioClipCounts?.join(", ") || "None"),
        row("Processed Video Tracks", String(state.silenceRemovalResult?.apply?.processedVideoTracks ?? 0)),
        row("Processed Audio Tracks", String(state.silenceRemovalResult?.apply?.processedAudioTracks ?? 0)),
        row("Planned Operations", String(state.silenceRemovalResult?.apply?.operationPlanCount ?? 0)),
        row("Executed Operations", String(state.silenceRemovalResult?.apply?.totalOperationsExecuted ?? 0)),
        row("Duplicate Source Uses", String(state.silenceRemovalResult?.apply?.duplicateSourceClipUseCount ?? 0)),
        row("Multi-Clip Keep Segments", String(state.silenceRemovalResult?.apply?.multiClipKeepSegments?.length ?? 0)),
        row("First Multi-Clip Keeps", formatMultiClipKeepSegments(state.silenceRemovalResult?.apply?.multiClipKeepSegments)),
        row("Reconstructed Video Clips", String(state.silenceRemovalResult?.apply?.reconstructedVideoClipsCount ?? 0)),
        row("Reconstructed Audio Clips", String(state.silenceRemovalResult?.apply?.reconstructedAudioClipsCount ?? 0)),
        row("Silence Video Inserts", String(state.silenceRemovalResult?.apply?.visualSegmentsInserted ?? 0)),
        row("Silence Audio Inserts", String(state.silenceRemovalResult?.apply?.audioSegmentsInserted ?? 0)),
        row("Video Inserts By Track", state.silenceRemovalResult?.apply?.videoSegmentsInsertedByTrack?.join(", ") || "None"),
        row("Audio Inserts By Track", state.silenceRemovalResult?.apply?.audioSegmentsInsertedByTrack?.join(", ") || "None"),
        row("Original Disabled On Draft", state.silenceRemovalResult?.apply?.originalTracksHiddenOrDisabledOnDuplicate ? "Yes" : "No"),
        row("Original Items Disabled", String(state.silenceRemovalResult?.apply?.originalTrackItemsDisabledOnDuplicate ?? 0)),
        row("Original Remove Unsafe", state.silenceRemovalResult?.apply?.warnings?.includes("ORIGINAL_TRACKITEM_REMOVE_UNSAFE_DISABLED_INSTEAD") ? "Yes" : "No"),
        row("Original Residual Items", String(state.silenceRemovalResult?.apply?.originalResidualTrackItems?.length ?? 0)),
        row("IMG_5575 Diagnostics", formatResidualItems(state.silenceRemovalResult?.apply?.img5575Diagnostics)),
        row("Silence Draft", state.silenceRemovalResult?.apply?.draftSequenceName || "not-created"),
        row("Silence Blockers", state.silenceRemovalResult?.blockers.join(" | ") || "None"),
        row("Silence Active Sequence", state.silenceRemovalResult?.apply?.activeSequenceName || state.diagnostics?.sequenceName || "unknown"),
        row("Generated Sequence Rule", state.silenceRemovalResult?.apply?.generatedSequenceDetectionRule || "not-matched"),
        row("Matched Pattern", state.silenceRemovalResult?.apply?.matchedPattern || "none"),
        row("Blocker Source", state.silenceRemovalResult?.apply?.blockerSource || "none"),
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

  function readableTimelineStatus(): string {
    if (!state.timelineLayout) return "Not analyzed";
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
        state.timelineLayout = null;
        clearSynchronizationRuntimeState();
        clearAutoSwitchRuntimeState();
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
        offsetsApplied: 0,
        clipsMoved: 0,
        movedItems: [],
        blockers: ["APPLY_SYNC_FAILED", (err as Error).message],
        warnings: [],
        timelineMutation: "move current timeline clips",
        sequenceMutation: "none",
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
      const videoCount = state.timelineLayout.videoTracks.length;
      ensureAudioMappingsForTimeline();
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

  async function removeSilence() {
    if (isProductionBusy()) return;
    state.silenceRemovalLoading = true;
    render();
    try {
      state.silenceRemovalResult = await runSilenceRemovalDraft({
        audioTrackIndex: 0,
        silenceThresholdDb: state.silenceThresholdDb,
        autoMode: true,
        minimumSilenceDurationSec: state.minimumSilenceDurationSec,
        minimumCutGapSec: state.minimumCutGapSec,
        minimumKeepSegmentDurationSec: state.minimumKeepSegmentDurationSec,
        mergeAdjacentKeepGapSec: state.mergeAdjacentKeepGapSec,
        paddingBeforeSec: state.silencePaddingBeforeSec,
        paddingAfterSec: state.silencePaddingAfterSec,
        selectedAudioStreamIndex: state.selectedAudioStreamIndex,
      });
    } catch (err) {
      state.silenceRemovalResult = {
        ok: false,
        analysis: {
          ok: false,
          audioTrackIndex: 0,
          analyzedSourcePath: null,
          selectedAudioStreamIndex: state.selectedAudioStreamIndex,
          analyzedDurationSec: 0,
          analysisWindowSec: 0.2,
          totalRmsWindows: 0,
          silenceSegments: [],
          droppedSilenceSegments: [],
          silenceDetectionDiagnostics: {
            thresholdUsed: state.silenceThresholdDb,
            minimumDurationUsed: state.minimumSilenceDurationSec,
            detectedSilenceSegments: [],
            rejectedSilenceSegments: [],
          },
          keepSegments: [],
          totalRemovedDurationSec: 0,
          blockers: ["SILENCE_REMOVAL_FAILED", (err as Error).message],
          warnings: [],
          timelineMutation: "none",
          sequenceMutation: "none",
        },
        apply: null,
        blockers: ["SILENCE_REMOVAL_FAILED", (err as Error).message],
        warnings: [],
      };
    } finally {
      state.silenceRemovalLoading = false;
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
      state.applyTrace.applyCameraDecisionsCalled = true;
      pushApplyCheckpoint(state.applyTrace, "APPLY_DECISIONS_START");
      state.applyCameraDecisionsResult = bindApplyResultToTimeline(
        await applyCameraDecisionsVisualOnly({ cameraDecisions }),
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

function formatMultiClipKeepSegments(segments: SilenceRemovalRunResult["apply"] extends infer Apply
  ? Apply extends { multiClipKeepSegments?: infer Items } ? Items | undefined : never
  : never): string {
  if (!Array.isArray(segments) || !segments.length) return "None";
  return segments.slice(0, 5).map((segment) => {
    const videoByTrack = Array.isArray(segment.videoClipsMatchedByTrack) ? segment.videoClipsMatchedByTrack.join("/") : "";
    const audioByTrack = Array.isArray(segment.audioClipsMatchedByTrack) ? segment.audioClipsMatchedByTrack.join("/") : "";
    return `#${segment.keepSegmentIndex}: V${segment.matchedVideoClipCount} [${videoByTrack}] A${segment.matchedAudioClipCount} [${audioByTrack}]`;
  }).join(" | ");
}

function formatResidualItems(items: SilenceRemovalRunResult["apply"] extends infer Apply
  ? Apply extends { img5575Diagnostics?: infer Items } ? Items | undefined : never
  : never): string {
  if (!Array.isArray(items) || !items.length) return "None";
  return items.slice(0, 5).map((item) =>
    `${item.mediaKind} T${item.trackIndex + 1} ${formatSeconds(item.startSec)}-${formatSeconds(item.endSec)} disabled=${String(item.disabled)}`
  ).join(" | ");
}

function formatSilenceSegments(segments: SilenceRemovalRunResult["analysis"]["droppedSilenceSegments"]): string {
  if (!Array.isArray(segments) || !segments.length) return "None";
  return segments.slice(0, 5).map((segment) =>
    `${formatSeconds(segment.startSec)}-${formatSeconds(segment.endSec)} (${formatSeconds(segment.durationSec)})`
  ).join(" | ");
}

function formatSilenceDiagnosticSegments(
  segments: NonNullable<SilenceRemovalRunResult["analysis"]["silenceDetectionDiagnostics"]>["detectedSilenceSegments"] | undefined,
): string {
  if (!Array.isArray(segments) || !segments.length) return "None";
  return segments.slice(0, 8).map((segment) => {
    const rms = `rms ${formatDb(segment.rmsMinDb)}/${formatDb(segment.rmsMaxDb)}/${formatDb(segment.rmsAvgDb)}`;
    const classification = segment.pauseClassification ? `${segment.pauseClassification}` : "unclassified";
    const decision = segment.cutDecisionReason ? ` - ${segment.cutDecisionReason}` : "";
    return `${formatSeconds(segment.startSec)}-${formatSeconds(segment.endSec)} (${formatSeconds(segment.durationSec)}) ${classification} ${segment.reason}${decision} ${rms}`;
  }).join(" | ");
}

function formatDb(value: number | undefined): string {
  if (value == null) return "n/a";
  if (!Number.isFinite(value)) return String(value);
  return `${Math.round(value * 1000) / 1000}dB`;
}

function formatTimelineV1A1(discovery: SilenceRemovalRunResult["apply"] extends infer Apply
  ? Apply extends { timelineClipDiscovery?: infer Discovery } ? Discovery | undefined : never
  : never): string {
  if (!discovery) return "None";
  return `V1:${discovery.v1ClipCount ?? 0} A1:${discovery.a1ClipCount ?? 0}`;
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
