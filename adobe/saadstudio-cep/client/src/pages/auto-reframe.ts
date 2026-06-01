/** Auto Reframe — Reap /create-reframe.
 *
 * Body shape per https://docs.reap.video/api-reference/create-reframe :
 *   - uploadId (required)
 *   - genre: "talking" | "screenshare" | "gaming"
 *   - orientation: "portrait" | "square"  (NOT aspect-ratio strings)
 *   - disableAutoSplit: boolean
 *
 * Note: this endpoint is Studio-plan only on Reap. */

import { ReapToolPage } from "./reap-tool-page";

const ORIENTATIONS = [
  { value: "portrait", label: "Portrait (9:16)" },
  { value: "square",   label: "Square (1:1)" },
];

const GENRES = [
  { value: "talking",     label: "Talking head / interview" },
  { value: "screenshare", label: "Screen share / demo" },
  { value: "gaming",      label: "Gaming" },
];

const AUTO_SPLIT = [
  { value: "on",  label: "Auto-split long videos" },
  { value: "off", label: "Single output (no split)" },
];

export function AutoReframePage(): HTMLElement {
  return ReapToolPage({
    title: "Auto Reframe",
    tool: "reframe",
    hint: "Reframe the source clip to a new orientation while keeping the subject centred.",
    options: [
      { key: "orientation", label: "Orientation", value: "portrait", options: ORIENTATIONS },
      { key: "genre",       label: "Genre",       value: "talking",  options: GENRES },
      { key: "autoSplit",   label: "Split",       value: "on",       options: AUTO_SPLIT },
    ],
    buildOptions: (vals) => ({
      orientation: vals.orientation,
      genre: vals.genre,
      disableAutoSplit: vals.autoSplit === "off",
    }),
  });
}
