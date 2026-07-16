import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { ProcessingLoader } from "../components/processing-loader";
import { el } from "../lib/dom";
import {
  api,
  getApiBase,
  type TransitionOutput,
  type TransitionPanelJob,
  type TransitionProject,
  type TransitionPresetItem,
} from "../lib/api";
import { icon } from "../lib/icons";
import { evalES, getHostImportButtonLabel, getHostImportSuccessMessage } from "../lib/cep";
import { toast } from "../lib/toast";
import { watchTimelineSelection, type TimelineClip } from "../lib/timeline-watcher";
import { enforceVideoDurationLimit } from "../lib/media-validation";

type InputKind = "image" | "video";
type TransitionInputSlot = "start" | "end";
type FramePosition = "first" | "last";
type TransitionGenerationModel = "kling-2.6/image-to-video" | "hailuo/2-3-image-to-video-standard";

type InputState = {
  file: File | null;
  localPath: string | null;
  remoteUrl: string | null;
  displayName: string | null;
  selectionKey: string | null;
  kind: InputKind | null;
  previewUrl: string | null;
  previewWidth: number | null;
  previewHeight: number | null;
  cacheKey: string | null;
  preparedUrl: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  transformation: "Transformation",
  fx_material: "FX / Material",
  camera_motion: "Camera / Motion",
  object_reveal: "Object / Reveal",
  stylized_special: "Stylized / Special",
};

const ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const DURATIONS = ["5", "6", "10"];
const RESOLUTIONS = ["720p"];
const FPS_OPTIONS = ["24"];
const TRANSITION_GENERATION_MODELS: TransitionGenerationModel[] = [
  "kling-2.6/image-to-video",
  "hailuo/2-3-image-to-video-standard",
];
const STORAGE_KEY = "saadstudio.transitions.projectId";
const AUTOSAVE_DELAY_MS = 1600;
const FIXED_TRANSITION_RESOLUTION = "720p";
const FIXED_TRANSITION_FPS = 24;
const DEFAULT_INTENSITY = 50;
const DEFAULT_SMOOTHNESS = 60;
const DEFAULT_CINEMATIC = 65;

