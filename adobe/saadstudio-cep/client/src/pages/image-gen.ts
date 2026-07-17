/** Image generation page.
 *
 * Backed by POST /api/panel/generate/image. The model list mirrors what the
 * Next.js MODEL_ROUTING already declares so add/remove a model in one place
 * (lib/apps-data or MODEL_ROUTING) and update both as needed. */

import { FeaturePage } from "./feature-page";
import { api, getApiBase } from "../lib/api";
import { t } from "../lib/i18n";

type ImageInputField = "image_url" | "image_input" | "image_urls" | "input_urls";

interface ImageModelSpec {
  value: string;
  label: string;
  maxRefImages: number;
  imageInputField?: ImageInputField;
  refModel?: string;
  textModel?: string;
}

const MODEL_SPECS: ImageModelSpec[] = [
  { value: "nano-banana-pro", label: "Nano Banana Pro", maxRefImages: 8, imageInputField: "image_input" },
  { value: "nano-banana-2", label: "Nano Banana 2", maxRefImages: 14, imageInputField: "image_input" },
  { value: "nano-banana-2-lite", label: "Nano Banana 2 Lite", maxRefImages: 14, imageInputField: "image_input" },
  { value: "google/nano-banana", label: "Nano Banana", maxRefImages: 0 },
  {
    value: "gpt-image-2",
    label: "GPT Image 2",
    maxRefImages: 16,
    imageInputField: "input_urls",
    textModel: "gpt-image-2-text-to-image",
    refModel: "gpt-image-2-image-to-image",
  },
];

const MODELS = MODEL_SPECS.map(({ value, label }) => ({ value, label }));
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

function toAbsoluteReferenceUrl(url: string): string {
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const base = getApiBase().replace(/\/+$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

function modelSpecFor(value: string): ImageModelSpec {
  return MODEL_SPECS.find((item) => item.value === value) ?? MODEL_SPECS[0];
}

export function ImageGenPage(): HTMLElement {
  return FeaturePage({
    title: t("imageGenTitle"),
    galleryKind: "image",
    dock: {
      placeholder: t("imageGenPlaceholder"),
      showAttach: true,
      options: [
        { key: "model", label: t("optionModel"), value: "nano-banana-pro", options: MODELS },
        { key: "aspect", label: t("optionAspect"), value: "1:1", options: ASPECTS },
        {
          key: "resolution",
          label: t("optionQuality"),
          value: "2K",
          options: RESOLUTIONS,
          getOptions: (state) => (state.options.model === "gpt-image-2" ? GPT_QUALITIES : RESOLUTIONS),
        },
      ],
    },
    submit: async ({ prompt, attachments, options }) => {
      const spec = modelSpecFor(options.model);
      if (attachments.some((file) => !file.type.startsWith("image/"))) {
        throw new Error(t("imageGenImageRefsOnly"));
      }
      if (attachments.length > spec.maxRefImages) {
        const noun = spec.maxRefImages === 1 ? t("imageGenRefImageSingular") : t("imageGenRefImagePlural");
        throw new Error(t("imageGenMaxRefs").replace("{model}", spec.label).replace("{count}", String(spec.maxRefImages)).replace("{noun}", noun));
      }
      if (attachments.length && spec.maxRefImages === 0) {
        throw new Error(t("imageGenNoRefs").replace("{model}", spec.label));
      }

      const imageUrls = await Promise.all(
        attachments.map(async (file) => toAbsoluteReferenceUrl(await api.uploadFileToStorage(file, "image"))),
      );
      const imageUrl = imageUrls[0];

      const selectedModel = imageUrls.length && spec.refModel
        ? spec.refModel
        : spec.textModel ?? options.model;

      return api.generate.image({
        prompt,
        model: selectedModel,
        aspect: options.aspect,
        resolution: options.resolution,
        ...(spec.imageInputField ? { imageInputField: spec.imageInputField } : {}),
        ...(imageUrl ? { imageUrl, imageUrls, referenceImageUrls: imageUrls } : {}),
      });
    },
  });
}
