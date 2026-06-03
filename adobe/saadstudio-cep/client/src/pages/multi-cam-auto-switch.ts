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
import {
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
import type { PodcastAdapterResult, PodcastExecutionResearchResult } from "../lib/podcast/types/premiere";

const DEFAULT_DIAGNOSTICS: PodcastDiagnostics = {
  activeSequence: false,
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
    executionStrategy: "decision-plan-only" as PodcastExecutionStrategy,
    mappings: {
      speaker_1: 0,
      speaker_2: 1,
      speaker_3: 2,
      wide: 0,
    } as Record<string, number>,
    audioMappings: {
      speaker_1: 0,
      speaker_2: 1,
      speaker_3: 2,
    } as Record<string, number>,
  };

  const page = el("div.app-main");
  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Multi-Cam Auto Switch"),
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
            el("h2", null, "Multi-Cam Auto Switch"),
            el("p", null, "Diagnostic foundation for podcast and interview automation."),
          ),
        ),
        renderControls(),
        renderTimelineLayoutPanel(),
        renderAudioSourceInspectorPanel(),
        renderFullAudioActivityProofPanel(),
        renderSpeakerSourceAttributionProofPanel(),
        renderCameraDecisionPlanProofPanel(),
        renderSafeTimelineExecutionResearchPanel(),
        renderSpeakerActivityProofPanel(),
        renderSafeExecutionPanel(),
        renderPlanPreview(),
        renderDebugPanel(),
      ),
    );
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
        renderAudioMappingRow("speaker_1"),
        renderAudioMappingRow("speaker_2"),
        renderAudioMappingRow("speaker_3"),
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
    const rows = ["speaker_1", "speaker_2", "speaker_3"].map((speakerId, index) => {
      const audio = audioTracks[index];
      const videoIndex = state.mappings[speakerId] ?? index;
      const video = videoTracks[videoIndex];
      return `${audio ? `A${audio.index + 1}` : `A${index + 1}`} ${speakerId} -> ${video ? `V${video.index + 1}` : `V${videoIndex + 1}`}`;
    });
    rows.push(`Wide -> V${(state.mappings.wide ?? 0) + 1}`);
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
          renderMappingRow("speaker_1"),
          renderMappingRow("speaker_2"),
          renderMappingRow("speaker_3"),
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
      el("strong", null, speakerId),
      renderTrackSelect(speakerId),
    );
  }

  function renderTrackSelect(speakerId: string): HTMLElement {
    const count = Math.max(1, state.diagnostics.videoTrackCount || 4);
    return el("select.podcast-select", {
      value: String(state.mappings[speakerId] ?? 0),
      onChange: (event: Event) => {
        state.mappings[speakerId] = Number((event.currentTarget as HTMLSelectElement).value);
        render();
      },
    }, ...Array.from({ length: count }, (_, index) =>
      el("option", { value: String(index) }, `V${index + 1}`)));
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

  async function refreshDiagnostics() {
    state.loading = true;
    render();
    try {
      state.diagnostics = await getPodcastDiagnostics();
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

  async function analyzeLayout() {
    state.timelineLoading = true;
    render();
    try {
      state.timelineLayout = await analyzeTimelineLayout();
      const videoCount = state.timelineLayout.videoTracks.length;
      if (videoCount > 0) {
        for (const key of Object.keys(state.mappings)) {
          state.mappings[key] = Math.min(state.mappings[key] ?? 0, videoCount - 1);
        }
      }
    } finally {
      state.timelineLoading = false;
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
      state.sourceAttributionProof = await runSpeakerSourceAttributionProof(getAudioMappings(), state.selectedAudioStreamIndex);
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
    if (!state.sourceAttributionProof) {
      state.cameraDecisionPlanProof = {
        cameraDecisions: [],
        summary: {
          totalDecisions: 0,
          speaker1CameraTimeSec: 0,
          speaker2CameraTimeSec: 0,
          wideCameraTimeSec: 0,
          keptPreviousCameraEvents: 0,
          droppedShortDecisions: 0,
        },
        blockers: ["SPEAKER_SOURCE_ATTRIBUTION_PROOF_REQUIRED"],
        warnings: [],
        timelineMutation: "none",
        sequenceMutation: "none",
      };
      render();
      return;
    }
    state.cameraDecisionPlanProof = generateCameraDecisionPlanProof({
      dominantTrackAtTime: state.sourceAttributionProof.dominantTrackAtTime,
      overlaps: state.sourceAttributionProof.overlaps,
    });
    render();
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
    return Object.entries(state.mappings).map(([speakerId, videoTrackIndex]) => ({
      speakerId,
      videoTrackIndex,
      cameraLabel: speakerId === "wide" ? "Wide camera" : speakerId,
      fallback: speakerId === "wide",
    }));
  }

  function getAudioMappings(): AudioTrackSpeakerMapping[] {
    return Object.entries(state.audioMappings).map(([speakerId, audioTrackIndex]) => ({
      speakerId,
      audioTrackIndex,
      audioTrackLabel: `A${audioTrackIndex + 1}`,
    }));
  }
}

function formatSeconds(value: number): string {
  return `${Math.round(value * 1000) / 1000}s`;
}

function formatOptionalSeconds(value: number | undefined): string {
  return value == null ? "null" : formatSeconds(value);
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
