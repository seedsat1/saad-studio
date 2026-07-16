import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { ProcessingLoader } from "../components/processing-loader";
import { RecentStrip } from "../components/recent-strip";
import { icon } from "../lib/icons";
import { api, type JobStatus } from "../lib/api";
import { evalES, getHostImportButtonLabel, getHostImportSuccessMessage } from "../lib/cep";
import { toast } from "../lib/toast";
import { store } from "../lib/store";

const GENRES = ["Cinematic", "Lo-Fi", "EDM", "Pop", "Jazz", "Arabic", "Ambient", "Synthwave", "Gaming", "Trap", "Orchestral"];
const MOODS = ["Epic", "Emotional", "Uplifting", "Dark", "Dreamy", "Energetic", "Nostalgic", "Romantic", "Calm", "Suspenseful"];
const STYLE_CHIPS = ["Cinematic", "Lo-Fi", "EDM", "Pop", "Jazz", "Arabic", "Ambient", "Synthwave", "Gaming"];

type MusicModel = "google/lyria-3-clip/music" | "google/lyria-3-pro/music";

export function EditVideoPage(): HTMLElement {
  let busy = false;
  let tab: "prompt" | "lyrics" = "prompt";
  let model: MusicModel = "google/lyria-3-pro/music";
  let genre = "Cinematic";
  let mood = "Epic";
  let bpm = 120;
  let duration = 120;
  let instrumental = false;
  let references: File[] = [];

  const promptInput = el("textarea.musicgen-textarea", {
    maxlength: "500",
    placeholder: "Describe your music... e.g. An uplifting orchestral piece with soaring violins, building percussion and a triumphant brass finale",
    onInput: renderPromptCount,
  }) as HTMLTextAreaElement;
  const promptCount = el("div.musicgen-count", null, "0 / 500");

  const verseInput = lyricBox("Write your verse lyrics here...");
  const chorusInput = lyricBox("Write your chorus lyrics here - this is the hook...");
  const bridgeInput = lyricBox("Write your bridge lyrics here...");

  const refsHost = el("div.musicgen-refs");
  const resultHost = el("div.col.gap-3");
  const workspace = el("div.musicgen-workspace");
  const generateBtn = el("button.btn-primary.musicgen-generate", {
    onClick: () => { void submit(); },
  }, icon("spark", 16), "Generate Music") as HTMLButtonElement;

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Music Generation"),
    el("div.app-main", null,
      el("div.musicgen-shell",
        null,
        el("div.musicgen-main",
          null,
          el("section.musicgen-panel",
            null,
            renderTabs(),
            workspace,
          ),
          renderStyleChips(),
          renderReferenceBox(),
          renderSettings(),
          resultHost,
          el("section", { style: { marginTop: "18px" } },
            el("div.section__head", null,
              el("h3.section__title", null, "Audio gallery"),
              el("span.section__hint", null, "All synced audio from your Saad Studio account"),
            ),
            RecentStrip({ fixedFilter: "audio", showToolbar: false, showNewTile: false }),
          ),
        ),
      ),
    ),
  );

  renderWorkspace();
  renderPromptCount();
  renderRefs();
  updateControls();
  return root;

  function renderTabs(): HTMLElement {
    return el("div.musicgen-tabs", null,
      tabButton("prompt", "Prompt", "spark"),
      tabButton("lyrics", "Custom Lyrics", "transcript"),
    );
  }

  function tabButton(next: "prompt" | "lyrics", label: string, iconName: "spark" | "transcript"): HTMLElement {
    return el("button.musicgen-tab" + (tab === next ? " musicgen-tab--active" : ""), {
      onClick: () => {
        tab = next;
        const panel = workspace.parentElement;
        if (panel) panel.replaceChild(renderTabs(), panel.firstChild!);
        renderWorkspace();
      },
    }, icon(iconName, 14), label);
  }

  function renderWorkspace() {
    if (tab === "prompt") {
      workspace.replaceChildren(
        el("div.musicgen-prompt-wrap", null, promptInput, promptCount),
      );
      return;
    }
    workspace.replaceChildren(
      lyricField("VERSE", verseInput),
      lyricField("CHORUS", chorusInput),
      lyricField("BRIDGE", bridgeInput),
      el("div.row.gap-2", { style: { marginTop: "8px" } },
        el("button.btn-secondary", {
          onClick: () => navigator.clipboard.writeText(buildLyrics()).then(() => toast("Lyrics copied")),
        }, "Copy All Lyrics"),
        el("button.btn-secondary", {
          onClick: () => {
            verseInput.value = "";
            chorusInput.value = "";
            bridgeInput.value = "";
            renderWorkspace();
          },
        }, "Clear All"),
      ),
    );
  }

  function renderStyleChips(): HTMLElement {
    return el("section.musicgen-style", null,
      el("div.musicgen-label", null, "STYLE SUGGESTIONS"),
      el("div.musicgen-chip-row", null,
        ...STYLE_CHIPS.map((item) => el("button.musicgen-chip" + (genre === item ? " musicgen-chip--active" : ""), {
          onClick: () => {
            genre = item;
            rerender();
          },
        }, item)),
      ),
    );
  }

  function renderReferenceBox(): HTMLElement {
    const input = el("input", {
      type: "file",
      accept: "image/png,image/jpeg,image/webp",
      multiple: "true",
      style: { display: "none" },
      onChange: (event: Event) => {
        const files = Array.from((event.target as HTMLInputElement).files ?? []).filter((file) => file.type.startsWith("image/"));
        references = [...references, ...files].slice(0, 10);
        renderRefs();
      },
    }) as HTMLInputElement;
    return el("section.musicgen-reference",
      null,
      el("div.row.gap-2", { style: { justifyContent: "space-between" } },
        el("div", null,
          el("div.musicgen-label", null, "IMAGE REFERENCES"),
          el("div.dim", { style: { fontSize: "12px" } }, "Optional. Lyria can compose music inspired by up to 10 images."),
        ),
        el("button.btn-secondary", { onClick: () => input.click() }, icon("plus", 14), "Add images"),
      ),
      input,
      refsHost,
    );
  }

  function renderSettings(): HTMLElement {
    const modelCards = el("div.musicgen-models", null,
      modelCard("google/lyria-3-clip/music", "Fast", "Google - Fast Preview"),
      modelCard("google/lyria-3-pro/music", "Pro", "Google - Pro Preview"),
    );
    const genreSelect = selectControl(GENRES, genre, (value) => { genre = value; rerender(); });
    const moodSelect = selectControl(MOODS, mood, (value) => { mood = value; });
    const bpmValue = el("span.musicgen-setting-value", null, String(bpm));
    const durationValue = el("span.musicgen-setting-value", null, formatTime(duration));
    const bpmSlider = rangeControl(60, 200, bpm, (value) => {
      bpm = value;
      bpmValue.textContent = String(bpm);
    });
    const durationSlider = rangeControl(30, 180, duration, (value) => {
      duration = model === "google/lyria-3-clip/music" ? 30 : value;
      durationValue.textContent = formatTime(duration);
    });

    return el("aside.musicgen-settings",
      null,
      el("div.musicgen-settings__head", null, icon("settings", 16), "Settings"),
      el("div.musicgen-settings__body", null,
        fieldBlock("MODEL", modelCards),
        fieldBlock("GENRE", genreSelect),
        fieldBlock("MOOD", moodSelect),
        sliderBlock("BPM", bpmValue, bpmSlider),
        sliderBlock("DURATION", durationValue, durationSlider),
        el("label.musicgen-toggle", null,
          el("span", null, el("strong", null, "Instrumental Only"), el("small", null, "No vocals")),
          el("input", {
            type: "checkbox",
            checked: instrumental,
            onChange: (event: Event) => { instrumental = (event.target as HTMLInputElement).checked; },
          }),
        ),
        generateBtn,
      ),
    );
  }

  function modelCard(value: MusicModel, title: string, desc: string): HTMLElement {
    return el("button.musicgen-model" + (model === value ? " musicgen-model--active" : ""), {
      onClick: () => {
        model = value;
        if (model === "google/lyria-3-clip/music") duration = 30;
        rerender();
      },
    },
      el("strong", null, title),
      el("span", null, desc),
      model === value ? el("i") : null,
    );
  }

  async function submit() {
    if (busy) return;
    const prompt = promptInput.value.trim();
    const lyrics = buildLyrics();
    if (!prompt && !lyrics) {
      toast("Write a prompt or custom lyrics first.", "error");
      return;
    }
    try {
      busy = true;
      updateControls();
      resultHost.replaceChildren(el("div.state-card", null, ProcessingLoader("Generating music")));
      const images = await Promise.all(references.slice(0, 10).map(fileToImagePayload));
      const job = await api.generate.music({
        prompt,
        lyrics: lyrics || undefined,
        model,
        genre,
        mood,
        style: [genre, mood].filter(Boolean).join(", "),
        bpm,
        duration: model === "google/lyria-3-clip/music" ? 30 : duration,
        output_format: "mp3",
        force_instrumental: instrumental,
        images,
      });
      if (job.status === "failed" || !job.result) {
        throw new Error(job.error ?? "Music generation failed");
      }
      resultHost.replaceChildren(resultCard(job.result));
      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (error) {
      const message = (error as Error).message;
      resultHost.replaceChildren(errorCard(message));
      toast(message, "error");
    } finally {
      busy = false;
      updateControls();
    }
  }

  function buildLyrics(): string {
    return [
      verseInput.value.trim() ? `[Verse]\n${verseInput.value.trim()}` : "",
      chorusInput.value.trim() ? `[Chorus]\n${chorusInput.value.trim()}` : "",
      bridgeInput.value.trim() ? `[Bridge]\n${bridgeInput.value.trim()}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function rerender() {
    const shell = root.querySelector(".musicgen-shell");
    if (!shell?.parentElement) return;
    shell.parentElement.replaceChild(el("div.musicgen-shell", null,
      el("div.musicgen-main", null,
        el("section.musicgen-panel", null, renderTabs(), workspace),
        renderStyleChips(),
        renderReferenceBox(),
        renderSettings(),
        resultHost,
        el("section", { style: { marginTop: "18px" } },
          el("div.section__head", null,
            el("h3.section__title", null, "Audio gallery"),
            el("span.section__hint", null, "All synced audio from your Saad Studio account"),
          ),
          RecentStrip({ fixedFilter: "audio", showToolbar: false, showNewTile: false }),
        ),
      ),
    ), shell);
    renderWorkspace();
    renderPromptCount();
    renderRefs();
    updateControls();
  }

  function renderPromptCount() {
    promptCount.textContent = `${promptInput.value.length} / 500`;
  }

  function renderRefs() {
    refsHost.replaceChildren(
      references.length
        ? el("div.musicgen-ref-grid", null,
            ...references.map((file, index) => {
              const url = URL.createObjectURL(file);
              return el("div.musicgen-ref", null,
                el("img", { src: url, onLoad: () => URL.revokeObjectURL(url) }),
                el("button", { onClick: () => { references = references.filter((_, i) => i !== index); renderRefs(); } }, icon("close", 10)),
              );
            }),
          )
        : el("div.dim", { style: { fontSize: "12px", marginTop: "10px" } }, "No image references attached."),
    );
  }

  function updateControls() {
    generateBtn.disabled = busy;
    generateBtn.style.opacity = busy ? "0.65" : "1";
    generateBtn.replaceChildren(icon(busy ? "settings" : "spark", 16), document.createTextNode(busy ? "Generating..." : "Generate Music"));
  }
}

function lyricBox(placeholder: string): HTMLTextAreaElement {
  return el("textarea.musicgen-lyric-box", { placeholder }) as HTMLTextAreaElement;
}

function lyricField(label: string, textarea: HTMLTextAreaElement): HTMLElement {
  const count = el("span", null, `${textarea.value.length} chars`);
  textarea.oninput = () => { count.textContent = `${textarea.value.length} chars`; };
  return el("div.musicgen-lyric-field", null,
    el("div.row", { style: { justifyContent: "space-between" } }, el("label", null, label), count),
    textarea,
  );
}

function fieldBlock(label: string, child: HTMLElement): HTMLElement {
  return el("div.musicgen-field", null, el("label", null, label), child);
}

function sliderBlock(label: string, value: HTMLElement, slider: HTMLElement): HTMLElement {
  return el("div.musicgen-field", null,
    el("div.row", { style: { justifyContent: "space-between" } }, el("label", null, label), value),
    slider,
  );
}

function selectControl(values: string[], value: string, onChange: (value: string) => void): HTMLSelectElement {
  return el("select.musicgen-select", {
    onChange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
  }, ...values.map((item) => el("option", { value: item, selected: item === value }, item))) as HTMLSelectElement;
}

function rangeControl(min: number, max: number, value: number, onInput: (value: number) => void): HTMLInputElement {
  return el("input.musicgen-range", {
    type: "range",
    min: String(min),
    max: String(max),
    value: String(value),
    onInput: (event: Event) => onInput(Number((event.target as HTMLInputElement).value)),
  }) as HTMLInputElement;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

async function fileToImagePayload(file: File): Promise<{ data: string; mimeType: string }> {
  return { data: await fileToDataUrl(file), mimeType: file.type || "image/png" };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function resultCard(r: NonNullable<JobStatus["result"]>): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Music generated"),
    el("audio", { src: r.url, controls: "true", style: { width: "100%", marginTop: "12px" } }),
    el("div.row.gap-2", { style: { marginTop: "12px" } },
      el("button.btn-primary", {
        onClick: async () => {
          try {
            const local = await api.downloadAsset(r.url, `${r.id}.mp3`);
            await evalES("importMediaFromPath", local);
            toast(getHostImportSuccessMessage(), "success");
          } catch (error) {
            toast(`Import failed: ${(error as Error).message}`, "error");
          }
        },
      }, icon("import", 14), getHostImportButtonLabel()),
      el("button.btn-secondary", { onClick: () => navigator.clipboard.writeText(r.url).then(() => toast("Link copied")) }, "Copy link"),
    ),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Generation failed"),
    el("div.state-card__subtitle", null, message),
  );
}
