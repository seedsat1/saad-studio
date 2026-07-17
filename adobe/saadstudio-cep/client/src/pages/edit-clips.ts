/** Edit Videos — Reap /create-clips.
 *
 * Generates short-form clips from a long source video. Body shape per
 * https://docs.reap.video/api-reference/create-clips :
 *   - clipDurations: integer[][] e.g. [[30,60],[60,90]]
 *   - exportResolution: 720 | 1080 | 1440 | 2160 (integer)
 *   - exportOrientation: "portrait" | "landscape" | "square"
 *   - genre: "talking" | "screenshare" | "gaming"
 *
 * The "Captions" pill lets the user opt into editable captions inside
 * Premiere: we ask Reap to render clean clips (enableCaptions: false) and
 * then run /create-transcription on each clipUrl to produce an SRT that
 * Premiere imports as a caption track on top of the clip. */

import { el } from "../lib/dom";
import { ReapToolPage } from "./reap-tool-page";
import { icon } from "../lib/icons";
import { api, reap, type ReapStatusResponse } from "../lib/api";
import { evalES } from "../lib/cep";
import { toast } from "../lib/toast";
import { t } from "../lib/i18n";

const GENRES = [
  { value: "talking",     label: "Talking head / interview" },
  { value: "screenshare", label: "Screen share / demo" },
  { value: "gaming",      label: "Gaming" },
];

// Each value maps to a clipDurations entry the API understands.
const DURATIONS = [
  { value: "0-30",    label: "Under 30s" },
  { value: "30-60",   label: "30 – 60s" },
  { value: "60-90",   label: "60 – 90s" },
  { value: "90-180",  label: "90s – 3m" },
  { value: "180-300", label: "3 – 5m" },
];

const ORIENTATIONS = [
  { value: "portrait",  label: "Portrait (9:16)" },
  { value: "square",    label: "Square (1:1)" },
  { value: "landscape", label: "Landscape (16:9)" },
];

// Match Reap's free-plan UI: 2K/4K require a paid upgrade and Reap rejects
// the job otherwise. We surface only the universally-supported resolutions.
const RESOLUTIONS = [
  { value: "720",  label: "720p" },
  { value: "1080", label: "1080p" },
];

const LANGUAGES = [
  { value: "auto", label: "Auto" },
  { value: "en",   label: "English" },
  { value: "ar",   label: "Arabic" },
  { value: "es",   label: "Spanish" },
  { value: "fr",   label: "French" },
  { value: "de",   label: "German" },
  { value: "pt",   label: "Portuguese" },
  { value: "hi",   label: "Hindi" },
];

function parseDurationRange(value: string): [number, number] {
  const [min, max] = value.split("-").map((n) => parseInt(n, 10));
  return [min, max];
}

export function EditClipsPage(): HTMLElement {
  return ReapToolPage({
    title: "AI Clip Maker",
    tool: "edit-videos",
    showPrompt: true,
    allowEmptySubmit: true,
    validate: (clip) => {
      const duration = clip.durationSec;
      if (duration != null && duration > 0) {
        if (duration < 60) {
          throw new Error(t("editClipsMinDurationError"));
        }
        if (duration > 3 * 3600) {
          throw new Error(t("editClipsMaxDurationError"));
        }
      }
      if (clip.size != null && clip.size > 5 * 1024 * 1024 * 1024) {
        throw new Error(t("editClipsFileTooLargeError"));
      }
    },
    hint: "Generate short clips from your long-form source. Describe the angle or hook to steer the cuts.",
    options: [
      { key: "genre",        label: "Genre",       value: "talking",  options: GENRES },
      { key: "duration",     label: "Duration",    value: "30-60",    options: DURATIONS },
      { key: "orientation",  label: "Orientation", value: "portrait", options: ORIENTATIONS },
      { key: "language",     label: "Language",    value: "auto",     options: LANGUAGES },
      { key: "resolution",   label: "Resolution",  value: "720",      options: RESOLUTIONS },
    ],
    toggles: [
      { key: "editableCaptions", label: "Editable captions", value: false },
    ],
    buildOptions: (vals) => ({
      genre: vals.genre,
      clipDurations: [parseDurationRange(vals.duration)],
      reframeClips: true,
      exportResolution: parseInt(vals.resolution, 10),
      exportOrientation: vals.orientation,
      enableHighlights: true,
      // "auto" means omit so Reap auto-detects the spoken language.
      language: vals.language === "auto" ? undefined : vals.language,
      // Editable mode = clean clips (no caption burn-in); SRT comes from a
      // separate /create-transcription run per clip at import time.
      enableCaptions: vals.editableCaptions !== "on",
    }),
    renderResult: (status, vals) => {
      const editable = vals.options.editableCaptions === "on";
      const orientation = vals.options.orientation || "portrait";
      const urls = (status.urls?.length ? status.urls : (status.url ? [status.url] : []))
        .filter((u) => typeof u === "string" && u.length > 0);

      if (!urls.length) {
        return el("div.state-card", null,
          el("div.state-card__title", null, "Done, but no clips returned."),
          el("div.state-card__subtitle", null,
            "Check the project on saadstudio.app to see what Reap produced."),
        );
      }

      return el("div.col.gap-3", null,
        el("div.dim", { style: { fontSize: "12px", padding: "0 4px" } },
          `${urls.length} clip${urls.length === 1 ? "" : "s"} ready`
          + (editable ? " — captions will be editable in Premiere." : ".")
          + " Drag to timeline or click Import."),
        el("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "10px",
          },
        }, ...urls.map((url, i) => clipCard(url, i + 1, editable, orientation))),
      );
    },
  });
}

