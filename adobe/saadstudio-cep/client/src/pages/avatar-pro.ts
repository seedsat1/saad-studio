import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { ProcessingLoader } from "../components/processing-loader";
import { icon } from "../lib/icons";
import { api, type JobStatus } from "../lib/api";
import { toast } from "../lib/toast";
import { evalES, getHostImportButtonLabel, getHostImportSuccessMessage } from "../lib/cep";
import { store } from "../lib/store";
import {
  watchTimelineAudioSelection,
  watchTimelineSelection,
  type TimelineAudio,
  type TimelineClip,
} from "../lib/timeline-watcher";
import { enforceVideoDurationLimit } from "../lib/media-validation";

type VisualState = {
  file: File | null;
  localPath: string | null;
  frameTimeSec: number | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
  displayName: string | null;
  kind: "image" | "video" | null;
  source: "upload" | "timeline" | null;
  selectionKey: string | null;
};

type AudioState = {
  file: File | null;
  localPath: string | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
  displayName: string | null;
  source: "upload" | "timeline" | null;
  selectionKey: string | null;
};

export function AvatarProPage(): HTMLElement {
  const visualState: VisualState = {
    file: null,
    localPath: null,
    frameTimeSec: null,
    previewUrl: null,
    uploadedUrl: null,
    uploadedKey: null,
    displayName: null,
    kind: null,
    source: null,
    selectionKey: null,
  };
  const audioState: AudioState = {
    file: null,
    localPath: null,
    previewUrl: null,
    uploadedUrl: null,
    uploadedKey: null,
    displayName: null,
    source: null,
    selectionKey: null,
  };

  let busy = false;

  const promptInput = el("textarea", {
    rows: "4",
    placeholder: "Optional: describe speech energy, expression, or framing…",
    style: {
      width: "100%",
      minHeight: "104px",
      resize: "vertical",
      borderRadius: "12px",
      border: "1px solid var(--line-soft)",
      background: "var(--bg-card)",
      color: "var(--text)",
      padding: "12px 14px",
      fontSize: "13px",
      lineHeight: "1.5",
      outline: "none",
    },
  }) as HTMLTextAreaElement;

  const visualImage = el("img", {
    alt: "LiP sync visual preview",
    style: {
      width: "100%",
      maxHeight: "220px",
      objectFit: "cover",
      borderRadius: "12px",
      display: "none",
    },
  }) as HTMLImageElement;

  const visualVideo = el("video", {
    controls: "true",
    muted: "true",
    playsinline: "true",
    preload: "metadata",
    style: {
      width: "100%",
      maxHeight: "220px",
      objectFit: "cover",
      borderRadius: "12px",
      display: "none",
      background: "#000",
    },
  }) as HTMLVideoElement;

  const audioPreview = el("audio", {
    controls: "true",
    style: {
      width: "100%",
      display: "none",
    },
  }) as HTMLAudioElement;

  const visualMeta = el("div.mono.muted", {
    style: { fontSize: "11px", wordBreak: "break-all" },
  }, "No image or video selected");

  const audioMeta = el("div.mono.muted", {
    style: { fontSize: "11px", wordBreak: "break-all" },
  }, "No audio selected");

  const generateBtnLabel = el("span", null, "Generate LiP sync");
  const generateBtn = el("button.btn-primary", {
    onClick: () => { void submit(); },
  }, icon("send", 14), generateBtnLabel) as HTMLButtonElement;
  const busyHint = el("div.busy-inline", {
    style: { display: "none", justifyContent: "flex-end", marginTop: "10px" },
  },
    el("span.busy-spinner", { "aria-hidden": "true" }),
    el("span", null, "Generating LiP sync… please wait"),
  );

  const resultHost = el("div.col.gap-3", { style: { padding: "0 16px 16px" } });

  const visualCard = createUploadCard({
    title: "Visual source",
    subtitle: "Pick an image or video from the timeline, or upload one. Video sources use the first frame for lip sync.",
    accept: "image/*,video/*",
    buttonLabel: "Choose image/video",
    preview: el("div.col.gap-3", null, visualImage, visualVideo),
    meta: visualMeta,
    onPick: async (file) => {
      await handleVisualPick(file);
    },
  });

  const audioCard = createUploadCard({
    title: "Speech audio",
    subtitle: "Pick an audio clip from the timeline, or upload a speech file.",
    accept: "audio/*",
    buttonLabel: "Choose audio",
    preview: audioPreview,
    meta: audioMeta,
    onPick: (file) => {
      applyAudioUpload(file);
      syncAudioPreview();
      updateGenerateState();
    },
  });

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("LiP sync"),
    el("div.app-main",
      null,
      el("div.state-card", { style: { margin: "0 16px 16px" } },
        el("div.state-card__icon", null, icon("video", 22)),
        el("div.state-card__title", null, "Lip sync from timeline or upload"),
        el("div.state-card__subtitle", null,
          "Select an image or video on the timeline for the face, select audio on the timeline for speech, or upload both manually. Video visuals are converted to a still frame before generation.",
        ),
      ),
      el("div.col.gap-3", { style: { padding: "0 16px 16px" } },
        visualCard,
        audioCard,
        el("div.state-card", { style: { padding: "14px" } },
          el("div.state-card__title", { style: { textAlign: "left", width: "100%", marginBottom: "8px" } }, "Prompt"),
          el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%", marginBottom: "12px" } },
            "Optional guidance for expression, framing, or speaking style.",
          ),
          promptInput,
          busyHint,
          el("div.row.gap-2", { style: { marginTop: "12px", justifyContent: "flex-end" } }, generateBtn),
        ),
      ),
      resultHost,
    ),
  );

  const visualWatcher = watchTimelineSelection((clip) => {
    if (!clip?.path || visualState.source === "upload") return;
    const key = clipSelectionKey(clip);
    if (!key || key === visualState.selectionKey) return;
    void handleTimelineVisual(clip);
  });
  visualWatcher.attachTo(root);

  const audioWatcher = watchTimelineAudioSelection((clip) => {
    if (!clip?.path || audioState.source === "upload") return;
    const key = audioSelectionKey(clip);
    if (!key || key === audioState.selectionKey) return;
    applyTimelineAudio(clip);
    syncAudioPreview();
    updateGenerateState();
  });
  audioWatcher.attachTo(root);

  updateGenerateState();
  return root;

  function applyVisualUpload(file: File | null) {
    revokePreviewUrl(visualState.previewUrl);
    visualState.file = file;
    visualState.localPath = null;
    visualState.frameTimeSec = null;
    visualState.previewUrl = file ? URL.createObjectURL(file) : null;
    visualState.uploadedUrl = null;
    visualState.uploadedKey = null;
    visualState.displayName = file?.name ?? null;
    visualState.kind = file ? detectVisualKind(file.type, file.name) : null;
    visualState.source = file ? "upload" : null;
    visualState.selectionKey = file ? `upload:${file.name}:${file.size}:${file.lastModified}` : null;
  }

  function applyAudioUpload(file: File | null) {
    revokePreviewUrl(audioState.previewUrl);
    audioState.file = file;
    audioState.localPath = null;
    audioState.previewUrl = file ? URL.createObjectURL(file) : null;
    audioState.uploadedUrl = null;
    audioState.uploadedKey = null;
    audioState.displayName = file?.name ?? null;
    audioState.source = file ? "upload" : null;
    audioState.selectionKey = file ? `upload:${file.name}:${file.size}:${file.lastModified}` : null;
  }

  function applyTimelineVisual(clip: TimelineClip) {
    revokePreviewUrl(visualState.previewUrl);
    visualState.file = null;
    visualState.localPath = clip.path;
    visualState.frameTimeSec = typeof clip.inSec === "number" && Number.isFinite(clip.inSec) ? clip.inSec : 0;
    visualState.previewUrl = pathToMediaSrc(clip.path);
    visualState.uploadedUrl = null;
    visualState.uploadedKey = null;
    visualState.displayName = clip.name ?? fileNameFromPath(clip.path);
    visualState.kind = clip.type;
    visualState.source = "timeline";
    visualState.selectionKey = clipSelectionKey(clip);
  }

  function applyTimelineAudio(clip: TimelineAudio) {
    revokePreviewUrl(audioState.previewUrl);
    audioState.file = null;
    audioState.localPath = clip.path;
    audioState.previewUrl = pathToMediaSrc(clip.path);
    audioState.uploadedUrl = null;
    audioState.uploadedKey = null;
    audioState.displayName = clip.name ?? fileNameFromPath(clip.path);
    audioState.source = "timeline";
    audioState.selectionKey = audioSelectionKey(clip);
  }

  function syncVisualPreview() {
    visualImage.style.display = "none";
    visualVideo.style.display = "none";
    visualImage.removeAttribute("src");
    visualVideo.removeAttribute("src");

    if (!visualState.previewUrl || !visualState.kind) {
      visualMeta.textContent = "No image or video selected";
      return;
    }

    if (visualState.kind === "image") {
      visualImage.src = visualState.previewUrl;
      visualImage.style.display = "block";
    } else {
      visualVideo.src = visualState.previewUrl;
      visualVideo.style.display = "block";
    }

    const sourceLabel = visualState.source === "timeline" ? "timeline" : "upload";
    const kindLabel = visualState.kind === "video" ? "video -> first frame" : "image";
    visualMeta.textContent = `${visualState.displayName ?? "Visual source"} • ${kindLabel} • ${sourceLabel}`;
  }

  async function handleVisualPick(file: File | null) {
    try {
      if (file && detectVisualKind(file.type, file.name) === "video") {
        await enforceVideoDurationLimit(file);
      }
      applyVisualUpload(file);
      syncVisualPreview();
      updateGenerateState();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function handleTimelineVisual(clip: TimelineClip) {
    try {
      if (clip.type === "video") {
        await enforceVideoDurationLimit(clip.path);
      }
      applyTimelineVisual(clip);
      syncVisualPreview();
      updateGenerateState();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  function syncAudioPreview() {
    audioPreview.style.display = "none";
    audioPreview.removeAttribute("src");
    if (!audioState.previewUrl) {
      audioMeta.textContent = "No audio selected";
      return;
    }
    audioPreview.src = audioState.previewUrl;
    audioPreview.style.display = "block";
    const sourceLabel = audioState.source === "timeline" ? "timeline" : "upload";
    audioMeta.textContent = `${audioState.displayName ?? "Audio source"} • ${sourceLabel}`;
  }

  function updateGenerateState() {
    generateBtn.disabled = busy || !hasVisualSource(visualState) || !hasAudioSource(audioState);
    generateBtn.style.opacity = generateBtn.disabled ? "0.6" : "1";
    generateBtn.style.pointerEvents = generateBtn.disabled ? "none" : "auto";
    generateBtn.classList.toggle("btn-primary--busy", busy);
    generateBtnLabel.textContent = busy ? "Generating…" : "Generate LiP sync";
    busyHint.style.display = busy ? "inline-flex" : "none";
  }

  async function submit() {
    if (busy) return;
    if (!hasVisualSource(visualState) || !hasAudioSource(audioState)) {
      toast("Select both a visual source and an audio source first.", "error");
      return;
    }

    try {
      busy = true;
      updateGenerateState();
      resultHost.replaceChildren(busyCard("Preparing timeline assets and generating LiP sync..."));

      const [imageUrl, audioUrl] = await Promise.all([
        ensureVisualUploadedAsImage(visualState),
        ensureAudioUploaded(audioState),
      ]);

      const job = await api.generate.avatarPro({
        imageUrl,
        audioUrl,
        prompt: promptInput.value.trim(),
      });
      const final = (job.status === "succeeded" || job.status === "failed")
        ? job
        : await api.pollJob(job.id);

      if (final.status === "failed" || !final.result) {
        throw new Error(final.error ?? "Generation failed");
      }

      resultHost.replaceChildren(resultCard(final));
      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      const message = (err as Error).message;
      resultHost.replaceChildren(errorCard(message));
      toast(message, "error");
    } finally {
      busy = false;
      updateGenerateState();
    }
  }
}

function createUploadCard(input: {
  title: string;
  subtitle: string;
  accept: string;
  buttonLabel: string;
  preview: HTMLElement;
  meta: HTMLElement;
  onPick: (file: File | null) => void | Promise<void>;
}): HTMLElement {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = input.accept;
  picker.style.display = "none";
  picker.addEventListener("change", () => {
    void Promise.resolve(input.onPick(picker.files?.[0] ?? null)).catch((err) => {
      toast((err as Error).message, "error");
    });
    picker.value = "";
  });

  return el("div.state-card", { style: { padding: "14px" } },
    el("div.state-card__title", { style: { textAlign: "left", width: "100%" } }, input.title),
    el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%", marginBottom: "12px" } }, input.subtitle),
    input.preview,
    input.meta,
    el("div.row.gap-2", { style: { marginTop: "12px", justifyContent: "flex-start" } },
      el("button.btn-secondary", { onClick: () => picker.click() }, icon("plus", 14), input.buttonLabel),
    ),
    picker,
  );
}

function hasVisualSource(state: VisualState): boolean {
  return Boolean(state.file || state.localPath);
}

function hasAudioSource(state: AudioState): boolean {
  return Boolean(state.file || state.localPath);
}

function revokePreviewUrl(url: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function detectVisualKind(type: string, fileName: string): "image" | "video" {
  const lower = fileName.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (/\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|heic|heif)$/i.test(lower)) return "image";
  return "video";
}

function fileNameFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "asset";
}

function clipSelectionKey(clip: TimelineClip): string | null {
  if (!clip.path) return null;
  return `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}`;
}

function audioSelectionKey(clip: TimelineAudio): string | null {
  if (!clip.path) return null;
  return `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}`;
}

function pathToMediaSrc(p: string): string {
  if (!p) return "";
  if (p.startsWith("blob:") || p.startsWith("data:") || p.startsWith("http")) return p;
  const forward = p.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}

async function ensureVisualUploadedAsImage(state: VisualState): Promise<string> {
  if (!hasVisualSource(state) || !state.kind) {
    throw new Error("Missing visual source.");
  }
  const uploadKey = state.file
    ? `file:${state.file.name}:${state.file.size}:${state.file.lastModified}:${state.kind}`
    : `path:${state.localPath}:${state.kind}:${state.frameTimeSec ?? 0}`;
  if (state.uploadedUrl && state.uploadedKey === uploadKey) {
    return state.uploadedUrl;
  }

  let uploadedUrl = "";
  if (state.kind === "image") {
    uploadedUrl = state.file
      ? await api.uploadFileToStorage(state.file, "image")
      : await api.uploadLocalPathToStorage(state.localPath!, "image");
  } else {
    const frameFile = state.file
      ? await captureFrameFromVideoFile(state.file, state.frameTimeSec)
      : await captureFrameFromVideoPath(state.localPath!, state.displayName ?? "timeline-video", state.frameTimeSec);
    uploadedUrl = await api.uploadFileToStorage(frameFile, "image");
  }

  state.uploadedUrl = uploadedUrl;
  state.uploadedKey = uploadKey;
  return uploadedUrl;
}

async function ensureAudioUploaded(state: AudioState): Promise<string> {
  if (!hasAudioSource(state)) {
    throw new Error("Missing audio source.");
  }
  const uploadKey = state.file
    ? `file:${state.file.name}:${state.file.size}:${state.file.lastModified}`
    : `path:${state.localPath}`;
  if (state.uploadedUrl && state.uploadedKey === uploadKey) {
    return state.uploadedUrl;
  }

  const uploadedUrl = state.file
    ? await api.uploadFileToStorage(state.file, "audio")
    : await api.uploadLocalPathToStorage(state.localPath!, "audio");

  state.uploadedUrl = uploadedUrl;
  state.uploadedKey = uploadKey;
  return uploadedUrl;
}

async function captureFrameFromVideoFile(file: File, inSec?: number | null): Promise<File> {
  const src = URL.createObjectURL(file);
  try {
    const blob = await captureFrameBlob(src, inSec);
    return new File([blob], `${baseName(file.name)}-frame.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function captureFrameFromVideoPath(localPath: string, displayName: string, inSec?: number | null): Promise<File> {
  const blob = await captureFrameBlob(pathToMediaSrc(localPath), inSec);
  return new File([blob], `${baseName(displayName)}-frame.png`, { type: "image/png" });
}

async function captureFrameBlob(src: string, inSec?: number | null): Promise<Blob> {
  const video = document.createElement("video");
  video.src = src;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    const onError = () => reject(new Error("Video preview could not be loaded."));
    video.onerror = onError;
    video.onloadedmetadata = () => {
      const trimmedStart = typeof inSec === "number" && Number.isFinite(inSec) ? Math.max(0, inSec) : 0;
      const fallback = Number.isFinite(video.duration) && video.duration > 0.12 ? 0.1 : 0;
      const target = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(trimmedStart + 0.05, Math.max(0, video.duration - 0.05))
        : fallback;
      if (target <= 0) {
        resolve();
        return;
      }
      video.currentTime = target;
    };
    video.onseeked = () => resolve();
    video.onloadeddata = () => {
      if (video.currentTime <= 0.001) resolve();
    };
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1024;
  canvas.height = video.videoHeight || 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Frame capture failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function generationBusyCard(message: string): HTMLElement {
  return el("div.state-card", null,
    ProcessingLoader("Generating LiP sync"),
    el("div.state-card__subtitle", { style: { marginTop: "8px" } }, message),
  );
}

function busyCard(message: string): HTMLElement {
  return generationBusyCard(message);
  return el("div.state-card", null,
    el("div.state-card__icon", null, icon("spark", 22)),
    el("div.state-card__title", null, "Working…"),
    el("div.state-card__subtitle", null, message),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Generation failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function resultCard(job: JobStatus): HTMLElement {
  const result = job.result!;
  return el("div.col.gap-3",
    null,
    el("div", {
      style: {
        borderRadius: "14px",
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid var(--line-soft)",
      },
    },
      el("video", {
        src: result.url,
        controls: "true",
        playsinline: "true",
        style: { width: "100%", display: "block" },
      }),
    ),
    el("div.row.gap-2", null,
      el("button.btn-primary", {
        onClick: async () => {
          try {
            const local = await api.downloadAsset(result.url, `${result.id}.mp4`);
            await evalES("importMediaFromPath", local);
            toast(getHostImportSuccessMessage(), "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
      }, icon("import", 14), getHostImportButtonLabel()),
      el("button.btn-secondary", {
        onClick: () => navigator.clipboard.writeText(result.url).then(() => toast("Link copied")),
      }, "Copy link"),
    ),
    result.prompt
      ? el("div.dim", { style: { fontSize: "12px", padding: "4px 4px 8px" } }, result.prompt)
      : null,
  );
}
