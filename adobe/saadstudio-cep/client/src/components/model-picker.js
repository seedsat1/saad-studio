/** Modal model / option picker used by the prompt dock. */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
export function openModelPicker(args) {
    return new Promise((resolve) => {
        const root = document.getElementById("modal-root");
        if (!root) {
            resolve(null);
            return;
        }
        const close = (value) => {
            root.replaceChildren();
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (e) => { if (e.key === "Escape")
            close(null); };
        document.addEventListener("keydown", onKey);
        const backdrop = el("div.modal-backdrop", { onClick: (e) => { if (e.target === backdrop)
                close(null); } }, el("div.modal", null, el("div.modal__head", null, el("div.modal__title", null, args.title), el("button.modal__close", { onClick: () => close(null) }, icon("close", 14))), el("div.modal__body", null, ...args.options.map((opt) => el("button.model-row", { onClick: () => close(opt.value) }, el("div.model-row__name", null, opt.label), args.metaFor?.(opt)
            ? el("div.model-row__meta", null, args.metaFor(opt))
            : null)))));
        root.appendChild(backdrop);
    });
}
