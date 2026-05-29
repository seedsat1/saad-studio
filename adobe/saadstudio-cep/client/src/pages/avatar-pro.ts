import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
import { api, type JobStatus } from "../lib/api";
import { toast } from "../lib/toast";
import { evalES } from "../lib/cep";
import { store } from "../lib/store";

type UploadState = {
  file: File | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
};

export function AvatarProPage(): HTMLElement {
  const imageState: UploadState = {
    file: null,
    previewUrl: null,
    uploadedUrl: null,
    uploadedKey: null,
  };
  const audioState: UploadState = {
    file: null,
    previewUrl: null,
    uploadedUrl: null,
    uploadedKey: null,
  };

  let busy = false;

  const promptInput = el("textarea", {
    rows: "4",
    placeholder: "Optional: describe expression, camera feel, or delivery style…",
    style: {
      width: "100%",
      minHeight: "104px",
      resize: "vertical",
      borderRadius: "12px",
      border: "1px solid var(--line-soft)",
      background: "var(--bg-card)",
      color: "var(--text)",
      padding: "12px 14px",
      fontSize: "13px",
      lineHeight: "1.5",
      outline: "none",
    },
  }) as HTMLTextAreaElement;

  const imagePreview = el("img", {
    alt: "Avatar preview",
    style: {
      width: "100%",
      maxHeight: "180px",
      objectFit: "cover",
      borderRadius: "12px",
      display: "none",
    },
  }) as HTMLImageElement;

  const audioPreview = el("audio", {
    controls: "true",
    style: {
      width: "100%",
      display: "none",
    },
  }) as HTMLAudioElement;

  const imageName = el("div.mono.muted", {
    style: { fontSize: "11px", wordBreak: "break-all" },
  }, "No image selected");

  const audioName = el("div.mono.muted", {
    style: { fontSize: "11px", wordBreak: "break-all" },
  }, "No audio selected");

  const generateBtn = el("button.btn-primary", {
    onClick: () => { void submit(); },
  }, icon("send", 14), "Generate avatar") as HTMLButtonElement;

  const resultHost = el("div.col.gap-3", { style: { padding: "0 16px 16px" } });

  const imageCard = createUploadCard({
    title: "Avatar image",
    subtitle: "Upload a portrait image for the talking avatar.",
    accept: "image/png,image/jpeg,image/webp",
    buttonLabel: "Choose image",
    onPick: (file) => {
      setFileState(imageState, file);
      syncFilePreview(imageState, imagePreview, imageName);
      updateGenerateState();
    },
    preview: imagePreview,
    meta: imageName,
  });

  const audioCard = createUploadCard({
    title: "Voice audio",
    subtitle: "Upload speech audio up to 5 minutes.",
    accept: "audio/mpeg,audio/wav,audio/x-wav,audio/aac,audio/mp4,audio/ogg",
    buttonLabel: "Choose audio",
    onPick: (file) => {
      setFileState(audioState, file);
      syncAudioPreview(audioState, audioPreview, audioName);
      updateGenerateState();
    },
    preview: audioPreview,
    meta: audioName,
  });

  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Kling AI Avatar Pro"),
    el("div.app-main",
      null,
      el("div.state-card", { style: { margin: "0 16px 16px" } },
        el("div.state-card__icon", null, icon("video", 22)),
        el("div.state-card__title", null, "Animate a portrait with voice"),
        el("div.state-card__subtitle", null,
          "Upload one avatar image and one audio file. The panel sends both files to Cloudflare R2 first, then runs Kling AI Avatar Pro through KIE.",
        ),
      ),
      el("div.col.gap-3", { style: { padding: "0 16px 16px" } },
        imageCard,
        audioCard,
        el("div.state-card", { style: { padding: "14px" } },
          el("div.state-card__title", { style: { textAlign: "left", width: "100%", marginBottom: "8px" } }, "Prompt"),
          el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%", marginBottom: "12px" } },
            "Optional guidance for expression, framing, or motion.",
          ),
          promptInput,
          el("div.row.gap-2", { style: { marginTop: "12px", justifyContent: "flex-end" } }, generateBtn),
        ),
      ),
      resultHost,
    ),
  );

  updateGenerateState();
  return root;

  function updateGenerateState() {
    generateBtn.disabled = busy || !imageState.file || !audioState.file;
    generateBtn.style.opacity = generateBtn.disabled ? "0.6" : "1";
    generateBtn.style.pointerEvents = generateBtn.disabled ? "none" : "auto";
  }

  async function submit() {
    if (busy) return;
    if (!imageState.file || !audioState.file) {
      toast("Select both an image and an audio file first.", "error");
      return;
    }

    try {
      busy = true;
      updateGenerateState();
      resultHost.replaceChildren(busyCard("Uploading assets and generating avatar…"));

      const [imageUrl, audioUrl] = await Promise.all([
        ensureUploaded(imageState, "image"),
        ensureUploaded(audioState, "audio"),
      ]);

      const job = await api.generate.avatarPro({
        imageUrl,
        audioUrl,
        prompt: promptInput.value.trim(),
      });

      if (job.status === "failed" || !job.result) {
        throw new Error(job.error ?? "Generation failed");
      }

      resultHost.replaceChildren(resultCard(job));
      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      const message = (err as Error).message;
      resultHost.replaceChildren(errorCard(message));
      toast(message, "error");
    } finally {
      busy = false;
      updateGenerateState();
    }
  }
}

