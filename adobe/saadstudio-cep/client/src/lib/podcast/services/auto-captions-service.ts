import { evalES } from "../../cep";
import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import { diagnoseFfmpegDetection } from "./audio-source-inspector-service";
import { discoverCaptionRuntime, type RuntimeDiscoveryResult } from "./runtime-manager-service";

export type CaptionLanguage = "auto" | "ar" | "en";
export type CaptionModel = "base" | "medium" | "large-v3-turbo" | "large-v3";

export const modelTiers: Record<CaptionModel, string> = {
  "base": "Base",
  "medium": "Standard",
  "large-v3-turbo": "Fast",
  "large-v3": "Professional",
};

export interface CaptionProgress {
  stage: "model" | "audio" | "transcription" | "premiere";
  message: string;
}

export interface AutoCaptionsResult {
  ok: boolean;
  language: string | null;
  captionCount: number;
  device: string | null;
  model: CaptionModel;
  srtPath: string | null;
  captionTracksBefore: number | null;
  captionTracksAfter: number | null;
  blockers: string[];
  diagnostics?: {
    audioExtractionTimeMs: number;
    wavDurationSec: number;
    wavSizeBytes: number;
    whisperStartTime: string;
    whisperEndTime: string;
    whisperDurationMs: number;
    srtWriteTimeMs: number;
    jsonWriteTimeMs: number;
    captionImportStartTime: string;
    captionImportEndTime: string;
    captionImportDurationMs: number;
    verificationStartTime: string;
    verificationEndTime: string;
    verificationDurationMs: number;
    selectedTier?: string;
    selectedModel?: string;
    selectedModelPath?: string;
    device?: string | null;
    computeType?: string | null;
    transcriptionDurationSec?: number;
    audioDurationSec?: number;
    realtimeFactor?: number;
    fallbackOccurred?: boolean;
    fallbackReason?: string;
    gpuName?: string | null;
    cudaAvailable?: boolean;
    cudaVersion?: string | null;
    ctranslate2Version?: string | null;
    fasterWhisperVersion?: string | null;
    exactCudaError?: string | null;
  };
}

interface NodeRuntime {
  fs: typeof import("fs");
  path: typeof import("path");
  cp: typeof import("child_process");
  crypto: typeof import("crypto");
  process: NodeJS.Process;
}

interface ModelMetadata {
  repository: string;
  revision: string;
  files: Array<{ path: string; size: number; sha256: string }>;
}

interface TranscriptionOutput {
  ok: boolean;
  language?: string;
  captionCount?: number;
  device?: string;
  srtPath?: string;
  computeType?: string;
  durationSec?: number;
  cudaError?: string | null;
}

interface PremiereCaptionImportResult {
  ok: boolean;
  placed?: boolean;
  captionTracksBefore?: number;
  captionTracksAfter?: number;
  reason?: string;
  error?: string;
}

