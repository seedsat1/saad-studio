/** Add Captions — full Reap-style layout, SRT-first output.
 *
 *  Layout (top to bottom):
 *    • Source clip card (auto-detected from the timeline; Change opens a
 *      file picker)
 *    • "Caption styles" row with live preset previews from
 *      /api/panel/reap/caption-presets + a "More styles" overflow modal
 *    • 2×2 form grid: Language, Translate to, Script, Resolution
 *    • Toggle rows: Add Emoji, Add Word Highlight
 *    • Generate Captions button
 *
 *  Output policy (user spec):
 *    • Always exports SRT and auto-imports it onto Premiere's first
 *      caption track via $.saadstudio.importSrtAsCaption.
 *    • Falls back to "Save SRT to Desktop" if Premiere has no caption
 *      track available.
 *    • Never opens an external Reap link.
 *
 *  Backend routing:
 *    • If a caption style is picked we hit /create-captions so Reap
 *      still produces the styled video (useful later) and we extract
 *      the SRT it bundles inside the urls object.
 *    • If "No style" is selected we hit /create-transcription (cheaper —
 *      30 credits vs 50). */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
import { getHostEnvironmentInfo, isInsideAdobe } from "../lib/cep";
import {
  api,
  reap,
  type ReapStatusResponse,
  type ReapTool,
  type ReapCaptionPreset,
  type ReapLanguageOption,
  type ReapRawLanguageOption,
} from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { openModelPicker } from "../components/model-picker";
import { getHostAdapter } from "../lib/host/adapter";
import { reapAdapter } from "../lib/reap/adapter";
import { getToken } from "../lib/auth";

// ─── Constants ───────────────────────────────────────────────────────────

const NO_TRANSLATION = "off";
const AUTO_DETECT_LANGUAGE = "__auto__";

const FALLBACK_SOURCE_LANGUAGES: ReapLanguageOption[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic - العربية" },
  { code: "es", label: "Spanish - Español" },
  { code: "fr", label: "French - Français" },
  { code: "de", label: "German - Deutsch" },
  { code: "it", label: "Italian - Italiano" },
  { code: "pt", label: "Portuguese - Português" },
  { code: "tr", label: "Turkish - Türkçe" },
  { code: "hi", label: "Hindi - हिन्दी" },
  { code: "ur", label: "Urdu - اردو" },
  { code: "fa", label: "Persian - فارسی" },
  { code: "id", label: "Indonesian - Bahasa Indonesia" },
  { code: "ms", label: "Malay - Bahasa Melayu" },
  { code: "ja", label: "Japanese - 日本語" },
  { code: "ko", label: "Korean - 한국어" },
  { code: "zh", label: "Chinese - 中文" },
  { code: "ru", label: "Russian - Русский" },
  { code: "nl", label: "Dutch - Nederlands" },
  { code: "pl", label: "Polish - Polski" },
  { code: "sv", label: "Swedish - Svenska" },
  { code: "no", label: "Norwegian - Norsk" },
  { code: "da", label: "Danish - Dansk" },
  { code: "fi", label: "Finnish - Suomi" },
  { code: "el", label: "Greek - Ελληνικά" },
  { code: "he", label: "Hebrew - עברית" },
  { code: "th", label: "Thai - ไทย" },
  { code: "vi", label: "Vietnamese - Tiếng Việt" },
  { code: "uk", label: "Ukrainian - Українська" },
  { code: "ro", label: "Romanian - Română" },
  { code: "cs", label: "Czech - Čeština" },
  { code: "hu", label: "Hungarian - Magyar" },
];

const FALLBACK_TARGET_LANGUAGES: ReapLanguageOption[] = [
  { code: "en", label: "English" },
];

const SCRIPTS = [
  { value: "native", label: "Native script" },
  { value: "roman",  label: "Roman (Latinised)" },
];

const RESOLUTIONS = [
  { value: "720",  label: "720p" },
  { value: "1080", label: "1080p" },
  { value: "1440", label: "1440p" },
  { value: "2160", label: "2160p (4K)" },
];

/** Sentinel "no style" — bypasses /create-captions and uses
 *  /create-transcription instead (30 credits vs 50). */
const NO_STYLE_ID = "__none__";
const NO_STYLE: ReapCaptionPreset = {
  id: NO_STYLE_ID,
  label: "No style (SRT)",
  source: "system",
};

// ─── Page state ──────────────────────────────────────────────────────────

interface PageState {
  clip: {
    path: string;
    name: string;
    origin: "timeline" | "file" | "link";
    mediaKind?: "video" | "audio";
    inSec?: number;
    outSec?: number;
    durationSec?: number;
  } | null;
  presets: ReapCaptionPreset[];
  sourceLanguages: ReapLanguageOption[];
  translationLanguages: ReapLanguageOption[];
  selectedPreset: string;
  activePresetTab: "all" | "caption" | "brand";
  sourceInput: string;
  language: string;
  translate: string;
  script: string;
  resolution: string;
  enableEmojis: boolean;
  enableHighlights: boolean;
  busy: boolean;
  manualOverride: boolean;
  presetsLoading: boolean;
  languagesLoading: boolean;
  presetsError: string | null;
  languagesError: string | null;
  debugLines: string[];
}

interface DebugSequenceContext {
  host?: string;
  hasSequence?: boolean;
  sequenceName?: string | null;
  sequenceId?: string | number | null;
  playheadTicks?: string | null;
  playheadSeconds?: number | null;
  captionTracksCount?: number;
  videoTracksCount?: number;
  selectedClip?: {
    trackKind?: string;
    trackIndex?: number;
    path?: string;
    name?: string;
    startTicks?: string | null;
    endTicks?: string | null;
    startSec?: number;
    endSec?: number;
    durationSec?: number;
  } | null;
}

interface ImportCaptionDebugResult {
  ok?: boolean;
  placed?: boolean;
  success?: boolean;
  method?: string;
  captionImportPrimaryMethod?: string;
  createCaptionTrackAvailable?: boolean;
  createCaptionTrackResult?: string;
  fallbackUsed?: boolean;
  fallbackMethod?: string;
  fallbackResult?: string;
  finalResult?: string;
  reason?: string;
  track?: string;
  at?: string;
  sequence?: string;
  playheadTicks?: string;
  sourceTrack?: string;
  sourceClipName?: string;
  selectedClipPath?: string;
  expectedSourcePath?: string | null;
  binPath?: string;
  error?: string;
}

type CaptionUploadSource =
  | { uploadId: string; sourceUrl?: never; method: "reap-upload"; filename: string }
  | { sourceUrl: string; uploadId?: never; method: "source-url"; filename: string };

