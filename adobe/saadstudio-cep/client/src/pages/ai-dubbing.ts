/** AI Dubbing — Reap /create-dubbing.
 *
 * Pulls the supported languages from /api/panel/reap/dubbing-languages
 * and exposes them through the dock's pill picker. Falls back to a
 * curated list of the major dubbing targets when the upstream call
 * fails so the UI is always usable. */

import { ReapToolPage } from "./reap-tool-page";
import { reap } from "../lib/api";
import { openModelPicker } from "../components/model-picker";

const FALLBACK_LANGUAGES = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "tr", label: "Turkish" },
  { value: "it", label: "Italian" },
];

let cachedLanguages: Array<{ value: string; label: string }> | null = null;
async function getLanguages(): Promise<Array<{ value: string; label: string }>> {
  if (cachedLanguages) return cachedLanguages;
  try {
    const res = await reap.dubbingLanguages();
    cachedLanguages = res.languages.length
      ? res.languages.map((l) => ({ value: l.code, label: l.label }))
      : FALLBACK_LANGUAGES;
  } catch {
    cachedLanguages = FALLBACK_LANGUAGES;
  }
  return cachedLanguages;
}

export function AIDubbingPage(): HTMLElement {
  return ReapToolPage({
    title: "AI Dubbing",
    tool: "dubbing",
    hint: "Pick a clip and choose the language you want it dubbed into.",
    options: [
      {
        key: "language",
        label: "Language",
        value: "en",
        options: FALLBACK_LANGUAGES,
        onPick: async () => {
          const langs = await getLanguages();
          return openModelPicker({
            title: "Dub into…",
            options: langs,
          });
        },
      },
    ],
    buildOptions: (vals) => ({
      language: vals.language ?? "en",
    }),
  });
}
