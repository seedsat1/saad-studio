/** Bottom prompt dock used by every feature page.
 *
 * Renders a textarea + a row of pill selectors (model, aspect, resolution,
 * mode) + an attach button + a submit. The page passes in the option lists
 * and a submit handler â€” this component is purely presentation. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { openModelPicker } from "./model-picker";
import { t } from "../lib/i18n";

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

/** Boolean checkbox toggle. State is exposed in `options` as "on" / "off"
 *  so consumers can read it uniformly alongside pill values. */
export interface DockToggle {
  key: string;
  label: string;
  value: boolean;
  hidden?: (state: DockState) => boolean;
}

export interface DockConfig {
  placeholder?: string;
  showAttach?: boolean;
  allowEmptySubmit?: boolean;
  /** Hide the textarea entirely for tools that take no free-form prompt
   *  (Add Captions, Reframe, â€¦). The dock then shows only the option
   *  pills + submit and `state.prompt` is always "". */
  hidePrompt?: boolean;
  options: DockOption[];
  /** Optional inline checkboxes rendered after the pills. */
  toggles?: DockToggle[];
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
    options: {
      ...Object.fromEntries(cfg.options.map((o) => [o.key, o.value])),
      ...Object.fromEntries((cfg.toggles ?? []).map((t) => [t.key, t.value ? "on" : "off"])),
    },
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
        "aria-label": t("promptRemoveFile").replace("{name}", file.name),
        onClick: () => {
          setAttachments(state.attachments.filter((_, i) => i !== index));
        },
      }, icon("close", 12));
      const card = el("div.prompt-dock__attachment",
        { title: `${file.name} - ${formatFileSize(file.size)}` },
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
    placeholder: cfg.placeholder ?? t("promptDefaultPlaceholder"),
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
    { "aria-label": t("promptGenerate"), title: t("promptGenerate"), onClick: () => submit() },
    icon("send", 14),
  ) as HTMLButtonElement;
  const optionButtons: HTMLButtonElement[] = [];
  const optionEntries: Array<{ opt: DockOption; pill: HTMLButtonElement }> = [];
  const toggleEntries: Array<{ toggle: DockToggle; button: HTMLButtonElement }> = [];
  const statusText = el("span", null, t("promptGenerating"));
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

  const refreshToggles = () => {
    for (const entry of toggleEntries) {
      const isOn = state.options[entry.toggle.key] === "on";
      const hidden = Boolean(entry.toggle.hidden?.(state));
      entry.button.style.display = hidden ? "none" : "";
      entry.button.classList.toggle("dock-button--active", isOn);
      entry.button.setAttribute("aria-pressed", isOn ? "true" : "false");
      const box = el("span", {
        style: {
          display: "inline-flex",
          width: "14px",
          height: "14px",
          borderRadius: "3px",
          border: "1.5px solid currentColor",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "6px",
          background: isOn ? "currentColor" : "transparent",
          color: isOn ? "var(--accent-contrast, #fff)" : "currentColor",
        },
      }, isOn ? icon("check", 10) : null);
      entry.button.replaceChildren(box, document.createTextNode(entry.toggle.label));
    }
  };

  if (cfg.showAttach && fileInput) {
    const attachButton = el("button.dock-button.dock-button--icon",
        {
          "aria-label": t("promptAttachFile"),
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
      onClick: async (event: MouseEvent) => {
        const options = resolveOptions(opt);
        if (!options.length) return;
        const next = opt.onPick
          ? await opt.onPick()
          : await openModelPicker({ title: opt.label, options, anchor: event.currentTarget as HTMLElement });
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

  for (const toggle of cfg.toggles ?? []) {
    const button = el("button.dock-button", {
      "aria-pressed": "false",
      onClick: () => {
        const current = state.options[toggle.key] === "on";
        state.options[toggle.key] = current ? "off" : "on";
        refreshToggles();
      },
    }) as HTMLButtonElement;
    optionButtons.push(button);
    toggleEntries.push({ toggle, button });
    optionRow.appendChild(button);
  }

  optionRow.appendChild(submitBtn);
  refreshOptionPills();
  refreshToggles();

  const dropHint = el("div.prompt-dock__drop-hint", { "aria-hidden": "true" }, icon("plus", 14), t("promptDropFiles"));
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
  }, attachmentStrip,
     cfg.hidePrompt ? null : textarea,
     dropHint, statusLine, optionRow) as PromptDockHandle;
  if (cfg.hidePrompt) root.classList.add("prompt-dock--no-prompt");
  root.setBusy = (nextBusy: boolean, message?: string) => {
    busy = nextBusy;
    if (message) statusText.textContent = message;
    else statusText.textContent = t("promptGenerating");
    if (!cfg.hidePrompt) textarea.disabled = busy;
    if (fileInput) (fileInput as HTMLInputElement).disabled = busy;
    for (const button of optionButtons) button.disabled = busy;
    submitBtn.disabled = busy;
    submitBtn.classList.toggle("dock-submit--busy", busy);
    submitBtn.setAttribute("aria-label", busy ? t("promptGenerating") : t("promptGenerate"));
    submitBtn.setAttribute("title", busy ? t("promptGenerating") : t("promptGenerate"));
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

