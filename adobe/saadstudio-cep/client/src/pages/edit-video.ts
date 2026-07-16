import { VideoUtilityPage } from "./video-utility-page";
import { api } from "../lib/api";

export function EditVideoPage(): HTMLElement {
  return VideoUtilityPage({
    title: "Edit video",
    hint: "Pick a clip from the timeline or upload a video. Edit video uses a real Grok Edit flow: it captures a frame from your selected shot, applies your prompt and preset, then generates a new motion clip.",
    showPrompt: true,
    allowEmptySubmit: true,
    options: [
      { key: "preset", label: "Preset", value: "cinematic", options: [
        { value: "cinematic", label: "Cinematic" },
        { value: "commercial", label: "Commercial" },
        { value: "music", label: "Music video" },
        { value: "anime", label: "Anime" },
      ]},
      { key: "aspect", label: "Aspect", value: "16:9", options: [
        { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" },
        { value: "1:1", label: "1:1" },
        { value: "3:2", label: "3:2" },
        { value: "2:3", label: "2:3" },
      ]},
      { key: "duration", label: "Duration", value: "6", options: [
        { value: "6", label: "6s" },
        { value: "8", label: "8s" },
        { value: "10", label: "10s" },
        { value: "12", label: "12s" },
        { value: "15", label: "15s" },
      ]},
      { key: "quality", label: "Quality", value: "720p", options: [
        { value: "480p", label: "480p" },
        { value: "720p", label: "720p" },
      ]},
      { key: "mode", label: "Mode", value: "normal", options: [
        { value: "normal", label: "Normal" },
        { value: "fun", label: "Fun" },
        { value: "spicy", label: "Spicy" },
      ]},
    ],
    submit: async ({ clip, prompt, options }) => {
      const imageUrl = await uploadKeyFrame(clip);
      return api.generate.video({
        model: "grok-imagine/image-to-video",
        prompt: buildEditPrompt(options.preset, prompt),
        aspect: options.aspect,
        durationSec: Number.parseInt(options.duration || "6", 10) || 6,
        quality: options.quality,
        mode: options.mode,
        imageUrl,
      });
    },
  });
}

function buildEditPrompt(preset: string, prompt: string): string {
  const presetPromptMap: Record<string, string> = {
    cinematic: "cinematic color grade, refined lighting, elegant camera motion, realistic details",
    commercial: "premium commercial look, polished product-grade finish, crisp contrast, ad-quality motion",
    music: "stylized music video energy, expressive lighting, rhythmic motion, dramatic visual identity",
    anime: "anime-inspired motion, clean stylization, vivid colors, dynamic shot design",
  };
  const presetText = presetPromptMap[preset] ?? presetPromptMap.cinematic;
  const userText = prompt.trim();
  return userText ? `${presetText}. ${userText}` : presetText;
}

async function uploadKeyFrame(clip: { path: string; file?: File; name?: string; inSec?: number }): Promise<string> {
  const frameFile = clip.file
    ? await captureFrameFromVideoFile(clip.file, clip.inSec)
    : await captureFrameFromVideoPath(clip.path, clip.name ?? "timeline-clip", clip.inSec);
  return api.uploadFileToStorage(frameFile, "image");
}

async function captureFrameFromVideoFile(file: File, inSec?: number): Promise<File> {
  const src = URL.createObjectURL(file);
  try {
    const blob = await captureFrameBlob(src, inSec);
    return new File([blob], `${baseName(file.name)}-edit-frame.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function captureFrameFromVideoPath(localPath: string, displayName: string, inSec?: number): Promise<File> {
  const blob = await captureFrameBlob(pathToMediaSrc(localPath), inSec);
  return new File([blob], `${baseName(displayName)}-edit-frame.png`, { type: "image/png" });
}

async function captureFrameBlob(src: string, inSec?: number): Promise<Blob> {
  const video = document.createElement("video");
  video.src = src;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const fail = () => {
      if (done) return;
      done = true;
      reject(new Error("Video preview could not be loaded."));
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const trimmedStart = typeof inSec === "number" && Number.isFinite(inSec) ? Math.max(0, inSec) : 0;
      const fallback = Number.isFinite(video.duration) && video.duration > 0.12 ? 0.1 : 0;
      const target = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(trimmedStart + 0.05, Math.max(0, video.duration - 0.05))
        : fallback;
      if (target <= 0) {
        finish();
        return;
      }
      video.currentTime = target;
    };
    video.onseeked = finish;
    video.onloadeddata = () => {
      if (video.currentTime <= 0.001) finish();
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
  return fileName.replace(/\.[^.]+$/, "") || "asset";
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
