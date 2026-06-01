/** Edit Videos — Reap /create-clips.
 *
 * Generates short-form clips from a long source video. Body shape per
 * https://docs.reap.video/api-reference/create-clips :
 *   - clipDurations: integer[][] e.g. [[30,60],[60,90]]
 *   - exportResolution: 720 | 1080 | 1440 | 2160 (integer)
 *   - exportOrientation: "portrait" | "landscape" | "square"
 *   - genre: "talking" | "screenshare" | "gaming" */

import { el } from "../lib/dom";
import { ReapToolPage } from "./reap-tool-page";
import { icon } from "../lib/icons";
import { api } from "../lib/api";
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
    title: "Edit Videos",
    tool: "edit-videos",
    showPrompt: true,
    hint: "Generate short clips from your long-form source. Describe the angle or hook to steer the cuts.",
    options: [
      { key: "genre",       label: "Genre",       value: "talking",  options: GENRES },
      { key: "duration",    label: "Duration",    value: "30-60",    options: DURATIONS },
      { key: "orientation", label: "Orientation", value: "portrait", options: ORIENTATIONS },
      { key: "resolution",  label: "Resolution",  value: "1080",     options: RESOLUTIONS },
    ],
    buildOptions: (vals) => ({
      genre: vals.genre,
      clipDurations: [parseDurationRange(vals.duration)],
      reframeClips: true,
      exportResolution: parseInt(vals.resolution, 10),
      exportOrientation: vals.orientation,
      enableHighlights: true,
    }),
    renderResult: (status) => {
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
          `${urls.length} clip${urls.length === 1 ? "" : "s"} ready.`),
        ...urls.map((url, i) => clipCard(url, i + 1)),
      );
    },
  });
}

function clipCard(url: string, idx: number): HTMLElement {
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
        onClick: async () => {
          try {
            const local = await api.downloadAsset(url, `reap-clip-${idx}.mp4`);
            await evalES("importAndPlaceOnTimeline", local);
            toast(`Added clip ${idx} to timeline`, "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
      }, icon("import", 12), "Import"),
    ),
  );
}
