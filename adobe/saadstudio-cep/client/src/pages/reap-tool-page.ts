/** Shared page shell for the Reap.video tools.
 *
 * Flow:
 *   1. Auto-detect a clip on the Premiere / AE timeline (or let the user
 *      pick one with the file picker).
 *   2. Upload it to Backblaze-backed storage to obtain a public sourceUrl.
 *   3. POST /api/panel/reap/start with the tool + sourceUrl + options.
 *   4. Poll /api/panel/reap/status until the project terminates.
 *   5. Render the final asset (or transcript JSON) with an Import button
 *      so the user can drop the result back onto the timeline.
 *
 * Each tool page (Add Captions, AI Dubbing, â€¦) is a tiny wrapper around
 * this shell that supplies its own options dock and (optionally) a
 * custom result renderer. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { PromptDock, type DockOption, type DockToggle } from "../components/prompt-dock";
import { ProcessingLoader } from "../components/processing-loader";
import { icon } from "../lib/icons";
import { evalES, isInsideAdobe } from "../lib/cep";
import { api, reap, type ReapTool, type ReapStatusResponse } from "../lib/api";
import { toast } from "../lib/toast";
import { store } from "../lib/store";
import { watchTimelineSelection } from "../lib/timeline-watcher";

export interface ReapToolConfig {
  title: string;
  tool: ReapTool;
  /** Optional text shown in the empty state. */
  hint?: string;
  /** Tool-specific selector pills (language, aspect, preset, â€¦). */
  options: DockOption[];
  /** Inline checkboxes rendered after the pills (e.g. "Editable captions"). */
  toggles?: DockToggle[];
  /** Show the textarea so the user can describe what they want. */
  showPrompt?: boolean;
  /** Allow Submit even when the user typed no prompt and attached no file.
   *  Tools driven by a timeline clip (AI Clip Maker, Auto-Reframe, etc.)
   *  should set this true so a selected clip alone is enough to generate. */
  allowEmptySubmit?: boolean;
  /** Turn the dock-selected options into the body sent to /reap/start. */
  buildOptions: (vals: Record<string, string>) => Record<string, unknown>;
  /** Custom result renderer; defaults to a <video controls> + Import button.
   *  Receives the dock state so renderers can branch on user-picked options
   *  (e.g. "editable captions" in Edit Clips). */
  renderResult?: (
    status: ReapStatusResponse,
    vals: { prompt: string; options: Record<string, string> },
  ) => HTMLElement;
}

interface SourceClip {
  path: string;
  name?: string;
  origin: "timeline" | "upload";
  /** Whatever the upload step produced â€” populated lazily. */
  publicUrl?: string;
}

interface ActiveReapToolJob {
  tool: ReapTool;
  title: string;
  projectId: string;
  generationId: string;
  filename: string;
  clip: SourceClip;
  prompt: string;
  options: Record<string, string>;
  startedAt: number;
  checks: number;
  lastStatus?: ReapStatusResponse["status"];
  lastProgress?: number;
}

const REAP_POLL_INTERVAL_MS = 12_000;

