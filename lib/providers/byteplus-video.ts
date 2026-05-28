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

const DEFAULT_MODEL = process.env.BYTEPLUS_MODEL ?? "seedance-pro-2-0-250528";

/** Internal id → BytePlus upstream model. */
const MODEL_MAP: Record<string, string> = {
  "bytedance/seedance-v2/text-to-video":      DEFAULT_MODEL,
  "bytedance/seedance-v2/text-to-video-fast": process.env.BYTEPLUS_MODEL_FAST ?? "seedance-lite-2-0-250528",
  "bytedance/seedance-2":      DEFAULT_MODEL,
  "bytedance/seedance-2-fast": process.env.BYTEPLUS_MODEL_FAST ?? "seedance-lite-2-0-250528",
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

  // Build the content payload. BytePlus accepts a text item + optional
  // image_url item; resolution/duration/ratio are passed as suffix tokens
  // on the text prompt (BytePlus convention).
  const text = appendTokens(input.prompt, {
    aspect: input.aspect,
    durationSec: input.durationSec,
    quality: input.quality,
  });

  const content: Array<Record<string, unknown>> = [{ type: "text", text }];
  if (input.imageUrl) {
    content.push({ type: "image_url", image_url: { url: input.imageUrl } });
  }

  // Official BytePlus Seedance 2.0 (non-Fast) defaults to a server-side
  // "AI generated" watermark. Opt out explicitly. Fast variants are left
  // on the BytePlus default per project scope.
  const isFastVariant =
    input.modelId === "bytedance/seedance-v2/text-to-video-fast" ||
    input.modelId === "bytedance/seedance-2-fast";
  const submitBody: Record<string, unknown> = { model, content };
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
