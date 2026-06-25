/** BytePlus official Seedance v2 adapter.
 *
 * BytePlus Ark API for text-to-video / image-to-video.
 * Auth: BYTEPLUS_API_KEY. Region/endpoint defaults to ap-southeast Ark
 * but can be overridden by BYTEPLUS_BASE_URL.
 *
 * Flow: POST a task → poll /tasks/{id} until status=succeeded → return
 * the resulting video URL. */

import type { VideoGenInput, ProviderResult } from "./types";
import { ProviderError } from "./types";

const API_KEY = process.env.BYTEPLUS_API_KEY ?? "";
const BASE = (
  process.env.BYTEPLUS_BASE_URL ??
  "https://ark.ap-southeast.bytepluses.com/api/v3"
).replace(/\/+$/, "");

const DEFAULT_MODEL = process.env.BYTEPLUS_MODEL ?? "dreamina-seedance-2-0-260128";

/** Internal id → BytePlus upstream model. */
const MODEL_MAP: Record<string, string> = {
  "bytedance/seedance-v2/text-to-video":      DEFAULT_MODEL,
  "bytedance/seedance-v2/text-to-video-fast": process.env.BYTEPLUS_MODEL_FAST ?? "dreamina-seedance-2-0-lite-260128",
  "bytedance/seedance-v2/text-to-video-mini": process.env.BYTEPLUS_MODEL_MINI ?? "ark-2ea1e31a-1727-4552-90da-1ece12c2141a-1353b",
  "bytedance/seedance-2":      DEFAULT_MODEL,
  "bytedance/seedance-2-fast": process.env.BYTEPLUS_MODEL_FAST ?? "dreamina-seedance-2-0-lite-260128",
  "bytedance/seedance-2-mini": process.env.BYTEPLUS_MODEL_MINI ?? "ark-2ea1e31a-1727-4552-90da-1ece12c2141a-1353b",
};

interface CreateTaskResp {
  id?: string;
  status?: string;
  error?: { message?: string };
}

interface PollResp {
  id?: string;
  status?: "queued" | "running" | "succeeded" | "failed" | string;
  content?: { video_url?: string };
  error?: { message?: string };
}

export async function byteplusGenerateVideo(input: VideoGenInput): Promise<ProviderResult> {
  if (!API_KEY) throw new ProviderError("byteplus", "config", "BYTEPLUS_API_KEY not set");

  const model = MODEL_MAP[input.modelId];
  if (!model) {
    throw new ProviderError("byteplus", "model", `Unknown BytePlus model: ${input.modelId}`);
  }

  const text = appendTokens(input.prompt, {
    aspect: input.aspect,
    durationSec: input.durationSec,
    quality: input.quality,
  });

  const content: Array<Record<string, unknown>> = [{ type: "text", text }];
  const firstFrameUrl =
    input.firstFrameUrl ??
    input.imageUrl ??
    (Array.isArray(input.imageUrls) ? input.imageUrls[0] : undefined);
  const lastFrameUrl =
    input.lastFrameUrl ??
    (Array.isArray(input.imageUrls) ? input.imageUrls[1] : undefined);
  const referenceImageUrls = Array.isArray(input.referenceImageUrls)
    ? input.referenceImageUrls.slice(0, 9)
    : [];
  const referenceVideoUrls = Array.isArray(input.referenceVideoUrls)
    ? input.referenceVideoUrls.slice(0, 3)
    : [];
  const referenceAudioUrls = Array.isArray(input.referenceAudioUrls)
    ? input.referenceAudioUrls.slice(0, 3)
    : [];

  if (firstFrameUrl) {
    content.push({ type: "image_url", image_url: { url: firstFrameUrl }, role: "first_frame" });
  }
  if (lastFrameUrl) {
    content.push({ type: "image_url", image_url: { url: lastFrameUrl }, role: "last_frame" });
  }
  for (const url of referenceImageUrls) {
    content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
  }
  for (const url of referenceVideoUrls) {
    content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
  }
  for (const url of referenceAudioUrls) {
    content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" });
  }

  // Official BytePlus Seedance 2.0 (non-Fast) defaults to a server-side
  // "AI generated" watermark. Opt out explicitly. Fast variants are left
  // on the BytePlus default per project scope.
  const isFastVariant =
    input.modelId === "bytedance/seedance-v2/text-to-video-fast" ||
    input.modelId === "bytedance/seedance-2-fast";
  const submitBody: Record<string, unknown> = { model, content };
  if (input.enableAudio === true) submitBody.generate_audio = true;
  if (input.enableAudio === false) submitBody.generate_audio = false;
  if (!isFastVariant) submitBody.watermark = false;

  // 1) Submit task
  const submit = await fetch(`${BASE}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submitBody),
  });
  const submitJson = (await safeJson(submit)) as CreateTaskResp;
  if (!submit.ok || !submitJson.id) {
    throw new ProviderError(
      "byteplus", "submit",
      submitJson.error?.message ?? `${submit.status} ${submit.statusText}`,
    );
  }

  const taskId = submitJson.id;

  // 2) Poll
  const url = await pollTask(taskId);
  return { urls: [url], provider: "byteplus", metadata: { upstream: model, taskId } };
}

async function pollTask(taskId: string): Promise<string> {
  const maxAttempts = 80;     // up to ~4 min at 3s per attempt
  const intervalMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, attempt < 3 ? 2000 : intervalMs));

    const res = await fetch(`${BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const json = (await safeJson(res)) as PollResp;

    if (!res.ok) {
      throw new ProviderError(
        "byteplus", "poll",
        json.error?.message ?? `${res.status} ${res.statusText}`,
      );
    }

    const status = (json.status ?? "").toLowerCase();
    if (status === "succeeded") {
      const videoUrl = json.content?.video_url;
      if (!videoUrl) {
        throw new ProviderError("byteplus", "poll", "task succeeded but content.video_url is missing");
      }
      return videoUrl;
    }
    if (status === "failed") {
      throw new ProviderError("byteplus", "poll", json.error?.message ?? "task failed");
    }
    // queued / running → continue
  }
  throw new ProviderError("byteplus", "poll", "task timed out");
}

function appendTokens(
  prompt: string,
  opts: { aspect?: string; durationSec?: number; quality?: string },
): string {
  const tokens: string[] = [];
  if (opts.aspect) tokens.push(`--ratio ${opts.aspect}`);
  if (opts.durationSec) tokens.push(`--duration ${Math.round(opts.durationSec)}`);
  if (opts.quality) tokens.push(`--resolution ${opts.quality}`);
  if (!tokens.length) return prompt;
  return `${prompt.trim()} ${tokens.join(" ")}`.trim();
}

async function safeJson(res: Response): Promise<unknown> {
  try { return await res.json(); }
  catch { return {}; }
}
