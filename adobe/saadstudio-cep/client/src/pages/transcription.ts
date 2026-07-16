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

interface Option {
  value: string;
  label: string;
}

interface UploadSource {
  path: string;
  name: string;
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

const FALLBACK_SOURCE_LANGUAGES: Option[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const SCRIPT_OPTIONS: Option[] = [
  { value: "native", label: "Native" },
  { value: "roman", label: "Roman" },
];

export function TranscriptionPage(): HTMLElement {
  const state = {
    link: "",
    upload: null as UploadSource | null,
    language: "en",
    translate: NO_TRANSLATION,
    script: "native",
    sourceLanguages: FALLBACK_SOURCE_LANGUAGES,
    targetLanguages: [{ value: NO_TRANSLATION, label: "None" }, ...FALLBACK_SOURCE_LANGUAGES],
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
    PageHeader("Transcription"),
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
      state.sourceLanguages = source.length ? source : FALLBACK_SOURCE_LANGUAGES;
      state.targetLanguages = [{ value: NO_TRANSLATION, label: "None" }, ...(target.length ? target : FALLBACK_SOURCE_LANGUAGES)];
      if (!state.sourceLanguages.some((item) => item.value === state.language)) {
        state.language = state.sourceLanguages[0]?.value ?? "en";
      }
    } catch {
      state.sourceLanguages = FALLBACK_SOURCE_LANGUAGES;
      state.targetLanguages = [{ value: NO_TRANSLATION, label: "None" }, ...FALLBACK_SOURCE_LANGUAGES];
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
      el("h2.captions-hero__title", null, "Transcription"),
      el("div.captions-hero__subtitle", null, "Generate transcript of your video in one click."),
    );
  }

  function renderLinkInput(): HTMLElement {
    return el("label.captions-link-input", null,
      el("span.captions-link-input__icon", null, icon("link", 15)),
      el("input", {
        value: state.link,
        placeholder: "Drop a video link",
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
      el("span.captions-source-divider__label", null, "Or"),
      el("span.captions-source-divider__line"),
    );
  }

  function renderUpload(): HTMLElement {
    return el("div.captions-section", null,
      el("div.captions-section__head", null,
        el("h3", null, "Upload your video"),
        state.upload ? el("button.dock-button", { onClick: () => { state.upload = null; render(); } }, "Change") : null,
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
      el("div.captions-upload-surface__title", null, "Click to upload or drag and drop"),
      el("div.captions-upload-surface__meta", null, "Max. File Size: 5 GB"),
    );
  }

  function renderSettings(): HTMLElement {
    return el("div.captions-section", null,
      el("div.transcription-settings-grid", null,
        renderPicker("Language", state.language, state.sourceLanguages, (value) => { state.language = value; render(); }),
        renderPicker("Translate to", state.translate, state.targetLanguages, (value) => { state.translate = value; render(); }),
        renderPicker("Script", state.script, SCRIPT_OPTIONS, (value) => { state.script = value; render(); }, true),
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
        state.busy ? "Generating..." : "Generate Transcript",
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
    };
    state.link = "";
    render();
  }

  async function runTranscription() {
    const sourceUrl = state.link.trim();
    if (!state.upload && !/^https?:\/\//i.test(sourceUrl)) {
      toast("Paste a video link or upload a video first.", "error");
      return;
    }

    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard("Starting transcription...", "Preparing source for Reap."));

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
    if (!state.upload) throw new Error("No upload selected.");
    resultArea.replaceChildren(progressCard("Uploading to Reap...", "Uploading source file."));
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
      "Resuming transcription...",
      `Saved job found. Elapsed ${formatElapsed(Date.now() - job.startedAt)} - Checks ${job.checks}`,
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
        status.status === "queued" ? "Queued..." : "Transcribing...",
        `Elapsed ${formatElapsed(Date.now() - job.startedAt)} - Checks ${job.checks}`,
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
      el("div.state-card__title", null, "Transcript ready"),
      el("div.state-card__subtitle", null, files.length ? "Download the formats returned by Reap." : "Reap completed but returned no transcription file URLs."),
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
                toast("Transcript copied", "success");
              } catch (err) {
                toast(`Copy failed: ${(err as Error).message}`, "error");
              }
            },
          }, "Copy")
        : null,
      el("button.btn-primary", {
        onClick: async () => {
          try {
            await api.downloadAsset(file.url, `transcription-${Date.now()}.${label.toLowerCase()}`);
            toast(`${label} downloaded`, "success");
          } catch (err) {
            toast(`Download failed: ${(err as Error).message}`, "error");
          }
        },
      }, "Download"),
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
      .map((item) => item.code ? { value: item.code, label: item.displayName || item.name || item.code } : null)
      .filter((item): item is Option => item !== null)
    : [];
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
    el("div.state-card__title", null, "Transcription failed"),
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
  return `${filename.replace(/\.[^.]+$/, "")}.mp4`;
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
