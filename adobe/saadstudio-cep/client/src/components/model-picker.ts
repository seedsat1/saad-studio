/** Anchored option picker used by prompt and form dropdown buttons. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import type { Option } from "./prompt-dock";

export interface ModelPickerArgs {
  title: string;
  options: Option[];
  anchor?: HTMLElement;
  /** Optional secondary label per option, for example "1080p - audio". */
  metaFor?: (opt: Option) => string | undefined;
}

export function openModelPicker(args: ModelPickerArgs): Promise<string | null> {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    if (!root) { resolve(null); return; }

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(null); };

    const close = (value: string | null) => {
      root.replaceChildren();
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
      resolve(value);
    };

    const panel = el("div.modal" + (args.anchor ? ".modal--popover" : ""),
      null,
      el("div.modal__head", null,
        el("div.modal__title", null, args.title),
        el("button.modal__close", { onClick: () => close(null) }, icon("close", 14)),
      ),
      el("div.modal__body", null,
        ...args.options.map((opt) =>
          el("button.model-row",
            { onClick: () => close(opt.value) },
            el("div.model-row__name", null, opt.label),
            args.metaFor?.(opt)
              ? el("div.model-row__meta", null, args.metaFor(opt)!)
              : null,
          ),
        ),
      ),
    ) as HTMLElement;

    function positionPopover() {
      if (!args.anchor) return;
      const edge = 10;
      const gap = 8;
      const rect = args.anchor.getBoundingClientRect();
      const width = Math.min(320, Math.max(180, window.innerWidth - edge * 2));
      const left = Math.min(Math.max(edge, rect.left), window.innerWidth - width - edge);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, (openAbove ? spaceAbove : spaceBelow) - gap - edge);

      panel.style.width = `${width}px`;
      panel.style.left = `${left}px`;
      panel.style.right = "auto";
      panel.style.maxHeight = `${maxHeight}px`;
      if (openAbove) {
        panel.style.top = "auto";
        panel.style.bottom = `${window.innerHeight - rect.top + gap}px`;
      } else {
        panel.style.top = `${rect.bottom + gap}px`;
        panel.style.bottom = "auto";
      }
    }

    const backdrop = el("div.modal-backdrop" + (args.anchor ? ".modal-backdrop--popover" : ""),
      { onClick: (e: Event) => { if (e.target === backdrop) close(null); } },
      panel,
    );
    root.appendChild(backdrop);
    document.addEventListener("keydown", onKey);
    if (args.anchor) {
      positionPopover();
      window.addEventListener("resize", positionPopover);
      window.addEventListener("scroll", positionPopover, true);
    }
  });
}
