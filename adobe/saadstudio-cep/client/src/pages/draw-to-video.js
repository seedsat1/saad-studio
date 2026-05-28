/** Draw-to-video entry from the home panel.
 *
 * Captures the current playhead frame from Premiere/AE via the
 * ExtendScript bridge, then offers two paths:
 *   - "Open Draw to Edit" (the dedicated docked panel — best for serious
 *     sketching with a tablet)
 *   - "Draw inline" (lightweight canvas right here in the main panel —
 *     fine for quick scribbles)
 *
 * Either way the result is a flattened PNG of the sketch + the source
 * frame, which gets sent to /api/panel/generate/video with mode="draw". */
import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
export function DrawToVideoPage() {
    const body = el("div.app-main");
    showStart();
    return el("div.col", { style: { height: "100%" } }, Header(), PageHeader("Draw to video"), body);
    function showStart() {
        body.replaceChildren(el("div.state-card", null, el("div.state-card__icon", null, icon("draw-pen", 22)), el("div.state-card__title", null, "Sketch a clip"), el("div.state-card__subtitle", null, "Grab the current frame from your timeline, draw what you want to change, and generate a clip."), el("div.state-card__actions", null, el("button.btn-primary", { onClick: captureFrame }, icon("video", 14), "Capture current frame"))));
    }
    async function captureFrame() {
        if (!isInsideAdobe()) {
            body.replaceChildren(errorCard("Frame capture only works inside Premiere / After Effects."));
            return;
        }
        try {
            body.replaceChildren(busyCard("Capturing frame…"));
            const snap = await evalES("getActiveTimelineFrameSnapshot");
            if (!snap?.imagePath)
                throw new Error("No frame returned from host");
            showCanvas(snap);
        }
        catch (err) {
            body.replaceChildren(errorCard(err.message));
        }
    }
    function showCanvas(snap) {
        const canvas = document.createElement("canvas");
        canvas.width = snap.width;
        canvas.height = snap.height;
        canvas.style.width = "100%";
        canvas.style.borderRadius = "12px";
        canvas.style.background = "var(--bg-card-hover)";
        canvas.style.cursor = "crosshair";
        canvas.style.touchAction = "none";
        const ctx = canvas.getContext("2d");
        const bg = new Image();
        bg.crossOrigin = "anonymous";
        bg.onload = () => ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        bg.src = pathToImgSrc(snap.imagePath);
        let drawing = false;
        let last = null;
        const scaleX = () => canvas.width / canvas.getBoundingClientRect().width;
        const scaleY = () => canvas.height / canvas.getBoundingClientRect().height;
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return { x: (e.clientX - rect.left) * scaleX(), y: (e.clientY - rect.top) * scaleY() };
        };
        canvas.addEventListener("pointerdown", (e) => {
            drawing = true;
            last = getPos(e);
            canvas.setPointerCapture(e.pointerId);
        });
        canvas.addEventListener("pointermove", (e) => {
            if (!drawing || !last)
                return;
            const p = getPos(e);
            ctx.strokeStyle = "#ff3b6f";
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last = p;
        });
        canvas.addEventListener("pointerup", () => { drawing = false; last = null; });
        body.replaceChildren(el("div.col.gap-3", { style: { padding: "0 16px" } }, el("div", { style: { borderRadius: "12px", overflow: "hidden" } }, canvas), el("div.row.gap-2", null, el("button.btn-secondary", {
            onClick: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bg, 0, 0); },
        }, "Clear"), el("button.btn-secondary", { onClick: showStart }, "Recapture"), el("button.btn-primary", { onClick: () => submit(canvas) }, icon("send", 14), "Generate"))));
    }
    async function submit(canvas) {
        try {
            body.replaceChildren(busyCard("Generating…"));
            const sketchDataUrl = canvas.toDataURL("image/png");
            const job = await api.generate.video({
                mode: "draw",
                sketch: sketchDataUrl,
                width: canvas.width,
                height: canvas.height,
            });
            const final = job.status === "succeeded" || job.status === "failed"
                ? job : await api.pollJob(job.id);
            if (final.status === "failed" || !final.result) {
                throw new Error(final.error ?? "Generation failed");
            }
            const r = final.result;
            body.replaceChildren(el("div.col.gap-3", { style: { padding: "0 16px" } }, el("div", {
                style: { borderRadius: "12px", overflow: "hidden",
                    background: "var(--bg-card)", border: "1px solid var(--line-soft)" },
            }, el("video", { src: r.url, controls: "true",
                style: { width: "100%", display: "block" } })), el("div.row.gap-2", null, el("button.btn-primary", {
                onClick: async () => {
                    try {
                        const local = await api.downloadAsset(r.url, `${r.id}.mp4`);
                        await evalES("importMediaFromPath", local);
                        toast("Imported to project bin", "success");
                    }
                    catch (err) {
                        toast(`Import failed: ${err.message}`, "error");
                    }
                },
            }, icon("import", 14), "Import to project"))));
            store.refreshCreditsOnly();
            store.refreshRecent();
        }
        catch (err) {
            body.replaceChildren(errorCard(err.message));
            toast(err.message, "error");
        }
    }
}
function pathToImgSrc(p) {
    if (p.startsWith("data:") || p.startsWith("http"))
        return p;
    // Local FS path returned from ExtendScript — file:// works inside CEP.
    const normalized = p.replace(/\\/g, "/");
    return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}
function busyCard(text) {
    return el("div.state-card", null, el("div.state-card__icon", null, icon("spark", 22)), el("div.state-card__title", null, text), el("div.state-card__subtitle", null, "Hang tight."));
}
function errorCard(text) {
    return el("div.state-card", null, el("div.state-card__title", null, "Something went wrong"), el("div.state-card__subtitle", null, text));
}
