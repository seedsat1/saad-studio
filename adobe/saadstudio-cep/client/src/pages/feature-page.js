/** Generic feature-page shell used by every tool route.
 *
 * Renders the header + result area + a configured PromptDock at the bottom.
 * Each concrete tool (image-gen, video-gen, reframe, …) just wires options
 * and an onSubmit that calls the matching api method, then drops the
 * returned asset into the result strip. */
import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { PromptDock } from "../components/prompt-dock";
import { icon } from "../lib/icons";
import { evalES } from "../lib/cep";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
export function FeaturePage(cfg) {
    const results = el("div.col.gap-3", { style: { padding: "0 16px" } });
    const empty = el("div.state-card", { style: { marginTop: "8px" } }, el("div.state-card__icon", null, icon("spark", 22)), el("div.state-card__title", null, "Nothing here yet"), el("div.state-card__subtitle", null, "Type a prompt below and tap the send button to start a generation."));
    results.appendChild(empty);
    const setBusy = (busy) => {
        if (busy) {
            results.replaceChildren(busyCard());
        }
    };
    const dock = PromptDock({
        ...cfg.dock,
        onSubmit: async (input) => {
            try {
                setBusy(true);
                const job = await cfg.submit(input);
                let final = job;
                if (job.status !== "succeeded" && job.status !== "failed") {
                    final = await api.pollJob(job.id);
                }
                if (final.status === "failed" || !final.result) {
                    throw new Error(final.error ?? "Generation failed");
                }
                results.replaceChildren(resultCard(final, results));
                store.refreshCreditsOnly();
                store.refreshRecent();
            }
            catch (err) {
                results.replaceChildren(errorCard(err.message));
                toast(err.message, "error");
            }
        },
    });
    return el("div.col", { style: { height: "100%" } }, Header(), PageHeader(cfg.title), el("div.app-main", null, results), dock);
}
function busyCard() {
    return el("div.state-card", null, el("div.state-card__icon", null, icon("spark", 22)), el("div.state-card__title", null, "Working…"), el("div.state-card__subtitle", null, "Your generation is in the queue. This usually takes 30–90 seconds."));
}
function errorCard(message) {
    return el("div.state-card", null, el("div.state-card__title", null, "Generation failed"), el("div.state-card__subtitle", null, message));
}
function resultCard(job, _host) {
    const r = job.result;
    const preview = r.kind === "video"
        ? el("video", { src: r.url, controls: "true", playsinline: "true",
            style: { width: "100%", borderRadius: "12px", display: "block" } })
        : el("img", { src: r.url, alt: r.prompt ?? "",
            style: { width: "100%", borderRadius: "12px", display: "block" } });
    return el("div.col.gap-3", null, el("div", {
        style: { borderRadius: "14px", overflow: "hidden", background: "var(--bg-card)",
            border: "1px solid var(--line-soft)" },
    }, preview), el("div.row.gap-2", null, el("button.btn-primary", {
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
    }, icon("import", 14), "Import to project"), el("button.btn-secondary", {
        onClick: () => navigator.clipboard.writeText(r.url).then(() => toast("Link copied")),
    }, "Copy link")), r.prompt
        ? el("div.dim", { style: { fontSize: "12px", padding: "4px 4px 8px" } }, r.prompt)
        : null);
}
