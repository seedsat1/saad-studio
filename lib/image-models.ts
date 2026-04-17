// ─── Image Model Definitions ─────────────────────────────────────────────────
// Per-model API parameter configs used by the image workspace UI.
// Routes: WaveSpeed (seedream/*), PiAPI (flux-2/*), KIE.ai (everything else)

export type ImageInputType = "text-to-image" | "image-to-image" | "edit";

export interface ImageModel {
  id: string;
  label: string;
  sublabel: string;
  badge: string;
  group: string;
  inputType: ImageInputType;
  /** Supported aspect ratio strings. Empty array = N/A (inherits from input image). */
  aspectRatios: string[];
  /** Max images per generation run. */
  maxImages: number;
  /** How many reference images this model accepts (0 = none, 1 = single, 4 = multi). */
  maxRefImages: number;
  /** Whether this model exposes a grok-style mode toggle. */
  grokMode?: boolean;
  /** Quality presets sent as a `quality` param (e.g. GPT Image). */
  qualityParam?: string[];
  /** KIE API input field name for reference images:
   * - undefined / "image_url" → single: image_url, multi: image_urls (default)
   * - "image_input" → always array: image_input (Gemini models)
   * - "image_urls" → always array: image_urls (Seedream, FLUX.2, GPT Image)
   */
  imageInputField?: "image_url" | "image_input" | "image_urls";
  /** Display credit cost (UI only). */
  creditCost: number;
}

// ─── All Aspect Options lookup (for the UI toggle buttons) ────────────────────
export const ALL_ASPECT_OPTIONS = [
  { value: "1:1",   label: "1:1",   cls: "w-6 h-6"        },
  { value: "16:9",  label: "16:9",  cls: "w-8 h-[18px]"   },
  { value: "9:16",  label: "9:16",  cls: "w-[18px] h-8"   },
  { value: "4:3",   label: "4:3",   cls: "w-8 h-6"         },
  { value: "3:4",   label: "3:4",   cls: "w-6 h-8"         },
  { value: "21:9",  label: "21:9",  cls: "w-[42px] h-[18px]" },
  { value: "2:3",   label: "2:3",   cls: "w-[18px] h-7"   },
  { value: "3:2",   label: "3:2",   cls: "w-7 h-[18px]"   },
] as const;

// ─── Image Model Catalog ──────────────────────────────────────────────────────
export const IMAGE_MODELS: ImageModel[] = [
  // ── Google Nano Banana ────────────────────────────────────────────────────
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    sublabel: "4K · Ultra Detail",
    badge: "TOP",
    group: "Nano Banana",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
    maxImages: 4,
    maxRefImages: 8,
    imageInputField: "image_input",
    creditCost: 2,
  },
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    sublabel: "Fast · Sharp",
    badge: "",
    group: "Nano Banana",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxImages: 4,
    maxRefImages: 14,
    imageInputField: "image_input",
    creditCost: 2,
  },
  {
    id: "google/nano-banana",
    label: "Nano Banana",
    sublabel: "Google · Standard",
    badge: "",
    group: "Nano Banana",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16"],
    maxImages: 4,
    maxRefImages: 8,
    imageInputField: "image_input",
    creditCost: 2,
  },
  {
    id: "google/nano-banana-edit",
    label: "Nano Banana Edit",
    sublabel: "Google · In-painting",
    badge: "",
    group: "Nano Banana",
    inputType: "edit",
    aspectRatios: [],
    maxImages: 1,
    maxRefImages: 1,
    imageInputField: "image_input",
    creditCost: 2,
  },
  // ── Google Imagen 4 ───────────────────────────────────────────────────────
  {
    id: "google/imagen4-fast",
    label: "Google Imagen 4 Fast",
    sublabel: "Speed-optimized",
    badge: "",
    group: "Google Imagen",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  {
    id: "google/imagen4",
    label: "Google Imagen 4",
    sublabel: "High-fidelity output",
    badge: "",
    group: "Google Imagen",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  {
    id: "google/imagen4-ultra",
    label: "Google Imagen 4 Ultra",
    sublabel: "Maximum quality",
    badge: "TOP",
    group: "Google Imagen",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxImages: 1,
    maxRefImages: 0,
    creditCost: 2,
  },
  // ── Seedream ──────────────────────────────────────────────────────────────
  {
    id: "seedream/4.5-text-to-image",
    label: "Seedream 4.5 T2I",
    sublabel: "Text to image",
    badge: "",
    group: "Seedream",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:2"],
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  {
    id: "seedream/4.5-edit",
    label: "Seedream 4.5 Edit",
    sublabel: "Image editing",
    badge: "",
    group: "Seedream",
    inputType: "edit",
    aspectRatios: [],
    maxImages: 1,
    maxRefImages: 10,
    imageInputField: "image_urls",
    creditCost: 2,
  },
  {
    id: "seedream/5-lite-text-to-image",
    label: "Seedream 5 Lite T2I",
    sublabel: "Text to image",
    badge: "NEW",
    group: "Seedream",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "2:3", "3:2"],
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  {
    id: "seedream/5-lite-image-to-image",
    label: "Seedream 5 Lite I2I",
    sublabel: "Image to image",
    badge: "NEW",
    group: "Seedream",
    inputType: "image-to-image",
    aspectRatios: [],
    maxImages: 4,
    maxRefImages: 10,
    imageInputField: "image_urls",
    creditCost: 2,
  },
  // ── Z-Image ───────────────────────────────────────────────────────────────
  {
    id: "z-image",
    label: "Z-Image",
    sublabel: "Consistent · Sharp",
    badge: "",
    group: "Other",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  // ── Qwen Image (KIE) ─────────────────────────────────────────────────────
  {
    id: "qwen/text-to-image",
    label: "Qwen Image T2I",
    sublabel: "Text to image",
    badge: "NEW",
    group: "Qwen",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    maxImages: 1,
    maxRefImages: 0,
    creditCost: 2,
  },
  {
    id: "qwen/image-to-image",
    label: "Qwen Image I2I",
    sublabel: "Image to image",
    badge: "NEW",
    group: "Qwen",
    inputType: "image-to-image",
    aspectRatios: [],
    maxImages: 1,
    maxRefImages: 1,
    imageInputField: "image_urls",
    creditCost: 2,
  },
  // ── Grok Imagine (KIE) ────────────────────────────────────────────────────
  {
    id: "grok-imagine/text-to-image",
    label: "Grok Imagine",
    sublabel: "Creative · Open",
    badge: "",
    group: "Other",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3", "2:3", "3:2"],
    maxImages: 4,
    maxRefImages: 0,
    grokMode: true,
    creditCost: 2,
  },
  // ── GPT Image (KIE) ───────────────────────────────────────────────────────
  {
    id: "gpt-image/1.5-text-to-image",
    label: "GPT Image 1.5 T2I",
    sublabel: "Precise · Detailed",
    badge: "",
    group: "Other",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "9:16"],
    maxImages: 4,
    maxRefImages: 0,
    qualityParam: ["medium", "high"],
    creditCost: 2,
  },
  {
    id: "gpt-image/1.5-image-to-image",
    label: "GPT Image 1.5 I2I",
    sublabel: "Image to image",
    badge: "",
    group: "Other",
    inputType: "image-to-image",
    aspectRatios: [],
    maxImages: 1,
    maxRefImages: 4,
    imageInputField: "image_urls",
    qualityParam: ["medium", "high"],
    creditCost: 2,
  },
];

