/** Account-linked gallery on the home page.
 *
 * Shows the latest generations from the signed-in website account with
 * Image / Video filters, inspired by the Higgsfield plugin entry view. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
import { store } from "../lib/store";
import { api, type GenerationItem } from "../lib/api";
import { evalES } from "../lib/cep";
import { toast } from "../lib/toast";

export interface RecentStripOptions {
  fixedFilter?: "image" | "video";
  showToolbar?: boolean;
  showNewTile?: boolean;
}

export function RecentStrip(options: RecentStripOptions = {}): HTMLElement {
  const root = el("section.library-shell");
  const imageTab = el("button.library-toggle.library-toggle--active", null, icon("image", 13), "Image");
  const videoTab = el("button.library-toggle", null, icon("video", 13), "Video");
  const viewBadge = el("div.library-view-badge", null, "View");
  const count = el("span.library-count", null, "0 items");
  const grid = el("div.library-grid");
  const fixedFilter = options.fixedFilter;
  const showToolbar = options.showToolbar ?? !fixedFilter;
  const showNewTile = options.showNewTile ?? !fixedFilter;
  let filter: "image" | "video" = fixedFilter ?? "image";

  let userSelectedFilter = false;
  const selectFilter = (next: "image" | "video") => {
    if (fixedFilter) return;
    filter = next;
    userSelectedFilter = true;
    render();
  };

  imageTab.addEventListener("click", () => selectFilter("image"));
  videoTab.addEventListener("click", () => selectFilter("video"));

  const render = () => {
    const state = store.get();
    const allItems = state.recent;
    const imageItems = allItems.filter((item) => item.kind === "image");
    const videoItems = allItems.filter((item) => item.kind === "video");

    if (fixedFilter) {
      filter = fixedFilter;
    } else if (!userSelectedFilter) {
      if (filter === "image" && !imageItems.length && videoItems.length) {
        filter = "video";
      } else if (filter === "video" && !videoItems.length && imageItems.length) {
        filter = "image";
      }
    }

    imageTab.classList.toggle("library-toggle--active", filter === "image");
    videoTab.classList.toggle("library-toggle--active", filter === "video");

    const items = filter === "image" ? imageItems : videoItems;
    count.textContent = state.recentLoading && !allItems.length
      ? "Loading..."
      : `${items.length} item${items.length === 1 ? "" : "s"}`;

    grid.replaceChildren();
    if (showNewTile) {
      grid.appendChild(newTile(filter));
    }

    if (state.recentLoading && !allItems.length) {
      grid.appendChild(loadingHint());
      return;
    }

    for (const item of items) {
      grid.appendChild(itemTile(item));
    }

    if (!items.length) {
      grid.appendChild(emptyHint(filter));
    }
  };

  if (showToolbar) {
    root.append(
      el("div.library-toolbar",
        null,
        el("div.library-toolbar__left",
          null,
          imageTab,
          videoTab,
        ),
        el("div.library-toolbar__right",
          null,
          count,
          viewBadge,
        ),
      ),
    );
  }
  root.append(grid);
  );
  render();
  store.refreshRecent();
  return root;

function newTile(filter: "image" | "video"): HTMLElement {
  const route = filter === "video" ? "/video-gen" : "/image-gen";
  const label = filter === "video" ? "New video" : "New image";
  return el("button.library-card.library-card--new",
    { onClick: () => navigate(route), "aria-label": label },
    el("div.library-card__new-icon", null, icon("plus", 18)),
    el("div.library-card__body",
      null,
      el("div.library-card__title", null, label),
      el("div.library-card__meta", null, "Start generating"),
    ),
  );
}

function loadingHint(): HTMLElement {
  return el("div.library-empty",
    null,
    "Loading your account gallery...",
  );
}

function emptyHint(filter: "image" | "video"): HTMLElement {
  return el("div.library-empty",
    null,
    filter === "video" ? "No recent videos yet." : "No recent images yet.",
  );
}

function itemTile(g: GenerationItem): HTMLElement {
  const media: HTMLElement = g.kind === "video"
    ? el("video", {
        src: g.url,
        muted: "true",
        playsinline: "true",
        loop: "true",
        preload: "metadata",
        onMouseenter: (e: Event) => (e.target as HTMLVideoElement).play().catch(() => {}),
        onMouseleave: (e: Event) => {
          const video = e.target as HTMLVideoElement;
          video.pause();
          video.currentTime = 0;
        },
      })
    : el("img", { src: g.thumbnailUrl || g.url, alt: g.prompt ?? "" });

  return el("div.library-card",
    { title: g.prompt ?? "" },
    el("div.library-card__media",
      null,
      media,
      el("button.library-card__import",
      {
        onClick: async (ev: Event) => {
          ev.stopPropagation();
          try {
            const local = await api.downloadAsset(g.url, fileNameFor(g));
            await evalES("importMediaFromPath", local);
            toast("Imported to project bin", "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
        "aria-label": "Import to timeline",
      },
      icon("import", 12),
    ),
    ),
    el("div.library-card__body",
      null,
      el("div.library-card__title", null, g.prompt ?? "Untitled generation"),
      el("div.library-card__meta", null, g.model ?? (g.kind === "video" ? "Video" : "Image")),
    ),
  );
}

function fileNameFor(g: GenerationItem): string {
  const ext = g.kind === "video" ? "mp4" : "png";
  return `${g.id}.${ext}`;
}
