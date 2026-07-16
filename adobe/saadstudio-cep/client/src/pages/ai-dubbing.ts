/** AI Dubbing - Reap /create-dubbing. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { ProcessingLoader } from "../components/processing-loader";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api, reap, type ReapRawLanguageOption, type ReapStatusResponse } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { watchTimelineSelection } from "../lib/timeline-watcher";
import { openModelPicker } from "../components/model-picker";

interface LanguageOption {
  value: string;
  label: string;
}

interface SourceClip {
  path: string;
  name: string;
  origin: "timeline" | "upload";
}

interface ActiveDubbingJob {
  projectId: string;
  generationId: string;
  filename: string;
  sourcePath: string;
  sourceName: string;
  sourceOrigin: SourceClip["origin"];
  sourceLanguage: string;
  targetLanguage: string;
  startedAt: number;
  checks: number;
  lastStatus?: ReapStatusResponse["status"];
  lastProgress?: number;
}

const EMPTY_LANGUAGES: LanguageOption[] = [];
const ACTIVE_DUBBING_JOB_KEY = "saadstudio.aiDubbing.activeJob";
const REAP_POLL_INTERVAL_MS = 12_000;

let cachedSource: LanguageOption[] | null = null;
let cachedTarget: LanguageOption[] | null = null;

export function AIDubbingPage(): HTMLElement {
  const state = {
    clip: null as SourceClip | null,
    sourceLanguage: "",
    targetLanguage: "",
    busy: false,
    loadingLanguages: true,
    languageError: null as string | null,
    status: null as HTMLElement | null,
  };

  const body = el("div.app-main");
  const page = el("div.ai-dubbing-page");
  const resultArea = el("div.ai-dubbing-result");
  let disposed = false;
  let pollSession = 0;
  body.appendChild(page);

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("AI Dubbing"),
    body,
  );

  const watcher = watchTimelineSelection((clip) => {
    if (state.busy || !clip?.path || state.clip?.origin === "upload") return;
    state.clip = {
      path: clip.path,
      name: clip.name ?? guessName(clip.path),
      origin: "timeline",
    };
    render();
  });
  watcher.attachTo(root);

  void loadLanguages().then(() => {
    state.loadingLanguages = false;
    state.sourceLanguage ||= pickDefault(cachedSource, "en-US");
    state.targetLanguage ||= pickDefault(cachedTarget, "ar");
    render();
  }).catch((err) => {
    state.loadingLanguages = false;
    state.languageError = (err as Error).message;
    render();
  });

  render();
  requestAnimationFrame(function watchDispose() {
    if (!root.isConnected) {
      disposed = true;
      pollSession += 1;
      return;
    }
    requestAnimationFrame(watchDispose);
  });
  void resumeStoredJob();
  return root;

  function render() {
    page.replaceChildren(
      renderDubbingCard(),
      resultArea,
    );
  }

  function renderDubbingCard(): HTMLElement {
    const canRun = Boolean(state.clip && state.sourceLanguage && state.targetLanguage && !state.busy);
    return el("div.ai-dubbing-card", null,
      el("div.ai-dubbing-hero", null,
        state.clip
          ? el("video.ai-dubbing-hero__video", {
              src: pathToVideoSrc(state.clip.path),
              controls: "true",
              muted: "true",
              preload: "metadata",
              onLoadedMetadata: (event: Event) => applyVideoAspect(event.currentTarget as HTMLVideoElement),
            })
          : el("div.ai-dubbing-hero__placeholder", null,
              el("span", null, "English"),
              el("strong", null, "Hi! Let's get started"),
              el("span", null, "Arabic"),
            ),
        el("button.modal__close.ai-dubbing-card__close", { onClick: () => history.back() }, icon("close", 14)),
      ),
      el("div.ai-dubbing-card__title", null, "AI Dubbing"),
      el("div.ai-dubbing-card__subtitle", null, "Dub your videos into any language with AI."),
      renderUploadArea(),
      el("div.ai-dubbing-form", null,
        renderLanguageField("Language", state.sourceLanguage, cachedSource ?? EMPTY_LANGUAGES, async (anchor) => {
          const picked = await openModelPicker({
            title: "Source language",
            options: cachedSource ?? EMPTY_LANGUAGES,
            anchor,
          });
          if (picked) { state.sourceLanguage = picked; render(); }
        }),
        renderLanguageField("Translate to", state.targetLanguage, cachedTarget ?? EMPTY_LANGUAGES, async (anchor) => {
          const picked = await openModelPicker({
            title: "Target language",
            options: cachedTarget ?? EMPTY_LANGUAGES,
            anchor,
          });
          if (picked) { state.targetLanguage = picked; render(); }
        }),
      ),
      state.languageError
        ? el("div.ai-dubbing-error", null, state.languageError)
        : null,
      el("button.btn-primary.ai-dubbing-submit",
        {
          disabled: !canRun,
          onClick: runDubbing,
        },
        state.busy ? "Translating..." : "Translate",
        icon("spark", 14),
      ),
    );
  }

  function renderUploadArea(): HTMLElement {
    return el("div.ai-dubbing-upload",
      {
        onDragover: (e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.add("ai-dubbing-upload--dragover");
        },
        onDragleave: (e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove("ai-dubbing-upload--dragover");
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove("ai-dubbing-upload--dragover");
          const file = e.dataTransfer?.files?.[0];
          if (file) setUploadFile(file);
        },
        onClick: pickUpload,
      },
      el("div.ai-dubbing-upload__label", null, "Upload your video"),
      el("div.ai-dubbing-upload__box", null,
        el("div.ai-dubbing-upload__icon", null, icon("import", 18)),
        el("div", null,
          state.clip
            ? state.clip.name
            : (isInsideAdobe() ? "Select a timeline clip, click to upload, or drag and drop" : "Click to upload or drag and drop")),
        el("small", null, "Max. File Size: 2 GB"),
      ),
    );
  }

  function renderLanguageField(
    label: string,
    value: string,
    options: LanguageOption[],
    onPick: (anchor: HTMLElement) => Promise<void>,
  ): HTMLElement {
    const optionLabel = options.find((item) => item.value === value)?.label ?? (state.loadingLanguages ? "Loading..." : "Choose language");
    return el("label.ai-dubbing-field", null,
      el("span", null, label),
      el("button.form-select", {
        onClick: (event: MouseEvent) => onPick(event.currentTarget as HTMLElement),
        disabled: state.loadingLanguages || state.busy,
      },
        optionLabel),
    );
  }

  function pickUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/quicktime,video/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) setUploadFile(file);
    });
    input.click();
  }

  function setUploadFile(file: File) {
    state.clip = {
      path: (file as File & { path?: string }).path ?? URL.createObjectURL(file),
      name: file.name,
      origin: "upload",
    };
    render();
  }

  async function runDubbing() {
    if (!state.clip) {
      toast("Select a timeline clip or upload a video first.", "error");
      return;
    }
    if (!state.sourceLanguage || !state.targetLanguage) {
      toast("Choose source and target languages first.", "error");
      return;
    }

    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard("Uploading to Reap...", "Preparing the video for AI dubbing."));

    try {
      const filename = ensureReapVideoFilename(state.clip.name);
      const uploadId = await uploadDirect(state.clip, filename);
      resultArea.replaceChildren(progressCard("Starting dubbing...", "Creating a Reap dubbing project."));

      const started = await reap.start({
        tool: "dubbing",
        uploadId,
        filename,
        options: {
          sourceLanguage: state.sourceLanguage,
          targetLanguage: state.targetLanguage,
        },
      });
      const job: ActiveDubbingJob = {
        projectId: started.projectId,
        generationId: started.generationId,
        filename,
        sourcePath: state.clip.path,
        sourceName: state.clip.name,
        sourceOrigin: state.clip.origin,
        sourceLanguage: state.sourceLanguage,
        targetLanguage: state.targetLanguage,
        startedAt: Date.now(),
        checks: 0,
        lastStatus: started.status as ReapStatusResponse["status"],
      };
      saveActiveDubbingJob(job);
      await pollDubbingJob(job);
      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      resultArea.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    } finally {
      state.busy = false;
      render();
    }
  }

  async function resumeStoredJob() {
    const job = readActiveDubbingJob();
    if (!job) return;
    hydrateFromJob(job);
    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard(
      "Resuming dubbing...",
      `Saved job found. Elapsed ${formatElapsed(Date.now() - job.startedAt)} - Checks ${job.checks}`,
      job.lastProgress,
    ));
    try {
      await pollDubbingJob(job);
    } catch (err) {
      resultArea.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    } finally {
      if (!disposed) {
        state.busy = false;
        render();
      }
    }
  }

  async function pollDubbingJob(initialJob: ActiveDubbingJob) {
    let job = initialJob;
    const session = ++pollSession;
    hydrateFromJob(job);
    state.busy = true;
    render();

    let firstCheck = true;
    while (!disposed && session === pollSession) {
      if (!firstCheck) await delay(REAP_POLL_INTERVAL_MS);
      firstCheck = false;
      if (disposed || session !== pollSession) return;

      const status = await reap.status(job.projectId, job.generationId);
      job = {
        ...job,
        checks: job.checks + 1,
        lastStatus: status.status,
        lastProgress: status.progress,
      };
      saveActiveDubbingJob(job);

      const elapsed = formatElapsed(Date.now() - job.startedAt);
      resultArea.replaceChildren(progressCard(
        status.status === "queued" ? "Queued..." : "Dubbing...",
        `Elapsed ${elapsed} - Checks ${job.checks}`,
        status.progress,
      ));

      if (!isTerminalStatus(status.status)) continue;

      if (status.status !== "completed") {
        clearActiveDubbingJob();
        throw new Error(status.error ?? `Reap job ${status.status}`);
      }

      clearActiveDubbingJob();
      await importDubbedResult(status);
      return;
    }
  }

  function hydrateFromJob(job: ActiveDubbingJob) {
    state.clip = {
      path: job.sourcePath,
      name: job.sourceName,
      origin: job.sourceOrigin,
    };
    state.sourceLanguage = job.sourceLanguage;
    state.targetLanguage = job.targetLanguage;
  }

  async function importDubbedResult(final: ReapStatusResponse) {
    const url = pickVideoUrl(final);
    if (!url) {
      resultArea.replaceChildren(errorCard("Reap finished but returned no dubbed video URL."));
      return;
    }
    resultArea.replaceChildren(progressCard("Adding dubbed video...", "Downloading the result and placing it on the timeline."));
    const local = await api.downloadAsset(url, `saadstudio-dubbed-${Date.now()}.mp4`);
    const placed = await evalES<{ ok: boolean; placed?: boolean; reason?: string }>("importAndPlaceOnTimeline", local);
    resultArea.replaceChildren(successCard(url, placed));
    toast(placed?.placed ? "Dubbed video added to timeline" : "Dubbed video imported", "success");
  }
}

async function loadLanguages() {
  if (cachedSource && cachedTarget) return;
  const res = await reap.dubbingLanguages();
  cachedSource = mapReapLanguages(res.sourceLanguages);
  cachedTarget = mapReapLanguages(res.targetLanguages);
}

async function uploadDirect(clip: SourceClip, filename: string): Promise<string> {
  if (/^https?:\/\//i.test(clip.path)) {
    const blob = await fetch(clip.path).then((r) => r.blob());
    return reap.uploadDirect({ kind: "blob", blob, name: filename });
  }
  if (clip.path.startsWith("blob:")) {
    const blob = await fetch(clip.path).then((r) => r.blob());
    return reap.uploadDirect({ kind: "blob", blob, name: filename });
  }
  return reap.uploadDirect({ kind: "path", path: clip.path, name: filename });
}

function mapReapLanguages(items: ReapRawLanguageOption[] | undefined): LanguageOption[] {
  return Array.isArray(items)
    ? items
      .map((item) => {
        if (!item?.code) return null;
        return {
          value: item.code,
          label: item.displayName || item.name || item.code,
        };
      })
      .filter((item): item is LanguageOption => item !== null)
    : EMPTY_LANGUAGES;
}

function pickDefault(items: LanguageOption[] | null, preferredPrefix: string): string {
  if (!items?.length) return "";
  return items.find((item) => item.value.toLowerCase().startsWith(preferredPrefix.toLowerCase()))?.value
    ?? items[0].value;
}

function progressCard(title: string, subtitle: string, progress?: number): HTMLElement {
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  return el("div.state-card.ai-dubbing-progress", null,
    ProcessingLoader(title),
    el("div.state-card__subtitle", null, subtitle),
    el("div.captions-progress" + (pct == null ? ".captions-progress--indeterminate" : ""), null,
      el("div.captions-progress__bar", { style: pct == null ? undefined : { width: `${pct}%` } }),
    ),
  );
}

function successCard(url: string, placed: { ok: boolean; placed?: boolean; reason?: string } | null): HTMLElement {
  return el("div.state-card.ai-dubbing-success", null,
    el("video", { src: url, controls: "true", style: { width: "100%", borderRadius: "8px" } }),
    el("div.state-card__title", null, placed?.placed ? "Dubbed video added" : "Dubbed video ready"),
    el("div.state-card__subtitle", null,
      placed?.placed ? "The dubbed result was placed on the timeline." : (placed?.reason ?? "The result was downloaded.")),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "AI Dubbing failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function pickVideoUrl(status: ReapStatusResponse): string | null {
  const urls = [status.url, ...(status.urls ?? []), ...collectStrings(status.metadata)]
    .filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value));
  return urls.find((url) => /\.(mp4|mov|webm)(\?|$|#)/i.test(url)) ?? urls[0] ?? null;
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => collectStrings(item, depth + 1));
}

function readActiveDubbingJob(): ActiveDubbingJob | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DUBBING_JOB_KEY);
    return raw ? JSON.parse(raw) as ActiveDubbingJob : null;
  } catch {
    return null;
  }
}

function saveActiveDubbingJob(job: ActiveDubbingJob) {
  localStorage.setItem(ACTIVE_DUBBING_JOB_KEY, JSON.stringify(job));
}

function clearActiveDubbingJob() {
  localStorage.removeItem(ACTIVE_DUBBING_JOB_KEY);
}

function isTerminalStatus(status: ReapStatusResponse["status"]): boolean {
  return status === "completed" || status === "failed" || status === "invalid" || status === "expired";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureReapVideoFilename(filename: string): string {
  const clean = filename || `clip-${Date.now()}.mp4`;
  if (/\.(mp4|mov)$/i.test(clean)) return clean;
  return `${clean.replace(/\.[^.]+$/, "")}.mp4`;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function guessName(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? "Clip";
}

function pathToVideoSrc(path: string): string {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("http")) return path;
  const forward = path.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}

function applyVideoAspect(video: HTMLVideoElement) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return;
  const frame = video.closest(".ai-dubbing-hero") as HTMLElement | null;
  if (!frame) return;
  frame.style.aspectRatio = `${width} / ${height}`;
  frame.style.maxWidth = height > width ? "290px" : "560px";
  frame.classList.toggle("ai-dubbing-hero--portrait", height > width);
  frame.classList.toggle("ai-dubbing-hero--wide", width >= height);
}
