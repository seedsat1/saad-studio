/** Bottom prompt dock used by every feature page.
 *
 * Renders a textarea + a row of pill selectors (model, aspect, resolution,
 * mode) + an attach button + a submit. The page passes in the option lists
 * and a submit handler — this component is purely presentation. */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { openModelPicker } from "./model-picker";
export function PromptDock(cfg) {
    const state = {
        prompt: "",
        attachments: [],
        options: Object.fromEntries(cfg.options.map((o) => [o.key, o.value])),
    };
    const textarea = el("textarea.prompt-dock__textarea", {
        rows: "2",
        placeholder: cfg.placeholder ?? "Describe what you want to make…",
        onInput: (e) => {
            const ta = e.target;
            state.prompt = ta.value;
            autoResize(ta);
        },
        onKeydown: (e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
            }
        },
    });
    const fileInput = cfg.showAttach
        ? el("input", {
            type: "file",
            multiple: "true",
            style: { display: "none" },
            onChange: (e) => {
                const files = e.target.files;
                if (files) {
                    state.attachments = Array.from(files);
                    cfg.onAttach?.(files);
                }
            },
        })
        : null;
    const submitBtn = el("button.dock-submit", { "aria-label": "Generate", onClick: () => submit() }, icon("send", 14));
    function submit() {
        if (!state.prompt.trim() && !state.attachments.length)
            return;
        cfg.onSubmit({ ...state, options: { ...state.options } });
    }
    const optionRow = el("div.row.gap-2", { style: { overflowX: "auto", paddingBottom: "2px" } });
    if (cfg.showAttach && fileInput) {
        optionRow.appendChild(el("button.dock-button.dock-button--icon", {
            "aria-label": "Attach file",
            onClick: () => fileInput.click(),
        }, icon("plus", 14)));
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
        }, labelFor(opt, state.options[opt.key]), icon("chevron-down", 12));
        optionRow.appendChild(pill);
    }
    optionRow.appendChild(submitBtn);
    return el("div.prompt-dock", null, textarea, optionRow);
}
function labelFor(opt, value) {
    const found = opt.options.find((o) => o.value === value);
    return found?.label ?? value ?? opt.label;
}
function autoResize(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
}