function clipCard(
  url: string,
  idx: number,
  editable: boolean,
  orientation: string,
): HTMLElement {
  // Cache the downloaded path so a second drag is instant.
  let cachedLocalPath: string | null = null;
  let downloadPromise: Promise<string> | null = null;

  const aspectRatio = orientation === "landscape" ? "16 / 9"
    : orientation === "square"   ? "1 / 1"
    : "9 / 16";

  const ensureLocal = (): Promise<string> => {
    if (cachedLocalPath) return Promise.resolve(cachedLocalPath);
    if (downloadPromise) return downloadPromise;
    downloadPromise = api.downloadAsset(url, `reap-clip-${idx}.mp4`)
      .then((p) => { cachedLocalPath = p; return p; });
    return downloadPromise;
  };

  const video = el("video", {
    src: url,
    muted: "true",
    preload: "metadata",
    playsinline: "true",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      pointerEvents: "none",
    },
  }) as HTMLVideoElement;

  const playBadge = el("div", {
    style: {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.25)",
      color: "#fff",
      fontSize: "20px",
      pointerEvents: "none",
      transition: "opacity 120ms ease",
    },
  }, "▶");

  const thumb = el("div", {
    style: {
      position: "relative",
      background: "#000",
      aspectRatio,
      overflow: "hidden",
      cursor: "pointer",
    },
    onClick: () => {
      if (video.paused) {
        video.play().catch(() => { /* ignored */ });
        playBadge.style.opacity = "0";
      } else {
        video.pause();
        playBadge.style.opacity = "1";
      }
    },
  }, video, playBadge);

  const card = el("div", {
    draggable: "true",
    title: "Drag onto the timeline or click Import",
    style: {
      borderRadius: "10px",
      overflow: "hidden",
      background: "var(--bg-card)",
      border: "1px solid var(--line-soft)",
      cursor: "grab",
      userSelect: "none",
    },
    onDragstart: async (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.dataTransfer.effectAllowed = "copy";
      if (!cachedLocalPath) {
        // Kick off the download in the background; let the user know the
        // drag will only succeed once it lands.
        ensureLocal().then(() => toast(`Clip ${idx} ready to drag.`, "info"));
        toast(`Preparing clip ${idx}… drag again in a moment.`, "info");
        e.preventDefault();
        return;
      }
      // Premiere CEP picks up either text/uri-list (file://) or a plain
      // path on text/plain. We set both for maximum compatibility.
      const fsPath = cachedLocalPath.replace(/\\/g, "/");
      e.dataTransfer.setData("text/uri-list", `file:///${fsPath}`);
      e.dataTransfer.setData("text/plain", cachedLocalPath);
    },
    onDragend: (e: DragEvent) => {
      // If the user dropped outside the panel (likely the timeline),
      // fall back to a programmatic import so nothing is lost.
      if (e.dataTransfer && e.dataTransfer.dropEffect === "none" && cachedLocalPath) {
        // No-op: drop was canceled inside the panel itself.
        return;
      }
    },
  },
    thumb,
    el("div.row.gap-2", {
      style: { padding: "6px 8px", alignItems: "center" },
    },
      el("div.grow", { style: { fontSize: "11px", fontWeight: "600" } }, `Clip ${idx}`),
      el("button.dock-button", {
        title: editable ? "Import + editable captions" : "Import",
        style: { padding: "4px 8px", fontSize: "10px" },
        onClick: editable
          ? () => importClipWithEditableCaptions(url, idx, ensureLocal)
          : () => importClipBurned(url, idx, ensureLocal),
      }, icon("import", 12)),
    ),
  );

  // Pre-cache the file on first hover so dragging works on the first try.
  card.addEventListener("mouseenter", () => { ensureLocal().catch(() => {}); }, { once: true });

  return card;
}