export function TransitionsPage(): HTMLElement {
  const inputA: InputState = { file: null, localPath: null, remoteUrl: null, displayName: null, selectionKey: null, kind: null, previewUrl: null, previewWidth: null, previewHeight: null, cacheKey: null, preparedUrl: null };
  const inputB: InputState = { file: null, localPath: null, remoteUrl: null, displayName: null, selectionKey: null, kind: null, previewUrl: null, previewWidth: null, previewHeight: null, cacheKey: null, preparedUrl: null };

  let busy = false;
  let presets: TransitionPresetItem[] = [];
  let activeCategory = "all";
  let selectedPresetId = "";
  let currentProjectId: string | null = null;
  let autosaveHandle: number | null = null;
  let activePollToken = 0;

  const aspectSelect = selectField(ASPECTS, "16:9");
  const durationSelect = selectField(DURATIONS, "5");
  const resolutionSelect = selectField(RESOLUTIONS, FIXED_TRANSITION_RESOLUTION);
  const fpsSelect = selectField(FPS_OPTIONS, "24");
  const modelSelect = selectField(TRANSITION_GENERATION_MODELS, "kling-2.6/image-to-video");

  const intensityInput = sliderField("50");
  const smoothnessInput = sliderField("60");
  const cinematicInput = sliderField("65");
  const preserveToggle = toggleField(true);
  const subjectToggle = toggleField(true);
  const enhanceToggle = toggleField(true);

  const inputAHost = el("div");
  const inputBHost = el("div");
  const categoryHost = el("div.row.gap-2", { style: { flexWrap: "wrap" } });
  const presetsHost = el("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "12px",
    },
  });
  const resultHost = el("div");
  const creditHint = el("div.mono.muted", { style: { fontSize: "11px" } }, "Select a preset to see estimated credits.");
  const busyHint = el("div.busy-inline", {
    style: { display: "none", marginTop: "8px" },
  },
    el("span.busy-spinner", { "aria-hidden": "true" }),
    el("span", null, "Generating transition… please wait"),
  );

  const generateBtnLabel = el("span", null, "Generate transition");
  const generateBtn = el("button.btn-primary", {
    onClick: () => { void generate(); },
  }, icon("spark", 14), generateBtnLabel) as HTMLButtonElement;

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Transitions"),
    el("div.app-main", null,
      section("Inputs",
        el("div.col.gap-3", null,
          el("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            },
          }, inputAHost, inputBHost),
          el("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "12px",
            },
          },
            settingsCard("Format",
              labelRow("Model", modelSelect),
              labelRow("Duration", durationSelect),
              el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%" } },
                "Aspect ratio works automatically from the selected media. Resolution stays 720p automatically.",
              ),
            ),
          ),
        ),
      ),
      section("Generate",
        el("div.state-card", { style: { padding: "14px" } },
          el("div.row", { style: { justifyContent: "space-between", alignItems: "center", gap: "12px" } },
            el("div.col.gap-1", null,
              el("div.state-card__title", { style: { textAlign: "left", width: "100%" } }, "Transition output"),
              el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%" } }, "Select a preset below, then set Start and End from the timeline or from uploaded files."),
              creditHint,
              busyHint,
            ),
            generateBtn,
          ),
          resultHost,
        ),
      ),
      section("Presets",
        el("div.col.gap-3", null, categoryHost, presetsHost),
      ),
    ),
  );

  renderInputCard(inputAHost, "Start", "start", inputA);
  renderInputCard(inputBHost, "End", "end", inputB);
  renderCategories();
  renderPresets();
  syncAutomaticSettings();
  updateCreditHint();
  updateGenerateState();
  durationSelect.addEventListener("change", () => {
    syncAutomaticSettings();
    updateCreditHint();
    queueProjectAutosave();
  });
  modelSelect.addEventListener("change", () => {
    syncModelSettings();
    updateCreditHint();
    queueProjectAutosave();
  });
  const watcher = watchTimelineSelection((clip) => {
    if (clip?.path) {
      void handleTimelineClip(clip);
    }
  });
  watcher.attachTo(root);

  void initialize();

  return root;

  function renderInputCard(host: HTMLElement, title: string, slot: TransitionInputSlot, state: InputState) {
    const previewHost = el("div");
    const helper = el("div.mono.muted", { style: { fontSize: "11px", wordBreak: "break-all" } }, "No source selected");
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*,video/*";
    picker.style.display = "none";
    picker.addEventListener("change", () => {
      const file = picker.files?.[0] ?? null;
      void handlePickedFile(file, state, previewHost, helper, slot);
      picker.value = "";
    });

    host.replaceChildren(
      settingsCard(title,
        el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%", marginBottom: "10px" } },
          slot === "start"
            ? "Click the first timeline clip. The transition will use its last frame."
            : "Click the second timeline clip. The transition will use its first frame.",
        ),
        previewHost,
        helper,
        el("div.row.gap-2", null,
          el("button.btn-secondary", { onClick: () => picker.click() }, icon("plus", 14), "Choose file"),
          hasInput(state)
            ? el("button.btn-secondary", {
                onClick: () => {
                  clearInputState(state);
                  updateInputPreview(previewHost, helper, state, slot);
                  syncAutomaticSettings();
                  updateGenerateState();
                  updateCreditHint();
                  queueProjectAutosave();
                  watcher.reset();
                },
              }, "Clear")
            : null,
        ),
        picker,
      ),
    );
    updateInputPreview(previewHost, helper, state, slot);
  }

  function renderCategories() {
    const categories = Array.from(new Set(presets.map((preset) => preset.category)));
    categoryHost.replaceChildren(
      categoryChip("all", `All (${presets.length})`),
      ...categories.map((category) =>
        categoryChip(category, CATEGORY_LABELS[category] ?? category),
      ),
    );
  }

  function categoryChip(value: string, label: string): HTMLElement {
    const active = activeCategory === value;
    return el("button", {
      onClick: () => {
        activeCategory = value;
        renderCategories();
        renderPresets();
      },
      style: {
        padding: "8px 12px",
        borderRadius: "999px",
        border: active ? "1px solid rgba(124,92,255,0.45)" : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(124,92,255,0.16)" : "rgba(255,255,255,0.04)",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: "11px",
        fontWeight: "600",
      },
    }, label);
  }

  function renderPresets() {
    const visible = activeCategory === "all"
      ? presets
      : presets.filter((preset) => preset.category === activeCategory);

    presetsHost.replaceChildren(
      ...visible.map((preset) => presetCard(preset)),
    );

    if (!visible.length) {
      presetsHost.replaceChildren(
        el("div.library-empty", { style: { gridColumn: "1 / -1" } }, "No transition presets found."),
      );
    }
  }

  function presetCard(preset: TransitionPresetItem): HTMLElement {
    const selected = selectedPresetId === preset.id;
    const mediaUrl = absoluteAssetUrl(preset.previewVideoUrl);
    const mediaKind = inferPreviewKind(mediaUrl);
    const mediaHost = el("div", {
      style: {
        aspectRatio: "16/9",
        position: "relative",
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
      },
    });
    const creditBadge = el("div", {
      style: {
        position: "absolute",
        bottom: "8px",
        right: "8px",
        padding: "4px 8px",
        borderRadius: "999px",
        background: "rgba(0,0,0,0.66)",
        color: "#d8b4fe",
        fontSize: "10px",
        fontWeight: "700",
      },
    }, `${estimateCredits(preset)} cr`);

    const setPreview = (node: HTMLElement) => {
      mediaHost.replaceChildren(node, creditBadge);
    };

    const showFallback = () => {
      setPreview(
        el("div", {
          style: {
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(124,92,255,0.22), rgba(20,20,48,0.92))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: "11px",
            fontWeight: "600",
          },
        }, "Preview"),
      );
    };

    const showImage = () => {
      if (!mediaUrl) {
        showFallback();
        return;
      }
      setPreview(el("img", {
        src: mediaUrl,
        alt: preset.name,
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
        onError: () => showFallback(),
      }));
    };

    const showVideo = () => {
      if (!mediaUrl) {
        showFallback();
        return;
      }
      setPreview(el("video", {
        src: mediaUrl,
        muted: "true",
        loop: "true",
        autoplay: "true",
        playsinline: "true",
        preload: "metadata",
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
        onCanPlay: (ev: Event) => {
          const node = ev.target as HTMLVideoElement;
          void node.play().catch(() => {});
        },
        onError: () => {
          if (mediaKind === "image") {
            showFallback();
            return;
          }
          showImage();
        },
      }));
    };

    if (!mediaUrl) showFallback();
    else if (mediaKind === "image") showImage();
    else showVideo();

    return el("button", {
      onClick: () => {
        selectedPresetId = preset.id;
        renderPresets();
        updateCreditHint();
        updateGenerateState();
        queueProjectAutosave();
      },
      style: {
        borderRadius: "14px",
        overflow: "hidden",
        textAlign: "left",
        border: selected ? "1px solid rgba(124,92,255,0.52)" : "1px solid rgba(255,255,255,0.08)",
        background: selected ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.03)",
      },
    },
      mediaHost,
      el("div.col.gap-1", { style: { padding: "12px" } },
        el("div", { style: { fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" } }, preset.name),
        el("div", { style: { fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.45" } }, preset.description),
        el("div", { style: { fontSize: "10px", color: "var(--text-muted)" } }, preset.motionProfile),
      ),
    );
  }

  async function loadPresets() {
    try {
      const data = await api.transitionPresets();
      presets = Array.isArray(data.presets) ? data.presets : [];
      if (!selectedPresetId && presets[0]) {
        selectedPresetId = presets[0].id;
      }
    } catch (err) {
      toast(`Could not load transitions: ${(err as Error).message}`, "error");
      presets = [];
    }
    renderCategories();
    renderPresets();
    updateCreditHint();
    updateGenerateState();
  }

  async function generate() {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      toast("Select a transition preset first.", "error");
      return;
    }
    if (!hasInput(inputA) || !hasInput(inputB)) {
      toast("Add both Input A and Input B first.", "error");
      return;
    }

    try {
      busy = true;
      updateGenerateState();
      resultHost.replaceChildren(busyCard("Preparing transition project and generation inputs..."));

      const [inputAUrl, inputBUrl] = await Promise.all([
        ensurePreparedInput(inputA, "last"),
        ensurePreparedInput(inputB, "first"),
      ]);
      const projectId = await ensureProject();

      await saveProjectState({
        immediate: true,
        inputAUrl,
        inputBUrl,
      });

      resultHost.replaceChildren(busyCard("Submitting transition job..."));
      const submission = await api.generateTransitionProject({
        projectId,
        presetId: preset.id,
        modelId: modelSelect.value,
        inputAUrl,
        inputBUrl,
        aspectRatio: getAutomaticAspectRatio(),
        duration: Number(durationSelect.value),
        intensity: DEFAULT_INTENSITY,
        smoothness: DEFAULT_SMOOTHNESS,
        cinematicStr: DEFAULT_CINEMATIC,
        preserveFraming: true,
        subjectFocus: true,
        resolution: FIXED_TRANSITION_RESOLUTION,
        fps: FIXED_TRANSITION_FPS,
        enhance: true,
      });

      await monitorTransitionJob(submission.jobId, submission.status);
    } catch (err) {
      resultHost.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    } finally {
      busy = false;
      updateGenerateState();
    }
  }

  function updateCreditHint() {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      creditHint.textContent = "Select a preset to see estimated credits.";
      return;
    }
    creditHint.textContent = `Estimated credits: ${estimateCredits(preset)} for ${preset.name} using ${modelSelect.value}.`;
  }

  function updateGenerateState() {
    generateBtn.disabled = busy || !selectedPresetId || !hasInput(inputA) || !hasInput(inputB);
    generateBtn.style.opacity = generateBtn.disabled ? "0.6" : "1";
    generateBtn.style.pointerEvents = generateBtn.disabled ? "none" : "auto";
    generateBtn.classList.toggle("btn-primary--busy", busy);
    generateBtnLabel.textContent = busy ? "Generating…" : "Generate transition";
    busyHint.style.display = busy ? "inline-flex" : "none";
  }

  function applyTimelineSelection(clip: TimelineClip) {
    const key = clipSelectionKey(clip);
    if (!key) return;

    if (!hasInput(inputA) || inputA.selectionKey === key) {
      setTimelineInputState(inputA, clip);
      renderInputCard(inputAHost, "Start", "start", inputA);
      syncAutomaticSettings();
      updateGenerateState();
      updateCreditHint();
      queueProjectAutosave();
      return;
    }

    if (inputB.selectionKey === key) return;

    setTimelineInputState(inputB, clip);
    renderInputCard(inputBHost, "End", "end", inputB);
    syncAutomaticSettings();
    updateGenerateState();
    updateCreditHint();
    queueProjectAutosave();
  }

  async function handlePickedFile(
    file: File | null,
    state: InputState,
    previewHost: HTMLElement,
    helper: HTMLElement,
    slot: TransitionInputSlot,
  ) {
    try {
      if (file && file.type.startsWith("video/")) {
        await enforceVideoDurationLimit(file);
      }
      setInputState(state, file);
      updateInputPreview(previewHost, helper, state, slot);
      syncAutomaticSettings();
      updateGenerateState();
      updateCreditHint();
      queueProjectAutosave();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function handleTimelineClip(clip: TimelineClip) {
    try {
      if (detectTimelineKind(clip) === "video") {
        await enforceVideoDurationLimit(clip.path);
      }
      applyTimelineSelection(clip);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  function estimateCredits(preset: TransitionPresetItem): number {
    return Math.ceil(15 * Number(durationSelect.value) * preset.costMultiplier);
  }

  async function initialize() {
    await loadPresets();
    await restoreProject();
  }

  async function restoreProject() {
    const storedProjectId = readStoredProjectId();
    if (!storedProjectId) return;
    try {
      const { project } = await api.transitionProject(storedProjectId);
      applyProject(project);
      if (project.jobs?.[0] && !project.outputs?.length && isTransitionJobActive(project.jobs[0].status)) {
        await monitorTransitionJob(project.jobs[0].id, project.jobs[0].status);
      } else if (project.outputs?.[0]) {
        resultHost.replaceChildren(resultCard(project.outputs[0]));
      }
    } catch {
      clearStoredProjectId();
    }
  }

  function applyProject(project: TransitionProject) {
    currentProjectId = project.id;
    rememberProjectId(project.id);
    selectedPresetId = project.presetId ?? selectedPresetId;
    aspectSelect.value = project.aspectRatio || "16:9";
    durationSelect.value = DURATIONS.includes(String(project.duration || 5)) ? String(project.duration || 5) : "5";
    resolutionSelect.value = FIXED_TRANSITION_RESOLUTION;
    fpsSelect.value = String(FIXED_TRANSITION_FPS);
    intensityInput.value = String(DEFAULT_INTENSITY);
    smoothnessInput.value = String(DEFAULT_SMOOTHNESS);
    cinematicInput.value = String(DEFAULT_CINEMATIC);
    preserveToggle.checked = true;
    subjectToggle.checked = true;
    enhanceToggle.checked = true;

    if (project.inputAUrl) {
      setRemoteInputState(inputA, project.inputAUrl, project.inputAType);
    }
    if (project.inputBUrl) {
      setRemoteInputState(inputB, project.inputBUrl, project.inputBType);
    }

    renderInputCard(inputAHost, "Start", "start", inputA);
    renderInputCard(inputBHost, "End", "end", inputB);
    renderCategories();
    renderPresets();
    syncAutomaticSettings();
    updateCreditHint();
    updateGenerateState();
  }

  function syncAutomaticSettings() {
    resolutionSelect.value = FIXED_TRANSITION_RESOLUTION;
    fpsSelect.value = String(FIXED_TRANSITION_FPS);
    intensityInput.value = String(DEFAULT_INTENSITY);
    smoothnessInput.value = String(DEFAULT_SMOOTHNESS);
    cinematicInput.value = String(DEFAULT_CINEMATIC);
    preserveToggle.checked = true;
    subjectToggle.checked = true;
    enhanceToggle.checked = true;
    aspectSelect.value = getAutomaticAspectRatio();
  }

  function syncModelSettings() {
    if (modelSelect.value === "hailuo/2-3-image-to-video-standard" && durationSelect.value === "5") {
      durationSelect.value = "6";
    }
    if (modelSelect.value === "kling-2.6/image-to-video" && durationSelect.value === "6") {
      durationSelect.value = "5";
    }
    updateGenerateState();
  }

  function getAutomaticAspectRatio(): string {
    const source = pickAspectSource(inputA, inputB);
    if (!source || !source.previewWidth || !source.previewHeight) {
      return aspectSelect.value || "16:9";
    }
    return classifyAspectRatio(source.previewWidth, source.previewHeight);
  }

  function queueProjectAutosave() {
    if (autosaveHandle != null) {
      window.clearTimeout(autosaveHandle);
    }
    autosaveHandle = window.setTimeout(() => {
      autosaveHandle = null;
      void saveProjectState({ immediate: true }).catch(() => {});
    }, AUTOSAVE_DELAY_MS);
  }

  async function ensureProject() {
    if (currentProjectId) return currentProjectId;
    const { project } = await api.createTransitionProject(buildProjectPayload());
    currentProjectId = project.id;
    rememberProjectId(project.id);
    return project.id;
  }

  function buildProjectPayload(overrides: Record<string, unknown> = {}) {
    return {
      title: "Transitions Project",
      inputAUrl: inputA.remoteUrl ?? inputA.preparedUrl ?? null,
      inputAType: inputA.kind ?? "image",
      inputBUrl: inputB.remoteUrl ?? inputB.preparedUrl ?? null,
      inputBType: inputB.kind ?? "image",
      presetId: selectedPresetId || null,
      aspectRatio: getAutomaticAspectRatio(),
      duration: Number(durationSelect.value),
      intensity: DEFAULT_INTENSITY,
      smoothness: DEFAULT_SMOOTHNESS,
      cinematicStr: DEFAULT_CINEMATIC,
      preserveFraming: true,
      subjectFocus: true,
      resolution: FIXED_TRANSITION_RESOLUTION,
      fps: FIXED_TRANSITION_FPS,
      enhance: true,
      ...overrides,
    };
  }

  async function saveProjectState(opts: {
    immediate?: boolean;
    inputAUrl?: string;
    inputBUrl?: string;
  } = {}) {
    const body = buildProjectPayload({
      inputAUrl: opts.inputAUrl ?? inputA.remoteUrl ?? inputA.preparedUrl ?? null,
      inputAType: inputA.kind ?? "image",
      inputBUrl: opts.inputBUrl ?? inputB.remoteUrl ?? inputB.preparedUrl ?? null,
      inputBType: inputB.kind ?? "image",
    });
    if (!selectedPresetId && !hasInput(inputA) && !hasInput(inputB)) {
      return;
    }
    if (!currentProjectId) {
      const { project } = await api.createTransitionProject(body);
      currentProjectId = project.id;
      rememberProjectId(project.id);
      return;
    }
    await api.updateTransitionProject(currentProjectId, body);
  }

  async function monitorTransitionJob(jobId: string, initialStatus?: string) {
    const pollToken = ++activePollToken;
    resultHost.replaceChildren(
      busyCard(initialStatus === "queued" ? "Transition queued... waiting for provider." : "Generating transition..."),
    );

    const finalJob = await api.pollTransitionJob(jobId, {
      intervalMs: 3000,
      timeoutMs: 8 * 60 * 1000,
    });
    if (pollToken !== activePollToken) return;

    if (finalJob.status !== "completed") {
      throw new Error(finalJob.error ?? "Transition generation failed");
    }

    let output = finalJob.output ?? buildOutputFromJob(finalJob);
    if ((!output || !output.url) && currentProjectId) {
      const { project } = await api.transitionProject(currentProjectId);
      output = project.outputs?.[0] ?? output;
    }
    if (!output || !output.url) {
      throw new Error("Transition completed but no output URL was returned.");
    }
    resultHost.replaceChildren(resultCard(output));
  }

  function buildOutputFromJob(job: TransitionPanelJob): TransitionOutput | null {
    if (!job.resultUrl) return null;
    const preset = presets.find((item) => item.id === job.presetId);
    return {
      id: job.id,
      url: job.resultUrl,
      presetId: job.presetId,
      presetName: preset?.name ?? job.presetId,
      aspectRatio: getAutomaticAspectRatio(),
      duration: Number(durationSelect.value),
      inputAUrl: null,
      inputBUrl: null,
      createdAt: job.createdAt,
    };
  }

  function rememberProjectId(projectId: string) {
    try {
      localStorage.setItem(STORAGE_KEY, projectId);
    } catch {
      // Ignore storage failures in restricted CEP environments.
    }
  }

  function readStoredProjectId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function clearStoredProjectId() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures in restricted CEP environments.
    }
  }
}

function section(title: string, ...children: Array<HTMLElement | null>): HTMLElement {
  return el("section.section", null,
    el("div.section__head", null,
      el("h2.section__title", null, title),
    ),
    ...children,
  );
}

function settingsCard(title: string, ...children: Array<HTMLElement | Node | null>): HTMLElement {
  return el("div.state-card", { style: { padding: "14px" } },
    el("div.state-card__title", { style: { textAlign: "left", width: "100%", marginBottom: "10px" } }, title),
    el("div.col.gap-2", null, ...children),
  );
}

function labelRow(label: string, control: HTMLElement): HTMLElement {
  return el("label.row", { style: { justifyContent: "space-between", alignItems: "center", gap: "12px" } },
    el("span", { style: { fontSize: "11px", color: "var(--text-secondary)" } }, label),
    control,
  );
}

function selectField(options: string[], value: string): HTMLSelectElement {
  const node = el("select", {
    style: {
      minWidth: "110px",
      borderRadius: "10px",
      border: "1px solid var(--line-soft)",
      background: "var(--bg-card)",
      color: "var(--text-primary)",
      padding: "8px 10px",
      fontSize: "11px",
    },
  }) as HTMLSelectElement;
  node.append(...options.map((option) => el("option", { value: option }, option)));
  node.value = value;
  return node;
}

function sliderField(value: string): HTMLInputElement {
  return el("input", {
    type: "range",
    min: "0",
    max: "100",
    step: "1",
    value,
  }) as HTMLInputElement;
}

function toggleField(checked: boolean): HTMLInputElement {
  const node = el("input", { type: "checkbox" }) as HTMLInputElement;
  node.checked = checked;
  return node;
}

function setInputState(state: InputState, file: File | null) {
  if (state.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.file = file;
  state.localPath = null;
  state.remoteUrl = null;
  state.displayName = file?.name ?? null;
  state.selectionKey = null;
  state.kind = file ? detectKind(file) : null;
  state.previewUrl = file ? URL.createObjectURL(file) : null;
  state.previewWidth = null;
  state.previewHeight = null;
  state.cacheKey = null;
  state.preparedUrl = null;
}

function clearInputState(state: InputState) {
  setInputState(state, null);
}

function setTimelineInputState(state: InputState, clip: TimelineClip) {
  if (state.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.file = null;
  state.localPath = clip.path;
  state.remoteUrl = null;
  state.displayName = clip.name ?? clip.path.split(/[\\/]/).pop() ?? clip.path;
  state.selectionKey = clipSelectionKey(clip);
  state.kind = detectTimelineKind(clip);
  state.previewUrl = toFileUrl(clip.path);
  state.previewWidth = null;
  state.previewHeight = null;
  state.cacheKey = null;
  state.preparedUrl = null;
}

function hasInput(state: InputState): boolean {
  return Boolean(state.file || state.localPath || state.remoteUrl);
}

function updateInputPreview(host: HTMLElement, helper: HTMLElement, state: InputState, slot: TransitionInputSlot) {
  host.replaceChildren();
  const framePosition = slot === "start" ? "last" : "first";
  if (!hasInput(state) || !state.previewUrl || !state.kind) {
    helper.textContent = "No source selected";
    host.appendChild(
      el("div", {
        style: {
          aspectRatio: "16/9",
          borderRadius: "12px",
          border: "1px dashed rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "11px",
        },
      }, slot === "start" ? "Start source" : "End source"),
    );
    return;
  }

  const sourceName = state.displayName ?? state.file?.name ?? "Source";
  helper.textContent = `${sourceName} · ${state.kind}${state.kind === "video" ? ` · uses ${framePosition} frame` : ""}`;
  host.appendChild(
    state.kind === "video"
      ? el("video", {
          src: state.previewUrl,
          muted: "true",
          loop: "true",
          autoplay: "true",
          playsinline: "true",
          onVolumeChange: (ev: Event) => {
            const node = ev.target as HTMLVideoElement;
            node.muted = true;
            node.volume = 0;
          },
          onLoadedMetadata: (ev: Event) => {
            const node = ev.target as HTMLVideoElement;
            node.muted = true;
            node.volume = 0;
            state.previewWidth = node.videoWidth || null;
            state.previewHeight = node.videoHeight || null;
          },
          style: { width: "100%", borderRadius: "12px", display: "block" },
        })
      : el("img", {
          src: state.previewUrl,
          alt: sourceName,
          onLoad: (ev: Event) => {
            const node = ev.target as HTMLImageElement;
            state.previewWidth = node.naturalWidth || null;
            state.previewHeight = node.naturalHeight || null;
          },
          style: { width: "100%", borderRadius: "12px", display: "block", aspectRatio: "16/9", objectFit: "cover" },
        }),
  );
}

async function ensurePreparedInput(state: InputState, framePosition: FramePosition): Promise<string> {
  if (!hasInput(state) || !state.kind) {
    throw new Error("Missing transition input file.");
  }
  const baseKey = state.file
    ? `${state.file.name}:${state.file.size}:${state.file.lastModified}`
    : state.remoteUrl
      ? `${state.remoteUrl}:${state.kind ?? ""}`
      : `${state.localPath ?? ""}:${state.selectionKey ?? ""}`;
  const key = `${baseKey}:${framePosition}`;
  if (state.preparedUrl && state.cacheKey === key) {
    return state.preparedUrl;
  }

  if (state.kind === "image") {
    state.preparedUrl = state.file
      ? await api.uploadFileToStorage(state.file, "image")
      : state.remoteUrl
        ? state.remoteUrl
        : await api.uploadLocalPathToStorage(state.localPath!, "image");
    state.cacheKey = key;
    return state.preparedUrl;
  }

  const frameBlob = await extractVideoFrameBlob(
    state.file ? URL.createObjectURL(state.file) : state.remoteUrl ?? toFileUrl(state.localPath!),
    framePosition,
  );
  const frameFile = new File(
    [frameBlob],
    `${(state.displayName ?? "clip").replace(/\.[^.]+$/, "")}-${framePosition}.jpg`,
    { type: "image/jpeg" },
  );
  state.preparedUrl = await api.uploadFileToStorage(frameFile, "thumbnail");
  state.cacheKey = key;
  return state.preparedUrl;
}

function detectKind(file: File): InputKind {
  return file.type.startsWith("video/") ? "video" : "image";
}

function detectTimelineKind(clip: TimelineClip): InputKind {
  if (clip.type === "image") return "image";
  const lower = String(clip.path ?? "").toLowerCase();
  return /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|heic|heif)$/i.test(lower) ? "image" : "video";
}

function setRemoteInputState(state: InputState, url: string, type?: string | null) {
  if (state.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.file = null;
  state.localPath = null;
  state.remoteUrl = url;
  state.displayName = url.split("/").pop()?.split("?")[0] ?? "Source";
  state.selectionKey = null;
  state.kind = inferRemoteKind(url, type);
  state.previewUrl = url;
  state.previewWidth = null;
  state.previewHeight = null;
  state.cacheKey = null;
  state.preparedUrl = null;
}

function pickAspectSource(...states: InputState[]): InputState | null {
  return states.find((state) => Boolean(state.previewWidth && state.previewHeight)) ?? null;
}

function classifyAspectRatio(width: number, height: number): string {
  const targetRatio = width / Math.max(1, height);
  let bestAspect = ASPECTS[0];
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const aspect of ASPECTS) {
    const [w, h] = aspect.split(":").map(Number);
    const aspectRatio = w / Math.max(1, h);
    const delta = Math.abs(aspectRatio - targetRatio);
    if (delta < bestDelta) {
      bestAspect = aspect;
      bestDelta = delta;
    }
  }

  return bestAspect;
}

function inferRemoteKind(url: string, fallback?: string | null): InputKind {
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url.split("?")[0] ?? "")) return "image";
  if (/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(url.split("?")[0] ?? "")) return "video";
  return fallback === "video" ? "video" : "image";
}

function clipSelectionKey(clip: TimelineClip): string {
  return `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}`;
}

async function extractVideoFrameBlob(sourceUrl: string, framePosition: FramePosition): Promise<Blob> {
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = sourceUrl;
      video.onloadedmetadata = () => {
        video.currentTime = framePosition === "last" ? Math.max(0, video.duration - 0.1) : 0;
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not available."));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Could not capture a frame from the video."));
            return;
          }
          resolve(blob);
        }, "image/jpeg", 0.92);
      };
      video.onerror = () => reject(new Error("Video preview could not be loaded."));
    });
  } finally {
    if (sourceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(sourceUrl);
    }
  }
}

function toFileUrl(localPath: string): string {
  const normalized = localPath.replace(/\\/g, "/");
  return encodeURI(`file:///${normalized.replace(/^\/+/, "")}`);
}

function absoluteAssetUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return encodeURI(path);
  return encodeURI(`${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`);
}

function inferPreviewKind(url: string): "image" | "video" {
  const clean = url.split("#")[0]?.split("?")[0] ?? "";
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(clean)) return "image";
  return "video";
}

function generationBusyCard(message: string): HTMLElement {
  return el("div.state-card", { style: { marginTop: "14px" } },
    ProcessingLoader("Generating transition"),
    el("div.state-card__subtitle", { style: { marginTop: "8px" } }, message),
  );
}

function busyCard(message: string): HTMLElement {
  return generationBusyCard(message);
  return el("div.state-card", { style: { marginTop: "14px" } },
    el("div.state-card__icon", null, icon("spark", 20)),
    el("div.state-card__title", null, "Working…"),
    el("div.state-card__subtitle", null, message),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", { style: { marginTop: "14px" } },
    el("div.state-card__title", null, "Generation failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function isTransitionJobActive(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "queued" || normalized === "processing" || normalized === "running";
}

function resultCard(output: TransitionOutput): HTMLElement {
  return el("div.col.gap-3", { style: { marginTop: "14px" } },
    el("div", {
      style: {
        borderRadius: "14px",
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid var(--line-soft)",
      },
    },
      el("video", {
        src: output.url,
        controls: "true",
        autoplay: "true",
        loop: "true",
        muted: "true",
        playsinline: "true",
        style: { width: "100%", display: "block" },
      }),
    ),
    el("div.row.gap-2", null,
      el("button.btn-primary", {
        onClick: async () => {
          try {
            const local = await api.downloadAsset(output.url, `${output.id}.mp4`);
            await evalES("importMediaFromPath", local);
            toast(getHostImportSuccessMessage(), "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
      }, icon("import", 14), getHostImportButtonLabel()),
      el("button.btn-secondary", {
        onClick: () => navigator.clipboard.writeText(output.url).then(() => toast("Link copied")),
      }, "Copy link"),
    ),
  );
}
