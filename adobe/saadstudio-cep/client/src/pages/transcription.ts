/** Transcription - Reap /create-transcription.
 *
 * API body supports only:
 *   sourceUrl or uploadId, language, translationLanguage, transcriptionScript.
 * Output files are exposed through project details URLs: SRT, VTT, CSV, TXT.
 */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { ProcessingLoader } from "../components/processing-loader";
import { icon } from "../lib/icons";
import { api, reap, type ReapRawLanguageOption, type ReapStatusResponse } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { openModelPicker } from "../components/model-picker";
import { t } from "../lib/i18n";

interface Option {
  value: string;
  label: string;
}

interface UploadSource {
  path: string;
  name: string;
  size?: number;
}

interface ActiveTranscriptionJob {
  projectId: string;
  generationId: string;
  sourceKind: "link" | "upload";
  sourceUrl?: string;
  upload?: UploadSource;
  language: string;
  translate: string;
  script: string;
  startedAt: number;
  checks: number;
  lastStatus?: ReapStatusResponse["status"];
  lastProgress?: number;
}

const ACTIVE_JOB_KEY = "saadstudio.transcription.activeJob";
const REAP_POLL_INTERVAL_MS = 12_000;
const AUTO_LANGUAGE = "__auto__";
const NO_TRANSLATION = "none";
const MAX_REAP_TRANSCRIPTION_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const MIN_REAP_TRANSCRIPTION_DURATION_SEC = 3;
const MAX_REAP_TRANSCRIPTION_DURATION_SEC = 15 * 60;