export function ReapToolPage(cfg: ReapToolConfig): HTMLElement {
  const body = el("div.app-main");
  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader(cfg.title),
    body,
  );

  let mode: "auto" | "uploaded" = "auto";
  let currentClipKey: string | null = null;
  let currentResults: HTMLElement | null = null;
  let busy = false;
  let disposed = false;
  let pollSession = 0;

  showEmpty();

  const watcher = watchTimelineSelection((clip) => {
    if (busy || mode === "uploaded") return;
    const key = clip ? `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}` : null;
    if (key === currentClipKey) return;
    currentClipKey = key;
    if (clip) showOptions({ path: clip.path, name: clip.name, origin: "timeline" });
    else showEmpty();
  });
  watcher.attachTo(root);

  requestAnimationFrame(function watchDispose() {
    if (!root.isConnected) {
      disposed = true;
      pollSession += 1;
      return;
    }
    requestAnimationFrame(watchDispose);
  });
  void resumeStoredJob();

  return root;

  // â”€â”€â”€ States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function showEmpty() {
    const inside = isInsideAdobe();
    body.replaceChildren(
      el("div.state-card",
        null,
        el("div.state-card__icon", null, icon("video", 22)),
        el("div.state-card__title", null,
          inside ? "Pick a clip on your timeline" : "Upload a video",
        ),
        el("div.state-card__subtitle", null,
          inside
            ? (cfg.hint ?? "Select any clip in the Premiere timeline and it'll appear here automatically.")
            : "Timeline auto-detect only works inside Premiere / After Effects. Upload a file to continue.",
        ),
        el("div.state-card__actions", null,
          el("button.btn-secondary", { onClick: uploadFile },
            icon("plus", 14), "Upload video"),
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
      mode = "uploaded";
      currentClipKey = `upload:${file.name}:${file.size}`;
      const localUrl = URL.createObjectURL(file);
      showOptions({
        path: (file as File & { path?: string }).path ?? localUrl,
        name: file.name,
        origin: "upload",
      });
    });
    input.click();
  }

  function showOptions(clip: SourceClip) {
    const previewSrc = pathToVideoSrc(clip.path);
    // Let the video pick its own intrinsic aspect ratio. Wrapped in a flex
    // centered container so portrait/landscape sources never get
    // pillar/letterboxed by a hard 100% width.
    const preview = el("video", {
      src: previewSrc,
      controls: "true",
      muted: "true",
      preload: "metadata",
      style: {
        maxWidth: "100%",
        maxHeight: "320px",
        height: "auto",
        background: "transparent",
        borderRadius: "10px",
        display: "block",
      },
    });
    const previewWrap = el("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        background: "#000",
        borderRadius: "10px",
        overflow: "hidden",
      },
    }, preview);

    const status = el("div.state-card",
      { style: { marginBottom: "16px", padding: "12px" } },
      el("div.col.gap-3", null,
        previewWrap,
        el("div.row.gap-3", { style: { alignItems: "center" } },
          el("div.state-card__icon",
            { style: { margin: "0", flexShrink: "0" } }, icon("video", 18)),
          el("div.col.gap-1.grow",
            { style: { textAlign: "left", alignItems: "flex-start", minWidth: "0" } },
            el("div.truncate", { style: { fontSize: "13px", fontWeight: "600", width: "100%" } },
              clip.name ?? "Source clip"),
            el("div.mono.muted.truncate",
              { style: { fontSize: "10px", width: "100%" }, title: clip.path },
              shortenPath(clip.path)),
          ),
          el("button.dock-button",
            { onClick: () => { mode = "auto"; currentClipKey = null; showEmpty(); } },
            "Change"),
        ),
      ),
    );

    const results = el("div.col.gap-3");
    currentResults = results;
    body.replaceChildren(status, results);

    const dock = PromptDock({
      placeholder: cfg.showPrompt
        ? "Optional: extra instructions for the toolâ€¦"
        : undefined,
      options: cfg.options,
      toggles: cfg.toggles,
      allowEmptySubmit: cfg.allowEmptySubmit,
      onSubmit: ({ prompt, options }) => runJob(clip, prompt, options, results),
    });
    body.appendChild(dock);
  }

  async function runJob(
    clip: SourceClip,
    prompt: string,
    options: Record<string, string>,
    results: HTMLElement,
  ) {
    busy = true;
    try {
      const filename = clip.name ?? `clip-${Date.now()}.mp4`;

      results.replaceChildren(busyCard("Uploading to Reap..."));
      const uploadId = await uploadSourceDirect(clip, filename);

      results.replaceChildren(busyCard("Starting Reap job..."));
      const started = await reap.start({
        tool: cfg.tool,
        uploadId,
        filename,
        options: cfg.buildOptions(options),
        prompt,
      });

      const job: ActiveReapToolJob = {
        tool: cfg.tool,
        title: cfg.title,
        projectId: started.projectId,
        generationId: started.generationId,
        filename,
        clip,
        prompt,
        options,
        startedAt: Date.now(),
        checks: 0,
        lastStatus: started.status as ReapStatusResponse["status"],
      };
      saveActiveJob(job);
      await pollJob(job, results);

      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      results.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    } finally {
      busy = false;
    }
  }

  async function resumeStoredJob() {
    const job = readActiveJob(cfg.tool);
    if (!job || job.tool !== cfg.tool) return;
    mode = job.clip.origin === "upload" ? "uploaded" : "auto";
    currentClipKey = `${job.clip.path}|resume`;
    showOptions(job.clip);
    const results = currentResults;
    if (!results) return;

    busy = true;
    results.replaceChildren(progressCard({
      title: `Resuming ${cfg.title}...`,
      status: `Saved job found. Elapsed ${formatElapsed(Date.now() - job.startedAt)} - Checks ${job.checks}`,
      progress: job.lastProgress,
    }));
    try {
      await pollJob(job, results);
      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      results.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    } finally {
      if (!disposed) busy = false;
    }
  }

  async function pollJob(initialJob: ActiveReapToolJob, results: HTMLElement) {
    let job = initialJob;
    const session = ++pollSession;
    let firstCheck = true;

    while (!disposed && session === pollSession) {
      if (!firstCheck) await delay(REAP_POLL_INTERVAL_MS);
      firstCheck = false;
      if (disposed || session !== pollSession) return;

      const status = await reap.status(job.projectId, job.generationId);
      job = {
        ...job,
        checks: job.checks + 1,
        lastStatus: status.status,
        lastProgress: status.progress,
      };
      saveActiveJob(job);

      const pct = typeof status.progress === "number" ? ` ${Math.round(status.progress)}%` : "";
      results.replaceChildren(progressCard({
        title: status.status === "queued" ? "Queued..." : `Processing${pct}...`,
        status: `Elapsed ${formatElapsed(Date.now() - job.startedAt)} - Checks ${job.checks}`,
        progress: status.progress,
      }));

      if (!isTerminalStatus(status.status)) continue;
      if (status.status !== "completed") {
        clearActiveJobForTool(cfg.tool);
        throw new Error(status.error ?? `Reap job ${status.status}`);
      }

      clearActiveJobForTool(cfg.tool);
      const final = {
        ...status,
        projectId: job.projectId,
        generationId: job.generationId,
      } as ReapStatusResponse & { projectId: string; generationId: string };

      if (cfg.renderResult) {
        results.replaceChildren(cfg.renderResult(final, { prompt: job.prompt, options: job.options }));
      } else {
        await autoImportToTimeline(final, results);
      }
      return;
    }
  }

  async function uploadSourceDirect(clip: SourceClip, filename: string): Promise<string> {
    // Source is already a public http(s) URL â€” fetch then PUT to Reap.
    if (/^https?:\/\//i.test(clip.path)) {
      const blob = await fetch(clip.path).then((r) => r.blob());
      return reap.uploadDirect({ kind: "blob", blob, name: filename });
    }

    // Upload picker (blob: URL).
    if (clip.path.startsWith("blob:")) {
      const blob = await fetch(clip.path).then((r) => r.blob());
      return reap.uploadDirect({ kind: "blob", blob, name: filename });
    }

    // Local FS path from the timeline or the file picker â€” let the Node
    // bridge read the bytes and PUT them directly.
    return reap.uploadDirect({ kind: "path", path: clip.path, name: filename });
  }

  async function autoImportToTimeline(
    status: ReapStatusResponse,
    results: HTMLElement,
  ): Promise<void> {
    const url = status.url ?? status.urls?.[0] ?? "";
    if (!url) {
      results.replaceChildren(errorCard("Reap finished but returned no asset URL."));
      return;
    }

    try {
      results.replaceChildren(busyCard("Adding to timelineâ€¦"));
      const local = await api.downloadAsset(url, `reap-${Date.now()}.mp4`);
      const placed = await evalES<{ ok: boolean; placed: boolean; reason?: string }>(
        "importAndPlaceOnTimeline", local,
      );

      results.replaceChildren(successCard(url, placed, local));
      toast(
        placed?.placed ? "Added to timeline" : "Imported to project bin",
        "success",
      );
    } catch (err) {
      // Fall back to the manual result card if auto-place fails.
      results.replaceChildren(defaultResult(status));
      toast(`Auto-import failed: ${(err as Error).message}`, "error");
    }
  }
}

