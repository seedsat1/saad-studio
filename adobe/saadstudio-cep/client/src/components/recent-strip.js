/** Horizontal "recent generations" strip on the home page.
 *
 * First tile is always a "new" entry that routes to the most recently used
 * tool. The remaining tiles render thumbnails for the user's last N
 * generations and expose a quick-import button that hands the asset to
 * the active Premiere/AE timeline via the ExtendScript bridge. */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
import { store } from "../lib/store";
import { api } from "../lib/api";
import { evalES } from "../lib/cep";
import { toast } from "../lib/toast";
export function RecentStrip() {
    const strip = el("div.recent-strip");
    const render = () => {
        strip.replaceChildren();
        strip.appendChild(newTile());
        const items = store.get().recent;
        for (const item of items)
            strip.appendChild(itemTile(item));
        if (!items.length && !store.get().recentLoading) {
            strip.appendChild(emptyHint());
        }
    };
    store.subscribe(render);
    render();
    // kick off a load on mount
    store.refreshRecent();
    return strip;
}
function newTile() {
    return el("button.recent-tile", { onClick: () => navigate("/image-gen"), "aria-label": "Start a new generation" }, el("div.recent-tile__add", null, icon("plus", 24)));
}
function emptyHint() {
    return el("div", { style: { padding: "8px 4px", color: "var(--text-muted)", fontSize: "11px" } }, "No recent generations yet.");
}
function itemTile(g) {
    const media = g.kind === "video"
        ? el("video", { src: g.url, muted: "true", playsinline: "true", loop: "true",
            onMouseenter: (e) => e.target.play().catch(() => { }),
            onMouseleave: (e) => e.target.pause() })
        : el("img", { src: g.thumbnailUrl || g.url, alt: g.prompt ?? "" });
    return el("div.recent-tile", { title: g.prompt ?? "" }, media, el("button.recent-tile__import", {
        onClick: async (ev) => {
            ev.stopPropagation();
            try {
                const local = await api.downloadAsset(g.url, fileNameFor(g));
                await evalES("importMediaFromPath", local);
                toast("Imported to project bin", "success");
            }
            catch (err) {
                toast(`Import failed: ${err.message}`, "error");
            }
        },
        "aria-label": "Import to timeline",
    }, icon("import", 12)));
}
function fileNameFor(g) {
    const ext = g.kind === "video" ? "mp4" : "png";
    return `${g.id}.${ext}`;
}
