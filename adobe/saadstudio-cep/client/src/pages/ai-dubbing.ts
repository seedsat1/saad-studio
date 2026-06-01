/** AI Dubbing — Reap /create-dubbing.
 *
 * Body shape per https://docs.reap.video/api-reference/create-dubbing :
 *   - uploadId (required)
 *   - sourceLanguage (required) — regional code like "en-US", "es-ES"
 *   - targetLanguage (required) — regional code like "fr-FR", "ja-JP"
 *
 * The picker offers regional codes (not bare language codes) because the
 * Reap dubbing engine routes to a different voice model per region. */

import { ReapToolPage } from "./reap-tool-page";
import { reap, type ReapRawLanguageOption } from "../lib/api";
import { openModelPicker } from "../components/model-picker";

const EMPTY_LANGUAGES: Array<{ value: string; label: string }> = [];

let cachedSource: Array<{ value: string; label: string }> | null = null;
let cachedTarget: Array<{ value: string; label: string }> | null = null;

async function loadLanguages() {
  if (cachedSource && cachedTarget) return;
  const res = await reap.dubbingLanguages();
  cachedSource = mapReapLanguages(res.sourceLanguages);
  cachedTarget = mapReapLanguages(res.targetLanguages);
}

export function AIDubbingPage(): HTMLElement {
  return ReapToolPage({
    title: "AI Dubbing",
    tool: "dubbing",
    hint: "Dub the source clip's voice track into another language with lip-aware timing.",
    options: [
      {
        key: "sourceLanguage",
        label: "From",
        value: "",
        options: EMPTY_LANGUAGES,
        onPick: async () => {
          await loadLanguages();
          return openModelPicker({
            title: "Source language",
            options: cachedSource ?? EMPTY_LANGUAGES,
          });
        },
      },
      {
        key: "targetLanguage",
        label: "To",
        value: "",
        options: EMPTY_LANGUAGES,
        onPick: async () => {
          await loadLanguages();
          return openModelPicker({
            title: "Target language",
            options: cachedTarget ?? EMPTY_LANGUAGES,
          });
        },
      },
    ],
    buildOptions: (vals) => ({
      sourceLanguage: vals.sourceLanguage ?? "",
      targetLanguage: vals.targetLanguage ?? "",
    }),
  });
}

function mapReapLanguages(items: ReapRawLanguageOption[] | undefined) {
  return Array.isArray(items)
    ? items
      .map((item) => {
        if (!item?.code) return null;
        return {
          value: item.code,
          label: item.displayName || item.name || item.code,
        };
      })
      .filter((item): item is { value: string; label: string } => item !== null)
    : EMPTY_LANGUAGES;
}