export function TranscriptionPage(): HTMLElement {
  const fallbackSourceLanguages = getFallbackLanguages();
  const state = {
    link: "",
    upload: null as UploadSource | null,
    language: "en",
    translate: NO_TRANSLATION,
    script: "native",
    sourceLanguages: fallbackSourceLanguages,
    targetLanguages: [{ value: NO_TRANSLATION, label: t("audiogramNone") }, ...fallbackSourceLanguages],
    loadingLanguages: true,
    busy: false,
  };

  const body = el("div.app-main");
  const page = el("div.captions-page.transcription-page");
  const resultArea = el("div.captions-result");
  let disposed = false;
  let pollSession = 0;
  body.appendChild(resultArea);
  body.appendChild(page);

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader(t("transcriptionTitle")),
    body,
  );

  void loadLanguages();
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

  async function loadLanguages() {
    try {
      const res = await reap.translationLanguages();
      const source = mapLanguages(res.sourceLanguages);
      const target = mapLanguages(res.targetLanguages);
      state.sourceLanguages = source.length ? source : fallbackSourceLanguages;
      state.targetLanguages = [{ value: NO_TRANSLATION, label: t("audiogramNone") }, ...(target.length ? target : fallbackSourceLanguages)];
      if (!state.sourceLanguages.some((item) => item.value === state.language)) {
        state.language = state.sourceLanguages[0]?.value ?? "en";
      }
    } catch {
      state.sourceLanguages = fallbackSourceLanguages;
      state.targetLanguages = [{ value: NO_TRANSLATION, label: t("audiogramNone") }, ...fallbackSourceLanguages];
    } finally {
      state.loadingLanguages = false;
      render();
    }
  }

  function render() {
    page.replaceChildren(
      renderHero(),
      renderLinkInput(),
      renderDivider(),
      renderUpload(),
      renderSettings(),
      renderCta(),
    );
  }

  function renderHero(): HTMLElement {
    return el("div.captions-hero", null,
      el("h2.captions-hero__title", null, t("transcriptionTitle")),
      el("div.captions-hero__subtitle", null, t("transcriptionSubtitle")),
    );
  }

  function renderLinkInput(): HTMLElement {
    return el("label.captions-link-input", null,
      el("span.captions-link-input__icon", null, icon("link", 15)),
      el("input", {
        value: state.link,
        placeholder: t("transcriptionDropLink"),
        disabled: state.busy,
        onInput: (event: Event) => {
          state.link = (event.currentTarget as HTMLInputElement).value;
          if (state.link.trim()) state.upload = null;
          render();
        },
      }),
    );
  }

  function renderDivider(): HTMLElement {
    return el("div.captions-source-divider", null,
      el("span.captions-source-divider__line"),
      el("span.captions-source-divider__label", null, t("transcriptionOr")),
      el("span.captions-source-divider__line"),
    );
  }

  function renderUpload(): HTMLElement {
    return el("div.captions-section", null,
      el("div.captions-section__head", null,
        el("h3", null, t("transcriptionUploadVideo")),
        state.upload ? el("button.dock-button", { onClick: () => { state.upload = null; render(); } }, t("videoUtilityChange")) : null,
      ),
      state.upload
        ? el("div.captions-source", null,
            el("div.captions-source__meta", null,
              el("div.captions-source__meta-icon", null, icon("video", 16)),
              el("div.captions-source__meta-text", null,
                el("div.captions-source__name", null, state.upload.name),
                el("div.captions-source__path", { title: state.upload.path }, state.upload.path),
              ),
            ),
          )
        : renderDropBox(),
    );
  }

  function renderDropBox(): HTMLElement {
    return el("div.captions-upload-surface",
      {
        onClick: pickUpload,
        onDragover: (event: DragEvent) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).classList.add("captions-upload-surface--dragover");
        },
        onDragleave: (event: DragEvent) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).classList.remove("captions-upload-surface--dragover");
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).classList.remove("captions-upload-surface--dragover");
          const file = event.dataTransfer?.files?.[0];
          if (file) setUpload(file);
        },
      },
      el("div.captions-upload-surface__icon", null, icon("import", 20)),
      el("div.captions-upload-surface__title", null, t("transcriptionClickUpload")),
      el("div.captions-upload-surface__meta", null, t("transcriptionMaxFile")),
    );
  }

  function renderSettings(): HTMLElement {
    return el("div.captions-section", null,
      el("div.transcription-settings-grid", null,
        renderPicker(t("transcriptionLanguage"), state.language, state.sourceLanguages, (value) => { state.language = value; render(); }),
        renderPicker(t("transcriptionTranslateTo"), state.translate, state.targetLanguages, (value) => { state.translate = value; render(); }),
        renderPicker(t("transcriptionScript"), state.script, getScriptOptions(), (value) => { state.script = value; render(); }, true),
      ),
    );
  }

  function renderPicker(
    label: string,
    value: string,
    options: Option[],
    onPick: (value: string) => void,
    wide = false,
  ): HTMLElement {
    const selected = options.find((item) => item.value === value)?.label ?? value;
    return el("label.transcription-field" + (wide ? ".transcription-field--wide" : ""), null,
      el("span", null, label),
      el("button.form-select", {
        disabled: state.busy || state.loadingLanguages,
        onClick: async (event: MouseEvent) => {
          const picked = await openModelPicker({ title: label, options, anchor: event.currentTarget as HTMLElement });
          if (picked) onPick(picked);
        },
      }, selected),
    );
  }

  function renderCta(): HTMLElement {
    const canRun = Boolean((state.upload || /^https?:\/\//i.test(state.link.trim())) && !state.busy);
    return el("div.captions-cta", null,
      el("button.btn-primary", { disabled: !canRun, onClick: runTranscription },
        state.busy ? t("transcriptionGenerating") : t("transcriptionGenerate"),
        icon("arrow-up-right", 14),
      ),
    );
  }

  function pickUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/quicktime,.mp4,.mov";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) setUpload(file);
    });
    input.click();
  }

  function setUpload(file: File) {
    state.upload = {
      path: (file as File & { path?: string }).path ?? URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    };
    state.link = "";
    render();
  }

  async function runTranscription() {
    const sourceUrl = state.link.trim();
    if (!state.upload && !/^https?:\/\//i.test(sourceUrl)) {
      toast(t("transcriptionNeedSource"), "error");
      return;
    }

    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard(t("transcriptionStarting"), t("transcriptionStartingSubtitle")));

    try {
      const body = {
        tool: "transcription" as const,
        options: {
          language: state.language === AUTO_LANGUAGE ? undefined : state.language,
          translationLanguage: state.translate === NO_TRANSLATION ? undefined : state.translate,
          transcriptionScript: state.script,
        },
      };

      const started = state.upload
        ? await startFromUpload(body)
        : await reap.start({ ...body, sourceUrl, filename: guessName(sourceUrl) });

      const job: ActiveTranscriptionJob = {
        projectId: started.projectId,
        generationId: started.generationId,
        sourceKind: state.upload ? "upload" : "link",
        sourceUrl: state.upload ? undefined : sourceUrl,
        upload: state.upload ?? undefined,
        language: state.language,
        translate: state.translate,
        script: state.script,
        startedAt: Date.now(),
        checks: 0,
        lastStatus: started.status as ReapStatusResponse["status"],
      };
      saveActiveJob(job);
      await pollJob(job);
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

  async function startFromUpload(body: { tool: "transcription"; options: Record<string, unknown> }) {
    if (!state.upload) throw new Error(t("transcriptionNoUpload"));
    resultArea.replaceChildren(progressCard(t("transcriptionUploading"), t("transcriptionUploadingSubtitle")));
    await validateTranscriptionUpload(state.upload);
    const filename = ensureSupportedFilename(state.upload.name);
    const uploadId = await uploadDirect(state.upload, filename);
    return reap.start({ ...body, uploadId, filename });
  }

  async function resumeStoredJob() {
    const job = readActiveJob();
    if (!job) return;
    hydrateFromJob(job);
    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard(
      t("transcriptionResuming"),
      t("reapElapsedChecks")
        .replace("{elapsed}", formatElapsed(Date.now() - job.startedAt))
        .replace("{checks}", String(job.checks)),
      job.lastProgress,
    ));
    try {
      await pollJob(job);
      store.refreshCreditsOnly();
      store.refreshRecent();
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

  async function pollJob(initialJob: ActiveTranscriptionJob) {
    let job = initialJob;
    const session = ++pollSession;
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
      saveActiveJob(job);

      resultArea.replaceChildren(progressCard(
        status.status === "queued" ? t("reapQueued") : t("transcriptionTranscribing"),
        t("reapElapsedChecks")
          .replace("{elapsed}", formatElapsed(Date.now() - job.startedAt))
          .replace("{checks}", String(job.checks)),
        status.progress,
      ));

      if (!isTerminalStatus(status.status)) continue;
      if (status.status !== "completed") {
        clearActiveJob();
        throw new Error(status.error ?? `Reap job ${status.status}`);
      }

      clearActiveJob();
      resultArea.replaceChildren(resultCard(status));
      return;
    }
  }

  function hydrateFromJob(job: ActiveTranscriptionJob) {
    state.link = job.sourceUrl ?? "";
    state.upload = job.upload ?? null;
    state.language = job.language;
    state.translate = job.translate;
    state.script = job.script;
  }
}

