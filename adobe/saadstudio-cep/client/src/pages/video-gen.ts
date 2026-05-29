/** Video generation page — POST /api/panel/generate/video. */

import { FeaturePage } from "./feature-page";
import { api } from "../lib/api";

const CINEMATIC_MODEL = "wavespeed-ai/cinematic-video-generator";
const VEO_FAST_MODEL = "google/veo3.1-fast-text-to-video";

const MODELS = [
  { value: "kling-3.0/video", label: "Kling 3" },
  { value: "bytedance/seedance-2", label: "Seedance 2.0" },
  { value: VEO_FAST_MODEL, label: "Google Veo 3.1 Fast" },
  { value: CINEMATIC_MODEL, label: "Cinematic Video Generator" },
];
const ASPECTS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9" },
  { value: "adaptive", label: "adaptive" },
];
const QUALITIES = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
  { value: "4k", label: "4k" },
];
const DURATIONS = [
  { value: "4", label: "4s" },
  { value: "5", label: "5s" },
  { value: "6", label: "6s" },
  { value: "8", label: "8s" },
  { value: "10", label: "10s" },
  { value: "12", label: "12s" },
  { value: "15", label: "15s" },
];
const MODES = [
  { value: "std", label: "Std" },
  { value: "pro", label: "Pro" },
  { value: "4K", label: "4K" },
];

type VideoModelSpec = {
  aspects: string[];
  durations: number[];
  qualities: string[];
  maxAttachments: number;
};

const MODEL_SPECS: Record<string, VideoModelSpec> = {
  "kling-3.0/video": {
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    qualities: ["720p", "1080p", "4k"],
    maxAttachments: 1,
  },
  "bytedance/seedance-2": {
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 8, 10, 12, 15],
    qualities: ["480p", "720p", "1080p"],
    maxAttachments: 1,
  },
  [VEO_FAST_MODEL]: {
    aspects: ["16:9", "9:16"],
    durations: [4, 6, 8],
    qualities: ["720p", "1080p", "4k"],
    maxAttachments: 3,
  },
  [CINEMATIC_MODEL]: {
    aspects: ["16:9", "9:16", "4:3", "3:4"],
    durations: [5, 10, 15],
    qualities: ["720p"],
    maxAttachments: 4,
  },
};

function pickAllowed<T extends string | number>(value: T, allowed: T[], fallback: T): T {
  return allowed.includes(value) ? value : fallback;
}

export function VideoGenPage(): HTMLElement {
  return FeaturePage({
    title: "Video generation",
    galleryKind: "video",
    dock: {
      placeholder: "Describe the video you want to generate…",
      showAttach: true,
      options: [
        { key: "model", label: "Model", value: "bytedance/seedance-2", options: MODELS },
        { key: "aspect", label: "Aspect", value: "16:9", options: ASPECTS },
        { key: "duration", label: "Duration", value: "5", options: DURATIONS },
        { key: "quality", label: "Quality", value: "720p", options: QUALITIES },
        { key: "mode", label: "Mode", value: "std", options: MODES },
      ],
    },
    submit: async ({ prompt, attachments, options }) => {
      if (attachments.some((file) => !file.type.startsWith("image/"))) {
        throw new Error("Video generation accepts only an image reference attachment.");
      }

      const model = options.model;
      const spec = MODEL_SPECS[model] ?? MODEL_SPECS["bytedance/seedance-2"];
      const aspect = pickAllowed(options.aspect, spec.aspects, spec.aspects[0]);
      const duration = pickAllowed(
        Math.max(1, Number.parseInt(options.duration || String(spec.durations[0]), 10) || spec.durations[0]),
        spec.durations,
        spec.durations[0],
      );
      const quality = pickAllowed(options.quality, spec.qualities, spec.qualities[0]);

      if (attachments.length > spec.maxAttachments) {
        throw new Error(
          spec.maxAttachments === 1
            ? "This model accepts only one reference image."
            : `This model accepts up to ${spec.maxAttachments} reference images.`,
        );
      }

      const imageUrls = model === CINEMATIC_MODEL
        ? await Promise.all(
            attachments.slice(0, spec.maxAttachments).map((file) => api.uploadFileToR2(file, "image")),
          )
        : [];

      const imageUrl = model === CINEMATIC_MODEL
        ? undefined
        : attachments[0]
          ? await api.uploadFileToR2(attachments[0], "image")
          : undefined;

      let mode = options.mode;
      if (model === "kling-3.0/video") {
        if (quality === "4k") mode = "4K";
        else if (quality === "1080p" && mode !== "4K") mode = "pro";
        else if (quality === "720p" && mode !== "pro" && mode !== "4K") mode = "std";
      }

      return api.generate.video({
        prompt,
        model,
        aspect,
        durationSec: duration,
        quality,
        mode,
        ...(imageUrls.length ? { imageUrls } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
    },
  });
}
