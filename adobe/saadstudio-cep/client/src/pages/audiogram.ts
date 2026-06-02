/** Audiogram - Reap audio-to-video workflow. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api, reap, type ReapRawLanguageOption, type ReapStatusResponse } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { openModelPicker } from "../components/model-picker";
import { getHostAdapter } from "../lib/host/adapter";

interface LanguageOption {
  value: string;
  label: string;
}

interface MediaSource {
  path: string;
  name: string;
  origin: "timeline" | "upload";
}

interface AudiogramTemplate {
  id: string;
  label: string;
  source: "api";
  tone: string;
}

interface ActiveAudiogramJob {
  projectId: string;
  generationId: string;
  audio: MediaSource;
  template: string;
  templateSource: AudiogramTemplate["source"];
  text: string;
  language: string;
  translate: string;
  script: string;
  orientation: string;
  resolution: string;
  startedAt: number;
  checks: number;
  lastStatus?: ReapStatusResponse["status"];
  lastProgress?: number;
}

const ACTIVE_AUDIOGRAM_JOB_KEY = "saadstudio.audiogram.activeJob";
const REAP_POLL_INTERVAL_MS = 12_000;
const NO_TRANSLATION = "none";
const AUTO_LANGUAGE = "__auto__";

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { value: AUTO_LANGUAGE, label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const SCRIPT_OPTIONS: LanguageOption[] = [
  { value: "native", label: "Native" },
  { value: "roman", label: "Roman" },
];

const ORIENTATION_OPTIONS: LanguageOption[] = [
  { value: "square", label: "Square (1:1)" },
  { value: "portrait", label: "Portrait (9:16)" },
  { value: "landscape", label: "Landscape (16:9)" },
];

const RESOLUTION_OPTIONS: LanguageOption[] = [
  { value: "720", label: "720" },
  { value: "1080", label: "1080" },
  { value: "1440", label: "2K" },
  { value: "2160", label: "4K" },
];

export function AudiogramPage(): HTMLElement {
  const hostAdapter = getHostAdapter();
  const state = {
    audio: null as MediaSource | null,
    logo: null as MediaSource | null,
    background: null as MediaSource | null,
    templates: [] as AudiogramTemplate[],
    selectedTemplate: "",
    catalogDiagnostic: null as string | null,
    text: "",
    language: "en",
    translate: NO_TRANSLATION,
    script: "native",
    orientation: "square",
    resolution: "720",
    languages: FALLBACK_LANGUAGES,
    translations: [{ value: NO_TRANSLATION, label: "None" }, ...FALLBACK_LANGUAGES.filter((item) => item.value !== AUTO_LANGUAGE)],
    loadingCatalog: true,
    busy: false,
  };

  const body = el("div.app-main");
  const page = el("div.captions-page.audiogram-page");
  const resultArea = el("div.captions-result");
  let disposed = false;
  let pollSession = 0;
  body.appendChild(resultArea);
  body.appendChild(page);

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Audiogram"),
    body,
  );

  const watcher = watchAudioSelection(hostAdapter, (clip) => {
    if (state.busy || state.audio?.origin === "upload") return;
    if (!clip?.path) return;
    state.audio = {
      path: clip.path,
      name: clip.name ?? guessName(clip.path),
      origin: "timeline",
    };
    render();
  });
  watcher.attachTo(root);

  void loadCatalog();
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

  async function loadCatalog() {
    try {
      const [langs, catalog] = await Promise.allSettled([
        reap.translationLanguages(),
        reap.catalog(),
      ]);
      if (langs.status === "fulfilled") {
        const sources = mapLanguages(langs.value.sourceLanguages);
        const targets = mapLanguages(langs.value.targetLanguages);
        state.languages = [FALLBACK_LANGUAGES[0], ...(sources.length ? sources : FALLBACK_LANGUAGES.slice(1))];
        state.translations = [{ value: NO_TRANSLATION, label: "None" }, ...(targets.length ? targets : FALLBACK_LANGUAGES.slice(1))];
      }
      if (catalog.status === "fulfilled") {
        const templates = catalog.value.audiogramTemplates.items
          .map((preset) => ({
            id: preset.id,
            label: preset.label || preset.name || preset.id,
            source: "api" as const,
            tone: preset.source === "user" ? "Brand template" : "API preset",
          }));
        state.templates = templates;
        if (!state.selectedTemplate || !templates.some((template) => template.id === state.selectedTemplate)) {
          state.selectedTemplate = templates[0]?.id ?? "";
        }
        state.catalogDiagnostic = catalog.value.audiogramTemplates.diagnostic ?? null;
      } else {
        state.catalogDiagnostic = catalog.reason instanceof Error ? catalog.reason.message : String(catalog.reason);
      }
    } finally {
      state.loadingCatalog = false;
      render();
    }
  }

  function render() {
    page.replaceChildren(
      el("div.captions-hero", null,
        el("h2.captions-hero__title", null, "Generate animated ", el("span.captions-hero__accent", null, "audiogram")),
        el("div.captions-hero__subtitle", null, "Uses Reap API presets only. Templates are derived from presets with addAudiogram enabled."),
      ),
      renderAudioSection(),
      renderTemplates(),
      renderAssetUpload("Logo", state.logo, "image/*", (source) => { state.logo = source; render(); }),
      renderTextField(),
      renderAssetUpload("Background image", state.background, "image/*", (source) => { state.background = source; render(); }),
      renderSettings(),
      renderCta(),
    );
  }

  function renderAudioSection(): HTMLElement {
    return el("div.captions-section", null,
      el("div.captions-section__head", null,
        el("h3", null, "Upload your audio"),
        state.audio ? el("button.dock-button", { onClick: () => { state.audio = null; render(); } }, "Change") : null,
      ),
      state.audio
        ? el("div.captions-source", null,
            el("div.captions-source__meta", null,
              el("div.captions-source__meta-icon", null, icon("waveform", 16)),
              el("div.captions-source__meta-text", null,
                el("div.captions-source__name", null, state.audio.name),
                el("div.captions-source__path", { title: state.audio.path }, state.audio.path),
              ),
            ),
            el("audio.captions-source__preview", { src: pathToMediaSrc(state.audio.path), controls: "true" }),
          )
        : renderDropBox("Click to upload or drag and drop", "Max. File Size: 1 GB", "audio/*", (source) => {
            state.audio = source;
            render();
          }),
    );
  }

  function renderTemplates(): HTMLElement {
    const selected = selectedTemplate();
    return el("div.captions-section", null,
      el("div.captions-tabs", null,
        el("button.captions-tab.captions-tab--active", null, "Audiogram presets"),
      ),
      state.loadingCatalog ? el("div.captions-section__hint", null, "Loading templates...") : null,
      !state.loadingCatalog && state.templates.length === 0
        ? el("div.captions-empty-panel", null,
            state.catalogDiagnostic ?? "No Reap API audiogram presets were returned for this studio.")
        : el("div.audiogram-template-grid", null,
            ...state.templates.slice(0, 12).map((template) => renderTemplateCard(template, template.id === selected?.id)),
          ),
    );
  }

  function renderTemplateCard(template: AudiogramTemplate, active: boolean): HTMLElement {
    return el("button",
      {
        class: "audiogram-template" + (active ? " audiogram-template--active" : ""),
        onClick: () => { state.selectedTemplate = template.id; render(); },
      },
      el("div.audiogram-template__preview", null,
        el("div.audiogram-template__waveform"),
        el("strong", null, template.label),
      ),
      el("span", null, template.tone),
    );
  }

  function renderAssetUpload(
    label: string,
    value: MediaSource | null,
    accept: string,
    onPick: (source: MediaSource | null) => void,
  ): HTMLElement {
    return el("div.captions-section", null,
      el("div.captions-section__head", null,
        el("h3", null, label),
        value ? el("button.dock-button", { onClick: () => onPick(null) }, "Remove") : null,
      ),
      value
        ? el("div.captions-source", null,
            el("div.captions-source__meta", null,
              el("div.captions-source__meta-icon", null, icon("image", 16)),
              el("div.captions-source__meta-text", null,
                el("div.captions-source__name", null, value.name),
                el("div.captions-source__path", { title: value.path }, value.path),
              ),
            ),
          )
        : renderDropBox("Click to upload or drag and drop", "", accept, (source) => onPick(source)),
    );
  }

  function renderDropBox(
    title: string,
    meta: string,
    accept: string,
    onPick: (source: MediaSource) => void,
  ): HTMLElement {
    const pick = () => pickFile(accept, onPick);
    return el("div.captions-upload-surface",
      {
        onClick: pick,
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
          if (file) onPick(fileToSource(file));
        },
      },
      el("div.captions-upload-surface__icon", null, icon("import", 20)),
      el("div.captions-upload-surface__title", null, title),
      meta ? el("div.captions-upload-surface__meta", null, meta) : null,
    );
  }

  function renderTextField(): HTMLElement {
    return el("div.captions-section", null,
      el("div.captions-section__head", null, el("h3", null, "Text")),
      el("input.audiogram-text-input", {
        value: state.text,
        placeholder: "Enter text for overlay",
        onInput: (event: Event) => { state.text = (event.currentTarget as HTMLInputElement).value; },
      }),
    );
  }

  function renderSettings(): HTMLElement {
    return el("div.captions-section", null,
      el("div.audiogram-settings-grid", null,
        renderPicker("Language", state.language, state.languages, (value) => { state.language = value; render(); }),
        renderPicker("Translate to", state.translate, state.translations, (value) => { state.translate = value; render(); }),
        renderPicker("Script", state.script, SCRIPT_OPTIONS, (value) => { state.script = value; render(); }),
        renderPicker("Orientation", state.orientation, ORIENTATION_OPTIONS, (value) => { state.orientation = value; render(); }),
        renderPicker("Resolution", state.resolution, RESOLUTION_OPTIONS, (value) => { state.resolution = value; render(); }),
      ),
    );
  }

  function renderPicker(
    label: string,
    value: string,
    options: LanguageOption[],
    onPick: (value: string) => void,
  ): HTMLElement {
    const selected = options.find((item) => item.value === value)?.label ?? value;
    return el("label.audiogram-field", null,
      el("span", null, label),
      el("button.form-select", {
        disabled: state.busy,
        onClick: async () => {
          const picked = await openModelPicker({ title: label, options });
          if (picked) onPick(picked);
        },
      }, selected),
    );
  }

  function renderCta(): HTMLElement {
    const canRun = Boolean(state.audio && state.selectedTemplate && !state.busy);
    return el("div.captions-cta", null,
      el("button.btn-primary", { disabled: !canRun, onClick: runAudiogram },
        state.busy ? "Generating..." : "Generate audiogram",
        icon("arrow-up-right", 14),
      ),
    );
  }

  async function runAudiogram() {
    if (!state.audio) {
      toast("Select or upload an audio file first.", "error");
      return;
    }

    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard("Uploading audio...", "Preparing the audio for Reap."));

    try {
      const filename = ensureAudioFilename(state.audio.name);
      const audioUploadId = await uploadMedia(state.audio, filename);
      const logoUploadId = state.logo ? await uploadMedia(state.logo, state.logo.name) : undefined;
      const backgroundUploadId = state.background ? await uploadMedia(state.background, state.background.name) : undefined;
      const template = selectedTemplate();

      resultArea.replaceChildren(progressCard("Starting audiogram...", "Creating the Reap audiogram project."));
      const started = await reap.start({
        tool: "audiogram",
        uploadId: audioUploadId,
        filename,
        options: {
          brandTemplateId: template ? state.selectedTemplate : undefined,
          captionsPreset: template ? state.selectedTemplate : undefined,
          text: state.text.trim() || undefined,
          logoUploadId,
          backgroundUploadId,
          language: state.language === AUTO_LANGUAGE ? undefined : state.language,
          translationLanguage: state.translate === NO_TRANSLATION ? undefined : state.translate,
          transcriptionScript: state.script,
          orientation: state.orientation,
          resolution: Number(state.resolution),
        },
      });

      const job: ActiveAudiogramJob = {
        projectId: started.projectId,
        generationId: started.generationId,
        audio: state.audio,
        template: state.selectedTemplate,
        templateSource: template?.source ?? "api",
        text: state.text,
        language: state.language,
        translate: state.translate,
        script: state.script,
        orientation: state.orientation,
        resolution: state.resolution,
        startedAt: Date.now(),
        checks: 0,
        lastStatus: started.status as ReapStatusResponse["status"],
      };
      saveActiveJob(job);
      await pollAudiogramJob(job);
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
    const job = readActiveJob();
    if (!job) return;
    hydrateFromJob(job);
    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard(
      "Resuming audiogram...",
      `Saved job found. Elapsed ${formatElapsed(Date.now() - job.startedAt)} - Checks ${job.checks}`,
      job.lastProgress,
    ));
    try {
      await pollAudiogramJob(job);
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

  async function pollAudiogramJob(initialJob: ActiveAudiogramJob) {
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
      saveActiveJob(job);

      const elapsed = formatElapsed(Date.now() - job.startedAt);
      resultArea.replaceChildren(progressCard(
        status.status === "queued" ? "Queued..." : "Generating audiogram...",
        `Elapsed ${elapsed} - Checks ${job.checks}`,
        status.progress,
      ));

      if (!isTerminalStatus(status.status)) continue;
      if (status.status !== "completed") {
        clearActiveJob();
        throw new Error(status.error ?? `Reap job ${status.status}`);
      }

      clearActiveJob();
      await importAudiogramResult(status);
      return;
    }
  }

  function hydrateFromJob(job: ActiveAudiogramJob) {
    state.audio = job.audio;
    state.selectedTemplate = job.template;
    state.text = job.text;
    state.language = job.language;
    state.translate = job.translate;
    state.script = job.script;
    state.orientation = job.orientation;
    state.resolution = job.resolution;
  }

  async function importAudiogramResult(status: ReapStatusResponse) {
    const url = pickVideoUrl(status);
    if (!url) {
      resultArea.replaceChildren(errorCard("Reap finished but returned no audiogram video URL."));
      return;
    }

    resultArea.replaceChildren(progressCard("Adding audiogram...", "Downloading the video and placing it on the timeline."));
    const local = await api.downloadAsset(url, `saadstudio-audiogram-${Date.now()}.mp4`);
    const placed = await evalES<{ ok: boolean; placed?: boolean; reason?: string }>("importAndPlaceOnTimeline", local);
    resultArea.replaceChildren(successCard(url, placed));
    toast(placed?.placed ? "Audiogram added to timeline" : "Audiogram imported", "success");
  }

  function selectedTemplate(): AudiogramTemplate | undefined {
    return state.templates.find((template) => template.id === state.selectedTemplate);
  }
}

async function uploadMedia(source: MediaSource, filename: string): Promise<string> {
  if (/^https?:\/\//i.test(source.path) || source.path.startsWith("blob:")) {
    const blob = await fetch(source.path).then((res) => res.blob());
    return reap.uploadDirect({ kind: "blob", blob, name: filename });
  }
  return reap.uploadDirect({ kind: "path", path: source.path, name: filename });
}

function pickFile(accept: string, onPick: (source: MediaSource) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onPick(fileToSource(file));
  });
  input.click();
}

function fileToSource(file: File): MediaSource {
  return {
    path: (file as File & { path?: string }).path ?? URL.createObjectURL(file),
    name: file.name,
    origin: "upload",
  };
}

function mapLanguages(items: ReapRawLanguageOption[] | undefined): LanguageOption[] {
  return Array.isArray(items)
    ? items
      .map((item) => item.code ? { value: item.code, label: item.displayName || item.name || item.code } : null)
      .filter((item): item is LanguageOption => item !== null)
    : [];
}

function progressCard(title: string, subtitle: string, progress?: number): HTMLElement {
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  return el("div.state-card.captions-progress-card", null,
    el("div.state-card__icon.captions-progress-card__icon", null, icon("spark", 18)),
    el("div.state-card__title", null, title),
    el("div.state-card__subtitle", null, subtitle),
    el("div.captions-progress" + (pct == null ? ".captions-progress--indeterminate" : ""), null,
      el("div.captions-progress__bar", { style: pct == null ? undefined : { width: `${pct}%` } }),
    ),
  );
}

function successCard(url: string, placed: { ok: boolean; placed?: boolean; reason?: string } | null): HTMLElement {
  return el("div.state-card", null,
    el("video", { src: url, controls: "true", style: { width: "100%", borderRadius: "8px" } }),
    el("div.state-card__title", null, placed?.placed ? "Audiogram added" : "Audiogram ready"),
    el("div.state-card__subtitle", null,
      placed?.placed ? "The audiogram was placed on the timeline." : (placed?.reason ?? "The result was downloaded.")),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Audiogram failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function readActiveJob(): ActiveAudiogramJob | null {
  try {
    const raw = localStorage.getItem(ACTIVE_AUDIOGRAM_JOB_KEY);
    return raw ? JSON.parse(raw) as ActiveAudiogramJob : null;
  } catch {
    return null;
  }
}

function saveActiveJob(job: ActiveAudiogramJob) {
  localStorage.setItem(ACTIVE_AUDIOGRAM_JOB_KEY, JSON.stringify(job));
}

function clearActiveJob() {
  localStorage.removeItem(ACTIVE_AUDIOGRAM_JOB_KEY);
}

function isTerminalStatus(status: ReapStatusResponse["status"]): boolean {
  return status === "completed" || status === "failed" || status === "invalid" || status === "expired";
}

function pickVideoUrl(status: ReapStatusResponse): string | null {
  const candidates = [status.url, ...(status.urls ?? []), ...collectStrings(status.metadata)]
    .filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value));
  return candidates.find((url) => /\.(mp4|mov|webm)(\?|$|#)/i.test(url)) ?? candidates[0] ?? null;
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => collectStrings(item, depth + 1));
}

function ensureAudioFilename(filename: string): string {
  const clean = filename || `audio-${Date.now()}.mp3`;
  if (/\.(mp3|m4a|wav)$/i.test(clean)) return clean;
  return `${clean.replace(/\.[^.]+$/, "")}.mp3`;
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

function guessName(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? "Audio";
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

interface LocalWatcher {
  stop: () => void;
  attachTo: (element: HTMLElement) => void;
}

function watchAudioSelection(
  hostAdapter: ReturnType<typeof getHostAdapter>,
  listener: (clip: { path: string; name?: string } | null) => void,
): LocalWatcher {
  let stopped = false;
  let lastKey = "__init__";
  const tick = async () => {
    if (stopped || !isInsideAdobe()) return;
    try {
      const clip = await hostAdapter.getSelection("audio");
      const key = clip?.path ? `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}` : "null";
      if (key !== lastKey) {
        lastKey = key;
        listener(clip?.path ? { path: clip.path, name: clip.name } : null);
      }
    } catch {
      // Retry on next tick.
    }
  };
  void tick();
  const id = window.setInterval(tick, 1200);
  return {
    stop() {
      stopped = true;
      window.clearInterval(id);
    },
    attachTo(element: HTMLElement) {
      const check = () => {
        if (stopped) return;
        if (!element.isConnected) {
          this.stop();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    },
  };
}
