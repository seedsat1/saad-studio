/** Shared page shell for tools that take an existing video as input
 *  (edit, reframe, remove-bg, upscale).
 *
 * Behaviour mirrors the Higgsfield Edit-video flow:
 *   • The page starts watching the Premiere/AE timeline as soon as it
 *     mounts. The moment the user clicks a clip in the timeline, the
 *     panel switches from the empty-state card to the options dock —
 *     no "Use timeline video" button to press first.
 *   • If the user trims the same clip or picks a different one, the
 *     watcher detects it (diff on `path + inSec + outSec`) and the
 *     panel refreshes automatically.
 *   • "Upload video" stays available as a fallback when nothing is
 *     selected (or when running inside the browser dev preview). */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { PromptDock, type DockOption } from "../components/prompt-dock";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api, type JobStatus } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { watchTimelineSelection, type TimelineClip } from "../lib/timeline-watcher";

export interface SourceClip {
  path: string;
  file?: File;
  width?: number;
  height?: number;
  durationSec?: number;
  name?: string;
}

export interface VideoUtilityConfig {
  title: string;
  /** Optional textual hint shown above the picker. */
  hint?: string;
  /** Options for the dock once a clip is picked. */
  options: DockOption[];
  /** Whether to show a prompt textarea (draw-to-video does, reframe doesn't). */
  showPrompt?: boolean;
  /** Build + send the API request. */
  submit: (input: {
    clip: SourceClip;
    prompt: string;
    options: Record<string, string>;
  }) => Promise<JobStatus>;
}

export function VideoUtilityPage(cfg: VideoUtilityConfig): HTMLElement {
  const body = el("div.app-main");
  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader(cfg.title),
    body,
  );

  // Track UI state so the watcher knows whether to overwrite.
  let currentMode: "auto" | "uploaded" = "auto";
  let currentClipKey: string | null = null;

  showEmpty();

  // Start watching the timeline. Auto-stops when this page is unmounted.
  const watcher = watchTimelineSelection((clip) => {
    if (currentMode === "uploaded") return; // user explicitly uploaded — don't override
    const key = clip ? `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}` : null;
    if (key === currentClipKey) return;
    currentClipKey = key;
    if (clip) showOptions(toSourceClip(clip));
    else showEmpty();
  });
  watcher.attachTo(root);

  return root;

  // ─── States ──────────────────────────────────────────────────────────

  function showEmpty() {
    const insideAdobe = isInsideAdobe();
    body.replaceChildren(
      el("div.state-card",
        null,
        el("div.state-card__icon", null, icon("video", 22)),
        el("div.state-card__title", null,
          insideAdobe ? "Select a clip on your timeline" : "Upload a video",
        ),
        el("div.state-card__subtitle", null,
          insideAdobe
            ? (cfg.hint ?? "Click any clip in the Premiere timeline and it'll show up here automatically.")
            : "Timeline auto-detect only works inside Premiere / After Effects. Upload a file to keep going.",
        ),
        el("div.state-card__actions",
          null,
          el("button.btn-secondary",
            { onClick: uploadFile },
            icon("plus", 14), "Upload video",
          ),
        ),
      ),
    );
  }

  function uploadFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const path = (file as File & { path?: string }).path ?? URL.createObjectURL(file);
      currentMode = "uploaded";
      currentClipKey = `upload:${file.name}:${file.size}`;
      showOptions({ path, name: file.name, file });
    });
    input.click();
  }

  function showOptions(clip: SourceClip) {
    const previewSrc = pathToVideoSrc(clip.path);
    const preview = el("video", {
      src: previewSrc,
      controls: "true",
      muted: "true",
      playsinline: "true",
      preload: "metadata",
      crossorigin: "anonymous",
      style: {
        width: "100%",
        maxHeight: "260px",
        background: "#000",
        borderRadius: "10px",
        display: "block",
      },
    });

    const status = el("div.state-card",
      { style: { marginBottom: "16px", padding: "12px" } },
      el("div.col.gap-3",
        null,
        preview,
        el("div.row.gap-3", { style: { alignItems: "center" } },
          el("div.state-card__icon", { style: { margin: "0", flexShrink: "0" } }, icon("video", 18)),
          el("div.col.gap-1.grow", { style: { textAlign: "left", alignItems: "flex-start", minWidth: "0" } },
            el("div.truncate", { style: { fontSize: "13px", fontWeight: "600", width: "100%" } },
              clip.name ?? "Source clip",
            ),
            el("div.mono.muted.truncate", { style: { fontSize: "10px", width: "100%" }, title: clip.path },
              shortenPath(clip.path),
            ),
          ),
          el("button.dock-button",
            { onClick: () => { currentMode = "auto"; currentClipKey = null; showEmpty(); } },
            "Change",
          ),
        ),
      ),
    );

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
          results.replaceChildren(buildResultCard(r));
          store.refreshCreditsOnly();
          store.refreshRecent();
        } catch (err) {
          results.replaceChildren(errorCard((err as Error).message));
          toast((err as Error).message, "error");
        }
      },
    });

    body.appendChild(dock);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function toSourceClip(c: TimelineClip): SourceClip {
  return {
    path: c.path,
    name: c.name,
    durationSec: c.durationSec,
  };
}