function createUploadCard(input: {
  title: string;
  subtitle: string;
  accept: string;
  buttonLabel: string;
  onPick: (file: File | null) => void;
  preview: HTMLElement;
  meta: HTMLElement;
}): HTMLElement {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = input.accept;
  picker.style.display = "none";
  picker.addEventListener("change", () => {
    input.onPick(picker.files?.[0] ?? null);
    picker.value = "";
  });

  return el("div.state-card", { style: { padding: "14px" } },
    el("div.state-card__title", { style: { textAlign: "left", width: "100%" } }, input.title),
    el("div.state-card__subtitle", { style: { textAlign: "left", width: "100%", marginBottom: "12px" } }, input.subtitle),
    input.preview,
    input.meta,
    el("div.row.gap-2", { style: { marginTop: "12px", justifyContent: "flex-start" } },
      el("button.btn-secondary", { onClick: () => picker.click() }, icon("plus", 14), input.buttonLabel),
    ),
    picker,
  );
}

function setFileState(state: UploadState, file: File | null) {
  if (state.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state.file = file;
  state.previewUrl = file ? URL.createObjectURL(file) : null;
  state.uploadedUrl = null;
  state.uploadedKey = null;
}

function syncFilePreview(state: UploadState, preview: HTMLImageElement, meta: HTMLElement) {
  if (!state.file || !state.previewUrl) {
    preview.style.display = "none";
    preview.removeAttribute("src");
    meta.textContent = "No image selected";
    return;
  }
  preview.src = state.previewUrl;
  preview.style.display = "block";
  meta.textContent = state.file.name;
}

function syncAudioPreview(state: UploadState, preview: HTMLAudioElement, meta: HTMLElement) {
  if (!state.file || !state.previewUrl) {
    preview.style.display = "none";
    preview.removeAttribute("src");
    meta.textContent = "No audio selected";
    return;
  }
  preview.src = state.previewUrl;
  preview.style.display = "block";
  meta.textContent = state.file.name;
}

async function ensureUploaded(state: UploadState, assetType: "image" | "audio"): Promise<string> {
  if (!state.file) throw new Error(`Missing ${assetType} file.`);
  const key = `${state.file.name}:${state.file.size}:${state.file.lastModified}`;
  if (state.uploadedUrl && state.uploadedKey === key) {
    return state.uploadedUrl;
  }
  const uploadedUrl = await api.uploadFileToR2(state.file, assetType);
  state.uploadedUrl = uploadedUrl;
  state.uploadedKey = key;
  return uploadedUrl;
}

function busyCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__icon", null, icon("spark", 22)),
    el("div.state-card__title", null, "Working…"),
    el("div.state-card__subtitle", null, message),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Generation failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function resultCard(job: JobStatus): HTMLElement {
  const result = job.result!;
  return el("div.col.gap-3",
    null,
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
    result.prompt
      ? el("div.dim", { style: { fontSize: "12px", padding: "4px 4px 8px" } }, result.prompt)
      : null,
  );
}