function successCard(
  url: string,
  placed: { ok: boolean; placed: boolean; reason?: string } | null,
  localPath?: string,
): HTMLElement {
  return el("div.col.gap-3", null,
    draggableVideoFrame(url, `reap-${Date.now()}.mp4`, localPath),
    el("div.state-card",
      { style: { padding: "12px", textAlign: "left" } },
      el("div.row.gap-2",
        null,
        el("div.state-card__icon", { style: { margin: "0" } }, icon("check", 16)),
        el("div.col.gap-1.grow",
          null,
          el("div", { style: { fontSize: "13px", fontWeight: "600" } },
            placed?.placed ? "Added to your timeline" : "Imported to project bin"),
          el("div.dim", { style: { fontSize: "11px" } },
            placed?.placed
              ? "Open Premiere to see the clip on the active sequence, or drag the preview again."
              : (placed?.reason ?? "Drag the preview from here onto the timeline.")),
        ),
      ),
    ),
  );
}

function draggableVideoFrame(url: string, fileName: string, initialLocalPath?: string): HTMLElement {
  let dragPath: string | null = initialLocalPath ?? null;
  let dragPending: Promise<string> | null = null;

  const warmDragAsset = async () => {
    if (dragPath) return dragPath;
    if (dragPending) return dragPending;
    dragPending = api.downloadAsset(url, fileName)
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

  return el("div", {
    style: {
      borderRadius: "14px",
      overflow: "hidden",
      background: "var(--bg-card)",
      border: "1px solid var(--line-soft)",
      cursor: "grab",
      userSelect: "none",
    },
    draggable: "true",
    title: "Drag onto the timeline",
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
      transfer.setData("DownloadURL", `video/mp4:${fileName}:${fileUri}`);
    },
  },
      el("video", {
        src: url, controls: "true",
        style: { width: "100%", display: "block" },
      }),
  );
}

