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
   * - "image_input" → always array: image_input (Gemini/Nano Banana models)
   * - "image_urls" → always array: image_urls (Seedream, FLUX.2, Grok I2I, Nano Banana Edit)
   * - "image_url" → single string: image_url (Qwen image-edit, qwen/image-to-image)
   * - "input_urls" → always array: input_urls (GPT Image I2I, Wan, Flux-2 I2I)
   */
  imageInputField?: "image_url" | "image_input" | "image_urls" | "input_urls";
  /** When true, the route runs N parallel createTasks for models that don't
   * accept num_images / n natively (so the user actually receives N images).
   * When false, model is sent num_images / n (or n via sequential mode for Wan).
   * Auto-derived per model in the route. UI does not set this. */
  /** Grok Imagine T2I exposes a speed-vs-quality boolean (`enable_pro`).
   * When true, `quality === "quality"` triggers enable_pro: true. */
  grokProToggle?: boolean;
  /** Wan 2.7 Image Pro can output up to 12 images via `enable_sequential: true`.
   * When true, the UI shows a sequential-mode toggle. */
  wanSequentialMode?: boolean;
  /** Display credit cost (UI only). */
  creditCost: number;
}

// ─── All Aspect Options lookup (for the UI toggle buttons) ────────────────────
export const ALL_ASPECT_OPTIONS = [
  { value: "auto",  label: "Auto",  cls: "w-7 h-7"        },
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
    qualityParam: ["1K", "2K", "4K"],
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
    qualityParam: ["1K", "2K", "4K"],
    creditCost: 2,
  },
  {
    id: "google/nano-banana",
    label: "Nano Banana",
    sublabel: "Google · Standard",
    badge: "",
    group: "Nano Banana",
    inputType: "text-to-image",
    // KIE spec: image_size enum (sent as `image_size` not `aspect_ratio`).
    aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"],
    // Spec has no num_images field → batched via parallel createTasks in the route.
    maxImages: 4,
    maxRefImages: 0,
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
    maxRefImages: 10,
    imageInputField: "image_urls",
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
    aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
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
    aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
    maxImages: 1,
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
    aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
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
    // KIE spec aspect_ratio enum: 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 2:3 / 3:2 / 21:9
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
    // No num_images in spec → parallel batching in the route.
    maxImages: 4,
    maxRefImages: 0,
    qualityParam: ["basic", "high"],
    creditCost: 2,
  },
  {
    id: "seedream/4.5-edit",
    label: "Seedream 4.5 Edit",
    sublabel: "Image editing",
    badge: "",
    group: "Seedream",
    inputType: "edit",
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
    maxImages: 1,
    maxRefImages: 14,
    imageInputField: "image_urls",
    qualityParam: ["basic", "high"],
    creditCost: 2,
  },
  {
    id: "seedream/5-lite-text-to-image",
    label: "Seedream 5 Lite T2I",
    sublabel: "Text to image",
    badge: "NEW",
    group: "Seedream",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
    maxImages: 4,
    maxRefImages: 0,
    qualityParam: ["basic", "high"],
    creditCost: 2,
  },
  {
    id: "seedream/5-lite-image-to-image",
    label: "Seedream 5 Lite I2I",
    sublabel: "Image to image",
    badge: "NEW",
    group: "Seedream",
    inputType: "image-to-image",
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
    maxImages: 4,
    maxRefImages: 14,
    imageInputField: "image_urls",
    qualityParam: ["basic", "high"],
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
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  // ── Qwen ─────────────────────────────────────────────────────────────────
  {
    id: "qwen2/text-to-image",
    label: "Qwen Image T2I",
    sublabel: "Text to image",
    badge: "NEW",
    group: "Qwen",
    inputType: "text-to-image",
    // KIE spec uses `image_size` enum (square_hd / portrait_4_3 / landscape_4_3 / portrait_16_9 / landscape_16_9).
    aspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
    // No num_images → parallel batching.
    maxImages: 4,
    maxRefImages: 0,
    creditCost: 2,
  },
  {
    id: "qwen2/image-edit",
    label: "Qwen2 Image Edit",
    sublabel: "Image editing",
    badge: "NEW",
    group: "Qwen",
    inputType: "edit",
    aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
    maxImages: 1,
    maxRefImages: 1,
    imageInputField: "image_url",
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
    imageInputField: "image_url",
    creditCost: 2,
  },
  // ── Grok Imagine ─────────────────────────────────────────────────────────
  {
    id: "grok-imagine/text-to-image",
    label: "Grok Imagine",
    sublabel: "Creative · Open",
    badge: "",
    group: "Other",
    inputType: "text-to-image",
    // KIE spec aspect_ratio enum: 2:3 / 3:2 / 1:1 / 16:9 / 9:16
    aspectRatios: ["2:3", "3:2", "1:1", "16:9", "9:16"],
    // No num_images in spec → parallel batching.
    maxImages: 4,
    maxRefImages: 0,
    // Speed (false) vs Quality (true) maps to enable_pro.
    qualityParam: ["speed", "quality"],
    grokProToggle: true,
    creditCost: 2,
  },
  {
    id: "grok-imagine/image-to-image",
    label: "Grok Imagine I2I",
    sublabel: "Image to image",
    badge: "NEW",
    group: "Other",
    inputType: "image-to-image",
    aspectRatios: [],
    maxImages: 1,
    // KIE spec image_urls maxItems: 5
    maxRefImages: 5,
    imageInputField: "image_urls",
    creditCost: 2,
  },
  // ── GPT Image ─────────────────────────────────────────────────────────────
  {
    id: "gpt-image-2-text-to-image",
    label: "GPT Image 2",
    sublabel: "Text to image - 1K/2K/4K",
    badge: "NEW",
    group: "GPT Image",
    inputType: "text-to-image",
    aspectRatios: ["auto", "1:1", "9:16", "16:9", "4:3", "3:4"],
    maxImages: 1,
    maxRefImages: 0,
    qualityParam: ["1K", "2K", "4K"],
    creditCost: 3,
  },
  {
    id: "gpt-image-2-image-to-image",
    label: "GPT Image 2 Edit",
    sublabel: "Image to image - up to 16 refs",
    badge: "NEW",
    group: "GPT Image",
    inputType: "image-to-image",
    aspectRatios: ["auto", "1:1", "9:16", "16:9", "4:3", "3:4"],
    maxImages: 1,
    maxRefImages: 16,
    imageInputField: "input_urls",
    qualityParam: ["1K", "2K", "4K"],
    creditCost: 3,
  },
  {
    id: "gpt-image/1.5-text-to-image",
    label: "GPT Image 1.5 T2I",
    sublabel: "Precise · Detailed",
    badge: "",
    group: "GPT Image",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "2:3", "3:2"],
    maxImages: 1,
    maxRefImages: 0,
    qualityParam: ["medium", "high"],
    creditCost: 2,
  },
  {
    id: "gpt-image/1.5-image-to-image",
    label: "GPT Image 1.5 I2I",
    sublabel: "Image to image",
    badge: "",
    group: "GPT Image",
    inputType: "image-to-image",
    aspectRatios: ["1:1", "2:3", "3:2"],
    maxImages: 1,
    maxRefImages: 16,
    imageInputField: "input_urls",
    qualityParam: ["medium", "high"],
    creditCost: 2,
  },
  // ── Wan ───────────────────────────────────────────────────────────────────
  {
    id: "wan/2-7-image-pro",
    label: "Wan 2.7 Image Pro",
    sublabel: "Generate & Edit",
    badge: "NEW",
    group: "Wan",
    inputType: "text-to-image",
    aspectRatios: ["1:1", "16:9", "4:3", "21:9", "3:4", "9:16", "8:1", "1:8"],
    // n: 1-4 default; 1-12 when enable_sequential. UI bumps to 12 when sequential mode is on.
    maxImages: 12,
    maxRefImages: 9,
    imageInputField: "input_urls",
    qualityParam: ["1K", "2K", "4K"],
    wanSequentialMode: true,
    creditCost: 2,
  },
  // ── FLUX.2 (public tiers; server resolves T2I/I2I variants privately) ─────────
  {
    id: "flux-2/pro",
    label: "FLUX.2 Pro",
    sublabel: "Speed-optimized detail",
    badge: "UNLIMITED",
    group: "Flux-2",
    inputType: "text-to-image",
    aspectRatios: ["auto", "1:1", "4:3", "3:4", "16:9", "9:16"],
    maxImages: 4,
    maxRefImages: 8,
    imageInputField: "input_urls",
    qualityParam: ["1K", "2K"],
    creditCost: 3,
  },
  {
    id: "flux-2/flex",
    label: "FLUX.2 Flex",
    sublabel: "Next-gen image generation",
    badge: "",
    group: "Flux-2",
    inputType: "text-to-image",
    aspectRatios: ["auto", "1:1", "4:3", "3:4", "16:9", "9:16"],
    maxImages: 4,
    maxRefImages: 8,
    imageInputField: "input_urls",
    qualityParam: ["1K"],
    creditCost: 2,
  },
  {
    id: "flux-2/max",
    label: "FLUX.2 Max",
    sublabel: "Ultimate precision and speed",
    badge: "",
    group: "Flux-2",
    inputType: "text-to-image",
    aspectRatios: ["auto", "1:1", "4:3", "3:4", "16:9", "9:16"],
    maxImages: 4,
    maxRefImages: 8,
    imageInputField: "input_urls",
    qualityParam: ["2K"],
    creditCost: 3,
  },
];