async function uploadDirect(source: UploadSource, filename: string): Promise<string> {
  if (/^https?:\/\//i.test(source.path) || source.path.startsWith("blob:")) {
    const blob = await fetch(source.path).then((res) => res.blob());
    return reap.uploadDirect({ kind: "blob", blob, name: filename });
  }
  return reap.uploadDirect({ kind: "path", path: source.path, name: filename });
}

function resultCard(status: ReapStatusResponse): HTMLElement {
  const files = collectOutputFiles(status);
  return el("div.col.gap-3", null,
    el("div.state-card", null,
      el("div.state-card__icon", null, icon("transcript", 18)),
      el("div.state-card__title", null, t("transcriptionReady")),
      el("div.state-card__subtitle", null, files.length ? t("transcriptionDownloadFormats") : t("transcriptionNoFiles")),
    ),
    files.length
      ? el("div.transcription-output-list", null,
          ...files.map((file) => outputFileRow(file)),
        )
      : el("pre.mono", { style: preStyle() }, JSON.stringify(status.metadata ?? {}, null, 2)),
  );
}

function outputFileRow(file: { key: string; url: string }): HTMLElement {
  const label = labelForOutput(file.key, file.url);
  return el("div.transcription-output-row", null,
    el("div", null,
      el("strong", null, label),
      el("small", null, file.key),
    ),
    el("div.row.gap-2", null,
      label === "TXT"
        ? el("button.btn-secondary", {
            onClick: async () => {
              try {
                const text = await fetch(file.url).then((res) => res.text());
                await navigator.clipboard.writeText(text);
                toast(t("transcriptionCopied"), "success");
              } catch (err) {
                toast(t("transcriptionCopyFailed").replace("{message}", (err as Error).message), "error");
              }
            },
          }, t("transcriptionCopy"))
        : null,
      el("button.btn-primary", {
        onClick: async () => {
          try {
            await api.downloadAsset(file.url, `transcription-${Date.now()}.${label.toLowerCase()}`);
            toast(t("transcriptionDownloaded").replace("{label}", label), "success");
          } catch (err) {
            toast(t("transcriptionDownloadFailed").replace("{message}", (err as Error).message), "error");
          }
        },
      }, t("transcriptionDownload")),
    ),
  );
}

function collectOutputFiles(status: ReapStatusResponse): Array<{ key: string; url: string }> {
  const out: Array<{ key: string; url: string }> = [];
  const visit = (value: unknown, key = "url") => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) out.push({ key, url: value });
    else if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        visit(childValue, childKey);
      }
    }
  };
  visit(status.url, "url");
  for (const [index, url] of (status.urls ?? []).entries()) visit(url, `url_${index + 1}`);
  visit(status.metadata, "metadata");
  return out.filter((file, index, arr) =>
    arr.findIndex((other) => other.url === file.url) === index &&
    /(srt|vtt|csv|txt|audioFile|audio|transcription)/i.test(`${file.key} ${file.url}`),
  );
}

