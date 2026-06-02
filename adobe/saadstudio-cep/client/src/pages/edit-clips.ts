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

const RESOLUTIONS = [
  { value: "720",  label: "720p" },
  { value: "1080", label: "1080p" },
  { value: "1440", label: "1440p" },
  { value: "2160", label: "2160p (4K)" },
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
    hint: "Generate short clips from your long-form source. Describe the angle or hook to steer the cuts.",
    options: [
      { key: "genre",        label: "Genre",       value: "talking",  options: GENRES },
      { key: "duration",     label: "Duration",    value: "30-60",    options: DURATIONS },
      { key: "orientation",  label: "Orientation", value: "portrait", options: ORIENTATIONS },
      { key: "resolution",   label: "Resolution",  value: "1080",     options: RESOLUTIONS },
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
      // Editable mode = clean clips (no caption burn-in); SRT comes from a
      // separate /create-transcription run per clip at import time.
      enableCaptions: vals.editableCaptions !== "on",
    }),
    renderResult: (status, vals) => {
      const editable = vals.options.editableCaptions === "on";
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
          + (editable ? " — captions will be editable in Premiere." : ".")),
        ...urls.map((url, i) => clipCard(url, i + 1, editable)),
      );
    },
  });
}

function clipCard(url: string, idx: number, editable: boolean): HTMLElement {
  return el("div", {
    style: {
      borderRadius: "14px",
      overflow: "hidden",
      background: "var(--bg-card)",
      border: "1px solid var(--line-soft)",
    },
  },
    el("video", {
      src: url,
      controls: "true",
      style: { width: "100%", display: "block", background: "#000" },
    }),
    el("div.row.gap-2", { style: { padding: "10px 12px" } },
      el("div.grow", { style: { fontSize: "12px", fontWeight: "600" } }, `Clip ${idx}`),
      el("button.dock-button", {
        onClick: editable
          ? () => importClipWithEditableCaptions(url, idx)
          : () => importClipBurned(url, idx),
      }, icon("import", 12), editable ? "Import + captions" : "Import"),
    ),
  );
}

async function importClipBurned(url: string, idx: number): Promise<void> {
  try {
    const local = await api.downloadAsset(url, `reap-clip-${idx}.mp4`);
    await evalES("importAndPlaceOnTimeline", local);
    toast(`Added clip ${idx} to timeline`, "success");
  } catch (err) {
    toast(`Import failed: ${(err as Error).message}`, "error");
  }
}

async function importClipWithEditableCaptions(url: string, idx: number): Promise<void> {
  try {
    toast(`Importing clip ${idx}…`, "info");
    const localClip = await api.downloadAsset(url, `reap-clip-${idx}.mp4`);
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
