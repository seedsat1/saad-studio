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
import { t } from "../lib/i18n";

interface LanguageOption {
  value: string;
  label: string;
}

interface SourceClip {
  path: string;
  name: string;
  origin: "timeline" | "upload";
  size?: number;
  durationSec?: number;
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
const MAX_REAP_DUBBING_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const MIN_REAP_DUBBING_DURATION_SEC = 3;
const MAX_REAP_DUBBING_DURATION_SEC = 15 * 60;

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
    PageHeader(t("aiDubbingTitle")),
    body,
  );

  const watcher = watchTimelineSelection((clip) => {
    if (state.busy || !clip?.path || state.clip?.origin === "upload") return;
    const inSec = clip.inSec ?? 0;
    const outSec = clip.outSec ?? 0;
    state.clip = {
      path: clip.path,
      name: clip.name ?? guessName(clip.path),
      origin: "timeline",
      durationSec: clip.durationSec || (outSec > inSec ? outSec - inSec : undefined),
      size: getLocalFileSize(clip.path),
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
              el("span", null, t("aiDubbingHeroSource")),
              el("strong", null, t("aiDubbingHeroText")),
              el("span", null, t("aiDubbingHeroTarget")),
            ),
        el("button.modal__close.ai-dubbing-card__close", { onClick: () => history.back() }, icon("close", 14)),
      ),
      el("div.ai-dubbing-card__title", null, t("aiDubbingTitle")),
      el("div.ai-dubbing-card__subtitle", null, t("aiDubbingSubtitle")),
      renderUploadArea(),
      el("div.ai-dubbing-form", null,
        renderLanguageField(t("aiDubbingSourceLanguage"), state.sourceLanguage, cachedSource ?? EMPTY_LANGUAGES, async (anchor) => {
          const picked = await openModelPicker({
            title: t("aiDubbingSourcePicker"),
            options: cachedSource ?? EMPTY_LANGUAGES,
            anchor,
          });
          if (picked) { state.sourceLanguage = picked; render(); }
        }),
        renderLanguageField(t("aiDubbingTargetLanguage"), state.targetLanguage, cachedTarget ?? EMPTY_LANGUAGES, async (anchor) => {
          const picked = await openModelPicker({
            title: t("aiDubbingTargetPicker"),
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
        state.busy ? t("aiDubbingTranslating") : t("aiDubbingTranslate"),
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
      el("div.ai-dubbing-upload__label", null, t("aiDubbingUploadTitle")),
      el("div.ai-dubbing-upload__box", null,
        el("div.ai-dubbing-upload__icon", null, icon("import", 18)),
        el("div", null,
          state.clip
            ? state.clip.name
            : (isInsideAdobe() ? t("aiDubbingPickHintAdobe") : t("aiDubbingPickHintBrowser"))),
        el("small", null, t("aiDubbingMaxFile")),
      ),
    );
  }

  function renderLanguageField(
    label: string,
    value: string,
    options: LanguageOption[],
    onPick: (anchor: HTMLElement) => Promise<void>,
  ): HTMLElement {
    const optionLabel = options.find((item) => item.value === value)?.label ?? (state.loadingLanguages ? t("aiDubbingLoadingLanguages") : t("aiDubbingChooseLanguage"));
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
    input.accept = "video/mp4,video/quicktime,.mp4,.mov";
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
      size: file.size,
    };
    render();
  }

  async function runDubbing() {
    if (!state.clip) {
      toast(t("aiDubbingSelectVideoFirst"), "error");
      return;
    }
    if (!state.sourceLanguage || !state.targetLanguage) {
      toast(t("aiDubbingChooseLanguagesFirst"), "error");
      return;
    }

    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard(t("aiDubbingUploading"), t("aiDubbingUploadingSubtitle")));

    try {
      await validateDubbingSource(state.clip);
      const filename = ensureReapVideoFilename(state.clip.name);
      const uploadId = await uploadDirect(state.clip, filename);
      resultArea.replaceChildren(progressCard(t("aiDubbingStarting"), t("aiDubbingStartingSubtitle")));

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
      t("aiDubbingResuming"),
      t("reapElapsedChecks")
        .replace("{elapsed}", formatElapsed(Date.now() - job.startedAt))
        .replace("{checks}", String(job.checks)),
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
        status.status === "queued" ? t("reapQueued") : t("aiDubbingDubbing"),
        t("reapElapsedChecks")
          .replace("{elapsed}", elapsed)
          .replace("{checks}", String(job.checks)),
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
      resultArea.replaceChildren(errorCard(t("aiDubbingNoOutput")));
      return;
    }
    resultArea.replaceChildren(progressCard(t("aiDubbingAdding"), t("aiDubbingAddingSubtitle")));
    const local = await api.downloadAsset(url, `saadstudio-dubbed-${Date.now()}.mp4`);
    const placed = await evalES<{ ok: boolean; placed?: boolean; reason?: string }>("importAndPlaceOnTimeline", local);
    resultArea.replaceChildren(successCard(url, placed));
    toast(placed?.placed ? t("aiDubbingAddedToast") : t("aiDubbingImportedToast"), "success");
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
    el("div.state-card__title", null, placed?.placed ? t("aiDubbingAddedTitle") : t("aiDubbingReadyTitle")),
    el("div.state-card__subtitle", null,
      placed?.placed ? t("aiDubbingAddedSubtitle") : (placed?.reason ?? t("aiDubbingReadySubtitle"))),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, t("aiDubbingFailedTitle")),
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
  throw new Error(t("aiDubbingUnsupportedFormat"));
}

async function validateDubbingSource(clip: SourceClip): Promise<void> {
  if (!/\.(mp4|mov)$/i.test(clip.name)) {
    throw new Error(t("aiDubbingUnsupportedFormat"));
  }
  if (typeof clip.size === "number" && clip.size > MAX_REAP_DUBBING_SIZE_BYTES) {
    throw new Error(t("aiDubbingFileTooLarge"));
  }

  let duration = clip.durationSec;
  if (duration == null) {
    duration = await probeVideoDuration(pathToVideoSrc(clip.path)) ?? undefined;
  }
  if (duration != null && (duration < MIN_REAP_DUBBING_DURATION_SEC || duration > MAX_REAP_DUBBING_DURATION_SEC)) {
    throw new Error(t("aiDubbingDurationOutOfRange"));
  }
}

function probeVideoDuration(src: string): Promise<number | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      done(duration);
    };
    video.onerror = () => done(null);
    window.setTimeout(() => done(null), 4000);
    video.src = src;
  });
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

function getLocalFileSize(path: string): number | undefined {
  try {
    if (window.cep_node) {
      const fs = window.cep_node.require("fs") as any;
      if (fs && fs.existsSync(path)) {
        return fs.statSync(path).size;
      }
    }
  } catch (err) {
    console.warn("Failed to read file size via Node fs:", err);
  }
  return undefined;
}