export async function runPodcastAutoCaptions(
  language: CaptionLanguage,
  model: CaptionModel,
  onProgress?: (progress: CaptionProgress) => void,
): Promise<AutoCaptionsResult> {
  const blockers: string[] = [];
  const runtime = await discoverCaptionRuntime();
  if (runtime.status !== "ready" || !runtime.layout || !runtime.manifest) {
    return failed(model, [`CAPTION_RUNTIME_NOT_READY:${runtime.blockers.join("|")}`]);
  }
  const node = getNodeRuntime();
  const modelPaths: Record<CaptionModel, string> = {
    "base": runtime.layout.baseModelRoot,
    "medium": "E:\\Multi-Cam Auto Switch\\whisper\\whisper medium",
    "large-v3-turbo": "E:\\Multi-Cam Auto Switch\\whisper\\whisper large v3 turbo",
    "large-v3": "E:\\Multi-Cam Auto Switch\\whisper\\whisper large v3"
  };

  let finalModel = model;
  let fallbackOccurred = false;
  let fallbackReason = "";

  // We do not auto-downgrade the model anymore. The user is allowed to run Standard (medium)
  // and Professional (large-v3) models on CPU/weak hardware, and we show warnings in the UI.

  const modelDir = modelPaths[finalModel];
  const modelBin = node.path.join(modelDir, "model.bin");
  if (!node.fs.existsSync(modelDir) || !node.fs.existsSync(modelBin)) {
    return failed(finalModel, ["SELECTED_WHISPER_MODEL_NOT_FOUND", `The Whisper model files were not found at ${modelDir}`]);
  }

  onProgress?.({ stage: "model", message: "Using local developer Whisper model override" });

  const layout = await premierePodcastAdapter.getTimelineLayout();
  if (layout.status !== "ready" || !layout.sequenceId || !(layout.sequenceDurationSec && layout.sequenceDurationSec > 0)) {
    return failed(model, ["ACTIVE_SEQUENCE_NOT_READY"]);
  }
  const activeAudioTrack = layout.audioTracks.find((track) => (track.clipCount || 0) > 0) || layout.audioTracks[0];
  if (!activeAudioTrack) return failed(model, ["ACTIVE_SEQUENCE_HAS_NO_AUDIO"]);
  const inspection = await premierePodcastAdapter.inspectAudioSources([{ speakerId: "captions", audioTrackIndex: activeAudioTrack.index }]);
  const sources = inspection.sources.filter((source) => source.mediaAvailable && source.sourcePath && validTiming(source));
  if (!sources.length) return failed(model, ["CAPTION_AUDIO_SOURCE_UNAVAILABLE", ...inspection.blockers]);

  const ffmpeg = await diagnoseFfmpegDetection();
  if (!ffmpeg.ok || !ffmpeg.selectedPath) return failed(model, ["FFMPEG_NOT_READY", ...ffmpeg.blockers]);
  const jobDir = node.path.join(runtime.layout.captionsCacheRoot, `${safeName(layout.sequenceName || "sequence")}-${Date.now()}`);
  node.fs.mkdirSync(jobDir, { recursive: true });
  const wavPath = node.path.join(jobDir, "sequence.wav");
  const srtPath = node.path.join(jobDir, "captions.srt");
  const jsonPath = node.path.join(jobDir, "captions.json");

  // --- AUDIO EXTRACTION STAGE ---
  onProgress?.({ stage: "audio", message: "Extracting Audio..." });
  const audioExtractionStart = Date.now();
  await renderTrackWav(node, ffmpeg.selectedPath, sources, layout.sequenceDurationSec, wavPath);
  const audioExtractionTimeMs = Date.now() - audioExtractionStart;

  let wavSizeBytes = 0;
  try {
    const stats = node.fs.statSync(wavPath);
    wavSizeBytes = stats.size;
  } catch (e) {}
  const wavDurationSec = layout.sequenceDurationSec || 0;

  // --- WHISPER TRANSCRIPTION STAGE ---
  const extensionPath = normalizeCepPath(window.__adobe_cep__?.getSystemPath("extension") || "");
  const worker = node.path.join(extensionPath, "runtime-assets", "faster-whisper-captions.py");
  onProgress?.({ stage: "transcription", message: "Running Whisper..." });
  
  const whisperStartTime = new Date().toISOString();
  const whisperStartMs = Date.now();
  await execFile(node, runtime.layout.pythonPath, [worker, "--audio", wavPath, "--model", modelDir, "--language", language, "--output-srt", srtPath, "--output-json", jsonPath], 6 * 60 * 60 * 1000);
  const whisperEndTime = new Date().toISOString();
  const whisperDurationMs = Date.now() - whisperStartMs;

  // --- WRITING SRT/JSON STAGE ---
  onProgress?.({ stage: "transcription", message: "Writing SRT..." });
  
  let srtWriteTimeMs = 0;
  let jsonWriteTimeMs = 0;
  try {
    const srtStats = node.fs.statSync(srtPath);
    const jsonStats = node.fs.statSync(jsonPath);
    srtWriteTimeMs = srtStats.mtime.getTime() - whisperStartMs;
    jsonWriteTimeMs = jsonStats.mtime.getTime() - whisperStartMs;
  } catch (e) {}

  const transcription = JSON.parse(node.fs.readFileSync(jsonPath, "utf8")) as TranscriptionOutput;
  if (!transcription.ok || !(transcription.captionCount && transcription.captionCount > 0) || !node.fs.existsSync(srtPath)) {
    return failed(finalModel, ["NO_SPEECH_CAPTIONS_GENERATED"]);
  }

  // --- IMPORTING CAPTIONS STAGE ---
  onProgress?.({ stage: "premiere", message: "Importing Captions..." });
  const captionImportStartTime = new Date().toISOString();
  const captionImportStartMs = Date.now();
  const imported = await evalES<PremiereCaptionImportResult>("importPodcastSrtAsCaption", srtPath, layout.sequenceId);
  const captionImportEndTime = new Date().toISOString();
  const captionImportDurationMs = Date.now() - captionImportStartMs;

  // --- VERIFYING CAPTION TRACK STAGE ---
  onProgress?.({ stage: "premiere", message: "Verifying Caption Track..." });
  const verificationStartTime = new Date().toISOString();
  const verificationStartMs = Date.now();
  if (!imported.ok) {
    blockers.push(`PREMIERE_CAPTION_TRACK_NOT_VERIFIED:${imported.reason || imported.error || "unknown"}`);
  }
  const verificationEndTime = new Date().toISOString();
  const verificationDurationMs = Date.now() - verificationStartMs;

  const actualDevice = transcription.device || null;
  const pythonCpuFallback = (actualDevice === "cpu");
  const finalFallbackOccurred = fallbackOccurred || pythonCpuFallback;
  let finalFallbackReason = fallbackReason;
  if (pythonCpuFallback) {
    const errorMsg = transcription.cudaError || runtime.selfTest?.exactCudaError || "CUDA is not functional or not available on this system.";
    finalFallbackReason = "PYTHON_CUDA_FAILED_FALLBACK_TO_CPU: " + errorMsg;
  }

  const transcriptionDurationSec = whisperDurationMs / 1000;
  const audioDurationSec = transcription.durationSec || wavDurationSec;
  const realtimeFactor = audioDurationSec > 0 ? transcriptionDurationSec / audioDurationSec : 0;

  const diagnosticsData = {
    audioExtractionTimeMs,
    wavDurationSec,
    wavSizeBytes,
    whisperStartTime,
    whisperEndTime,
    whisperDurationMs,
    srtWriteTimeMs,
    jsonWriteTimeMs,
    captionImportStartTime,
    captionImportEndTime,
    captionImportDurationMs,
    verificationStartTime,
    verificationEndTime,
    verificationDurationMs,
    selectedTier: modelTiers[finalModel],
    selectedModel: finalModel,
    selectedModelPath: modelDir,
    device: actualDevice,
    computeType: transcription.computeType || null,
    transcriptionDurationSec,
    audioDurationSec,
    realtimeFactor,
    fallbackOccurred: finalFallbackOccurred,
    fallbackReason: finalFallbackReason || "None",
    gpuName: runtime.selfTest?.gpuName || "Unknown GPU",
    cudaAvailable: runtime.selfTest?.cudaAvailable || false,
    cudaVersion: runtime.selfTest?.cudaVersion || "Not Detected",
    ctranslate2Version: runtime.selfTest?.ctranslate2Version || "N/A",
    fasterWhisperVersion: runtime.selfTest?.fasterWhisperVersion || "N/A",
    exactCudaError: transcription.cudaError || runtime.selfTest?.exactCudaError || null,
  };
  console.log("[Saad Caption Diagnostics Timing]", JSON.stringify(diagnosticsData, null, 2));

  try {
    const tempDir = "C:\\Users\\PC\\AppData\\Local\\Temp\\saadstudio";
    node.fs.mkdirSync(tempDir, { recursive: true });
    node.fs.writeFileSync(node.path.join(tempDir, "caption-diagnostics.json"), JSON.stringify(diagnosticsData, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write caption-diagnostics.json:", err);
  }

  return {
    ok: blockers.length === 0,
    language: transcription.language || null,
    captionCount: transcription.captionCount || 0,
    device: actualDevice,
    model: finalModel,
    srtPath,
    captionTracksBefore: imported.captionTracksBefore ?? null,
    captionTracksAfter: imported.captionTracksAfter ?? null,
    blockers,
    diagnostics: diagnosticsData,
  };
}

export async function ensureModel(node: NodeRuntime, runtime: RuntimeDiscoveryResult, model: CaptionModel, modelDir: string): Promise<void> {
  const lockPath = node.path.join(modelDir, "saad-model-lock.json");
  const expected = (runtime.manifest!.models as any)[model];
  if (node.fs.existsSync(lockPath)) {
    const metadata = JSON.parse(node.fs.readFileSync(lockPath, "utf8")) as ModelMetadata;
    if (metadata.repository === expected.repository && metadata.revision === expected.revision && await validateModelFiles(node, modelDir, metadata)) return;
  }
  const staging = `${modelDir}.downloading`;
  node.fs.rmSync(staging, { recursive: true, force: true });
  node.fs.mkdirSync(staging, { recursive: true });
  
  const localSourceDir = "E:\\Multi-Cam Auto Switch\\whisper\\whisper medium";
  let copiedLocally = false;
  if (model === "medium" && node.fs.existsSync(localSourceDir) && node.fs.existsSync(node.path.join(localSourceDir, "model.bin"))) {
    try {
      const filesToCopy = ["model.bin", "vocabulary.txt", "config.json"];
      for (const file of filesToCopy) {
        const src = node.path.join(localSourceDir, file);
        const dst = node.path.join(staging, file);
        if (node.fs.existsSync(src)) {
          node.fs.copyFileSync(src, dst);
        }
      }
      copiedLocally = true;
    } catch (copyErr) {
      node.fs.rmSync(staging, { recursive: true, force: true });
      node.fs.mkdirSync(staging, { recursive: true });
    }
  }

  if (!copiedLocally) {
    const code = "from huggingface_hub import snapshot_download; import sys; snapshot_download(repo_id=sys.argv[1], revision=sys.argv[2], local_dir=sys.argv[3])";
    await execFile(node, runtime.layout!.pythonPath, ["-c", code, expected.repository, expected.revision, staging], 2 * 60 * 60 * 1000);
  }
  const testCode = "from faster_whisper import WhisperModel; import sys; WhisperModel(sys.argv[1], device='cpu', compute_type='int8', local_files_only=True); print('ok')";
  await execFile(node, runtime.layout!.pythonPath, ["-c", testCode, staging], 10 * 60 * 1000);
  const files = await listLockedFiles(node, staging);
  const metadata: ModelMetadata = { repository: expected.repository, revision: expected.revision, files };
  node.fs.writeFileSync(node.path.join(staging, "saad-model-lock.json"), JSON.stringify(metadata, null, 2), "utf8");
  node.fs.rmSync(modelDir, { recursive: true, force: true });
  node.fs.mkdirSync(node.path.dirname(modelDir), { recursive: true });
  node.fs.renameSync(staging, modelDir);
}

async function listLockedFiles(node: NodeRuntime, root: string): Promise<ModelMetadata["files"]> {
  const output: ModelMetadata["files"] = [];
  const visit = async (dir: string) => {
    for (const entry of node.fs.readdirSync(dir, { withFileTypes: true })) {
      const full = node.path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.name !== "saad-model-lock.json") output.push({ path: node.path.relative(root, full).replace(/\\/g, "/"), size: node.fs.statSync(full).size, sha256: await hashFile(node, full) });
    }
  };
  await visit(root);
  return output.sort((a, b) => a.path.localeCompare(b.path));
}

async function validateModelFiles(node: NodeRuntime, root: string, metadata: ModelMetadata): Promise<boolean> {
  if (!metadata.files.length) return false;
  for (const item of metadata.files) {
    const full = node.path.join(root, ...item.path.split("/"));
    if (!node.fs.existsSync(full) || node.fs.statSync(full).size !== item.size || await hashFile(node, full) !== item.sha256) return false;
  }
  return true;
}

async function renderTrackWav(node: NodeRuntime, ffmpeg: string, sources: Array<{ sourcePath?: string | null; sourceInPointSec?: number; timelineStartSec?: number; durationSec?: number }>, duration: number, output: string): Promise<void> {
  const args: string[] = ["-hide_banner", "-loglevel", "error", "-y"];
  for (const source of sources) args.push("-ss", String(source.sourceInPointSec || 0), "-t", String(source.durationSec), "-i", String(source.sourcePath));
  const filters: string[] = [];
  const labels: string[] = [];
  sources.forEach((source, index) => {
    const label = `a${index}`;
    const delay = Math.max(0, Math.round((source.timelineStartSec || 0) * 1000));
    filters.push(`[${index}:a:0]aresample=16000,aformat=sample_fmts=s16:channel_layouts=mono,adelay=${delay}|${delay}[${label}]`);
    labels.push(`[${label}]`);
  });
  filters.push(`${labels.join("")}amix=inputs=${labels.length}:duration=longest:normalize=0,atrim=0:${duration}[out]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[out]", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output);
  await execFile(node, ffmpeg, args, 60 * 60 * 1000);
}

function validTiming(source: { timelineStartSec?: number; timelineEndSec?: number; sourceInPointSec?: number; sourceOutPointSec?: number; durationSec?: number }): boolean {
  return typeof source.timelineStartSec === "number" && typeof source.timelineEndSec === "number" && typeof source.sourceInPointSec === "number" && typeof source.sourceOutPointSec === "number" && !!source.durationSec && source.durationSec > 0;
}

function execFile(node: NodeRuntime, file: string, args: string[], timeout: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => node.cp.execFile(file, args, { windowsHide: true, timeout, maxBuffer: 64 * 1024 * 1024, env: { ...node.process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" } }, (error, stdout, stderr) => error ? reject(new Error((stderr || error.message).trim())) : resolve({ stdout, stderr })));
}

function hashFile(node: NodeRuntime, file: string): Promise<string> {
  return new Promise((resolve, reject) => { const hash = node.crypto.createHash("sha256"); const stream = node.fs.createReadStream(file); stream.on("error", reject); stream.on("data", (chunk) => hash.update(chunk)); stream.on("end", () => resolve(hash.digest("hex"))); });
}

function getNodeRuntime(): NodeRuntime {
  const requireNode = window.cep_node!.require as <T>(moduleName: string) => T;
  return {
    fs: requireNode<typeof import("fs")>("fs"),
    path: requireNode<typeof import("path")>("path"),
    cp: requireNode<typeof import("child_process")>("child_process"),
    crypto: requireNode<typeof import("crypto")>("crypto"),
    process: requireNode<NodeJS.Process>("process"),
  };
}

function normalizeCepPath(value: string): string { let path = decodeURIComponent(value.replace(/^file:\/\//i, "")); if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1); return path.replace(/\//g, "\\"); }
function safeName(value: string): string { return value.replace(/[<>:"/\\|?*]+/g, "-").slice(0, 80); }
function failed(model: CaptionModel, blockers: string[]): AutoCaptionsResult { return { ok: false, language: null, captionCount: 0, device: null, model, srtPath: null, captionTracksBefore: null, captionTracksAfter: null, blockers }; }

