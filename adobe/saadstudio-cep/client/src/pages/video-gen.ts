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
  maxImages: number;
  maxVideos: number;
  maxAudios: number;
  supportsMode: boolean;
};

const MODEL_SPECS: Record<string, VideoModelSpec> = {
  "kling-3.0/video": {
    aspects: ["16:9", "9:16", "1:1"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["720p", "1080p", "4k"],
    maxImages: 2,
    maxVideos: 0,
    maxAudios: 0,
    supportsMode: true,
  },
  "bytedance/seedance-2": {
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 8, 10, 12, 15],
    qualities: ["480p", "720p", "1080p"],
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
    supportsMode: false,
  },
  [VEO_FAST_MODEL]: {
    aspects: ["16:9", "9:16"],
    durations: [4, 6, 8],
    qualities: ["720p", "1080p", "4k"],
    maxImages: 3,
    maxVideos: 0,
    maxAudios: 0,
    supportsMode: false,
  },
  [CINEMATIC_MODEL]: {
    aspects: ["16:9", "9:16", "4:3", "3:4"],
    durations: [5, 10, 15],
    qualities: ["720p"],
    maxImages: 4,
    maxVideos: 0,
    maxAudios: 0,
    supportsMode: false,
  },
};

function pickAllowed<T extends string | number>(value: T, allowed: T[], fallback: T): T {
  return allowed.includes(value) ? value : fallback;
}

function specFor(model: string): VideoModelSpec {
  return MODEL_SPECS[model] ?? MODEL_SPECS["bytedance/seedance-2"];
}

function optionsFromValues(values: string[] | number[]): Array<{ value: string; label: string }> {
  return values.map((value) => {
    const text = String(value);
    return { value: text, label: typeof value === "number" ? `${text}s` : text };
  });
}

function assetTypeForFile(file: File): "image" | "video" | "audio" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

function splitAttachments(files: File[]) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  const videos = files.filter((file) => file.type.startsWith("video/"));
  const audios = files.filter((file) => file.type.startsWith("audio/"));
  const unsupported = files.filter(
    (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/"),
  );
  return { images, videos, audios, unsupported };
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
        {
          key: "aspect",
          label: "Aspect",
          value: "16:9",
          options: ASPECTS,
          getOptions: (state) => optionsFromValues(specFor(state.options.model ?? "bytedance/seedance-2").aspects),
        },
        {
          key: "duration",
          label: "Duration",
          value: "5",
          options: DURATIONS,
          getOptions: (state) => optionsFromValues(specFor(state.options.model ?? "bytedance/seedance-2").durations),
        },
        {
          key: "quality",
          label: "Quality",
          value: "720p",
          options: QUALITIES,
          getOptions: (state) => optionsFromValues(specFor(state.options.model ?? "bytedance/seedance-2").qualities),
        },
        {
          key: "mode",
          label: "Mode",
          value: "std",
          options: MODES,
          hidden: (state) => !specFor(state.options.model ?? "bytedance/seedance-2").supportsMode,
          getOptions: (state) => specFor(state.options.model ?? "bytedance/seedance-2").supportsMode ? MODES : [],
        },
      ],
    },
    submit: async ({ prompt, attachments, options }) => {
      const model = options.model;
      const spec = specFor(model);
      const { images, videos, audios, unsupported } = splitAttachments(attachments);
      const aspect = pickAllowed(options.aspect, spec.aspects, spec.aspects[0]);
      const duration = pickAllowed(
        Math.max(1, Number.parseInt(options.duration || String(spec.durations[0]), 10) || spec.durations[0]),
        spec.durations,
        spec.durations[0],
      );
      const quality = pickAllowed(options.quality, spec.qualities, spec.qualities[0]);

      if (unsupported.length) {
        throw new Error("Unsupported attachment type. Use images, videos, or audio files only.");
      }
      if (images.length > spec.maxImages) {
        throw new Error(`This model accepts up to ${spec.maxImages} reference image${spec.maxImages === 1 ? "" : "s"}.`);
      }
      if (videos.length > spec.maxVideos) {
        throw new Error(spec.maxVideos === 0 ? "This model does not accept reference videos." : `This model accepts up to ${spec.maxVideos} reference videos.`);
      }
      if (audios.length > spec.maxAudios) {
        throw new Error(spec.maxAudios === 0 ? "This model does not accept reference audio files." : `This model accepts up to ${spec.maxAudios} reference audio files.`);
      }

      const uploaded = await Promise.all(
        attachments.map(async (file) => ({
          file,
          url: await api.uploadFileToR2(file, assetTypeForFile(file)),
        })),
      );
      const uploadedImages = uploaded.filter((item) => item.file.type.startsWith("image/")).map((item) => item.url);
      const uploadedVideos = uploaded.filter((item) => item.file.type.startsWith("video/")).map((item) => item.url);
      const uploadedAudios = uploaded.filter((item) => item.file.type.startsWith("audio/")).map((item) => item.url);

      let mode: string | undefined = undefined;
      if (model === "kling-3.0/video") {
        mode = options.mode;
        if (quality === "4k") mode = "4K";
        else if (quality === "1080p" && mode !== "4K") mode = "pro";
        else if (quality === "720p" && mode !== "pro" && mode !== "4K") mode = "std";
      }

      const body: Record<string, unknown> = {
        prompt,
        model,
        aspect,
        durationSec: duration,
        quality,
        ...(mode ? { mode } : {}),
      };

      if (model === "kling-3.0/video") {
        if (uploadedImages.length) body.imageUrls = uploadedImages.slice(0, 2);
      } else if (model === "bytedance/seedance-2") {
        if (uploadedImages[0]) body.firstFrameUrl = uploadedImages[0];
        if (uploadedImages[1]) body.lastFrameUrl = uploadedImages[1];
        if (uploadedImages.length > 2) body.referenceImageUrls = uploadedImages.slice(2, 9);
        if (uploadedVideos.length) body.referenceVideoUrls = uploadedVideos.slice(0, 3);
        if (uploadedAudios.length) body.referenceAudioUrls = uploadedAudios.slice(0, 3);
        body.enableAudio = uploadedAudios.length > 0;
      } else if (model === VEO_FAST_MODEL) {
        if (uploadedImages.length) {
          body.imageUrls = uploadedImages.slice(0, 3);
          body.generationType = uploadedImages.length >= 3
            ? "REFERENCE_2_VIDEO"
            : "FIRST_AND_LAST_FRAMES_2_VIDEO";
        }
      } else if (model === CINEMATIC_MODEL) {
        if (uploadedImages.length) body.imageUrls = uploadedImages.slice(0, 4);
      }

      return api.generate.video(body);
    },
  });
}
