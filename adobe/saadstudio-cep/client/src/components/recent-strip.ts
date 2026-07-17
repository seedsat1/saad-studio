/** Account-linked gallery on the home page.
 *
 * Shows the latest generations from the signed-in website account with
 * Image / Video filters, inspired by the Higgsfield plugin entry view. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { navigate } from "../lib/router";
import { store } from "../lib/store";
import { api, type GenerationItem } from "../lib/api";
import { evalES, getHostDragTargetLabel, getHostImportButtonLabel, getHostImportSuccessMessage } from "../lib/cep";
import { toast } from "../lib/toast";
import { t } from "../lib/i18n";

export interface RecentStripOptions {
  fixedFilter?: "image" | "video" | "audio";
  showToolbar?: boolean;
  showNewTile?: boolean;
}

export function RecentStrip(options: RecentStripOptions = {}): HTMLElement {
  const root = el("section.library-shell");
  const imageTab = el("button.library-toggle.library-toggle--active", null, icon("image", 13), t("filterImage"));
  const videoTab = el("button.library-toggle", null, icon("video", 13), t("filterVideo"));
  const viewBadge = el("div.library-view-badge", null, t("libraryView"));
  const count = el("span.library-count", null, t("libraryItems").replace("{count}", "0").replace("{plural}", "s"));
  const grid = el("div.library-grid");
  const fixedFilter = options.fixedFilter;
  const showToolbar = options.showToolbar ?? !fixedFilter;
  const showNewTile = options.showNewTile ?? !fixedFilter;
  let filter: "image" | "video" | "audio" = fixedFilter ?? "image";
  let fixedItems: GenerationItem[] | null = null;
  let fixedLoading = false;
  const dragReady = new Map<string, string>();
  const dragPending = new Map<string, Promise<string>>();

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
    const allItems = fixedFilter ? (fixedItems ?? []) : state.recent;
    const imageItems = allItems.filter((item) => item.kind === "image");
    const videoItems = allItems.filter((item) => item.kind === "video");
    const audioItems = allItems.filter((item) => item.kind === "audio");

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

    const items = filter === "image" ? imageItems : filter === "video" ? videoItems : audioItems;
    const loading = fixedFilter ? fixedLoading : state.recentLoading;
    count.textContent = loading && !allItems.length
      ? t("libraryLoading")
      : t("libraryItems").replace("{count}", String(items.length)).replace("{plural}", items.length === 1 ? "" : "s");

    grid.replaceChildren();
    if (showNewTile && (filter === "image" || filter === "video")) {
      grid.appendChild(newTile(filter));
    }

    if (loading && !allItems.length) {
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
  render();
  const unsubscribe = store.subscribe(() => render());
  attachCleanup(root, unsubscribe);
  if (fixedFilter) {
    refreshFixedItems();
  } else {
    store.refreshRecent();
  }
  return root;

  async function refreshFixedItems() {
    if (!fixedFilter) return;
    fixedLoading = true;
    render();
    try {
      const { items } = await api.allGenerations(fixedFilter);
      fixedItems = items.filter((item) => item.kind === fixedFilter);
    } catch {
      fixedItems = [];
    } finally {
      fixedLoading = false;
      render();
    }
  }

  function warmDragAsset(item: GenerationItem): Promise<string> {
    const cached = dragReady.get(item.id);
    if (cached) return Promise.resolve(cached);
    const pending = dragPending.get(item.id);
    if (pending) return pending;

    const task = api.downloadAsset(item.url, fileNameFor(item))
      .then((localPath) => {
        dragReady.set(item.id, localPath);
        dragPending.delete(item.id);
        return localPath;
      })
      .catch((err) => {
        dragPending.delete(item.id);
        throw err;
      });

    dragPending.set(item.id, task);
    return task;
  }

  async function deleteItem(item: GenerationItem) {
    const label = item.kind === "image" ? t("filterImage") : item.kind === "video" ? t("filterVideo") : t("filterAudio");
    const ok = window.confirm(t("libraryDeleteConfirm").replace("{kind}", label));
    if (!ok) return;
    try {
      await api.deleteGeneration(item.id);
      toast(t("libraryDeleted").replace("{kind}", label), "success");
      if (fixedFilter) await refreshFixedItems();
      else await store.refreshRecent();
    } catch (err) {
      toast(t("libraryDeleteFailed").replace("{message}", (err as Error).message), "error");
    }
  }

  function itemTile(item: GenerationItem): HTMLElement {
    return buildItemTile({
      item,
      getReadyDragPath: (id) => dragReady.get(id) ?? null,
      onWarmDrag: warmDragAsset,
      onDelete: deleteItem,
    });
  }
}

function newTile(filter: "image" | "video"): HTMLElement {
  const route = filter === "video" ? "/video-gen" : "/image-gen";
  const label = filter === "video" ? t("libraryNewVideo") : t("libraryNewImage");
  return el("button.library-card.library-card--new",
    { onClick: () => navigate(route), "aria-label": label },
    el("div.library-card__new-icon", null, icon("plus", 18)),
    el("div.library-card__body",
      null,
      el("div.library-card__title", null, label),
      el("div.library-card__meta", null, t("libraryStartGenerating")),
    ),
  );
}

function loadingHint(): HTMLElement {
  return el("div.library-empty",
    null,
    t("libraryLoadingGallery"),
  );
}

function emptyHint(filter: "image" | "video" | "audio"): HTMLElement {
  return el("div.library-empty",
    null,
    filter === "video" ? t("libraryEmptyVideos") : filter === "audio" ? t("libraryEmptyAudio") : t("libraryEmptyImages"),
  );
}

function buildItemTile(params: {
  item: GenerationItem;
  getReadyDragPath: (id: string) => string | null;
  onWarmDrag: (item: GenerationItem) => Promise<string>;
  onDelete: (item: GenerationItem) => Promise<void>;
}): HTMLElement {
  const { item: g, getReadyDragPath, onWarmDrag, onDelete } = params;
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
    : g.kind === "audio"
      ? el("div.library-card__audio", null,
          icon("waveform", 28),
          el("audio", { src: g.url, controls: "true", preload: "metadata" }),
        )
      : el("img", { src: g.thumbnailUrl || g.url, alt: g.prompt ?? "" });

  return el("div.library-card",
    {
      title: `${g.prompt ?? ""}${` • ${t("libraryDragTo").replace("{target}", getHostDragTargetLabel(g.kind))}`}`.trim(),
      draggable: "true",
      onMouseenter: () => { void onWarmDrag(g); },
      onPointerdown: () => { void onWarmDrag(g); },
      onDragstart: (ev: Event) => {
        const e = ev as DragEvent;
        const transfer = e.dataTransfer;
        if (!transfer) return;

        const cached = getReadyDragPath(g.id);
        if (!cached) {
          e.preventDefault();
          void onWarmDrag(g);
          toast(t("commonPreparingDrag"), "info");
          return;
        }

        const fileUri = toFileUri(cached);
        transfer.effectAllowed = "copy";
        transfer.setData("com.adobe.cep.dnd.file.count", "1");
        transfer.setData("com.adobe.cep.dnd.file.0", cached);
        transfer.setData("text/plain", cached);
        transfer.setData("text/uri-list", fileUri);
        transfer.setData("DownloadURL", `${mimeFor(g)}:${fileNameFor(g)}:${fileUri}`);
      },
    },
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
            toast(getHostImportSuccessMessage(), "success");
          } catch (err) {
            toast(t("commonImportFailed").replace("{message}", (err as Error).message), "error");
          }
        },
        "aria-label": getHostImportButtonLabel(),
      },
      icon("import", 12),
    ),
      el("button.library-card__delete",
      {
        onClick: async (ev: Event) => {
          ev.stopPropagation();
          await onDelete(g);
        },
        "aria-label": t("libraryDeleteFromLibrary"),
      },
      icon("trash", 12),
    ),
      el("div.library-card__drag-hint", null, t("libraryDragTo").replace("{target}", getHostDragTargetLabel(g.kind))),
    ),
    el("div.library-card__body",
      null,
      el("div.library-card__title", null, g.prompt ?? t("libraryUntitled")),
      el("div.library-card__meta", null, g.model ?? (g.kind === "video" ? t("filterVideo") : g.kind === "audio" ? t("filterAudio") : t("filterImage"))),
    ),
  );
}

function fileNameFor(g: GenerationItem): string {
  const ext = g.kind === "video" ? "mp4" : g.kind === "audio" ? "mp3" : "png";
  return `${g.id}.${ext}`;
}

function toFileUri(localPath: string): string {
  const normalized = localPath.replace(/\\/g, "/");
  if (normalized.startsWith("file://")) return normalized;
  if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${normalized}`;
  if (normalized.startsWith("/")) return `file://${normalized}`;
  return `file:///${normalized}`;
}

function mimeFor(item: GenerationItem): string {
  return item.kind === "video" ? "video/mp4" : item.kind === "audio" ? "audio/mpeg" : "image/png";
}

function attachCleanup(root: HTMLElement, cleanup: () => void) {
  const check = () => {
    if (!root.isConnected) {
      cleanup();
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