function shortenPath(p: string, max = 48): string {
  if (p.length <= max) return p;
  const head = p.slice(0, 12);
  const tail = p.slice(-(max - 15));
  return `${head}…${tail}`;
}

/** Convert a host-reported path into something an HTML <video> tag can load.
 *  Premiere returns native paths (Windows backslashes, Mac POSIX); CEP can
 *  read them via file:// when --allow-file-access is set in the manifest.
 *  Blob URLs from the upload picker pass through unchanged. */
function pathToVideoSrc(p: string): string {
  if (!p) return "";
  if (p.startsWith("blob:") || p.startsWith("data:") || p.startsWith("http")) return p;
  const forward = p.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  // Windows drive letter (C:/...) needs three slashes after the scheme.
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  // POSIX absolute path
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}

function busyCard(): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__icon", null, icon("spark", 22)),
    el("div.state-card__title", null, "Working…"),
    el("div.state-card__subtitle", null, "This usually takes under two minutes."));
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Failed"),
    el("div.state-card__subtitle", null, message));
}

function buildResultCard(r: NonNullable<JobStatus["result"]>): HTMLElement {
  let dragPath: string | null = null;
  let dragPending: Promise<string> | null = null;

  const warmDragAsset = async () => {
    if (dragPath) return dragPath;
    if (dragPending) return dragPending;
    dragPending = api.downloadAsset(r.url, `${r.id}.${r.kind === "video" ? "mp4" : "png"}`)
      .then((local) => {
        dragPath = local;
        dragPending = null;
        return local;
      })
      .catch((err) => {
        dragPending = null;
        throw err;
      });
    return dragPending;
  };

  return el("div.col.gap-3", null,
    el("div", {
      style: {
        borderRadius: "14px",
        overflow: "hidden",
        background: "var(--bg-card)",
        border: "1px solid var(--line-soft)",
      },
      draggable: "true",
      title: "Drag to Premiere timeline",
      onMouseenter: () => { void warmDragAsset(); },
      onPointerdown: () => { void warmDragAsset(); },
      onDragstart: (ev: Event) => {
        const e = ev as DragEvent;
        const transfer = e.dataTransfer;
        if (!transfer) return;
        if (!dragPath) {
          e.preventDefault();
          void warmDragAsset();
          toast("Preparing asset for drag. Drag again in a second.", "info");
          return;
        }
        const fileUri = toFileUri(dragPath);
        transfer.effectAllowed = "copy";
        transfer.setData("com.adobe.cep.dnd.file.count", "1");
        transfer.setData("com.adobe.cep.dnd.file.0", dragPath);
        transfer.setData("text/plain", dragPath);
        transfer.setData("text/uri-list", fileUri);
        transfer.setData("DownloadURL", `${mimeFor(r.kind)}:${r.id}.${r.kind === "video" ? "mp4" : "png"}:${fileUri}`);
      },
    },
      r.kind === "video"
        ? el("video", { src: r.url, controls: "true", style: { width: "100%", display: "block" } })
        : el("img", { src: r.url, style: { width: "100%", display: "block" } }),
    ),
    el("div.row.gap-2", { style: { marginTop: "12px" } },
      el("button.btn-primary",
        {
          onClick: async () => {
            try {
              const local = await api.downloadAsset(r.url, `${r.id}.${r.kind === "video" ? "mp4" : "png"}`);
              await evalES("importMediaFromPath", local);
              toast("Imported to project bin", "success");
            } catch (err) {
              toast(`Import failed: ${(err as Error).message}`, "error");
            }
          },
        },
        icon("import", 14), "Import to project",
      ),
    ),
  );
}

function toFileUri(localPath: string): string {
  const normalized = localPath.replace(/\\/g, "/");
  if (normalized.startsWith("file://")) return normalized;
  if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${normalized}`;
  if (normalized.startsWith("/")) return `file://${normalized}`;
  return `file:///${normalized}`;
}

function mimeFor(kind: "image" | "video"): string {
  return kind === "video" ? "video/mp4" : "image/png";
}
