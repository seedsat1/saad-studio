/** Video generation page - POST /api/panel/generate/video. */

import { FeaturePage } from "./feature-page";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { watchTimelineSelection, type TimelineClip } from "../lib/timeline-watcher";
import { t } from "../lib/i18n";

type VideoModelSpec = {
  value: string;
  label: string;
  aspects: string[];
  durations: number[];
  qualities: string[];
  maxImages: number;
  maxVideos: number;
  maxAudios: number;
  requiresImage?: boolean;
  refModel?: string;
  modes?: string[];
};

const MODEL_SPECS: VideoModelSpec[] = [
  {
    value: "kling-3.0/video",
    label: "Kling 3.0",
    aspects: ["16:9", "9:16", "1:1"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["std", "pro", "4K"],
    maxImages: 2,
    maxVideos: 0,
    maxAudios: 0,
    modes: ["std", "pro", "4K"],
  },
  {
    value: "kling/v3-turbo-text-to-video",
    label: "Kling V3 Turbo",
    aspects: ["16:9", "9:16", "1:1"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["720p", "1080p"],
    maxImages: 1,
    maxVideos: 0,
    maxAudios: 0,
    refModel: "kling/v3-turbo-image-to-video",
  },
  {
    value: "hailuo/2-3-image-to-video-standard",
    label: "Minimax Hailuo 2.3 Fast",
    aspects: ["auto"],
    durations: [6, 10],
    qualities: ["768P", "1080P"],
    maxImages: 1,
    maxVideos: 0,
    maxAudios: 0,
    requiresImage: true,
  },
  {
    value: "hailuo/2-3-image-to-video-pro",
    label: "Minimax Hailuo 2.3",
    aspects: ["auto"],
    durations: [6, 10],
    qualities: ["768P", "1080P"],
    maxImages: 1,
    maxVideos: 0,
    maxAudios: 0,
    requiresImage: true,
  },
  {
    value: "google/veo3.1-lite-text-to-video",
    label: "Google Veo 3.1 Lite",
    aspects: ["16:9", "9:16"],
    durations: [4, 6, 8],
    qualities: ["720p", "1080p"],
    maxImages: 2,
    maxVideos: 0,
    maxAudios: 0,
  },
  {
    value: "google/veo3.1-fast-text-to-video",
    label: "Google Veo 3.1 Fast",
    aspects: ["16:9", "9:16"],
    durations: [4, 6, 8],
    qualities: ["720p", "1080p", "4k"],
    maxImages: 3,
    maxVideos: 0,
    maxAudios: 0,
  },
  {
    value: "google/veo3.1-text-to-video",
    label: "Google Veo 3.1",
    aspects: ["16:9", "9:16"],
    durations: [4, 6, 8],
    qualities: ["720p", "1080p", "4k"],
    maxImages: 3,
    maxVideos: 0,
    maxAudios: 0,
  },
  {
    value: "google/gemini-omni-flash",
    label: "Gemini Omni Flash",
    aspects: ["16:9", "9:16"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10],
    qualities: ["720p"],
    maxImages: 3,
    maxVideos: 1,
    maxAudios: 0,
  },
  {
    value: "bytedance/seedance-v2/text-to-video-fast",
    label: "Seedance 2.0 Fast",
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["480p", "720p"],
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  {
    value: "bytedance/seedance-v2/text-to-video-mini",
    label: "Seedance 2.0 Mini",
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["480p", "720p"],
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  {
    value: "bytedance/seedance-v2/text-to-video",
    label: "Seedance 2.0",
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["480p", "720p", "1080p", "4k"],
    maxImages: 9,
    maxVideos: 3,
    maxAudios: 3,
  },
  {
    value: "x-ai/grok-imagine-video/text-to-video-1-5",
    label: "Grok Imagine Video 1.5",
    aspects: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
    durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["480p", "720p"],
    maxImages: 0,
    maxVideos: 0,
    maxAudios: 0,
    modes: ["normal", "fun", "spicy"],
  },
  {
    value: "x-ai/grok-imagine-video/edit-video-1-5",
    label: "Grok Imagine Video 1.5 I2V",
    aspects: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
    durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    qualities: ["480p", "720p"],
    maxImages: 1,
    maxVideos: 0,
    maxAudios: 0,
    requiresImage: true,
    modes: ["normal", "fun"],
  },
];

const MODELS = MODEL_SPECS.map(({ value, label }) => ({ value, label }));
const ALL_ASPECTS = uniqueOptions(MODEL_SPECS.flatMap((spec) => spec.aspects));
const ALL_DURATIONS = uniqueNumbers(MODEL_SPECS.flatMap((spec) => spec.durations)).map((value) => ({ value: String(value), label: `${value}s` }));
const ALL_QUALITIES = uniqueOptions(MODEL_SPECS.flatMap((spec) => spec.qualities));
const ALL_MODES = uniqueOptions(MODEL_SPECS.flatMap((spec) => spec.modes ?? []));

let latestTimelineClip: TimelineClip | null = null;

function specFor(model: string): VideoModelSpec {
  return MODEL_SPECS.find((item) => item.value === model) ?? MODEL_SPECS[0];
}

function uniqueOptions(values: string[]): Array<{ value: string; label: string }> {
  return Array.from(new Set(values)).map((value) => ({ value, label: value }));
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function optionsFromStrings(values: string[]): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value, label: value }));
}

function optionsFromNumbers(values: number[]): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value: String(value), label: `${value}s` }));
}

