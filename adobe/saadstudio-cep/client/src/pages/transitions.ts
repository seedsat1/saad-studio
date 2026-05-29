import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { el } from "../lib/dom";
import { api, getApiBase, type GenerationItem, type JobStatus, type TransitionPresetItem } from "../lib/api";
import { icon } from "../lib/icons";
import { evalES } from "../lib/cep";
import { store } from "../lib/store";
import { toast } from "../lib/toast";

type InputKind = "image" | "video";

type InputState = {
  file: File | null;
  kind: InputKind | null;
  previewUrl: string | null;
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
const DURATIONS = ["3", "4", "5", "6", "7", "8", "10"];
const RESOLUTIONS = ["720p", "1080p", "1440p", "4K"];
const FPS_OPTIONS = ["24", "30", "60"];

export function TransitionsPage(): HTMLElement {
  const inputA: InputState = { file: null, kind: null, previewUrl: null, cacheKey: null, preparedUrl: null };
  const inputB: InputState = { file: null, kind: null, previewUrl: null, cacheKey: null, preparedUrl: null };

  let busy = false;
  let presets: TransitionPresetItem[] = [];
  let activeCategory = "all";
  let selectedPresetId = "";
  let currentJob: JobStatus | null = null;

  const aspectSelect = selectField(ASPECTS, "16:9");
  const durationSelect = selectField(DURATIONS, "5");
  const resolutionSelect = selectField(RESOLUTIONS, "1080p");
  const fpsSelect = selectField(FPS_OPTIONS, "24");

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
  const recentHost = el("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "12px",
    },
  });
  const resultHost = el("div");
  const creditHint = el("div.mono.muted", { style: { fontSize: "11px" } }, "Select a preset to see estimated credits.");

  const generateBtn = el("button.btn-primary", {
    onClick: () => { void generate(); },
  }, icon("spark", 14), "Generate transition") as HTMLButtonElement;

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
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            },
          },
            settingsCard("Format",
              labelRow("Aspect ratio", aspectSelect),
              labelRow("Duration", durationSelect),
              labelRow("Resolution", resolutionSelect),
              labelRow("FPS", fpsSelect),
            ),
            settingsCard("Motion Controls",
              sliderRow("Intensity", intensityInput),
              sliderRow("Smoothness", smoothnessInput),
              sliderRow("Cinematic", cinematicInput),
              toggleRow("Preserve framing", preserveToggle),
              toggleRow("Subject focus", subjectToggle),
              toggleRow("Enhancement", enhanceToggle),
            ),
          ),
        ),
      ),
      section("Presets",
        el("div.col.gap-3", null, categoryHost, presetsHost),
      ),
      section("Generate",
        el("div.state-card", { style: { padding: "14px" } },
          el("div.row", { style: { justifyContent: "space-between", alignItems: "center", gap: "12px" } },
            el("div.col.gap-1", null,
              el("div.state-card__title", { style: { textAlign: "left", width: "100%" } }, "Transition output"),
              el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%" } }, "Choose one preset, prepare inputs A and B, then generate inside the panel."),
              creditHint,
            ),
            generateBtn,
          ),
          resultHost,
        ),
      ),
      section("Recent Transitions", recentHost),
    ),
  );

  renderInputCard(inputAHost, "Input A", "first", inputA);
  renderInputCard(inputBHost, "Input B", "last", inputB);
  renderCategories();
  renderPresets();
  renderRecent();
  updateCreditHint();
  updateGenerateState();

  void loadPresets();
  void store.refreshRecent();
  store.subscribe(() => renderRecent());

  return root;

  function renderInputCard(host: HTMLElement, title: string, framePosition: "first" | "last", state: InputState) {
    const previewHost = el("div");
    const helper = el("div.mono.muted", { style: { fontSize: "11px", wordBreak: "break-all" } }, "No file selected");
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*,video/*";
    picker.style.display = "none";
    picker.addEventListener("change", () => {
      const file = picker.files?.[0] ?? null;
      setInputState(state, file);
      updateInputPreview(previewHost, helper, state, framePosition);
      updateGenerateState();
      updateCreditHint();
      picker.value = "";
    });

    host.replaceChildren(
      settingsCard(title,
        el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%", marginBottom: "10px" } },
          framePosition === "first"
            ? "Uses the first frame for video sources."
            : "Uses the last frame for video sources.",
        ),
        previewHost,
        helper,
        el("div.row.gap-2", null,
          el("button.btn-secondary", { onClick: () => picker.click() }, icon("plus", 14), "Choose file"),
          state.file
            ? el("button.btn-secondary", {
                onClick: () => {
                  setInputState(state, null);
                  updateInputPreview(previewHost, helper, state, framePosition);
                  updateGenerateState();
                  updateCreditHint();
                },
              }, "Clear")
            : null,
        ),
        picker,
      ),
    );
    updateInputPreview(previewHost, helper, state, framePosition);
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
    const isVideo = /\.(mp4|webm|ogg)$/i.test(mediaUrl);
    return el("button", {
      onClick: () => {
        selectedPresetId = preset.id;
        renderPresets();
        updateCreditHint();
        updateGenerateState();
      },
      style: {
        borderRadius: "14px",
        overflow: "hidden",
        textAlign: "left",
        border: selected ? "1px solid rgba(124,92,255,0.52)" : "1px solid rgba(255,255,255,0.08)",
        background: selected ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.03)",
      },
    },
      el("div", {
        style: {
          aspectRatio: "16/9",
          position: "relative",
          overflow: "hidden",
          background: "rgba(255,255,255,0.03)",
        },
      },
        isVideo
          ? el("video", {
              src: mediaUrl,
              muted: "true",
              loop: "true",
              autoplay: "true",
              playsinline: "true",
              preload: "metadata",
              style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
            })
          : el("img", {
              src: mediaUrl,
              alt: preset.name,
              style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
            }),
        el("div", {
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
        }, `${estimateCredits(preset)} cr`),
      ),
      el("div.col.gap-1", { style: { padding: "12px" } },
        el("div", { style: { fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" } }, preset.name),
        el("div", { style: { fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.45" } }, preset.description),
        el("div", { style: { fontSize: "10px", color: "var(--text-muted)" } }, preset.motionProfile),
      ),
    );
  }

  function renderRecent() {
    const items = store.get().recent.filter(
      (item) => item.kind === "video" && String(item.model ?? "").startsWith("transition/"),
    );

    recentHost.replaceChildren(
      ...items.map((item) => recentCard(item)),
    );

    if (!items.length) {
      recentHost.replaceChildren(
        el("div.library-empty", { style: { gridColumn: "1 / -1" } }, "No transition outputs yet."),
      );
    }
  }

  function recentCard(item: GenerationItem): HTMLElement {
    return el("div.library-card",
      null,
      el("div.library-card__media", null,
        el("video", {
          src: item.url,
          muted: "true",
          loop: "true",
          playsinline: "true",
          preload: "metadata",
          style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
        }),
      ),
      el("div.library-card__body", null,
        el("div.library-card__title", null, item.prompt ?? "Transition"),
        el("div.library-card__meta", null, item.model ?? "transition"),
        el("div.row.gap-2", { style: { marginTop: "8px" } },
          el("button.btn-secondary", {
            onClick: async () => {
              try {
                const local = await api.downloadAsset(item.url, `${item.id}.mp4`);
                await evalES("importMediaFromPath", local);
                toast("Imported to project bin", "success");
              } catch (err) {
                toast(`Import failed: ${(err as Error).message}`, "error");
              }
            },
          }, icon("import", 12), "Import"),
          el("button.btn-secondary", {
            onClick: () => navigator.clipboard.writeText(item.url).then(() => toast("Link copied")),
          }, "Copy link"),
        ),
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
    if (!inputA.file || !inputB.file) {
      toast("Add both Input A and Input B first.", "error");
      return;
    }

    try {
      busy = true;
      updateGenerateState();
      resultHost.replaceChildren(busyCard("Preparing transition inputs and generating…"));

      const [inputAUrl, inputBUrl] = await Promise.all([
        ensurePreparedInput(inputA, "first"),
        ensurePreparedInput(inputB, "last"),
      ]);

      currentJob = await api.generate.transition({
        presetId: preset.id,
        inputAUrl,
        inputBUrl,
        aspectRatio: aspectSelect.value,
        duration: Number(durationSelect.value),
        intensity: Number(intensityInput.value),
        smoothness: Number(smoothnessInput.value),
        cinematicStr: Number(cinematicInput.value),
        preserveFraming: preserveToggle.checked,
        subjectFocus: subjectToggle.checked,
        resolution: resolutionSelect.value,
        fps: Number(fpsSelect.value),
        enhance: enhanceToggle.checked,
      });

      if (currentJob.status !== "succeeded" || !currentJob.result) {
        throw new Error(currentJob.error ?? "Transition generation failed");
      }

      resultHost.replaceChildren(resultCard(currentJob));
      store.refreshCreditsOnly();
      store.refreshRecent();
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
    creditHint.textContent = `Estimated credits: ${estimateCredits(preset)} for ${preset.name}.`;
  }

  function updateGenerateState() {
    generateBtn.disabled = busy || !selectedPresetId || !inputA.file || !inputB.file;
    generateBtn.style.opacity = generateBtn.disabled ? "0.6" : "1";
    generateBtn.style.pointerEvents = generateBtn.disabled ? "none" : "auto";
  }

  function estimateCredits(preset: TransitionPresetItem): number {
    const baseRate = resolutionSelect.value === "720p" ? 15 : 22;
    return Math.ceil(baseRate * Number(durationSelect.value) * preset.costMultiplier);
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

function sliderRow(label: string, input: HTMLInputElement): HTMLElement {
  const value = el("span.mono.muted", { style: { fontSize: "11px" } }, input.value);
  input.addEventListener("input", () => { value.textContent = input.value; });
  return el("div.col.gap-1", null,
    el("div.row", { style: { justifyContent: "space-between", alignItems: "center" } },
      el("span", { style: { fontSize: "11px", color: "var(--text-secondary)" } }, label),
      value,
    ),
    input,
  );
}

function toggleRow(label: string, input: HTMLInputElement): HTMLElement {
  return el("label.row", { style: { justifyContent: "space-between", alignItems: "center", gap: "12px" } },
    el("span", { style: { fontSize: "11px", color: "var(--text-secondary)" } }, label),
    input,
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
  state.kind = file ? detectKind(file) : null;
  state.previewUrl = file ? URL.createObjectURL(file) : null;
  state.cacheKey = null;
  state.preparedUrl = null;
}

function updateInputPreview(host: HTMLElement, helper: HTMLElement, state: InputState, framePosition: "first" | "last") {
  host.replaceChildren();
  if (!state.file || !state.previewUrl || !state.kind) {
    helper.textContent = "No file selected";
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
      }, framePosition === "first" ? "First source" : "Second source"),
    );
    return;
  }

  helper.textContent = `${state.file.name} · ${state.kind}${state.kind === "video" ? ` · ${framePosition} frame` : ""}`;
  host.appendChild(
    state.kind === "video"
      ? el("video", {
          src: state.previewUrl,
          muted: "true",
          loop: "true",
          autoplay: "true",
          playsinline: "true",
          controls: "true",
          style: { width: "100%", borderRadius: "12px", display: "block" },
        })
      : el("img", {
          src: state.previewUrl,
          alt: state.file.name,
          style: { width: "100%", borderRadius: "12px", display: "block", aspectRatio: "16/9", objectFit: "cover" },
        }),
  );
}

async function ensurePreparedInput(state: InputState, framePosition: "first" | "last"): Promise<string> {
  if (!state.file || !state.kind) {
    throw new Error("Missing transition input file.");
  }
  const key = `${state.file.name}:${state.file.size}:${state.file.lastModified}:${framePosition}`;
  if (state.preparedUrl && state.cacheKey === key) {
    return state.preparedUrl;
  }

  if (state.kind === "image") {
    state.preparedUrl = await api.uploadFileToR2(state.file, "image");
    state.cacheKey = key;
    return state.preparedUrl;
  }

  const frameBlob = await extractVideoFrameBlob(state.file, framePosition);
  const frameFile = new File(
    [frameBlob],
    `${state.file.name.replace(/\.[^.]+$/, "")}-${framePosition}.jpg`,
    { type: "image/jpeg" },
  );
  state.preparedUrl = await api.uploadFileToR2(frameFile, "thumbnail");
  state.cacheKey = key;
  return state.preparedUrl;
}

function detectKind(file: File): InputKind {
  return file.type.startsWith("video/") ? "video" : "image";
}

async function extractVideoFrameBlob(file: File, framePosition: "first" | "last"): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = objectUrl;
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
    URL.revokeObjectURL(objectUrl);
  }
}

function absoluteAssetUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

function busyCard(message: string): HTMLElement {
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

function resultCard(job: JobStatus): HTMLElement {
  const result = job.result!;
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
        src: result.url,
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
            const local = await api.downloadAsset(result.url, `${result.id}.mp4`);
            await evalES("importMediaFromPath", local);
            toast("Imported to project bin", "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
      }, icon("import", 14), "Import to project"),
      el("button.btn-secondary", {
        onClick: () => navigator.clipboard.writeText(result.url).then(() => toast("Link copied")),
      }, "Copy link"),
    ),
  );
}
