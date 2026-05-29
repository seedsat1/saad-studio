import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
import { api, type JobStatus } from "../lib/api";
import { toast } from "../lib/toast";
import { evalES, getHostImportButtonLabel, getHostImportSuccessMessage } from "../lib/cep";
import { store } from "../lib/store";
import { watchTimelineSelection, type TimelineClip } from "../lib/timeline-watcher";
import { enforceVideoDurationLimit } from "../lib/media-validation";

type ExpandState = {
  file: File | null;
  localPath: string | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
  displayName: string | null;
  kind: "image" | "video" | null;
  source: "upload" | "timeline" | null;
  selectionKey: string | null;
};

const ASPECTS = ["auto", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9", "9:21"] as const;
const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;

export function DrawToVideoPage(): HTMLElement {
  const state: ExpandState = {
    file: null,
    localPath: null,
    previewUrl: null,
    uploadedUrl: null,
    uploadedKey: null,
    displayName: null,
    kind: null,
    source: null,
    selectionKey: null,
  };
  let busy = false;

  const promptInput = el("textarea", {
    rows: "4",
    placeholder: "Optional: describe the environment you want outside the original frame…",
    style: textareaStyle(),
  }) as HTMLTextAreaElement;

  const aspectSelect = createSelect(ASPECTS.map((value) => ({ value, label: value })), "16:9");
  const outputSelect = createSelect(OUTPUT_FORMATS.map((value) => ({ value, label: value })), "png");

  const imagePreview = el("img", {
    alt: "Expand source preview",
    style: previewStyle("none"),
  }) as HTMLImageElement;

  const videoPreview = el("video", {
    controls: "true",
    muted: "true",
    playsinline: "true",
    preload: "metadata",
    style: previewStyle("none"),
  }) as HTMLVideoElement;

  const sourceMeta = el("div.mono.muted", {
    style: { fontSize: "11px", wordBreak: "break-all" },
  }, "No image or video selected");

  const generateBtnLabel = el("span", null, "Generate expand");
  const generateBtn = el("button.btn-primary", {
    onClick: () => { void submit(); },
  }, icon("send", 14), generateBtnLabel) as HTMLButtonElement;
  const busyHint = el("div.busy-inline", {
    style: { display: "none", justifyContent: "flex-end", marginTop: "10px" },
  },
    el("span.busy-spinner", { "aria-hidden": "true" }),
    el("span", null, "Generating expand result… please wait"),
  );

  const resultHost = el("div.col.gap-3", { style: { padding: "0 16px 16px" } });

  const sourceCard = createUploadCard({
    title: "Source media",
    subtitle: "Pick an image or video from the timeline, or upload one manually.",
    accept: "image/*,video/*",
    buttonLabel: "Choose image/video",
    preview: el("div.col.gap-3", null, imagePreview, videoPreview),
    meta: sourceMeta,
    onPick: async (file) => {
      await handlePickedFile(file);
    },
  });

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Expand"),
    el("div.app-main",
      null,
      el("div.state-card", { style: { margin: "0 16px 16px" } },
        el("div.state-card__icon", null, icon("draw-pen", 22)),
        el("div.state-card__title", null, "Expand any image or video"),
        el("div.state-card__subtitle", null,
          "Uses WaveSpeed outpainting models. Images go to image zoom-out. Videos go to video outpainter with optional prompt guidance.",
        ),
      ),
      el("div.col.gap-3", { style: { padding: "0 16px 16px" } },
        sourceCard,
        el("div.state-card", { style: { padding: "14px" } },
          el("div.state-card__title", { style: leftTitleStyle() }, "Format"),
          el("div.grid-2", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
            buildField("Aspect ratio", aspectSelect),
            buildField("Output format", outputSelect),
          ),
        ),
        el("div.state-card", { style: { padding: "14px" } },
          el("div.state-card__title", { style: leftTitleStyle() }, "Prompt"),
          el("div.state-card__subtitle", { style: leftSubStyle() },
            "Optional for video expansion. Image zoom-out focuses on canvas extension and may ignore the prompt.",
          ),
          promptInput,
          busyHint,
          el("div.row.gap-2", { style: { marginTop: "12px", justifyContent: "flex-end" } }, generateBtn),
        ),
      ),
      resultHost,
    ),
  );

  const watcher = watchTimelineSelection((clip) => {
    if (!clip?.path || state.source === "upload") return;
    const key = clipSelectionKey(clip);
    if (!key || key === state.selectionKey) return;
    void handleTimelineClip(clip);
  });
  watcher.attachTo(root);

  updateGenerateState();
  return root;

  function applyUpload(file: File | null) {
    revokePreviewUrl(state.previewUrl);
    state.file = file;
    state.localPath = null;
    state.previewUrl = file ? URL.createObjectURL(file) : null;
    state.uploadedUrl = null;
    state.uploadedKey = null;
    state.displayName = file?.name ?? null;
    state.kind = file ? detectKind(file.type, file.name) : null;
    state.source = file ? "upload" : null;
    state.selectionKey = file ? `upload:${file.name}:${file.size}:${file.lastModified}` : null;
    if (state.kind === "video") {
      outputSelect.value = "png";
    }
  }

  function applyTimelineSelection(clip: TimelineClip) {
    revokePreviewUrl(state.previewUrl);
    state.file = null;
    state.localPath = clip.path;
    state.previewUrl = pathToMediaSrc(clip.path);
    state.uploadedUrl = null;
    state.uploadedKey = null;
    state.displayName = clip.name ?? fileNameFromPath(clip.path);
    state.kind = clip.type;
    state.source = "timeline";
    state.selectionKey = clipSelectionKey(clip);
    if (state.kind === "video") {
      outputSelect.value = "png";
    }
  }

  function syncPreview() {
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";
    imagePreview.removeAttribute("src");
    videoPreview.removeAttribute("src");

    if (!state.previewUrl || !state.kind) {
      sourceMeta.textContent = "No image or video selected";
      return;
    }

    if (state.kind === "image") {
      imagePreview.src = state.previewUrl;
      imagePreview.style.display = "block";
    } else {
      videoPreview.src = state.previewUrl;
      videoPreview.style.display = "block";
    }

    const sourceLabel = state.source === "timeline" ? "timeline" : "upload";
    sourceMeta.textContent = `${state.displayName ?? "Source media"} • ${state.kind} • ${sourceLabel}`;
  }

  async function handlePickedFile(file: File | null) {
    try {
      if (file && detectKind(file.type, file.name) === "video") {
        await enforceVideoDurationLimit(file);
      }
      applyUpload(file);
      syncPreview();
      updateGenerateState();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function handleTimelineClip(clip: TimelineClip) {
    try {
      if (clip.type === "video") {
        await enforceVideoDurationLimit(clip.path);
      }
      applyTimelineSelection(clip);
      syncPreview();
      updateGenerateState();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  function updateGenerateState() {
    generateBtn.disabled = busy || !hasSource(state);
    generateBtn.style.opacity = generateBtn.disabled ? "0.6" : "1";
    generateBtn.style.pointerEvents = generateBtn.disabled ? "none" : "auto";
    generateBtn.classList.toggle("btn-primary--busy", busy);
    generateBtnLabel.textContent = busy ? "Generating…" : "Generate expand";
    busyHint.style.display = busy ? "inline-flex" : "none";
    aspectSelect.value = state.kind === "video" && aspectSelect.value === "auto" ? "auto" : aspectSelect.value;
  }

  async function submit() {
    if (busy) return;
    if (!hasSource(state) || !state.kind) {
      toast("Select an image or a video first.", "error");
      return;
    }

    try {
      busy = true;
      updateGenerateState();
      resultHost.replaceChildren(busyCard(`Uploading ${state.kind} and generating expand result…`));

      const inputUrl = await ensureUploaded(state);
      const body: {
        inputUrl: string;
        inputKind: "image" | "video";
        aspectRatio: string;
        prompt?: string;
        outputFormat?: "png" | "jpeg" | "webp";
      } = {
        inputUrl,
        inputKind: state.kind,
        aspectRatio: state.kind === "video" ? aspectSelect.value : aspectSelect.value || "16:9",
      };
      const prompt = promptInput.value.trim();
      if (prompt) body.prompt = prompt;
      if (state.kind === "image") {
        body.outputFormat = outputSelect.value as "png" | "jpeg" | "webp";
      }

      const job = await api.generate.expand(body);
      const final = (job.status === "succeeded" || job.status === "failed")
        ? job
        : await api.pollJob(job.id);
      if (final.status === "failed" || !final.result) {
        throw new Error(final.error ?? "Expand generation failed");
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
    el("div.state-card__title", { style: leftTitleStyle() }, input.title),
    el("div.state-card__subtitle", { style: leftSubStyle() }, input.subtitle),
    input.preview,
    input.meta,
    el("div.row.gap-2", { style: { marginTop: "12px", justifyContent: "flex-start" } },
      el("button.btn-secondary", { onClick: () => picker.click() }, icon("plus", 14), input.buttonLabel),
    ),
    picker,
  );
}

function buildField(label: string, control: HTMLElement): HTMLElement {
  return el("label.col.gap-2", null,
    el("div.dim", { style: { fontSize: "12px" } }, label),
    control,
  );
}

function createSelect(options: Array<{ value: string; label: string }>, value: string): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "dock-select";
  Object.assign(select.style, {
    width: "100%",
    minHeight: "40px",
    borderRadius: "12px",
    border: "1px solid var(--line-soft)",
    background: "var(--bg-card)",
    color: "var(--text)",
    padding: "0 12px",
    outline: "none",
  });
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    select.appendChild(node);
  }
  select.value = value;
  return select;
}

function hasSource(state: ExpandState): boolean {
  return Boolean(state.file || state.localPath);
}

async function ensureUploaded(state: ExpandState): Promise<string> {
  if (!hasSource(state) || !state.kind) {
    throw new Error("Missing source media.");
  }
  const uploadKey = state.file
    ? `file:${state.file.name}:${state.file.size}:${state.file.lastModified}:${state.kind}`
    : `path:${state.localPath}:${state.kind}`;
  if (state.uploadedUrl && state.uploadedKey === uploadKey) {
    return state.uploadedUrl;
  }

  const assetType = state.kind === "video" ? "video" : "image";
  const uploadedUrl = state.file
    ? await api.uploadFileToR2(state.file, assetType)
    : await api.uploadLocalPathToR2(state.localPath!, assetType);

  state.uploadedUrl = uploadedUrl;
  state.uploadedKey = uploadKey;
  return uploadedUrl;
}

function detectKind(type: string, fileName: string): "image" | "video" {
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

function clipSelectionKey(clip: TimelineClip): string | null {
  if (!clip.path) return null;
  return `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}`;
}

function revokePreviewUrl(url: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
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

function textareaStyle(): Partial<CSSStyleDeclaration> {
  return {
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
  };
}

function previewStyle(display: string): Partial<CSSStyleDeclaration> {
  return {
    width: "100%",
    maxHeight: "240px",
    objectFit: "cover",
    borderRadius: "12px",
    display,
    background: "#000",
  };
}

function leftTitleStyle(): Partial<CSSStyleDeclaration> {
  return { textAlign: "left", width: "100%", marginBottom: "8px" };
}

function leftSubStyle(): Partial<CSSStyleDeclaration> {
  return { textAlign: "left", width: "100%", marginBottom: "12px" };
}

function busyCard(message: string): HTMLElement {
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
      result.kind === "video"
        ? el("video", {
            src: result.url,
            controls: "true",
            playsinline: "true",
            style: { width: "100%", display: "block" },
          })
        : el("img", {
            src: result.url,
            style: { width: "100%", display: "block" },
          }),
    ),
    el("div.row.gap-2", null,
      el("button.btn-primary", {
        onClick: async () => {
          try {
            const ext = result.kind === "video" ? "mp4" : "png";
            const local = await api.downloadAsset(result.url, `${result.id}.${ext}`);
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
  );
}
