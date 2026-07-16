/** Image generation page.
 *
 * Backed by POST /api/panel/generate/image. The model list mirrors what the
 * Next.js MODEL_ROUTING already declares so add/remove a model in one place
 * (lib/apps-data or MODEL_ROUTING) and update both as needed. */

import { FeaturePage } from "./feature-page";
import { api } from "../lib/api";

const MODELS = [
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "nano-banana-2", label: "Nano Banana 2" },
  { value: "nano-banana-2-lite", label: "Nano Banana 2 Lite" },
  { value: "google/nano-banana", label: "Nano Banana" },
  { value: "gpt-image-2", label: "GPT Image 2" },
];
const ASPECTS = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];
// kie.ai expects uppercase resolution tokens ("1K" / "2K" / "4K").
// Lowercase values get rejected as "not within the range of allowed options".
const RESOLUTIONS = [
  { value: "1K", label: "1k" },
  { value: "2K", label: "2k" },
  { value: "4K", label: "4k" },
];
const GPT_QUALITIES = [
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function ImageGenPage(): HTMLElement {
  return FeaturePage({
    title: "Image generation",
    galleryKind: "image",
    dock: {
      placeholder: "Describe the image you want to generate…",
      showAttach: true,
      options: [
        { key: "model", label: "Model", value: "nano-banana-pro", options: MODELS },
        { key: "aspect", label: "Aspect", value: "1:1", options: ASPECTS },
        {
          key: "resolution",
          label: "Quality",
          value: "2K",
          options: RESOLUTIONS,
          getOptions: (state) => (state.options.model === "gpt-image-2" ? GPT_QUALITIES : RESOLUTIONS),
        },
      ],
    },
    submit: async ({ prompt, attachments, options }) => {
      if (attachments.some((file) => !file.type.startsWith("image/"))) {
        throw new Error("Image generation accepts only an image reference attachment.");
      }
      if (attachments.length > 1) {
        throw new Error("Image generation accepts only one reference image.");
      }

      const imageUrl = attachments[0]
        ? await api.uploadFileToStorage(attachments[0], "image")
        : undefined;

      const selectedModel = options.model === "gpt-image-2"
        ? (imageUrl ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image")
        : options.model;

      return api.generate.image({
        prompt,
        model: selectedModel,
        aspect: options.aspect,
        resolution: options.resolution,
        ...(imageUrl ? { imageUrl } : {}),
      });
    },
  });
}