// â”€â”€â”€ Result + state cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function defaultResult(status: ReapStatusResponse): HTMLElement {
  const url = status.url ?? status.urls?.[0] ?? "";
  return el("div.col.gap-3", null,
    draggableVideoFrame(url, `reap-${Date.now()}.mp4`),
    el("div.row.gap-2", { style: { marginTop: "12px" } },
      el("button.btn-primary",
        {
          onClick: async () => {
            if (!url) return;
            try {
              const local = await api.downloadAsset(url, `reap-${Date.now()}.mp4`);
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

function busyCard(text: string): HTMLElement {
  return el("div.state-card", null,
    ProcessingLoader(text),
    el("div.state-card__subtitle", null, "Reap projects usually finish in 1-5 minutes."),
  );
}

function progressCard(args: { title: string; status: string; progress?: number }): HTMLElement {
  const pct = typeof args.progress === "number"
    ? Math.max(0, Math.min(100, Math.round(args.progress)))
    : null;
  return el("div.state-card", null,
    el("div.state-card__icon", null, icon("spark", 22)),
    el("div.state-card__title", null, args.title),
    el("div.state-card__subtitle", null, args.status),
    el("div.captions-progress" + (pct == null ? ".captions-progress--indeterminate" : ""), null,
      el("div.captions-progress__bar", { style: pct == null ? undefined : { width: `${pct}%` } }),
    ),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function activeJobKey(tool: ReapTool): string {
  return `saadstudio.reap.${tool}.activeJob`;
}

function readActiveJob(tool: ReapTool): ActiveReapToolJob | null {
  try {
    const raw = localStorage.getItem(activeJobKey(tool));
    return raw ? JSON.parse(raw) as ActiveReapToolJob : null;
  } catch {
    return null;
  }
}

function saveActiveJob(job: ActiveReapToolJob) {
  localStorage.setItem(activeJobKey(job.tool), JSON.stringify(job));
}

function clearActiveJobForTool(tool: ReapTool) {
  localStorage.removeItem(activeJobKey(tool));
}

function isTerminalStatus(status: ReapStatusResponse["status"]): boolean {
  return status === "completed" || status === "failed" || status === "invalid" || status === "expired";
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFileUri(localPath: string): string {
  const normalized = localPath.replace(/\\/g, "/");
  if (normalized.startsWith("file://")) return normalized;
  if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${normalized}`;
  if (normalized.startsWith("/")) return `file://${normalized}`;
  return `file:///${normalized}`;
}

function shortenPath(p: string, max = 48): string {
  if (p.length <= max) return p;
  return `${p.slice(0, 12)}â€¦${p.slice(-(max - 15))}`;
}

function pathToVideoSrc(p: string): string {
  if (!p) return "";
  if (p.startsWith("blob:") || p.startsWith("data:") || p.startsWith("http")) return p;
  const forward = p.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}

// Helpers for tool pages that need to render non-video results.

export function jsonResultCard(status: ReapStatusResponse, title: string): HTMLElement {
  const text = status.metadata ? JSON.stringify(status.metadata, null, 2) : "";
  return el("div.col.gap-3", null,
    el("div.state-card",
      null,
      el("div.state-card__title", null, title),
      el("div.state-card__subtitle", null, "Result ready."),
      text
        ? el("pre.mono",
            {
              style: {
                marginTop: "12px",
                padding: "10px 12px",
                background: "var(--bg-input)",
                border: "1px solid var(--line-soft)",
                borderRadius: "8px",
                fontSize: "10px",
                lineHeight: "1.4",
                maxHeight: "320px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: "left",
              },
            },
            text)
        : null,
    ),
  );
}
