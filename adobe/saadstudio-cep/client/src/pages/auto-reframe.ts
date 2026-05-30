/** Auto Reframe — Reap /create-reframe.
 *
 * Reap doesn't take an explicit aspect parameter on /create-reframe (it
 * uses the project's configured target). We forward an "aspect" option
 * anyway so future Reap API changes can pick it up without touching the
 * UI. */

import { ReapToolPage } from "./reap-tool-page";

const ASPECTS = [
  { value: "9:16", label: "9:16 (Stories / Reels)" },
  { value: "1:1",  label: "1:1 (Square)" },
  { value: "4:5",  label: "4:5 (Portrait)" },
  { value: "16:9", label: "16:9 (Wide)" },
];

export function AutoReframePage(): HTMLElement {
  return ReapToolPage({
    title: "Auto Reframe",
    tool: "reframe",
    hint: "Reframe the source clip to a new aspect ratio while keeping the subject centred.",
    options: [
      { key: "aspect", label: "Aspect", value: "9:16", options: ASPECTS },
    ],
    buildOptions: (vals) => ({
      aspect: vals.aspect ?? "9:16",
    }),
  });
}
