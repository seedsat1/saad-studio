/** Bottom prompt dock used by every feature page.
 *
 * Renders a textarea + a row of pill selectors (model, aspect, resolution,
 * mode) + an attach button + a submit. The page passes in the option lists
 * and a submit handler — this component is purely presentation. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { openModelPicker } from "./model-picker";

export interface Option { value: string; label: string; }
export interface DockOption {
  key: string;
  label: string;
  options: Option[];
  value: string;
  getOptions?: (state: DockState) => Option[];
  hidden?: (state: DockState) => boolean;
  onPick?: () => Promise<string | null> | string | null;
}

export interface DockConfig {
  placeholder?: string;
  showAttach?: boolean;
  allowEmptySubmit?: boolean;
  options: DockOption[];
  onAttach?: (files: FileList) => void;
  onSubmit: (state: DockState) => void;
}

export interface PromptDockHandle extends HTMLElement {
  setBusy: (busy: boolean, message?: string) => void;
}

export interface DockState {
  prompt: string;
  attachments: File[];
  options: Record<string, string>;
}

export function PromptDock(cfg: DockConfig): PromptDockHandle {
  const state: DockState = {
    prompt: "",
    attachments: [],
    options: Object.fromEntries(cfg.options.map((o) => [o.key, o.value])),
  };
  let busy = false;
  let dragDepth = 0;
  let attachmentPreviewUrls: string[] = [];

  const attachmentStrip = el("div.prompt-dock__attachments", {
    style: { display: "none" },
  });

  function revokeAttachmentPreviews() {
    for (const url of attachmentPreviewUrls) URL.revokeObjectURL(url);
    attachmentPreviewUrls = [];
  }

  function renderAttachments() {
    revokeAttachmentPreviews();
    attachmentStrip.replaceChildren();
    attachmentStrip.style.display = state.attachments.length ? "flex" : "none";
    for (const [index, file] of state.attachments.entries()) {
      const isPreviewable = file.type.startsWith("image/") || file.type.startsWith("video/");
      const previewUrl = isPreviewable ? URL.createObjectURL(file) : "";
      if (previewUrl) attachmentPreviewUrls.push(previewUrl);
      const thumb = previewUrl
        ? file.type.startsWith("image/")
          ? el("img.prompt-dock__attachment-thumb", { src: previewUrl, alt: file.name })
          : el("video.prompt-dock__attachment-thumb", { src: previewUrl, muted: "true", playsinline: "true", preload: "metadata" })
        : el("div.prompt-dock__attachment-icon", { "aria-hidden": "true" }, icon(iconForFile(file), 14));
      const removeBtn = el("button.prompt-dock__attachment-remove", {
        type: "button",
        "aria-label": `Remove ${file.name}`,
        onClick: () => {
          setAttachments(state.attachments.filter((_, i) => i !== index));
        },
      }, icon("close", 12));
      const card = el("div.prompt-dock__attachment",
        { title: `${file.name} • ${formatFileSize(file.size)}` },
        thumb,
        removeBtn,
      );
      attachmentStrip.appendChild(card);
    }
  }

  function filesToFileList(files: File[]): FileList {
    const dt = new DataTransfer();
    for (const file of files) dt.items.add(file);
    return dt.files;
  }

  function setAttachments(files: File[]) {
    state.attachments = files;
    if (fileInput) {
      try {
        (fileInput as HTMLInputElement).files = filesToFileList(files);
      } catch {
        // Some CEP hosts treat input.files as read-only. State remains source of truth.
      }
    }
    renderAttachments();
    if (cfg.onAttach) cfg.onAttach(filesToFileList(files));
  }

  function appendAttachments(files: FileList | File[]) {
    const next = [...state.attachments, ...Array.from(files)];
    setAttachments(next);
  }

  const textarea = el("textarea.prompt-dock__textarea", {
    rows: "2",
    placeholder: cfg.placeholder ?? "Describe what you want to make…",
    onInput: (e: Event) => {
      const ta = e.target as HTMLTextAreaElement;
      state.prompt = ta.value;
      autoResize(ta);
    },
    onKeydown: (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    },
    onDragenter: (e: DragEvent) => {
      if (!cfg.showAttach || busy) return;
      e.preventDefault();
      dragDepth += 1;
      root.classList.add("prompt-dock--dragover");
    },
    onDragover: (e: DragEvent) => {
      if (!cfg.showAttach || busy) return;
      e.preventDefault();
    },
    onDragleave: () => {
      if (!cfg.showAttach || busy) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) root.classList.remove("prompt-dock--dragover");
    },
    onDrop: (e: DragEvent) => {
      if (!cfg.showAttach || busy) return;
      e.preventDefault();
      dragDepth = 0;
      root.classList.remove("prompt-dock--dragover");
      const files = e.dataTransfer?.files;
      if (files?.length) appendAttachments(files);
    },
  }) as HTMLTextAreaElement;

  const fileInput = cfg.showAttach
    ? el("input", {
        type: "file",
        multiple: "true",
        style: { display: "none" },
        onChange: (e: Event) => {
          const files = (e.target as HTMLInputElement).files;
          if (files?.length) appendAttachments(files);
        },
      })
    : null;

  const submitBtn = el("button.dock-submit",
    { "aria-label": "Generate", onClick: () => submit() },
    icon("send", 14),
    el("span", null, "Generate"),
  ) as HTMLButtonElement;
  const submitLabel = submitBtn.querySelector("span") as HTMLSpanElement;
  const optionButtons: HTMLButtonElement[] = [];
  const optionEntries: Array<{ opt: DockOption; pill: HTMLButtonElement }> = [];
  const statusText = el("span", null, "Generating…");
  const statusLine = el("div.prompt-dock__status", {
    style: { display: "none" },
  },
    el("span.busy-spinner", { "aria-hidden": "true" }),
    statusText,
  );

  function submit() {
    if (busy) return;
    if (!cfg.allowEmptySubmit && !state.prompt.trim() && !state.attachments.length) return;
    cfg.onSubmit({ ...state, options: { ...state.options } });
  }

  const optionRow = el("div.row.gap-2", { style: { overflowX: "auto", paddingBottom: "2px" } });

  const resolveOptions = (opt: DockOption): Option[] => {
    const dynamic = opt.getOptions?.(state);
    return dynamic?.length ? dynamic : opt.options;
  };

  const refreshOptionPills = () => {
    for (const entry of optionEntries) {
      const options = resolveOptions(entry.opt);
      if (options.length && !options.some((item) => item.value === state.options[entry.opt.key])) {
        state.options[entry.opt.key] = options[0].value;
      }
      const hidden = Boolean(entry.opt.hidden?.(state)) || options.length <= 1;
      entry.pill.style.display = hidden ? "none" : "";
      entry.pill.replaceChildren(
        document.createTextNode(labelFor(entry.opt, state.options[entry.opt.key], options)),
        icon("chevron-down", 12),
      );
    }
  };

  if (cfg.showAttach && fileInput) {
    const attachButton = el("button.dock-button.dock-button--icon",
        {
          "aria-label": "Attach file",
          onClick: () => (fileInput as HTMLInputElement).click(),
        },
        icon("plus", 14),
      ) as HTMLButtonElement;
    optionButtons.push(attachButton);
    optionRow.appendChild(attachButton);
    optionRow.appendChild(fileInput);
  }

  for (const opt of cfg.options) {
    const pill = el("button.dock-button", {
      onClick: async () => {
        const options = resolveOptions(opt);
        if (!options.length) return;
        const next = opt.onPick
          ? await opt.onPick()
          : await openModelPicker({ title: opt.label, options });
        if (next != null) {
          state.options[opt.key] = next;
          refreshOptionPills();
        }
      },
    },
      labelFor(opt, state.options[opt.key], resolveOptions(opt)),
      icon("chevron-down", 12),
    ) as HTMLButtonElement;
    optionButtons.push(pill);
    optionEntries.push({ opt, pill });
    optionRow.appendChild(pill);
  }

  optionRow.appendChild(submitBtn);
  refreshOptionPills();

  const dropHint = el("div.prompt-dock__drop-hint", { "aria-hidden": "true" }, icon("plus", 14), "Drop files here");
  const root = el("div.prompt-dock", {
    onDragenter: (e: DragEvent) => {
      if (!cfg.showAttach || busy) return;
      e.preventDefault();
      dragDepth += 1;
      root.classList.add("prompt-dock--dragover");
    },
    onDragover: (e: DragEvent) => {
      if (!cfg.showAttach || busy) return;
      e.preventDefault();
    },
    onDragleave: () => {
      if (!cfg.showAttach || busy) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) root.classList.remove("prompt-dock--dragover");
    },
    onDrop: (e: DragEvent) => {
      if (!cfg.showAttach || busy) return;
      e.preventDefault();
      dragDepth = 0;
      root.classList.remove("prompt-dock--dragover");
      const files = e.dataTransfer?.files;
      if (files?.length) appendAttachments(files);
    },
  }, attachmentStrip, textarea, dropHint, statusLine, optionRow) as PromptDockHandle;
  root.setBusy = (nextBusy: boolean, message?: string) => {
    busy = nextBusy;
    if (message) statusText.textContent = message;
    else statusText.textContent = "Generating…";
    textarea.disabled = busy;
    if (fileInput) (fileInput as HTMLInputElement).disabled = busy;
    for (const button of optionButtons) button.disabled = busy;
    submitBtn.disabled = busy;
    submitBtn.classList.toggle("dock-submit--busy", busy);
    submitLabel.textContent = busy ? "Generating…" : "Generate";
    statusLine.style.display = busy ? "flex" : "none";
    if (busy) {
      dragDepth = 0;
      root.classList.remove("prompt-dock--dragover");
    }
  };
  return root;
}

function labelFor(opt: DockOption, value: string, options?: Option[]): string {
  const found = (options ?? opt.options).find((o) => o.value === value);
  return found?.label ?? value ?? opt.label;
}

function autoResize(ta: HTMLTextAreaElement) {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForFile(file: File) {
  if (file.type.startsWith("image/")) return "image" as const;
  if (file.type.startsWith("video/")) return "video" as const;
  return "settings" as const;
}