export function AddCaptionsPage(): HTMLElement {
  const hostAdapter = getHostAdapter();
  const state: PageState = {
    clip: null,
    presets: [NO_STYLE],
    sourceLanguages: [],
    translationLanguages: [],
    selectedPreset: NO_STYLE.id,
    activePresetTab: "all",
    sourceInput: "",
    language: AUTO_DETECT_LANGUAGE,
    translate: NO_TRANSLATION,
    script: "native",
    resolution: "1080",
    enableEmojis: false,
    enableHighlights: true,
    busy: false,
    manualOverride: false,
    presetsLoading: true,
    languagesLoading: true,
    presetsError: null,
    languagesError: null,
    debugLines: [],
  };

  const body = el("div.app-main");
  const page = el("div.captions-page");
  const resultArea = el("div.captions-result");
  body.appendChild(resultArea);
  body.appendChild(page);

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Add Captions"),
    body,
  );

  const watcher = createHostSelectionWatcher(hostAdapter, (clip) => {
    if (state.manualOverride) return;
    if (!clip) { state.clip = null; render(); return; }
    state.clip = {
      path: clip.path,
      name: clip.name ?? guessName(clip.path),
      origin: "timeline",
      mediaKind: clip.trackKind === "audio" || looksLikeAudioPath(clip.path) ? "audio" : "video",
      inSec: clip.inSec,
      outSec: clip.outSec,
      durationSec: clip.durationSec,
    };
    render();
  });
  watcher.attachTo(root);

  // Load real presets + languages from Reap through the backend proxy.
  void (async () => {
    try {
      const [captionPresets, brandTemplates] = await Promise.all([
        reapAdapter.listCaptionPresets(),
        reapAdapter.listBrandTemplates(),
      ]);
      state.presets = [NO_STYLE, ...captionPresets.items, ...brandTemplates.items];
      state.presetsError = state.presets.length > 1
        ? null
        : (captionPresets.diagnostic
          ?? brandTemplates.diagnostic
          ?? "Reap returned no caption styles or brand templates for this account.");
    } catch (err) {
      state.presets = [NO_STYLE];
      state.presetsError = (err as Error).message;
    } finally {
      state.presetsLoading = false;
    }

    try {
      const res = await reap.translationLanguages();
      const sourceLanguages = mapReapLanguages(res.sourceLanguages);
      const targetLanguages = mapReapLanguages(res.targetLanguages);
      state.sourceLanguages = sourceLanguages.length ? sourceLanguages : FALLBACK_SOURCE_LANGUAGES;
      state.translationLanguages = targetLanguages.length ? targetLanguages : FALLBACK_TARGET_LANGUAGES;
      state.languagesError = null;
      if (sourceLanguages.length) {
        const hasArabic = sourceLanguages.some((lang) => lang.code === "ar");
        const preferred = hasArabic ? "ar" : sourceLanguages[0].code;
        if (
          !state.language ||
          state.language === AUTO_DETECT_LANGUAGE ||
          !sourceLanguages.some((lang) => lang.code === state.language)
        ) {
          state.language = preferred;
        }
        if (state.translate !== NO_TRANSLATION && !targetLanguages.some((lang) => lang.code === state.translate)) {
          state.translate = NO_TRANSLATION;
        }
      }
    } catch (err) {
      state.sourceLanguages = FALLBACK_SOURCE_LANGUAGES;
      state.translationLanguages = FALLBACK_TARGET_LANGUAGES;
      state.languagesError = null;
    } finally {
      state.languagesLoading = false;
    }

    render();
  })();

  render();
  void captureRuntimeDebug("PAGE_OPEN");
  return root;

  // ─── Render ─────────────────────────────────────────────────────────

  function render() {
    page.replaceChildren(
      renderHero(),
      renderSourceSection(),
      renderStylesSection(),
      renderFormGrid(),
      renderToggle("Add Emoji", "enableEmojis",
        el("span.toggle-row__accent", { style: { background: "rgba(255,107,107,0.18)" } }, "😎")),
      renderToggle("Add Word Highlight", "enableHighlights",
        el("span.toggle-row__accent",
          { style: { background: "rgba(250,204,21,0.2)", color: "#facc15" } }, "Highlight")),
      renderCta(),
      renderDebugPanel(),
    );
  }

  function renderHero(): HTMLElement {
    return el("div.captions-hero", null,
      el("h2.captions-hero__title", null,
        "Add ",
        el("span.captions-hero__accent", null, "Captions"),
        " to your reels, shorts & stories",
      ),
      el("div.captions-hero__subtitle", null,
        "Output mode stays CC only. We import the SRT into Premiere automatically when possible."),
    );
  }

  function renderSourceSection(): HTMLElement {
      const selectedClipCard = state.clip
      ? el("div.captions-section",
          null,
          el("div.captions-section__head", null,
            el("h3", null, "Selected clip"),
            el("button.dock-button",
              { onClick: resetSourceSelection },
              "Change"),
          ),
          el("div.captions-source", null,
            renderSourcePreview(state.clip),
            el("div.captions-source__meta", null,
              el("div.captions-source__meta-icon", null, icon(state.clip.mediaKind === "audio" ? "mic" : "video", 16)),
              el("div.captions-source__meta-text", null,
                el("div.captions-source__name", null, state.clip.name),
                el("div.captions-source__path", { title: state.clip.path }, state.clip.path),
              ),
            ),
          ),
        )
      : null;

    return el("div.captions-section",
      null,
      el("label.captions-link-input", null,
        el("span.captions-link-input__icon", null, icon("link", 15)),
        el("input", {
          type: "text",
          value: state.sourceInput,
          placeholder: "Drop a video or audio link",
          spellcheck: "false",
          onInput: (e: Event) => {
            state.sourceInput = (e.target as HTMLInputElement).value;
          },
          onBlur: applySourceInput,
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applySourceInput();
            }
          },
        }),
      ),
      el("div.captions-source-divider", null,
        el("span.captions-source-divider__line"),
        el("span.captions-source-divider__label", null, "Or"),
        el("span.captions-source-divider__line"),
      ),
      renderUploadSurface(),
      selectedClipCard,
    );
  }

  function renderStylesSection(): HTMLElement {
    const systemPresets = state.presets.filter((p) =>
      p.id === NO_STYLE_ID || p.source === "system");
    const brandPresets = state.presets.filter((p) => p.source === "user");
    const allPresets = state.presets;

    const selectedTab = state.activePresetTab;
    const tabPresets = selectedTab === "all"
      ? allPresets
      : selectedTab === "caption"
        ? systemPresets
        : brandPresets;
    const visiblePresets = tabPresets.slice(0, 4);
    const total = tabPresets.length;

    return el("div.captions-section", null,
      el("div.captions-tabs", null,
        el("button.captions-tab" + (selectedTab === "all" ? ".captions-tab--active" : ""),
          {
            onClick: () => {
              state.activePresetTab = "all";
              render();
            },
          },
          "All presets",
        ),
        el("button.captions-tab" + (selectedTab === "caption" ? ".captions-tab--active" : ""),
          {
            onClick: () => {
              state.activePresetTab = "caption";
              render();
            },
          },
          "Caption styles",
        ),
        el("button.captions-tab" + (selectedTab === "brand" ? ".captions-tab--active" : ""),
          {
            onClick: () => {
              state.activePresetTab = "brand";
              render();
            },
          },
          "Brand templates",
        ),
      ),
      state.presetsLoading
        ? el("div.captions-empty-panel", null, "Loading styles from Reap…")
        : null,
      !state.presetsLoading && state.presetsError
        ? el("div.captions-empty-panel", null, `Styles diagnostic: ${state.presetsError}`)
        : null,
      !state.presetsLoading && !state.presetsError && selectedTab === "caption" && systemPresets.length === 1
        ? el("div.captions-empty-panel", null,
            "No real caption styles were returned by Reap. Only SRT-only mode is currently available.")
        : null,
      selectedTab === "brand" && !brandPresets.length
        ? el("div.captions-empty-panel", null,
            "No brand templates are available on this account yet.")
        : el("div.styles-row", null, ...visiblePresets.map(renderStyleCard)),
      total > visiblePresets.length
        ? el("button.styles-more",
            {
              onClick: () => openMorePresets(
                tabPresets,
                selectedTab === "all" ? "All presets"
                  : selectedTab === "caption" ? "Caption styles"
                    : "Brand templates",
              ),
            },
            selectedTab === "brand" ? "More templates" : "More styles")
        : null,
      el("div.captions-section__hint", null,
        `${Math.max(0, allPresets.length - 1)} Reap presets available`
          + (brandPresets.length ? ` • ${brandPresets.length} brand templates` : "")),
    );
  }

  function renderUploadSurface(): HTMLElement {
    return el("div.captions-upload-surface",
      {
        onDragover: (e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.add("captions-upload-surface--dragover");
        },
        onDragleave: (e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove("captions-upload-surface--dragover");
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove("captions-upload-surface--dragover");
          const file = e.dataTransfer?.files?.[0];
          if (file) {
            setClipFromFile(file);
            render();
          }
        },
      },
      el("div.captions-upload-surface__icon", null, icon("import", 22)),
      el("div.captions-upload-surface__title", null, "Drag and drop file to upload or"),
      el("button.btn-primary.captions-upload-surface__browse", { onClick: pickUpload }, "Browse files"),
      el("div.captions-upload-surface__meta", null,
        isInsideAdobe()
          ? "Max. file 15 mins and 2 GB"
          : "Upload a local video file to continue."),
      !state.clip && isInsideAdobe()
        ? el("div.captions-upload-surface__hint", null,
            "Tip: selecting a video or audio clip on the Premiere timeline will auto-fill this tool.")
        : null,
    );
  }

  function renderSourcePreview(clip: NonNullable<PageState["clip"]>): HTMLElement {
    const src = pathToSrc(clip.path);
    if (clip.mediaKind === "audio" || looksLikeAudioPath(clip.path)) {
      return el("audio.captions-source__preview", {
        src,
        controls: "true",
        preload: "metadata",
      });
    }
    return el("video.captions-source__preview", {
      src,
      controls: "true",
      muted: "true",
      preload: "metadata",
    });
  }

  function resetSourceSelection() {
    state.manualOverride = false;
    state.sourceInput = "";
    state.clip = null;
    render();
  }

  function applySourceInput() {
    const value = state.sourceInput.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) {
      toast("Paste a valid http/https media link.", "error");
      return;
    }
    state.manualOverride = true;
    state.clip = {
      path: value,
      name: guessName(value),
      origin: "link",
      mediaKind: looksLikeAudioPath(value) ? "audio" : "video",
    };
    render();
  }

  function setClipFromFile(file: File) {
    const localUrl = URL.createObjectURL(file);
    state.manualOverride = true;
    state.sourceInput = "";
    state.clip = {
      path: (file as File & { path?: string }).path ?? localUrl,
      name: file.name,
      origin: "file",
      mediaKind: file.type.startsWith("audio/") || looksLikeAudioPath(file.name) ? "audio" : "video",
    };
  }

  function ensureClipSelected(): boolean {
    if (state.clip) return true;
    const value = state.sourceInput.trim();
    if (/^https?:\/\//i.test(value)) {
      applySourceInput();
      return state.clip != null;
    }
    return false;
  }

  function renderStyleCard(p: ReapCaptionPreset): HTMLElement {
    const selected = p.id === state.selectedPreset;
    return el("button.style-card" + (selected ? ".style-card--selected" : ""),
      {
        onClick: () => { state.selectedPreset = p.id; render(); },
        title: p.label,
      },
      el("div.style-card__preview", null, renderPresetSample(p)),
      el("div.style-card__label", null, p.label),
    );
  }

  function renderPresetSample(p: ReapCaptionPreset): HTMLElement {
    if (p.id === NO_STYLE_ID) {
      return el("div", {
        style: {
          fontSize: "10px",
          color: "var(--text-muted)",
          textAlign: "center",
          padding: "6px",
        },
      }, "SRT only");
    }
    const style = extractPresetStyle(p.preferences);
    return el("span.style-card__sample",
      {
        style: {
          color: style.textColor,
          background: style.bgColor,
          boxShadow: style.bgColor === "transparent"
            ? "0 0 0 1px rgba(255,255,255,0.08) inset"
            : "none",
          fontWeight: String(style.fontWeight),
          padding: "3px 7px",
        },
      },
      // Show a short fragment that highlights one word — mirrors Reap's
      // own preview convention without imitating exact preset artwork.
      "ONE ",
      el("span", { style: { color: style.highlightColor } }, "word"),
    );
  }

  function renderFormGrid(): HTMLElement {
    const sourceLanguageOptions = [
      { value: AUTO_DETECT_LANGUAGE, label: "Auto-detect" },
      ...state.sourceLanguages.map((lang) => ({
      value: lang.code,
      label: lang.label,
      })),
    ];
    const translationOptions = [
      { value: NO_TRANSLATION, label: "Don't translate" },
      ...state.translationLanguages.map((lang) => ({ value: lang.code, label: lang.label })),
    ];
    return el("div.captions-section", null,
      el("div.captions-section__head", null,
        el("h3", null, "Settings"),
      ),
      el("div.form-grid", null,
        renderSelectField("Language", state.language, sourceLanguageOptions, (v) => state.language = v, {
          disabled: false,
          placeholder: state.languagesLoading ? "Loading…" : "Auto-detect",
        }),
        renderSelectField("Translate to", state.translate, translationOptions, (v) => state.translate = v, {
          disabled: state.languagesLoading || translationOptions.length === 1,
          placeholder: state.languagesLoading ? "Loading…" : "Unavailable",
        }),
        renderSelectField("Script", state.script, SCRIPTS, (v) => state.script = v),
        renderSelectField("Resolution", state.resolution, RESOLUTIONS, (v) => state.resolution = v),
      ),
      state.languagesError
        ? el("div.captions-empty-panel", null, `Languages diagnostic: ${state.languagesError}`)
        : null,
    );
  }

  function renderSelectField(
    label: string,
    value: string,
    options: Array<{ value: string; label: string }>,
    onPick: (v: string) => void,
    extra: { disabled?: boolean; placeholder?: string } = {},
  ): HTMLElement {
    const current = options.find((o) => o.value === value);
    return el("div.form-field", null,
      el("div.form-field__label", null, label),
      el("button.form-select",
        {
          disabled: extra.disabled ? "true" : null,
          onClick: async () => {
            if (extra.disabled) return;
            const picked = await openModelPicker({
              title: label,
              options,
            });
            if (picked != null) { onPick(picked); render(); }
          },
        },
        current?.label ?? extra.placeholder ?? value,
      ),
    );
  }

  function renderToggle(label: string, key: "enableEmojis" | "enableHighlights", accent: HTMLElement | null): HTMLElement {
    const on = state[key];
    return el("div.toggle-row", null,
      el("div.toggle-row__label", null, label, accent),
      el("button.toggle-switch" + (on ? ".toggle-switch--on" : ""),
        {
          onClick: () => { state[key] = !state[key]; render(); },
          "aria-pressed": on ? "true" : "false",
          "aria-label": label,
        },
      ),
    );
  }

  function renderCta(): HTMLElement {
    return el("div.captions-cta", null,
      el("button.btn-primary",
        {
          onClick: onGenerate,
          disabled: state.busy,
        },
        icon("send", 14),
        state.busy ? "Generating…" : "Generate Captions",
      ),
    );
  }

  function renderDebugPanel(): HTMLElement {
    return el("div.captions-debug", null,
      el("div.captions-section__head", null,
        el("h3", null, "Debug Panel"),
        el("span.captions-section__hint", null, "Runtime log for Premiere testing"),
      ),
      el("pre.captions-debug__pre.mono", null,
        state.debugLines.length
          ? state.debugLines.join("\n")
          : "[ADD_CAPTIONS] Waiting for runtime debug output..."),
    );
  }

  // ─── Upload + generation ────────────────────────────────────────────

  async function openMorePresets(presets: ReapCaptionPreset[], title: string) {
    const picked = await openModelPicker({
      title,
      options: presets.map((p) => ({ value: p.id, label: p.label })),
      metaFor: (opt) => {
        const p = presets.find((q) => q.id === opt.value);
        if (!p) return undefined;
        return p.source === "user" ? "Your brand template" : "System preset";
      },
    });
    if (picked != null) { state.selectedPreset = picked; render(); }
  }

  function pickUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      setClipFromFile(file);
      render();
    });
    input.click();
  }

  async function onGenerate() {
    const token = getToken();
    const selectedSource =
      state.clip?.origin
      ?? (/^https?:\/\//i.test(state.sourceInput.trim()) ? "link" : "none");
    pushDebugLines([
      "Button Clicked: TRUE",
      "Generate Handler Started: TRUE",
      `Selected Source: ${selectedSource}`,
      `Token Found: ${token ? "TRUE" : "FALSE"}`,
      `Token Prefix ssp_: ${token?.startsWith("ssp_") ? "TRUE" : "FALSE"}`,
    ]);
    if (state.busy) {
      pushDebugLines(["Blocking Reason: Generation is already in progress."]);
      return;
    }
    if (state.languagesError) {
      pushDebugLines([
        `Languages diagnostic: ${state.languagesError}`,
        "Language loading fallback: proceeding with current selection.",
      ]);
    }
    if (!ensureClipSelected()) {
      const blockingReason = state.sourceInput.trim()
        ? "Source input is invalid or unsupported."
        : "No clip selected or provided.";
      pushDebugLines([
        `Blocking Reason: ${blockingReason}`,
        "Final Result: FAILED",
        `Reason: ${blockingReason}`,
      ]);
      toast("Select a timeline video/audio clip, paste a link, or upload a media file first.", "error");
      return;
    }
    state.busy = true;
    render();

    resultArea.replaceChildren(busyCard("Uploading clip to Reap…"));

    try {
      const runtime = await captureRuntimeDebug("BEFORE_RUN");
      // 1) Upload the source directly to Reap
      const clip = state.clip;
      if (!clip) throw new Error("Select a clip before generating captions.");
      const filename = clip.name || `clip-${Date.now()}.mp4`;
      pushDebugLines([
        "Generate Captions: STARTED",
        `Source Path from Add Captions: ${clip.path}`,
        `Captions Preset: ${state.selectedPreset}`,
        `Language: ${state.language === AUTO_DETECT_LANGUAGE ? "AUTO" : state.language}`,
        `Translation Language: ${state.translate === NO_TRANSLATION ? "NONE" : state.translate}`,
        `Source Match: ${buildSourceMatchLabel(runtime, clip.path)}`,
        "Upload Started: TRUE",
      ]);
      const upload = await uploadClip(clip, filename);
      pushDebugLines([
        "Upload Success: TRUE",
        `Upload Method: ${upload.method}`,
        `Upload Filename: ${upload.filename}`,
        upload.uploadId ? `Upload ID: ${upload.uploadId}` : `Source URL: ${upload.sourceUrl}`,
      ]);

      // 2) No style imports editable SRT captions. Styled presets use
      // Reap's rendered captions output because visual effects such as
      // Wiggle/Typewriter cannot be represented by a plain SRT track.
      const usingStyle = state.selectedPreset !== NO_STYLE.id;
      const tool: ReapTool = usingStyle ? "captions" : "transcription";
      const options: Record<string, unknown> = {
        language: state.language === AUTO_DETECT_LANGUAGE ? undefined : state.language,
        translationLanguage: state.translate === NO_TRANSLATION ? null : state.translate,
        transcriptionScript: state.script,
      };
      if (usingStyle) {
        options.captionsPreset = state.selectedPreset;
        options.resolution = parseInt(state.resolution, 10);
        options.enableEmojis = state.enableEmojis;
        options.enableHighlights = state.enableHighlights;
      }

      resultArea.replaceChildren(busyCard("Starting Reap job…"));
      pushDebugLines([
        "Reap Job Started: TRUE",
        `Reap Tool: ${tool}`,
        usingStyle ? "Caption Style Rendering: TRUE" : "Caption Style Rendering: NONE",
      ]);
      const jobStartedAt = Date.now();
      let statusChecks = 0;
      const final = await reapAdapter.runJob(
        { tool, uploadId: upload.uploadId, sourceUrl: upload.sourceUrl, filename: upload.filename, options },
        (s) => {
          statusChecks += 1;
          const elapsed = formatElapsed(Date.now() - jobStartedAt);
          pushDebugLines([
            `Job Status: ${s.status.toUpperCase()}`,
            `Job Progress: ${typeof s.progress === "number" ? `${Math.round(s.progress)}%` : "UNKNOWN"}`,
            `Status Checks: ${statusChecks}`,
          ]);
          if (s.status === "queued") {
            resultArea.replaceChildren(progressCard({
              title: "Queued in Reap...",
              status: "Waiting for processing to start",
              elapsed,
              checks: statusChecks,
              progress: s.progress,
            }));
          }
          else if (s.status === "processing") {
            const pct = typeof s.progress === "number" ? ` ${Math.round(s.progress)}%` : "";
            resultArea.replaceChildren(progressCard({
              title: `Transcribing${pct}...`,
              status: typeof s.progress === "number"
                ? "Reap is processing the captions"
                : "Reap is processing. Percentage is not available yet",
              elapsed,
              checks: statusChecks,
              progress: s.progress,
            }));
          }
        },
      );

      if (final.status !== "completed") {
        throw new Error(final.error ?? `Reap returned status: ${final.status}`);
      }

      pushDebugLines([
        "Reap Job Started: TRUE",
        `Reap Job ID: ${final.generationId}`,
        `Reap Project ID: ${final.projectId}`,
        "Job Completed: TRUE",
        `Job Status: ${final.status.toUpperCase()}`,
      ]);

      await handleCompleted(final, usingStyle);
      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      const message = (err as Error).message;
      pushDebugLines([
        `Upload Failed: ${/upload/i.test(message) ? "TRUE" : "FALSE"}`,
        `Reap Job Started: ${/Reap|project|caption|transcription|job/i.test(message) ? "TRUE" : "FALSE"}`,
        `Job Completed: FALSE`,
        `Download Success: FALSE`,
        "Import Started: FALSE",
        `createCaptionTrack Success: FALSE`,
        `Fallback Success: FALSE`,
        "Final Result: FAILED",
        `Failure: ${message}`,
      ]);
      resultArea.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    } finally {
      state.busy = false;
      render();
    }
  }

  async function uploadClip(
    clip: NonNullable<PageState["clip"]>,
    filename: string,
  ): Promise<CaptionUploadSource> {
    const uploadSource = await prepareClipForUpload(clip, filename);
    try {
      if (/^https?:\/\//i.test(uploadSource.path)) {
        const blob = await fetch(uploadSource.path).then((r) => r.blob());
        const uploadId = await reapAdapter.upload({ kind: "blob", blob, name: uploadSource.filename });
        return { uploadId, method: "reap-upload", filename: uploadSource.filename };
      }
      if (uploadSource.path.startsWith("blob:")) {
        const blob = await fetch(uploadSource.path).then((r) => r.blob());
        const uploadId = await reapAdapter.upload({ kind: "blob", blob, name: uploadSource.filename });
        return { uploadId, method: "reap-upload", filename: uploadSource.filename };
      }
      const uploadId = await reapAdapter.upload({ kind: "path", path: uploadSource.path, name: uploadSource.filename });
      return { uploadId, method: "reap-upload", filename: uploadSource.filename };
    } catch (err) {
      const sourceUrl = await uploadClipFallbackSourceUrl({ ...clip, path: uploadSource.path }, uploadSource.filename);
      pushDebugLines([
        `Reap Upload URL Fallback: TRUE`,
        `Reap Upload Error: ${(err as Error).message}`,
        `Fallback Source URL: ${sourceUrl}`,
      ]);
      return { sourceUrl, method: "source-url", filename: uploadSource.filename };
    }
  }

  async function prepareClipForUpload(
    clip: NonNullable<PageState["clip"]>,
    filename: string,
  ): Promise<{ path: string; filename: string; trimmed: boolean }> {
    const mustConvertAudio = clip.mediaKind === "audio" || looksLikeAudioPath(clip.path) || looksLikeAudioPath(filename);
    if (clip.origin !== "timeline") {
      if (!mustConvertAudio || /^(https?:|blob:)/i.test(clip.path)) {
        return { path: clip.path, filename: ensureReapSupportedFilename(filename, mustConvertAudio), trimmed: false };
      }
    }
    if (/^(https?:|blob:)/i.test(clip.path)) {
      return { path: clip.path, filename: ensureReapSupportedFilename(filename, mustConvertAudio), trimmed: false };
    }

    const inSec = cleanSeconds(clip.inSec);
    const outSec = cleanSeconds(clip.outSec);
    const durationSec = cleanSeconds(clip.durationSec) || (outSec > inSec ? outSec - inSec : 0);
    const uploadFilename = ensureReapSupportedFilename(filename, mustConvertAudio);

    try {
      resultArea.replaceChildren(busyCard(
        mustConvertAudio ? "Preparing audio for Reap..." : "Preparing selected range...",
        durationSec > 0.2
          ? `Preparing ${formatElapsed(durationSec * 1000)} from the timeline before upload.`
          : "Converting audio to an MP4 container before upload.",
      ));
      const trimmedPath = await trimLocalClipWithFfmpeg(clip.path, uploadFilename, inSec, durationSec, mustConvertAudio);
      pushDebugLines([
        mustConvertAudio ? "Local Audio MP4 Conversion: TRUE" : "Local Trim Before Upload: TRUE",
        `Trim Start: ${inSec.toFixed(3)}s`,
        `Trim Duration: ${durationSec > 0 ? durationSec.toFixed(3) : "FULL"}s`,
        `Trimmed Upload Path: ${trimmedPath}`,
        `Prepared Upload Filename: ${uploadFilename}`,
      ]);
      return { path: trimmedPath, filename: uploadFilename, trimmed: true };
    } catch (err) {
      pushDebugLines([
        mustConvertAudio ? "Local Audio MP4 Conversion: FALSE" : "Local Trim Before Upload: FALSE",
        `Local Trim Error: ${(err as Error).message}`,
        "Local Trim Fallback: Uploading original source file",
      ]);
      return { path: clip.path, filename: uploadFilename, trimmed: false };
    }
  }

  async function uploadClipFallbackSourceUrl(
    clip: NonNullable<PageState["clip"]>,
    filename: string,
  ): Promise<string> {
    if (/^https?:\/\//i.test(clip.path)) return clip.path;
    if (clip.path.startsWith("blob:")) {
      const blob = await fetch(clip.path).then((r) => r.blob());
      const file = new File([blob], filename, { type: blob.type || "video/mp4" });
      return api.uploadFileToR2(file, "video");
    }
    return api.uploadLocalPathToR2(clip.path, "video");
  }

  async function handleCompleted(final: ReapStatusResponse, usingStyle: boolean): Promise<void> {
    if (usingStyle) {
      await handleStyledCompleted(final);
      return;
    }

    const srtUrl = pickSrtUrl(final);
    if (!srtUrl) {
      pushDebugLines([
        `Reap Job ID: ${(final as ReapStatusResponse & { generationId?: string }).generationId ?? "UNKNOWN"}`,
        "SRT URL Found: FALSE",
        "SRT Download URL: NONE",
        "Download Success: FALSE",
        "Import Started: FALSE",
        "createCaptionTrack Success: FALSE",
        "Fallback Success: FALSE",
        "Final Result: FAILED",
        "Reason: Reap finished but did not return an SRT asset.",
      ]);
      resultArea.replaceChildren(el("div.state-card", null,
        el("div.state-card__title", null, "Done, but no SRT returned"),
        el("div.state-card__subtitle", null,
          "Reap finished but didn't expose a .srt asset. Try again with a longer clip."),
      ));
      return;
    }

    resultArea.replaceChildren(busyCard("Adding captions to your sequence…"));
    const srtFileName = `saadstudio-captions-${Date.now()}.srt`;
    pushDebugLines([
      "SRT URL Found: TRUE",
      `SRT URL: ${srtUrl}`,
      "Download Started: TRUE",
    ]);
    const localPath = await api.downloadAsset(srtUrl, srtFileName);
    pushDebugLines([
      `SRT Download URL: ${srtUrl}`,
      `Download Success: ${localPath ? "TRUE" : "FALSE"}`,
      `Downloaded SRT Path: ${localPath}`,
    ]);

    let placed = false;
    let reason: string | undefined;
    let importResult: ImportCaptionDebugResult | null = null;
    try {
      pushDebugLines(["Import Started: TRUE"]);
      const timelineSourcePath = state.clip?.origin === "timeline" ? state.clip.path : null;
      const r = await hostAdapter.placeCaption({ srtPath: localPath, sourcePath: timelineSourcePath ?? undefined });
      importResult = r as ImportCaptionDebugResult;
      if (r && r.ok) {
        placed = (r as ImportCaptionDebugResult).placed === true;
        reason = (r as ImportCaptionDebugResult).reason;
      }
    } catch (err) {
      reason = `Auto-import failed: ${(err as Error).message}`;
    }

    pushDebugLines(buildImportDebugLines(importResult, placed, reason));

    resultArea.replaceChildren(successCard({ placed, reason, localPath, fileName: srtFileName }));
    if (placed) toast("Captions added to the caption track", "success");
  }

  async function handleStyledCompleted(final: ReapStatusResponse): Promise<void> {
    const videoUrl = pickRenderedVideoUrl(final);
    if (!videoUrl) {
      const diagnostic = describeReturnedAssets(final);
      pushDebugLines([
        `Reap Job ID: ${(final as ReapStatusResponse & { generationId?: string }).generationId ?? "UNKNOWN"}`,
        "Styled Video URL Found: FALSE",
        `Returned Assets: ${diagnostic}`,
        "Final Result: FAILED",
        "Reason: Reap finished but did not return a rendered captions video.",
      ]);
      resultArea.replaceChildren(el("div.state-card", null,
        el("div.state-card__title", null, "Done, but no styled video returned"),
        el("div.state-card__subtitle", null, diagnostic),
      ));
      return;
    }

    resultArea.replaceChildren(busyCard("Adding styled captions to your sequence..."));
    const styledFileName = `saadstudio-styled-captions-${Date.now()}.mp4`;
    pushDebugLines([
      "Styled Video URL Found: TRUE",
      `Styled Video URL: ${videoUrl}`,
      "Styled Video Download Started: TRUE",
    ]);
    const localPath = await api.downloadAsset(videoUrl, styledFileName);
    pushDebugLines([
      `Styled Video Download Success: ${localPath ? "TRUE" : "FALSE"}`,
      `Styled Video Local Path: ${localPath}`,
      "Styled Video Import Started: TRUE",
    ]);

    const importResult = await hostAdapter.placeMedia({ assetPath: localPath, afterSelected: true });
    const placed = importResult?.ok === true;
    pushDebugLines([
      `Styled Video Import Result: ${jsonValue(importResult)}`,
      `Styled Video Import Success: ${placed ? "TRUE" : "FALSE"}`,
      `Final Result: ${placed ? "SUCCESS" : "FAILED"}`,
    ]);
    resultArea.replaceChildren(styledSuccessCard({
      placed,
      reason: importResult?.reason ?? importResult?.message,
      localPath,
      fileName: styledFileName,
    }));
    if (placed) toast("Styled captions added to the timeline", "success");
  }

  async function captureRuntimeDebug(stage: string): Promise<DebugSequenceContext | null> {
    const host = getHostEnvironmentInfo();
    let context: DebugSequenceContext | null = null;
    try {
      context = await hostAdapter.getContext() as DebugSequenceContext | null;
    } catch (err) {
      pushDebugLines([
        `Stage: ${stage}`,
        `Premiere: ${host?.appVersion || "unknown"}`,
        `Runtime Context Error: ${(err as Error).message}`,
      ]);
      return null;
    }

    pushDebugLines([
      `Stage: ${stage}`,
      `Premiere: ${host?.appVersion || "unknown"}`,
      `Active Sequence Name: ${context?.sequenceName ?? "NONE"}`,
      `Active Sequence ID: ${stringValue(context?.sequenceId)}`,
      `Current Playhead Time: ${formatPlayhead(context)}`,
      `Number of Caption Tracks: ${stringValue(context?.captionTracksCount)}`,
      `Number of Video Tracks: ${stringValue(context?.videoTracksCount)}`,
      `Selected Clip Name: ${context?.selectedClip?.name ?? "NONE"}`,
      `Selected Clip Media Path: ${context?.selectedClip?.path ?? "NONE"}`,
      `Caption Track: ${(context?.captionTracksCount ?? 0) > 0 ? "FOUND" : "NOT FOUND"}`,
    ]);

    return context;
  }

  function pushDebugLines(lines: string[]) {
    if (!lines.length) return;
    const stamped = lines.map((line) => `[ADD_CAPTIONS] ${line}`);
    for (const line of stamped) console.log(line);
    state.debugLines = [...state.debugLines, ...stamped].slice(-160);
    render();
  }

  function buildSourceMatchLabel(context: DebugSequenceContext | null, sourcePath: string): string {
    const selectedPath = context?.selectedClip?.path;
    if (!selectedPath) return "UNKNOWN";
    if (!sourcePath) return "UNKNOWN";
    return normalizePathForDebug(selectedPath) === normalizePathForDebug(sourcePath) ? "TRUE" : "FALSE";
  }

  function buildImportDebugLines(
    result: ImportCaptionDebugResult | null,
    placed: boolean,
    reason?: string,
  ): string[] {
    if (!result) {
      return [
        "Import Started: TRUE",
        "Caption Import Primary Method: createCaptionTrack",
        "createCaptionTrack Available: UNKNOWN",
        "createCaptionTrack Result: UNKNOWN",
        "Fallback Used: UNKNOWN",
        "Fallback Method: captionTracks[0].insertClip",
        "Final Result: UNKNOWN",
        "Result of importSrtAsCaption: NONE",
        "createCaptionTrack Success: FALSE",
        "Fallback Success: FALSE",
        `Insert Caption: ${placed ? "SUCCESS" : "FAILED"}`,
        `Reason: ${reason ?? "Unknown import result."}`,
      ];
    }
    const createCaptionTrackSuccess = String(result.createCaptionTrackResult ?? "").startsWith("SUCCESS");
    const fallbackSuccess = String(result.fallbackResult ?? "").startsWith("SUCCESS");
    return [
      "Import Started: TRUE",
      `Caption Import Primary Method: ${result.captionImportPrimaryMethod ?? "createCaptionTrack"}`,
      `createCaptionTrack Available: ${typeof result.createCaptionTrackAvailable === "boolean" ? (result.createCaptionTrackAvailable ? "TRUE" : "FALSE") : "UNKNOWN"}`,
      `createCaptionTrack Result: ${result.createCaptionTrackResult ?? "UNKNOWN"}`,
      `createCaptionTrack Success: ${createCaptionTrackSuccess ? "TRUE" : "FALSE"}`,
      `Fallback Used: ${typeof result.fallbackUsed === "boolean" ? (result.fallbackUsed ? "TRUE" : "FALSE") : "UNKNOWN"}`,
      `Fallback Method: ${result.fallbackMethod ?? "captionTracks[0].insertClip"}`,
      `Fallback Success: ${fallbackSuccess ? "TRUE" : "FALSE"}`,
      `Final Result: ${result.finalResult ?? (placed ? "SUCCESS" : "FAILED")}`,
      `Result of importSrtAsCaption: ${jsonValue(result)}`,
      `Source Match: ${result.expectedSourcePath && result.selectedClipPath
        ? (normalizePathForDebug(result.expectedSourcePath) === normalizePathForDebug(result.selectedClipPath) ? "TRUE" : "FALSE")
        : "UNKNOWN"}`,
      `Insert Caption: ${placed ? "SUCCESS" : "FAILED"}`,
      `Reason: ${result.reason ?? reason ?? "NONE"}`,
    ];
  }

  function mapReapLanguages(items: ReapRawLanguageOption[] | undefined): ReapLanguageOption[] {
    return Array.isArray(items)
      ? items
        .map((item) => {
          if (!item?.code) return null;
          return {
            code: item.code,
            label: item.displayName || item.name || item.code,
          };
        })
        .filter((item): item is ReapLanguageOption => item !== null)
      : [];
  }
}

interface LocalWatcher {
  stop: () => void;
  attachTo: (element: HTMLElement) => void;
}

function createHostSelectionWatcher(
  hostAdapter: ReturnType<typeof getHostAdapter>,
  listener: (clip: {
    path: string;
    name?: string;
    trackKind?: "video" | "audio";
    inSec?: number;
    outSec?: number;
    durationSec?: number;
  } | null) => void,
  intervalMs = 1200,
): LocalWatcher {
  let stopped = false;
  let lastKey = "__init__";

  const tick = async () => {
    if (stopped) return;
    try {
      const clip = await getTimelineMediaSelection(hostAdapter);
      const key = clip ? `${clip.path ?? ""}|${clip.inSec ?? 0}|${clip.outSec ?? 0}` : "null";
      if (key !== lastKey) {
        lastKey = key;
        listener(clip && clip.path ? {
          path: clip.path,
          name: clip.name,
          trackKind: clip.trackKind,
          inSec: clip.inSec,
          outSec: clip.outSec,
          durationSec: clip.durationSec,
        } : null);
      }
    } catch {
      // Ignore transient host failures and retry on the next tick.
    }
  };

  void tick();
  const id = window.setInterval(tick, intervalMs);

  const stop = () => {
    stopped = true;
    window.clearInterval(id);
  };

  return {
    stop,
    attachTo(element: HTMLElement) {
      const check = () => {
        if (stopped) return;
        if (!element.isConnected) {
          stop();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    },
  };
}

async function getTimelineMediaSelection(
  hostAdapter: ReturnType<typeof getHostAdapter>,
) {
  const videoClip = await hostAdapter.getSelection("video");
  if (videoClip?.path) return { ...videoClip, trackKind: "video" as const };
  const audioClip = await hostAdapter.getSelection("audio");
  if (audioClip?.path) return { ...audioClip, trackKind: "audio" as const };
  return null;
}

// ─── Result cards ───────────────────────────────────────────────────────

function successCard(args: {
  placed: boolean;
  reason?: string;
  localPath: string;
  fileName: string;
}): HTMLElement {
  const title = args.placed ? "Captions on the timeline" : "SRT in your project bin";
  const subtitle = args.placed
    ? "Added to the active sequence's first caption track. Edit in Premiere's Captions panel."
    : (args.reason ?? "Drag the file from the bin onto a caption (CC) track.");

  return el("div.col.gap-3", null,
    el("div.state-card", { style: { textAlign: "left", padding: "16px" } },
      el("div.row.gap-3", { style: { alignItems: "flex-start" } },
        el("div.state-card__icon", { style: { margin: "0", flexShrink: "0" } },
          icon("check", 18)),
        el("div.col.gap-1.grow", null,
          el("div", { style: { fontSize: "13px", fontWeight: "600" } }, title),
          el("div.dim", { style: { fontSize: "11px", lineHeight: "1.5" } }, subtitle),
        ),
      ),
    ),
    el("div.row.gap-2", null,
      el("button.btn-secondary",
        { onClick: () => copyLocalToDesktop(args.localPath, args.fileName) },
        icon("import", 14), "Download SRT"),
    ),
  );
}

function styledSuccessCard(args: {
  placed: boolean;
  reason?: string;
  localPath: string;
  fileName: string;
}): HTMLElement {
  return el("div.state-card", { style: { textAlign: "left", padding: "16px" } },
    el("div.row.gap-2", { style: { alignItems: "flex-start" } },
      el("div.state-card__icon", { style: { margin: "0", flexShrink: "0" } },
        icon(args.placed ? "check" : "import", 16)),
      el("div", { style: { minWidth: "0" } },
        el("div.state-card__title", { style: { textAlign: "left" } },
          args.placed ? "Styled captions added" : "Styled captions downloaded"),
        el("div.state-card__subtitle", { style: { textAlign: "left", marginBottom: "8px" } },
          args.placed
            ? "The rendered captions video was placed on the timeline."
            : (args.reason ?? "The rendered video is saved locally, but auto-placement did not complete.")),
        el("div.mono", {
          style: {
            fontSize: "10px",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
          title: args.localPath,
        }, args.localPath),
      ),
    ),
    el("div.row.gap-2", null,
      el("button.btn-secondary",
        { onClick: () => copyLocalToDesktop(args.localPath, args.fileName) },
        icon("import", 14), "Download video"),
    ),
  );
}

function busyCard(text: string, subtitle = "Hold tight."): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__icon", null, icon("spark", 18)),
    el("div.state-card__title", null, text),
    el("div.state-card__subtitle", null, subtitle),
  );
}

function progressCard(args: {
  title: string;
  status: string;
  elapsed: string;
  checks: number;
  progress?: number;
}): HTMLElement {
  const pct = typeof args.progress === "number"
    ? Math.max(0, Math.min(100, Math.round(args.progress)))
    : null;
  return el("div.state-card.captions-progress-card", null,
    el("div.state-card__icon.captions-progress-card__icon", null, icon("spark", 18)),
    el("div.state-card__title", null, args.title),
    el("div.state-card__subtitle", null, args.status),
    el("div.captions-progress" + (pct == null ? ".captions-progress--indeterminate" : ""), {
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      ...(pct == null ? {} : { "aria-valuenow": String(pct) }),
    },
      el("div.captions-progress__bar", { style: pct == null ? undefined : { width: `${pct}%` } }),
    ),
    el("div.captions-progress-meta", null,
      el("span", null, `Elapsed ${args.elapsed}`),
      el("span", null, pct == null ? "Progress pending" : `${pct}%`),
      el("span", null, `Checks ${args.checks}`),
    ),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Caption job failed"),
    el("div.state-card__subtitle", null, message),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function pickSrtUrl(status: ReapStatusResponse): string | null {
  for (const url of status.urls ?? []) {
    if (looksLikeSrt(url)) return url;
  }
  if (typeof status.url === "string" && looksLikeSrt(status.url)) return status.url;
  const meta = (status.metadata as Record<string, unknown> | undefined)?.urls;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    for (const key of ["transcription_srt", "transcriptionSrt", "srt", "subtitlesSrt", "srtUrl", "subtitleUrl", "captionsSrt"]) {
      const cand = m[key];
      if (typeof cand === "string" && cand.length) return cand;
    }
  }
  return findSrtInUnknown(status.metadata);
}

function pickRenderedVideoUrl(status: ReapStatusResponse): string | null {
  const candidates = collectStrings(status);
  const preferred = candidates.find((url) =>
    /^https?:\/\//i.test(url) &&
    !looksLikeSrt(url) &&
    /\.(mp4|mov|webm)(\?|$|#)/i.test(url)
  );
  if (preferred) return preferred;
  return candidates.find((url) => /^https?:\/\//i.test(url) && !looksLikeSrt(url)) ?? null;
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => collectStrings(item, depth + 1));
}

function describeReturnedAssets(status: ReapStatusResponse): string {
  const urls = collectStrings(status)
    .filter((value) => /^https?:\/\//i.test(value))
    .slice(0, 6);
  if (!urls.length) return "No downloadable URLs were returned by Reap.";
  return urls.map((url) => url.replace(/\?.*$/, "")).join(" | ");
}

function looksLikeSrt(url: string): boolean {
  return /\.srt(\?|$|#)/i.test(url);
}

function looksLikeAudioPath(path: string): boolean {
  return /\.(mp3|wav|m4a|aac|ogg|oga|flac|aif|aiff|wma)(\?|$|#)/i.test(path);
}

function findSrtInUnknown(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") return looksLikeSrt(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSrtInUnknown(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const preferred = Object.entries(record).filter(([key]) => /srt|subtitle|caption/i.test(key));
  const rest = Object.entries(record).filter(([key]) => !/srt|subtitle|caption/i.test(key));
  for (const [, item] of [...preferred, ...rest]) {
    const found = findSrtInUnknown(item, depth + 1);
    if (found) return found;
  }
  return null;
}

function guessName(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() ?? "Clip";
}

function normalizePathForDebug(value: string | null | undefined): string {
  return String(value ?? "").replace(/\//g, "\\").toLowerCase();
}

function jsonValue(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function stringValue(value: unknown): string {
  if (value == null || value === "") return "NONE";
  return String(value);
}

function formatPlayhead(context: DebugSequenceContext | null): string {
  if (!context) return "NONE";
  const sec = typeof context.playheadSeconds === "number" ? `${context.playheadSeconds.toFixed(3)}s` : "NONE";
  const ticks = context.playheadTicks ? ` (${context.playheadTicks} ticks)` : "";
  return `${sec}${ticks}`;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function cleanSeconds(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

async function trimLocalClipWithFfmpeg(
  inputPath: string,
  filename: string,
  inSec: number,
  durationSec: number,
  audioOnlyMp4 = false,
): Promise<string> {
  const nodeRequire = window.cep_node?.require as (<T = unknown>(moduleName: string) => T) | undefined;
  if (!nodeRequire) throw new Error("CEP Node runtime is not available.");

  const fs = nodeRequire<typeof import("fs")>("fs");
  const os = nodeRequire<typeof import("os")>("os");
  const path = nodeRequire<typeof import("path")>("path");
  const cp = nodeRequire<typeof import("child_process")>("child_process");
  const ffmpegPath = resolveFfmpegPath(fs, path, nodeRequire);
  const tempDir = path.join(os.tmpdir(), "saadstudio-captions");
  fs.mkdirSync(tempDir, { recursive: true });

  const baseName = sanitizeFileStem(filename.replace(/\.[^.]+$/, "") || "clip");
  const outputPath = path.join(tempDir, `${baseName}-${Date.now()}-trimmed.mp4`);
  const start = Math.max(0, inSec).toFixed(3);
  const duration = durationSec > 0.2 ? Math.max(0.2, durationSec).toFixed(3) : null;

  if (audioOnlyMp4) {
    const audioArgs = [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-ss", start,
      "-i", inputPath,
      ...(duration ? ["-t", duration] : []),
      "-vn",
      "-map", "0:a:0?",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ];
    await execFileChecked(cp, ffmpegPath, audioArgs);
    const stat = fs.statSync(outputPath);
    if (!stat.size) throw new Error("FFmpeg produced an empty MP4 audio file.");
    return outputPath;
  }

  const copyArgs = [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-ss", start,
    "-i", inputPath,
    ...(duration ? ["-t", duration] : []),
    "-map", "0:v:0?",
    "-map", "0:a:0?",
    "-c", "copy",
    "-avoid_negative_ts", "make_zero",
    outputPath,
  ];

  try {
    await execFileChecked(cp, ffmpegPath, copyArgs);
  } catch {
    const transcodeArgs = [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-ss", start,
      "-i", inputPath,
      ...(duration ? ["-t", duration] : []),
      "-map", "0:v:0?",
      "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ];
    await execFileChecked(cp, ffmpegPath, transcodeArgs);
  }

  const stat = fs.statSync(outputPath);
  if (!stat.size) throw new Error("FFmpeg produced an empty trimmed file.");
  return outputPath;
}

function resolveFfmpegPath(
  fs: typeof import("fs"),
  path: typeof import("path"),
  nodeRequire: <T = unknown>(moduleName: string) => T,
): string {
  const candidates: string[] = [];
  try {
    const ext = window.__adobe_cep__?.getSystemPath("extension");
    if (ext) candidates.push(path.join(ext, "tools", "ffmpeg", "ffmpeg.exe"));
  } catch { /* ignore */ }
  try {
    const staticPath = nodeRequire<string>("ffmpeg-static");
    if (staticPath) candidates.push(staticPath);
  } catch { /* ignore */ }

  const found = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  return found ?? "ffmpeg";
}

function execFileChecked(
  cp: typeof import("child_process"),
  file: string,
  args: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    cp.execFile(file, args, { windowsHide: true }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(String(stderr || error.message || error)));
        return;
      }
      resolve();
    });
  });
}

function sanitizeFileStem(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").replace(/\s+/g, "-").slice(0, 64) || "clip";
}

function ensureReapSupportedFilename(filename: string, forceMp4 = false): string {
  const base = sanitizeFileStem(filename.replace(/\.[^.]+$/, "") || "clip");
  if (forceMp4) return `${base}.mp4`;
  return /\.(mp4|mov)$/i.test(filename) ? filename : `${base}.mp4`;
}

function pathToSrc(p: string): string {
  if (!p) return "";
  if (p.startsWith("blob:") || p.startsWith("data:") || p.startsWith("http")) return p;
  const forward = p.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}

/** Defensive reader over the Reap preset preferences blob.
 *
 * The upstream schema isn't formally documented, so we probe a few
 * common nesting paths (typography.color, caption.text.color, …) and
 * gracefully fall back to readable defaults when nothing matches. The
 * result drives the colour + weight + highlight of the mini preview in
 * each style card — no exact replica of Reap's preset artwork, just a
 * faithful colour cue. */
interface PreviewStyle {
  textColor: string;
  bgColor: string;
  highlightColor: string;
  fontWeight: number;
}
function extractPresetStyle(prefs: Record<string, unknown> | undefined): PreviewStyle {
  const fallback: PreviewStyle = {
    textColor: "#ffffff",
    bgColor: "transparent",
    highlightColor: "#facc15",
    fontWeight: 800,
  };
  if (!prefs || typeof prefs !== "object") return fallback;

  const peek = (path: string[]): unknown => {
    let cur: unknown = prefs;
    for (const key of path) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[key];
    }
    return cur;
  };

  const firstString = (...paths: string[][]): string | undefined => {
    for (const p of paths) {
      const v = peek(p);
      if (typeof v === "string" && v.trim()) return v;
    }
    return undefined;
  };

  const firstNumber = (...paths: string[][]): number | undefined => {
    for (const p of paths) {
      const v = peek(p);
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
    }
    return undefined;
  };

  const textColor = firstString(
    ["typography", "color"],
    ["caption", "typography", "color"],
    ["text", "color"],
    ["primaryColor"],
  );
  const bgColor = firstString(
    ["background", "color"],
    ["caption", "background", "color"],
    ["box", "color"],
    ["backgroundColor"],
  );
  const highlightColor = firstString(
    ["highlight", "color"],
    ["highlights", "color"],
    ["accent", "color"],
    ["wordHighlightColor"],
  );
  const fontWeight = firstNumber(
    ["typography", "weight"],
    ["typography", "fontWeight"],
    ["caption", "typography", "weight"],
    ["fontWeight"],
  );

  return {
    textColor: textColor ?? fallback.textColor,
    bgColor: bgColor ?? fallback.bgColor,
    highlightColor: highlightColor ?? fallback.highlightColor,
    fontWeight: fontWeight ?? fallback.fontWeight,
  };
}

async function copyLocalToDesktop(srcPath: string, fileName: string): Promise<void> {
  if (typeof window.cep === "undefined" || !window.cep_node) {
    toast("Desktop save only works inside Premiere / After Effects.", "error");
    return;
  }
  try {
    const fs = window.cep_node.require("fs") as typeof import("fs");
    const path = window.cep_node.require("path") as typeof import("path");
    const os = window.cep_node.require("os") as typeof import("os");
    const desktop = path.join(os.homedir(), "Desktop");
    if (!fs.existsSync(desktop)) fs.mkdirSync(desktop, { recursive: true });
    const dest = path.join(desktop, fileName);
    fs.copyFileSync(srcPath, dest);
    toast(`Saved to Desktop: ${fileName}`, "success");
  } catch (err) {
    toast(`Save failed: ${(err as Error).message}`, "error");
  }
}