function labelForOutput(key: string, url: string): string {
  const text = `${key} ${url}`.toLowerCase();
  if (/srt/.test(text)) return "SRT";
  if (/vtt/.test(text)) return "VTT";
  if (/csv/.test(text)) return "CSV";
  if (/txt|text/.test(text)) return "TXT";
  if (/audio/.test(text)) return "AUDIO";
  return "FILE";
}

function mapLanguages(items: ReapRawLanguageOption[] | undefined): Option[] {
  return Array.isArray(items)
    ? items
      .map((item) => item.code ? { value: item.code, label: localizeLanguageLabel(item.code, item.displayName || item.name || item.code) } : null)
      .filter((item): item is Option => item !== null)
    : [];
}

function getFallbackLanguages(): Option[] {
  return [
    { value: "en", label: t("audiogramLangEnglish") },
    { value: "ar", label: t("audiogramLangArabic") },
    { value: "es", label: t("audiogramLangSpanish") },
    { value: "fr", label: t("audiogramLangFrench") },
  ];
}

function getScriptOptions(): Option[] {
  return [
    { value: "native", label: t("audiogramNative") },
    { value: "roman", label: t("audiogramRoman") },
  ];
}

function localizeLanguageLabel(code: string, fallback: string): string {
  const lower = code.toLowerCase();
  if (lower.startsWith("en")) return t("audiogramLangEnglish");
  if (lower.startsWith("ar")) return t("audiogramLangArabic");
  if (lower.startsWith("es")) return t("audiogramLangSpanish");
  if (lower.startsWith("fr")) return t("audiogramLangFrench");
  return fallback;
}

function progressCard(title: string, subtitle: string, progress?: number): HTMLElement {
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  return el("div.state-card.captions-progress-card", null,
    ProcessingLoader(title),
    el("div.state-card__subtitle", null, subtitle),
    el("div.captions-progress" + (pct == null ? ".captions-progress--indeterminate" : ""), null,
      el("div.captions-progress__bar", { style: pct == null ? undefined : { width: `${pct}%` } }),
    ),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, t("transcriptionFailed")),
    el("div.state-card__subtitle", null, message),
  );
}

function readActiveJob(): ActiveTranscriptionJob | null {
  try {
    const raw = localStorage.getItem(ACTIVE_JOB_KEY);
    return raw ? JSON.parse(raw) as ActiveTranscriptionJob : null;
  } catch {
    return null;
  }
}

function saveActiveJob(job: ActiveTranscriptionJob) {
  localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(job));
}

function clearActiveJob() {
  localStorage.removeItem(ACTIVE_JOB_KEY);
}

function isTerminalStatus(status: ReapStatusResponse["status"]): boolean {
  return status === "completed" || status === "failed" || status === "invalid" || status === "expired";
}

function ensureSupportedFilename(filename: string): string {
  if (/\.(mp4|mov)$/i.test(filename)) return filename;
  throw new Error(t("transcriptionUnsupportedFormat"));
}

async function validateTranscriptionUpload(upload: UploadSource): Promise<void> {
  if (!/\.(mp4|mov)$/i.test(upload.name)) {
    throw new Error(t("transcriptionUnsupportedFormat"));
  }
  if (typeof upload.size === "number" && upload.size > MAX_REAP_TRANSCRIPTION_SIZE_BYTES) {
    throw new Error(t("transcriptionFileTooLarge"));
  }
  const duration = await probeVideoDuration(pathToMediaSrc(upload.path));
  if (duration != null && (duration < MIN_REAP_TRANSCRIPTION_DURATION_SEC || duration > MAX_REAP_TRANSCRIPTION_DURATION_SEC)) {
    throw new Error(t("transcriptionDurationOutOfRange"));
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

function pathToMediaSrc(path: string): string {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("http")) return path;
  const forward = path.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}

function guessName(pathOrUrl: string): string {
  try {
    const url = new URL(pathOrUrl);
    return url.pathname.split("/").pop() || `source-${Date.now()}.mp4`;
  } catch {
    return pathOrUrl.replace(/\\/g, "/").split("/").pop() || `source-${Date.now()}.mp4`;
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function preStyle(): Partial<CSSStyleDeclaration> {
  return {
    padding: "12px",
    background: "var(--bg-input)",
    border: "1px solid var(--line-soft)",
    borderRadius: "10px",
    fontSize: "10px",
    lineHeight: "1.4",
    maxHeight: "360px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    textAlign: "left",
  };
}
