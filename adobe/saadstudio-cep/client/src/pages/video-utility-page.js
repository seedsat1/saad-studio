/** Shared page shell for tools that take an existing video as input
 *  (edit, reframe, remove-bg, upscale, draw-to-video).
 *
 * Renders the "Choose one video" prompt with two paths:
 *   - "Use timeline video": reads the active selection from Premiere/AE
 *     via the ExtendScript bridge.
 *   - "Upload video": opens a local file picker.
 *
 * Once a clip is picked, an options dock is shown so the user can tune
 * model / quality / etc., then the submit handler is called with the
 * clip path + options. */
import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { PromptDock } from "../components/prompt-dock";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
export function VideoUtilityPage(cfg) {
    const body = el("div.app-main");
    function showPicker(noticeBelow) {
        body.replaceChildren(el("div.state-card", null, el("div.state-card__icon", null, icon("video", 22)), el("div.state-card__title", null, "Choose one video"), el("div.state-card__subtitle", null, cfg.hint ?? "Pick a clip from your Premiere timeline, or upload a file."), el("div.state-card__actions", null, el("button.btn-primary", { onClick: useTimelineClip }, icon("video", 14), "Use timeline video"), el("button.btn-secondary", { onClick: uploadFile }, icon("plus", 14), "Upload video")), noticeBelow
            ? el("div.dim", { style: { marginTop: "12px", fontSize: "11px" } }, noticeBelow)
            : null));
    }
    async function useTimelineClip() {
        if (!isInsideAdobe()) {
            showPicker("Timeline selection is only available inside Premiere/After Effects.");
            return;
        }
        try {
            const clip = await evalES("getSelectedClip");
            if (!clip || !clip.path) {
                showPicker("Nothing selected on the timeline.");
                return;
            }
            showOptions(clip);
        }
        catch (err) {
            showPicker(`Could not read selection: ${err.message}`);
        }
    }
    function uploadFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file)
                return;
            // In CEP we have a real file path via the .path property; in a plain
            // browser preview we fall back to a blob URL so the UI still flows.
            const path = file.path ?? URL.createObjectURL(file);
            showOptions({ path });
        });
        input.click();
    }
    function showOptions(clip) {
        const status = el("div.state-card", null, el("div.state-card__icon", null, icon("video", 22)), el("div.state-card__title", null, "Source selected"), el("div.state-card__subtitle.mono", { style: { fontSize: "11px" } }, clip.path), el("div.state-card__actions", null, el("button.btn-secondary", { onClick: () => showPicker() }, "Change clip")));
        const results = el("div.col.gap-3");
        body.replaceChildren(status, results);
        const dock = PromptDock({
            placeholder: cfg.showPrompt
                ? "Optional: describe what you want to change…"
                : undefined,
            options: cfg.options,
            onSubmit: async ({ prompt, options }) => {
                try {
                    results.replaceChildren(busyCard());
                    const job = await cfg.submit({ clip, prompt, options });
                    const final = job.status === "succeeded" || job.status === "failed"
                        ? job : await api.pollJob(job.id);
                    if (final.status === "failed" || !final.result) {
                        throw new Error(final.error ?? "Generation failed");
                    }
                    const r = final.result;
                    results.replaceChildren(el("div", {
                        style: { borderRadius: "14px", overflow: "hidden",
                            background: "var(--bg-card)",
                            border: "1px solid var(--line-soft)" },
                    }, r.kind === "video"
                        ? el("video", { src: r.url, controls: "true",
                            style: { width: "100%", display: "block" } })
                        : el("img", { src: r.url, style: { width: "100%", display: "block" } })), el("div.row.gap-2", { style: { marginTop: "12px" } }, el("button.btn-primary", {
                        onClick: async () => {
                            try {
                                const local = await api.downloadAsset(r.url, `${r.id}.${r.kind === "video" ? "mp4" : "png"}`);
                                await evalES("importMediaFromPath", local);
                                toast("Imported to project bin", "success");
                            }
                            catch (err) {
                                toast(`Import failed: ${err.message}`, "error");
                            }
                        },
                    }, icon("import", 14), "Import to project")));
                    store.refreshCreditsOnly();
                    store.refreshRecent();
                }
                catch (err) {
                    results.replaceChildren(errorCard(err.message));
                    toast(err.message, "error");
                }
            },
        });
        body.appendChild(dock);
    }
    showPicker();
    return el("div.col", { style: { height: "100%" } }, Header(), PageHeader(cfg.title), body);
}
function busyCard() {
    return el("div.state-card", null, el("div.state-card__icon", null, icon("spark", 22)), el("div.state-card__title", null, "Working…"), el("div.state-card__subtitle", null, "This usually takes under two minutes."));
}
function errorCard(message) {
    return el("div.state-card", null, el("div.state-card__title", null, "Failed"), el("div.state-card__subtitle", null, message));
}