function pickAllowed<T extends string | number>(value: T, allowed: T[], fallback: T): T {
  return allowed.includes(value) ? value : fallback;
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
  const page = FeaturePage({
    title: t("videoGenTitle"),
    galleryKind: "video",
    dock: {
      placeholder: t("videoGenPlaceholder"),
      showAttach: true,
      options: [
        { key: "model", label: t("optionModel"), value: "google/veo3.1-fast-text-to-video", options: MODELS },
        {
          key: "aspect",
          label: t("optionAspect"),
          value: "16:9",
          options: ALL_ASPECTS,
          getOptions: (state) => optionsFromStrings(specFor(state.options.model).aspects),
          hidden: (state) => specFor(state.options.model).aspects.length <= 1 && specFor(state.options.model).aspects[0] === "auto",
        },
        {
          key: "duration",
          label: t("optionDuration"),
          value: "8",
          options: ALL_DURATIONS,
          getOptions: (state) => optionsFromNumbers(specFor(state.options.model).durations),
        },
        {
          key: "quality",
          label: t("optionQuality"),
          value: "720p",
          options: ALL_QUALITIES,
          getOptions: (state) => optionsFromStrings(specFor(state.options.model).qualities),
        },
        {
          key: "mode",
          label: t("optionMode"),
          value: "normal",
          options: ALL_MODES,
          hidden: (state) => !(specFor(state.options.model).modes?.length),
          getOptions: (state) => optionsFromStrings(specFor(state.options.model).modes ?? []),
        },
      ],
    },
    submit: async ({ prompt, attachments, options }) => {
      const spec = specFor(options.model);
      const aspect = pickAllowed(options.aspect, spec.aspects, spec.aspects[0]);
      const duration = pickAllowed(
        Math.max(1, Number.parseInt(options.duration || String(spec.durations[0]), 10) || spec.durations[0]),
        spec.durations,
        spec.durations[0],
      );
      const quality = pickAllowed(options.quality, spec.qualities, spec.qualities[0]);
      const { unsupported } = splitAttachments(attachments);

      if (unsupported.length) {
        throw new Error("Unsupported attachment type. Use images, videos, or audio files only.");
      }

      const uploaded = await uploadAllReferences(attachments, latestTimelineClip, spec);
      const uploadedImages = uploaded.filter((item) => item.type === "image").map((item) => item.url);
      const uploadedVideos = uploaded.filter((item) => item.type === "video").map((item) => item.url);
      const uploadedAudios = uploaded.filter((item) => item.type === "audio").map((item) => item.url);

      if (uploadedImages.length > spec.maxImages) {
        throw new Error(`${spec.label} accepts up to ${spec.maxImages} reference image${spec.maxImages === 1 ? "" : "s"}.`);
      }
      if (uploadedVideos.length > spec.maxVideos) {
        throw new Error(spec.maxVideos === 0 ? `${spec.label} does not accept reference videos.` : `${spec.label} accepts up to ${spec.maxVideos} reference videos.`);
      }
      if (uploadedAudios.length > spec.maxAudios) {
        throw new Error(spec.maxAudios === 0 ? `${spec.label} does not accept reference audio files.` : `${spec.label} accepts up to ${spec.maxAudios} reference audio files.`);
      }
      if (spec.requiresImage && !uploadedImages.length) {
        throw new Error(`${spec.label} requires a reference image. Attach an image or select a visual clip on the timeline.`);
      }

      const selectedModel = uploadedImages.length && spec.refModel ? spec.refModel : spec.value;
      const body: Record<string, unknown> = {
        prompt,
        model: selectedModel,
        aspect,
        durationSec: duration,
        quality,
      };

      if (spec.modes?.length) {
        body.mode = spec.value === "kling-3.0/video" ? quality : pickAllowed(options.mode, spec.modes, spec.modes[0]);
      }

      if (selectedModel.includes("hailuo")) {
        body.imageUrl = uploadedImages[0];
      } else if (selectedModel.includes("seedance") || selectedModel.includes("bytedance")) {
        if (uploadedImages[0]) body.firstFrameUrl = uploadedImages[0];
        if (uploadedImages[1]) body.lastFrameUrl = uploadedImages[1];
        if (uploadedImages.length > 2) body.referenceImageUrls = uploadedImages.slice(2, 9);
        if (uploadedVideos.length) body.referenceVideoUrls = uploadedVideos.slice(0, 3);
        if (uploadedAudios.length) body.referenceAudioUrls = uploadedAudios.slice(0, 3);
        body.enableAudio = uploadedAudios.length > 0;
      } else if (selectedModel.includes("veo3.1") || selectedModel.includes("gemini-omni")) {
        if (uploadedImages[0]) body.firstFrameUrl = uploadedImages[0];
        if (uploadedImages[1]) body.lastFrameUrl = uploadedImages[1];
        if (uploadedImages.length >= 3) {
          body.referenceImageUrls = uploadedImages.slice(0, 3);
          body.generationType = "REFERENCE_2_VIDEO";
        } else if (uploadedImages.length) {
          body.imageUrls = uploadedImages.slice(0, 2);
          body.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
        }
        if (uploadedVideos[0]) body.videoUrl = uploadedVideos[0];
      } else if (selectedModel.includes("grok-imagine-video/edit-video")) {
        if (uploadedImages.length) body.imageUrls = uploadedImages.slice(0, spec.maxImages);
      } else if (selectedModel.includes("kling")) {
        if (uploadedImages.length) {
          body.imageUrl = uploadedImages[0];
          body.imageUrls = uploadedImages.slice(0, spec.maxImages);
        }
      } else {
        if (uploadedImages.length) body.imageUrls = uploadedImages.slice(0, spec.maxImages);
      }

      return api.generate.video(body);
    },
  });

  const watcher = watchTimelineSelection((clip) => {
    latestTimelineClip = clip?.path ? clip : null;
    if (latestTimelineClip) {
      toast("Timeline clip ready as video reference.", "info");
    }
  });
  watcher.attachTo(page);

  return page;
}

