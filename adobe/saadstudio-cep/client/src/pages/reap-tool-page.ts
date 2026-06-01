/** Shared page shell for the Reap.video tools.
 *
 * Flow:
 *   1. Auto-detect a clip on the Premiere / AE timeline (or let the user
 *      pick one with the file picker).
 *   2. Upload it to R2 to obtain a public sourceUrl.
 *   3. POST /api/panel/reap/start with the tool + sourceUrl + options.
 *   4. Poll /api/panel/reap/status until the project terminates.
 *   5. Render the final asset (or transcript JSON) with an Import button
 *      so the user can drop the result back onto the timeline.
 *
 * Each tool page (Add Captions, AI Dubbing, …) is a tiny wrapper around
 * this shell that supplies its own options dock and (optionally) a
 * custom result renderer. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { PromptDock, type DockOption } from "../components/prompt-dock";
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
  /** Tool-specific selector pills (language, aspect, preset, …). */
  options: DockOption[];
  /** Show the textarea so the user can describe what they want. */
  showPrompt?: boolean;
  /** Turn the dock-selected options into the body sent to /reap/start. */
  buildOptions: (vals: Record<string, string>) => Record<string, unknown>;
  /** Custom result renderer; defaults to a <video controls> + Import button. */
  renderResult?: (status: ReapStatusResponse) => HTMLElement;
}

interface SourceClip {
  path: string;
  name?: string;
  origin: "timeline" | "upload";
  /** Whatever the upload step produced — populated lazily. */
  publicUrl?: string;
}

export function ReapToolPage(cfg: ReapToolConfig): HTMLElement {
  const body = el("div.app-main");
  const root = el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader(cfg.title),
    body,
  );

  let mode: "auto" | "uploaded" = "auto";
  let currentClipKey: string | null = null;

  showEmpty();

  const watcher = watchTimelineSelection((clip) => {
    if (mode === "uploaded") return;
    const key = clip ? `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}` : null;
    if (key === currentClipKey) return;
    currentClipKey = key;
    if (clip) showOptions({ path: clip.path, name: clip.name, origin: "timeline" });
    else showEmpty();
  });
  watcher.attachTo(root);

  return root;

  // ─── States ──────────────────────────────────────────────────────────

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
    const preview = el("video", {
      src: previewSrc,
      controls: "true",
      muted: "true",
      preload: "metadata",
      style: { width: "100%", maxHeight: "240px", background: "#000",
               borderRadius: "10px", display: "block" },
    });

    const status = el("div.state-card",
      { style: { marginBottom: "16px", padding: "12px" } },
      el("div.col.gap-3", null,
        preview,
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
    body.replaceChildren(status, results);

    const dock = PromptDock({
      placeholder: cfg.showPrompt
        ? "Optional: extra instructions for the tool…"
        : undefined,
      options: cfg.options,
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
    try {
      const filename = clip.name ?? `clip-${Date.now()}.mp4`;

      // 1) Push the source DIRECTLY to Reap's presigned URL (no R2 hop).
      results.replaceChildren(busyCard("Uploading to Reap…"));
      const uploadId = await uploadSourceDirect(clip, filename);

      // 2) Kick off the tool with the uploadId.
      results.replaceChildren(busyCard("Starting Reap job…"));

      const final = await reap.run(
        {
          tool: cfg.tool,
          uploadId,
          filename,
          options: cfg.buildOptions(options),
          prompt,
        },
        (s) => {
          if (s.status === "queued") results.replaceChildren(busyCard("Queued…"));
          else if (s.status === "processing") {
            const pct = typeof s.progress === "number"
              ? ` ${Math.round(s.progress)}%` : "";
            results.replaceChildren(busyCard(`Processing${pct}…`));
          }
        },
      );

      if (final.status !== "completed") {
        throw new Error(final.error ?? `Reap job ${final.status}`);
      }

      // 3) Custom result renderers (e.g. Transcription) get full control.
      //    Everything else: auto-drop the asset on the timeline so the
      //    user doesn't have to click an extra Import button.
      if (cfg.renderResult) {
        results.replaceChildren(cfg.renderResult(final));
      } else {
        await autoImportToTimeline(final, results);
      }

      store.refreshCreditsOnly();
      store.refreshRecent();
    } catch (err) {
      results.replaceChildren(errorCard((err as Error).message));
      toast((err as Error).message, "error");
    }
  }

  async function uploadSourceDirect(clip: SourceClip, filename: string): Promise<string> {
    // Source is already a public http(s) URL — fetch then PUT to Reap.
    if (/^https?:\/\//i.test(clip.path)) {
      const blob = await fetch(clip.path).then((r) => r.blob());
      return reap.uploadDirect({ kind: "blob", blob, name: filename });
    }

    // Upload picker (blob: URL).
    if (clip.path.startsWith("blob:")) {
      const blob = await fetch(clip.path).then((r) => r.blob());
      return reap.uploadDirect({ kind: "blob", blob, name: filename });
    }

    // Local FS path from the timeline or the file picker — let the Node
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
      results.replaceChildren(busyCard("Adding to timeline…"));
      const local = await api.downloadAsset(url, `reap-${Date.now()}.mp4`);
      const placed = await evalES<{ ok: boolean; placed: boolean; reason?: string }>(
        "importAndPlaceOnTimeline", local,
      );

      results.replaceChildren(successCard(url, placed));
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
): HTMLElement {
  return el("div.col.gap-3", null,
    el("div", {
      style: { borderRadius: "14px", overflow: "hidden",
               background: "var(--bg-card)", border: "1px solid var(--line-soft)" },
    },
      el("video", {
        src: url, controls: "true",
        style: { width: "100%", display: "block" },
      }),
    ),
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
              ? "Open Premiere to see the clip on the active sequence."
              : (placed?.reason ?? "Drag from the project bin onto the timeline.")),
        ),
      ),
    ),
  );
}

// ─── Result + state cards ────────────────────────────────────────────────

function defaultResult(status: ReapStatusResponse): HTMLElement {
  const url = status.url ?? status.urls?.[0] ?? "";
  return el("div.col.gap-3", null,
    el("div", {
      style: { borderRadius: "14px", overflow: "hidden",
               background: "var(--bg-card)", border: "1px solid var(--line-soft)" },
    },
      el("video", {
        src: url,
        controls: "true",
        style: { width: "100%", display: "block" },
      }),
    ),
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
    el("div.state-card__icon", null, icon("spark", 22)),
    el("div.state-card__title", null, text),
    el("div.state-card__subtitle", null, "Reap projects usually finish in 1-5 minutes."),
  );
}

function errorCard(message: string): HTMLElement {
  return el("div.state-card", null,
    el("div.state-card__title", null, "Failed"),
    el("div.state-card__subtitle", null, message),
  );
}

function shortenPath(p: string, max = 48): string {
  if (p.length <= max) return p;
  return `${p.slice(0, 12)}…${p.slice(-(max - 15))}`;
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
