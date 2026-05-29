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
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];
const QUALITIES = [
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
];
const DURATIONS = [
  { value: "5", label: "5s" },
  { value: "8", label: "8s" },
  { value: "10", label: "10s" },
];
const MODES = [
  { value: "std", label: "Std" },
  { value: "pro", label: "Pro" },
];

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
      const aspect = options.aspect;
      const duration = Math.max(1, Number.parseInt(options.duration || "5", 10) || 5);

      if (model === VEO_FAST_MODEL) {
        if (duration > 8) {
          throw new Error("Google Veo 3.1 Fast supports up to 8 seconds.");
        }
        if (!["16:9", "9:16"].includes(aspect)) {
          throw new Error("Google Veo 3.1 Fast supports only 16:9 or 9:16.");
        }
      }

      if (model === "kling-3.0/video" && ![5, 10].includes(duration)) {
        throw new Error("Kling 3 supports 5s or 10s in this panel.");
      }

      if (model !== CINEMATIC_MODEL && attachments.length > 1) {
        throw new Error("This model accepts only one reference image.");
      }

      const imageUrls = model === CINEMATIC_MODEL
        ? await Promise.all(
            attachments.slice(0, 4).map((file) => api.uploadFileToR2(file, "image")),
          )
        : [];

      if (model === CINEMATIC_MODEL && attachments.length > 4) {
        throw new Error("Cinematic Video Generator accepts up to 4 reference images.");
      }

      const imageUrl = model === CINEMATIC_MODEL
        ? undefined
        : attachments[0]
          ? await api.uploadFileToR2(attachments[0], "image")
          : undefined;

      return api.generate.video({
        prompt,
        model,
        aspect,
        durationSec: duration,
        quality: options.quality,
        mode: options.mode,
        ...(imageUrls.length ? { imageUrls } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
    },
  });
}