async function uploadAllReferences(
  attachments: File[],
  timelineClip: TimelineClip | null,
  spec: VideoModelSpec,
): Promise<Array<{ type: "image" | "video" | "audio"; url: string }>> {
  const uploaded = await Promise.all(
    attachments.map(async (file) => ({
      type: assetTypeForFile(file),
      url: await api.uploadFileToStorage(file, assetTypeForFile(file)),
    })),
  );

  if (!timelineClip?.path) return uploaded;

  const alreadyAttached = uploaded.length > 0;
  if (alreadyAttached && uploaded.length >= spec.maxImages + spec.maxVideos + spec.maxAudios) {
    return uploaded;
  }

  if (timelineClip.type === "image") {
    if (spec.maxImages <= uploaded.filter((item) => item.type === "image").length) return uploaded;
    uploaded.unshift({
      type: "image",
      url: await api.uploadLocalPathToStorage(timelineClip.path, "image"),
    });
    return uploaded;
  }

  if (spec.maxVideos > uploaded.filter((item) => item.type === "video").length) {
    uploaded.unshift({
      type: "video",
      url: await api.uploadLocalPathToStorage(timelineClip.path, "video"),
    });
    return uploaded;
  }

  if (spec.maxImages > uploaded.filter((item) => item.type === "image").length) {
    const frameFile = await captureFrameFromVideoPath(timelineClip.path, timelineClip.name ?? "timeline-video", timelineClip.inSec);
    uploaded.unshift({
      type: "image",
      url: await api.uploadFileToStorage(frameFile, "image"),
    });
  }

  return uploaded;
}

async function captureFrameFromVideoPath(localPath: string, displayName: string, inSec?: number | null): Promise<File> {
  const blob = await captureFrameBlob(pathToMediaSrc(localPath), inSec);
  return new File([blob], `${baseName(displayName)}-frame.png`, { type: "image/png" });
}

async function captureFrameBlob(src: string, inSec?: number | null): Promise<Blob> {
  const video = document.createElement("video");
  video.src = src;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onerror = () => reject(new Error("Timeline video frame could not be loaded."));
    video.onloadedmetadata = () => {
      const start = typeof inSec === "number" && Number.isFinite(inSec) ? Math.max(0, inSec) : 0;
      const target = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(start + 0.05, Math.max(0, video.duration - 0.05))
        : 0;
      if (target <= 0) {
        resolve();
        return;
      }
      video.currentTime = target;
    };
    video.onseeked = () => resolve();
    video.onloadeddata = () => {
      if (video.currentTime <= 0.001) resolve();
    };
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1024;
  canvas.height = video.videoHeight || 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Frame capture failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "timeline-video";
}

function pathToMediaSrc(p: string): string {
  if (!p) return "";
  if (p.startsWith("blob:") || p.startsWith("data:") || p.startsWith("http")) return p;
  const forward = p.replace(/\\/g, "/");
  if (forward.startsWith("file://")) return forward;
  if (/^[a-zA-Z]:\//.test(forward)) return `file:///${forward}`;
  if (forward.startsWith("/")) return `file://${forward}`;
  return `file:///${forward}`;
}
