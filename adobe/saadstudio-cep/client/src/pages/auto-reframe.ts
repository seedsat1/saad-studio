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
import { t } from "../lib/i18n";

const ORIENTATIONS = [
  { value: "portrait", label: "Portrait (9:16)" },
  { value: "square",   label: "Square (1:1)" },
];

export function AutoReframePage(): HTMLElement {
  return ReapToolPage({
    title: "Auto Reframe",
    tool: "reframe",
    hint: "Reframe the source clip to a new orientation while keeping the subject centred.",
    allowEmptySubmit: true,
    validate: (clip) => {
      const duration = clip.durationSec;
      if (duration != null && duration > 0) {
        if (duration < 3) {
          throw new Error(t("reframeMinDurationError"));
        }
        if (duration > 15 * 60) {
          throw new Error(t("reframeMaxDurationError"));
        }
      }
      if (clip.size != null && clip.size > 5 * 1024 * 1024 * 1024) {
        throw new Error(t("reframeFileTooLargeError"));
      }
    },
    options: [
      { key: "orientation", label: "Orientation", value: "portrait", options: ORIENTATIONS },
    ],
    toggles: [
      { key: "faceTracking", label: "Face tracking", value: true },
    ],
    buildOptions: (vals) => ({
      orientation: vals.orientation,
      // Reap's app exposes "Face tracking", but the Automation API exposes
      // the analysis mode as `genre`. Map the UI toggle to the closest API modes.
      genre: vals.faceTracking === "off" ? "screenshare" : "talking",
      disableAutoSplit: true,
    }),
  });
}
