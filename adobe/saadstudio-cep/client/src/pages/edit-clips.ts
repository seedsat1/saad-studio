/** Edit Videos — Reap /create-clips.
 *
 * Generates short-form clips from a long source video. The user can
 * steer the cut with a prompt (genre, mood, focus topic). Multi-clip
 * results render as a vertical strip with per-clip Import buttons. */

import { el } from "../lib/dom";
import { ReapToolPage } from "./reap-tool-page";
import { icon } from "../lib/icons";
import { api } from "../lib/api";
import { evalES } from "../lib/cep";
import { toast } from "../lib/toast";

const GENRES = [
  { value: "auto",        label: "Auto" },
  { value: "podcast",     label: "Podcast" },
  { value: "interview",   label: "Interview" },
  { value: "keynote",     label: "Keynote" },
  { value: "vlog",        label: "Vlog" },
  { value: "comedy",      label: "Comedy" },
  { value: "education",   label: "Education" },
];

const DURATIONS = [
  { value: "15-30",  label: "15-30s" },
  { value: "30-60",  label: "30-60s" },
  { value: "60-90",  label: "60-90s" },
];

const ASPECTS = [
  { value: "9:16", label: "9:16" },
  { value: "1:1",  label: "1:1" },
  { value: "16:9", label: "16:9" },
];

const RESOLUTIONS = [
  { value: "720p",  label: "720p" },
  { value: "1080p", label: "1080p" },
];

export function EditClipsPage(): HTMLElement {
  return ReapToolPage({
    title: "Edit Videos",
    tool: "edit-videos",
    showPrompt: true,
    hint: "Generate short clips from your long-form source. Describe the angle or hook to steer the cuts.",
    options: [
      { key: "genre",      label: "Genre",      value: "auto",  options: GENRES },
      { key: "duration",   label: "Duration",   value: "30-60", options: DURATIONS },
      { key: "aspect",     label: "Aspect",     value: "9:16",  options: ASPECTS },
      { key: "resolution", label: "Resolution", value: "1080p", options: RESOLUTIONS },
    ],
    buildOptions: (vals) => ({
      genre: vals.genre,
      clipDurations: vals.duration,
      reframeClips: true,
      exportResolution: vals.resolution,
      exportOrientation: vals.aspect,
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
            await evalES("importMediaFromPath", local);
            toast(`Imported clip ${idx}`, "success");
          } catch (err) {
            toast(`Import failed: ${(err as Error).message}`, "error");
          }
        },
      }, icon("import", 12), "Import"),
    ),
  );
}