async function importClipBurned(
  url: string,
  idx: number,
  ensureLocal?: () => Promise<string>,
): Promise<void> {
  try {
    const local = ensureLocal
      ? await ensureLocal()
      : await api.downloadAsset(url, `reap-clip-${idx}.mp4`);
    await evalES("importAndPlaceOnTimeline", local);
    toast(`Added clip ${idx} to timeline`, "success");
  } catch (err) {
    toast(`Import failed: ${(err as Error).message}`, "error");
  }
}

async function importClipWithEditableCaptions(
  url: string,
  idx: number,
  ensureLocal?: () => Promise<string>,
): Promise<void> {
  try {
    toast(`Importing clip ${idx}…`, "info");
    const localClip = ensureLocal
      ? await ensureLocal()
      : await api.downloadAsset(url, `reap-clip-${idx}.mp4`);
    await evalES("importAndPlaceOnTimeline", localClip);

    // Reap fetches the clipUrl from its own CDN, so we skip a re-upload.
    toast(`Generating editable captions for clip ${idx}…`, "info");
    const trans = await reap.run({
      tool: "transcription",
      sourceUrl: url,
      filename: `reap-clip-${idx}.mp4`,
      options: {},
    });

    if (trans.status !== "completed") {
      throw new Error(trans.error ?? `Transcription ${trans.status}`);
    }

    const srtUrl = pickSrtUrl(trans);
    if (!srtUrl) {
      toast(`Clip ${idx} imported, but Reap returned no SRT.`, "info");
      return;
    }
    const localSrt = await api.downloadAsset(srtUrl, `reap-clip-${idx}.srt`);
    await evalES("placeCaptionFromSrt", localSrt, localClip);

    toast(`Clip ${idx} added with editable captions`, "success");
  } catch (err) {
    toast(`Import failed: ${(err as Error).message}`, "error");
  }
}

// ─── SRT URL extraction (mirrors add-captions.ts) ────────────────────────
// Reap doesn't formally document which key holds the SRT, so we probe the
// usual aliases plus a recursive sweep through metadata.

function pickSrtUrl(status: ReapStatusResponse): string | null {
  for (const u of status.urls ?? []) {
    if (looksLikeSrt(u)) return u;
  }
  if (typeof status.url === "string" && looksLikeSrt(status.url)) return status.url;
  const meta = (status.metadata as Record<string, unknown> | undefined)?.urls;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    for (const key of [
      "transcription_srt", "transcriptionSrt",
      "srt", "subtitlesSrt", "srtUrl", "subtitleUrl", "captionsSrt",
    ]) {
      const cand = m[key];
      if (typeof cand === "string" && cand.length) return cand;
    }
  }
  return findSrtInUnknown(status.metadata);
}

function looksLikeSrt(url: string): boolean {
  return /\.srt(\?|$|#)/i.test(url);
}

function findSrtInUnknown(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") return looksLikeSrt(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSrtInUnknown(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const preferred = Object.entries(record).filter(([key]) => /srt|subtitle|caption/i.test(key));
  const rest = Object.entries(record).filter(([key]) => !/srt|subtitle|caption/i.test(key));
  for (const [, item] of [...preferred, ...rest]) {
    const found = findSrtInUnknown(item, depth + 1);
    if (found) return found;
  }
  return null;
}
