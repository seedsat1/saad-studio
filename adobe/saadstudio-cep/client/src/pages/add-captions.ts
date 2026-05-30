/** Add Captions — Reap /create-captions.
 *
 * Loads the caption presets from /api/panel/reap/caption-presets at
 * mount time so the picker reflects whatever the Reap account currently
 * has available. Falls back to a small built-in list when the upstream
 * call fails (offline preview, missing API key, …). */

import { ReapToolPage } from "./reap-tool-page";
import { reap } from "../lib/api";
import { openModelPicker } from "../components/model-picker";

const FALLBACK_PRESETS = [
  { value: "default",     label: "Default" },
  { value: "bold",        label: "Bold" },
  { value: "minimal",     label: "Minimal" },
  { value: "subtitles",   label: "Subtitles" },
  { value: "yellow-pop",  label: "Yellow Pop" },
];

let cachedPresets: Array<{ value: string; label: string }> | null = null;
async function getPresets(): Promise<Array<{ value: string; label: string }>> {
  if (cachedPresets) return cachedPresets;
  try {
    const res = await reap.captionPresets();
    cachedPresets = res.presets.length
      ? res.presets.map((p) => ({ value: p.id, label: p.label }))
      : FALLBACK_PRESETS;
  } catch {
    cachedPresets = FALLBACK_PRESETS;
  }
  return cachedPresets;
}

export function AddCaptionsPage(): HTMLElement {
  return ReapToolPage({
    title: "Add Captions",
    tool: "captions",
    hint: "Pick a clip and we'll burn styled captions in.",
    options: [
      {
        key: "captionsPreset",
        label: "Style",
        value: "default",
        options: FALLBACK_PRESETS,
        onPick: async () => {
          const presets = await getPresets();
          return openModelPicker({
            title: "Caption style",
            options: presets,
          });
        },
      },
    ],
    buildOptions: (vals) => ({
      captionsPreset: vals.captionsPreset ?? "default",
    }),
  });
}
