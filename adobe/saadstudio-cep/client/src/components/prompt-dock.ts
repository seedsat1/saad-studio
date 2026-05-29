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
  onPick?: () => Promise<string | null> | string | null;
}

export interface DockConfig {
  placeholder?: string;
  showAttach?: boolean;
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
  }) as HTMLTextAreaElement;

  const fileInput = cfg.showAttach
    ? el("input", {
        type: "file",
        multiple: "true",
        style: { display: "none" },
        onChange: (e: Event) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            state.attachments = Array.from(files);
            cfg.onAttach?.(files);
          }
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
  const statusText = el("span", null, "Generating…");
  const statusLine = el("div.prompt-dock__status", {
    style: { display: "none" },
  },
    el("span.busy-spinner", { "aria-hidden": "true" }),
    statusText,
  );

  function submit() {
    if (busy) return;
    if (!state.prompt.trim() && !state.attachments.length) return;
    cfg.onSubmit({ ...state, options: { ...state.options } });
  }

  const optionRow = el("div.row.gap-2", { style: { overflowX: "auto", paddingBottom: "2px" } });

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
        const next = opt.onPick
          ? await opt.onPick()
          : await openModelPicker({ title: opt.label, options: opt.options });
        if (next != null) {
          state.options[opt.key] = next;
          const found = opt.options.find((o) => o.value === next);
          pill.replaceChildren(document.createTextNode(found?.label ?? next), icon("chevron-down", 12));
        }
      },
    },
      labelFor(opt, state.options[opt.key]),
      icon("chevron-down", 12),
    ) as HTMLButtonElement;
    optionButtons.push(pill);
    optionRow.appendChild(pill);
  }

  optionRow.appendChild(submitBtn);

  const root = el("div.prompt-dock", null, textarea, statusLine, optionRow) as PromptDockHandle;
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
  };
  return root;
}

function labelFor(opt: DockOption, value: string): string {
  const found = opt.options.find((o) => o.value === value);
  return found?.label ?? value ?? opt.label;
}

function autoResize(ta: HTMLTextAreaElement) {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
}
