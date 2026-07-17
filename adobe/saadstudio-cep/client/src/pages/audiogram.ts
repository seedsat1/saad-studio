/** Audiogram - Reap audio-to-video workflow. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { ProcessingLoader } from "../components/processing-loader";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api, reap, type ReapRawLanguageOption, type ReapStatusResponse } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { openModelPicker } from "../components/model-picker";
import { getHostAdapter } from "../lib/host/adapter";
import { t } from "../lib/i18n";

interface LanguageOption {
  value: string;
  label: string;
}

interface MediaSource {
  path: string;
  name: string;
  origin: "timeline" | "upload";
  size?: number;
  durationSec?: number;
}

interface AudiogramTemplate {
  id: string;
  label: string;
  labelKey?: string;
  source: "system" | "brand";
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
const MAX_REAP_AUDIOGRAM_SIZE_BYTES = 1024 * 1024 * 1024;
const MIN_REAP_AUDIOGRAM_DURATION_SEC = 3;
const MAX_REAP_AUDIOGRAM_DURATION_SEC = 15 * 60;

const SYSTEM_TEMPLATES: AudiogramTemplate[] = [
  { id: "vinyl_vibes", label: "Vinyl Vibes", labelKey: "audiogramTemplateVinylVibes", source: "system", tone: "audiogramToneRecordMotion" },
  { id: "daily_cafe", label: "Daily Cafe", labelKey: "audiogramTemplateDailyCafe", source: "system", tone: "audiogramTonePodcastCard" },
  { id: "after_dark", label: "After Dark", labelKey: "audiogramTemplateAfterDark", source: "system", tone: "audiogramToneDarkWaveform" },
];

const RESOLUTION_OPTIONS: LanguageOption[] = [
  { value: "720", label: "720" },
  { value: "1080", label: "1080" },
  { value: "1440", label: "2K" },
  { value: "2160", label: "4K" },
];

export function AudiogramPage(): HTMLElement {
  const hostAdapter = getHostAdapter();
  const fallbackLanguages = getFallbackLanguages();
  const state = {
    audio: null as MediaSource | null,
    logo: null as MediaSource | null,
    background: null as MediaSource | null,
    templates: SYSTEM_TEMPLATES,
    brandTemplates: [] as AudiogramTemplate[],
    selectedTemplate: SYSTEM_TEMPLATES[0].id,
    activeTemplateTab: "templates" as "templates" | "brand",
    catalogDiagnostic: null as string | null,
    text: "",
    language: "en",
    translate: NO_TRANSLATION,
    script: "native",
    orientation: "square",
    resolution: "720",
    languages: fallbackLanguages,
    translations: [{ value: NO_TRANSLATION, label: t("audiogramNone") }, ...fallbackLanguages.filter((item) => item.value !== AUTO_LANGUAGE)],
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
    PageHeader(t("audiogramTitle")),
    body,
  );

  const watcher = watchAudioSelection(hostAdapter, (clip) => {
    if (state.busy || state.audio?.origin === "upload") return;
    if (!clip?.path) return;
    state.audio = {
      path: clip.path,
      name: clip.name ?? guessName(clip.path),
      origin: "timeline",
      durationSec: clip.durationSec,
      size: clip.size,
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
        state.languages = [fallbackLanguages[0], ...(sources.length ? sources : fallbackLanguages.slice(1))];
        state.translations = [{ value: NO_TRANSLATION, label: t("audiogramNone") }, ...(targets.length ? targets : fallbackLanguages.slice(1))];
      }
      if (catalog.status === "fulfilled") {
        const brandTemplates = catalog.value.audiogramTemplates.items
          .filter((preset) => preset.source === "user")
          .map((preset) => ({
            id: preset.id,
            label: preset.label || preset.name || preset.id,
            source: "brand" as const,
            tone: "audiogramToneBrandTemplate",
          }));
        state.brandTemplates = brandTemplates;
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
        el("h2.captions-hero__title", null, t("audiogramHeroPrefix"), el("span.captions-hero__accent", null, t("audiogramHeroAccent")), t("audiogramHeroSuffix")),
        el("div.captions-hero__subtitle", null, t("audiogramHeroSubtitle")),
      ),
      renderAudioSection(),
      renderTemplates(),
      renderAssetUpload(t("audiogramLogo"), state.logo, "image/*", (source) => { state.logo = source; render(); }),
      renderTextField(),
      renderAssetUpload(t("audiogramBackgroundImage"), state.background, "image/*", (source) => { state.background = source; render(); }),
      renderSettings(),
      renderCta(),
    );
  }

  function renderAudioSection(): HTMLElement {
    return el("div.captions-section", null,
      el("div.captions-section__head", null,
        el("h3", null, t("audiogramUploadAudio")),
        state.audio ? el("button.dock-button", { onClick: () => { state.audio = null; render(); } }, t("videoUtilityChange")) : null,
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
        : renderDropBox(t("audiogramClickUpload"), t("audiogramMaxAudioFile"), "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,.mp3,.m4a,.wav", (source) => {
            state.audio = source;
            render();
          }),
    );
  }

  function renderTemplates(): HTMLElement {
    const selected = selectedTemplate();
    const showingBrand = state.activeTemplateTab === "brand";
    const visibleTemplates = showingBrand ? state.brandTemplates : state.templates;
    return el("div.captions-section", null,
      el("div.captions-tabs", null,
        el("button.captions-tab" + (!showingBrand ? ".captions-tab--active" : ""), {
          onClick: () => {
            state.activeTemplateTab = "templates";
            state.selectedTemplate = state.templates[0]?.id ?? "";
            render();
          },
        }, t("audiogramTemplates")),
        el("button.captions-tab" + (showingBrand ? ".captions-tab--active" : ""), {
          onClick: () => {
            state.activeTemplateTab = "brand";
            state.selectedTemplate = state.brandTemplates[0]?.id ?? "";
            render();
          },
        }, t("audiogramBrandTemplates")),
      ),
      state.loadingCatalog ? el("div.captions-section__hint", null, t("audiogramLoadingTemplates")) : null,
      !state.loadingCatalog && visibleTemplates.length === 0
        ? el("div.captions-empty-panel", null,
            showingBrand ? t("audiogramNoBrandTemplates") : (state.catalogDiagnostic ?? t("audiogramNoTemplates")))
        : el("div.audiogram-template-grid", null,
            ...visibleTemplates.slice(0, 12).map((template) => renderTemplateCard(template, template.id === selected?.id)),
          ),
    );
  }

  function renderTemplateCard(template: AudiogramTemplate, active: boolean): HTMLElement {
    return el("button",
      {
        class: `audiogram-template audiogram-template--${template.id}` + (active ? " audiogram-template--active" : ""),
        onClick: () => { state.selectedTemplate = template.id; render(); },
      },
      el("div.audiogram-template__preview", null,
        el("div.audiogram-template__waveform"),
        el("strong", null, localizeTemplateLabel(template)),
      ),
      el("span", null, localizeTemplateTone(template.tone)),
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
        value ? el("button.dock-button", { onClick: () => onPick(null) }, t("audiogramRemove")) : null,
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
        : renderDropBox(t("audiogramClickUpload"), "", accept, (source) => onPick(source)),
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
      el("div.captions-section__head", null, el("h3", null, t("audiogramText"))),
      el("input.audiogram-text-input", {
        value: state.text,
        placeholder: t("audiogramTextPlaceholder"),
        onInput: (event: Event) => { state.text = (event.currentTarget as HTMLInputElement).value; },
      }),
    );
  }

  function renderSettings(): HTMLElement {
    return el("div.captions-section", null,
      el("div.audiogram-settings-grid", null,
        renderPicker(t("audiogramLanguage"), state.language, state.languages, (value) => { state.language = value; render(); }),
        renderPicker(t("audiogramTranslateTo"), state.translate, state.translations, (value) => { state.translate = value; render(); }),
        renderPicker(t("audiogramScript"), state.script, getScriptOptions(), (value) => { state.script = value; render(); }),
        renderPicker(t("audiogramOrientation"), state.orientation, getOrientationOptions(), (value) => { state.orientation = value; render(); }),
        renderPicker(t("audiogramResolution"), state.resolution, RESOLUTION_OPTIONS, (value) => { state.resolution = value; render(); }),
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
        onClick: async (event: MouseEvent) => {
          const picked = await openModelPicker({ title: label, options, anchor: event.currentTarget as HTMLElement });
          if (picked) onPick(picked);
        },
      }, selected),
    );
  }

  function renderCta(): HTMLElement {
    const canRun = Boolean(state.audio && selectedTemplate() && !state.busy);
    return el("div.captions-cta", null,
      el("button.btn-primary", { disabled: !canRun, onClick: runAudiogram },
        state.busy ? t("audiogramGenerating") : t("audiogramGenerate"),
        icon("arrow-up-right", 14),
      ),
    );
  }

  async function runAudiogram() {
    if (!state.audio) {
      toast(t("audiogramSelectAudioFirst"), "error");
      return;
    }

    state.busy = true;
    render();
    resultArea.replaceChildren(progressCard(t("audiogramUploading"), t("audiogramUploadingSubtitle")));

    try {
      await validateAudiogramAudio(state.audio);
      const filename = ensureAudioFilename(state.audio.name);
      const audioUploadId = await uploadMedia(state.audio, filename);
      const logoUploadId = state.logo ? await uploadMedia(state.logo, state.logo.name) : undefined;
      const backgroundUploadId = state.background ? await uploadMedia(state.background, state.background.name) : undefined;
      const template = selectedTemplate();

      resultArea.replaceChildren(progressCard(t("audiogramStarting"), t("audiogramStartingSubtitle")));
      const started = await reap.start({
        tool: "audiogram",
        uploadId: audioUploadId,
        filename,
        options: {
          template: template?.source === "system" ? state.selectedTemplate : undefined,
          templateId: template?.source === "system" ? state.selectedTemplate : undefined,
          brandTemplateId: template?.source === "brand" ? state.selectedTemplate : undefined,
          captionsPreset: template?.source === "brand" ? state.selectedTemplate : undefined,
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
        templateSource: template?.source ?? "system",
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
      t("audiogramResuming"),
      t("reapElapsedChecks")
        .replace("{elapsed}", formatElapsed(Date.now() - job.startedAt))
        .replace("{checks}", String(job.checks)),
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
        status.status === "queued" ? t("reapQueued") : t("audiogramGeneratingJob"),
        t("reapElapsedChecks")
          .replace("{elapsed}", elapsed)
          .replace("{checks}", String(job.checks)),
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
    state.activeTemplateTab = job.templateSource === "brand" ? "brand" : "templates";
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
      resultArea.replaceChildren(errorCard(t("audiogramNoOutput")));
      return;
    }

    resultArea.replaceChildren(progressCard(t("audiogramAdding"), t("audiogramAddingSubtitle")));
    const local = await api.downloadAsset(url, `saadstudio-audiogram-${Date.now()}.mp4`);
    const placed = await evalES<{ ok: boolean; placed?: boolean; reason?: string }>("importAndPlaceOnTimeline", local);
    resultArea.replaceChildren(successCard(url, placed));
    toast(placed?.placed ? t("audiogramAddedToast") : t("audiogramImportedToast"), "success");
  }

  function selectedTemplate(): AudiogramTemplate | undefined {
    const list = state.activeTemplateTab === "brand" ? state.brandTemplates : state.templates;
    return list.find((template) => template.id === state.selectedTemplate);
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
    size: file.size,
  };
}

function mapLanguages(items: ReapRawLanguageOption[] | undefined): LanguageOption[] {
  return Array.isArray(items)
    ? items
      .map((item) => item.code ? { value: item.code, label: localizeLanguageLabel(item.code, item.displayName || item.name || item.code) } : null)
      .filter((item): item is LanguageOption => item !== null)
    : [];
}

function getFallbackLanguages(): LanguageOption[] {
  return [
    { value: AUTO_LANGUAGE, label: t("audiogramAutoDetect") },
    { value: "en", label: t("audiogramLangEnglish") },
    { value: "ar", label: t("audiogramLangArabic") },
    { value: "es", label: t("audiogramLangSpanish") },
    { value: "fr", label: t("audiogramLangFrench") },
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

function getScriptOptions(): LanguageOption[] {
  return [
    { value: "native", label: t("audiogramNative") },
    { value: "roman", label: t("audiogramRoman") },
  ];
}

function getOrientationOptions(): LanguageOption[] {
  return [
    { value: "square", label: t("audiogramSquare") },
    { value: "portrait", label: t("audiogramPortrait") },
    { value: "landscape", label: t("audiogramLandscape") },
  ];
}

function localizeTemplateTone(tone: string): string {
  if (tone === "audiogramToneRecordMotion") return t("audiogramToneRecordMotion");
  if (tone === "audiogramTonePodcastCard") return t("audiogramTonePodcastCard");
  if (tone === "audiogramToneDarkWaveform") return t("audiogramToneDarkWaveform");
  if (tone === "audiogramToneBrandTemplate") return t("audiogramToneBrandTemplate");
  return tone;
}

function localizeTemplateLabel(template: AudiogramTemplate): string {
  if (template.labelKey === "audiogramTemplateVinylVibes") return t("audiogramTemplateVinylVibes");
  if (template.labelKey === "audiogramTemplateDailyCafe") return t("audiogramTemplateDailyCafe");
  if (template.labelKey === "audiogramTemplateAfterDark") return t("audiogramTemplateAfterDark");
  return template.label;
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

function successCard(url: string, placed: { ok: boolean; placed?: boolean; reason?: string } | null): HTMLElement {
  return el("div.state-card", null,
    el("video", { src: url, controls: "true", style: { width: "100%", borderRadius: "8px" } }),
    el("div.state-card__title", null, placed?.placed ? t("audiogramAddedTitle") : t("audiogramReadyTitle")),
    el("div.state-card__subtitle", null,
      placed?.placed ? t("audiogramAddedSubtitle") : (placed?.reason ?? t("audiogramReadySubtitle"))),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, t("audiogramFailedTitle")),
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
  throw new Error(t("audiogramUnsupportedAudioFormat"));
}

async function validateAudiogramAudio(audio: MediaSource): Promise<void> {
  if (!/\.(mp3|m4a|wav)$/i.test(audio.name)) {
    throw new Error(t("audiogramUnsupportedAudioFormat"));
  }
  if (typeof audio.size === "number" && audio.size > MAX_REAP_AUDIOGRAM_SIZE_BYTES) {
    throw new Error(t("audiogramAudioFileTooLarge"));
  }
  let duration = audio.durationSec;
  if (duration == null) {
    duration = await probeAudioDuration(pathToMediaSrc(audio.path)) ?? undefined;
  }
  if (duration != null && (duration < MIN_REAP_AUDIOGRAM_DURATION_SEC || duration > MAX_REAP_AUDIOGRAM_DURATION_SEC)) {
    throw new Error(t("audiogramAudioDurationOutOfRange"));
  }
}

function probeAudioDuration(src: string): Promise<number | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      done(duration);
    };
    audio.onerror = () => done(null);
    window.setTimeout(() => done(null), 4000);
    audio.src = src;
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
  listener: (clip: { path: string; name?: string; durationSec?: number; size?: number } | null) => void,
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
        if (clip?.path) {
          const inSec = clip.inSec ?? 0;
          const outSec = clip.outSec ?? 0;
          listener({
            path: clip.path,
            name: clip.name,
            durationSec: clip.durationSec || (outSec > inSec ? outSec - inSec : undefined),
            size: getLocalFileSize(clip.path),
          });
        } else {
          listener(null);
        }
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
