/** BytePlus official Seedance v2 adapter. */

import type { VideoGenInput, ProviderResult } from "./types";
import { ProviderError } from "./types";

const API_KEY = process.env.BYTEPLUS_API_KEY ?? "";

const BASE = (
  process.env.BYTEPLUS_BASE_URL ??
  process.env.BYTEPLUS_ARK_BASE_URL ??
  "https://ark.ap-southeast.bytepluses.com/api/v3"
).replace(/\/+$/, "");

const TASKS_URL = `${BASE}/contents/generations/tasks`;

const MODEL_MAP: Record<string, string> = {
  "bytedance/seedance-v2/text-to-video":
    process.env.BYTEPLUS_MODEL ?? "dreamina-seedance-2-0-260128",

  "bytedance/seedance-v2/text-to-video-fast":
    process.env.BYTEPLUS_MODEL_FAST ?? "dreamina-seedance-2-0-fast-260128",

  "bytedance/seedance-v2/text-to-video-mini":
    process.env.BYTEPLUS_MODEL_MINI ?? "dreamina-seedance-2-0-mini-260615",

  "bytedance/seedance-2":
    process.env.BYTEPLUS_MODEL ?? "dreamina-seedance-2-0-260128",

  "bytedance/seedance-2-fast":
    process.env.BYTEPLUS_MODEL_FAST ?? "dreamina-seedance-2-0-fast-260128",

  "bytedance/seedance-2-mini":
    process.env.BYTEPLUS_MODEL_MINI ?? "dreamina-seedance-2-0-mini-260615",
};

type AnyJson = Record<string, any>;

interface CreateTaskResp {
  id?: string;
  task_id?: string;
  taskId?: string;
  data?: AnyJson;
  error?: AnyJson;
  message?: string;
  msg?: string;
  code?: string;
}

interface PollResp {
  id?: string;
  status?: string;
  data?: AnyJson;
  content?: AnyJson;
  error?: AnyJson;
  message?: string;
  msg?: string;
  code?: string;
}

export async function byteplusGenerateVideo(input: VideoGenInput): Promise<ProviderResult> {
  if (!API_KEY) {
    throw new ProviderError("byteplus", "config", "BYTEPLUS_API_KEY not set");
  }

  const model = MODEL_MAP[input.modelId];

  if (!model) {
    throw new ProviderError("byteplus", "model", `Unknown BytePlus model: ${input.modelId}`);
  }

  const submitBody: Record<string, unknown> = {
    model,
    content: buildContent(input),
    ratio: normalizeRatio(input.aspect),
    resolution: normalizeResolution(input.quality),
    duration: normalizeDuration(input.durationSec),
    generate_audio: input.enableAudio === true,
  };

  const submit = await fetch(TASKS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submitBody),
  });

  const submitJson = (await safeJson(submit)) as CreateTaskResp;
  const taskId = extractTaskId(submitJson);

  if (!submit.ok || !taskId) {
    const message = providerFailureMessage(submitJson, submit.status, submit.statusText);
    console.error("[BytePlus Video Provider] create task failed:", {
      status: submit.status,
      model,
      modelRoute: input.modelId,
      body: submitJson,
    });
    throw new ProviderError("byteplus", "submit", message);
  }

  const videoUrl = await pollTask(taskId);

  return {
    urls: [videoUrl],
    provider: "byteplus",
    metadata: {
      upstream: model,
      taskId,
      modelRoute: input.modelId,
    },
  };
}

function buildContent(input: VideoGenInput): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: String(input.prompt || "").trim(),
    },
  ];

  const firstFrameUrl =
    input.firstFrameUrl ??
    input.imageUrl ??
    (Array.isArray(input.imageUrls) ? input.imageUrls[0] : undefined);

  const lastFrameUrl =
    input.lastFrameUrl ??
    (Array.isArray(input.imageUrls) ? input.imageUrls[1] : undefined);

  if (firstFrameUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: firstFrameUrl,
      },
      role: "first_frame",
    });
  }

  if (lastFrameUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: lastFrameUrl,
      },
      role: "last_frame",
    });
  }

  return content;
}

function normalizeRatio(aspect?: string): string {
  const value = String(aspect || "16:9").trim();
  if (["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(value)) return value;
  return "16:9";
}

function normalizeResolution(quality?: string): string {
  const value = String(quality || "720p").toLowerCase().trim();

  if (value.includes("1080")) return "1080p";
  if (value.includes("720")) return "720p";
  if (value.includes("480")) return "480p";

  return "720p";
}

function normalizeDuration(durationSec?: number): number {
  const duration = Number(durationSec || 5);

  if (!Number.isFinite(duration)) return 5;
  if (duration <= 4) return 4;
  if (duration >= 15) return 15;

  return Math.round(duration);
}

async function pollTask(taskId: string): Promise<string> {
  const maxAttempts = 80;
  const intervalMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(attempt < 3 ? 2000 : intervalMs);

    const res = await fetch(`${TASKS_URL}/${encodeURIComponent(taskId)}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const json = (await safeJson(res)) as PollResp;

    if (!res.ok) {
      const message = providerFailureMessage(json, res.status, res.statusText);
      console.error("[BytePlus Video Provider] poll failed:", {
        status: res.status,
        taskId,
        body: json,
      });
      throw new ProviderError("byteplus", "poll", message);
    }

    const status = String(json.status ?? json.data?.status ?? "").toLowerCase();

    if (
      status === "succeeded" ||
      status === "completed" ||
      status === "completed_with_watermark"
    ) {
      const videoUrl = extractVideoUrl(json);

      if (!videoUrl) {
        console.error("[BytePlus Video Provider] task succeeded but video URL missing:", json);
        throw new ProviderError("byteplus", "poll", "Task succeeded but video URL is missing");
      }

      return videoUrl;
    }

    if (status === "failed" || status === "error") {
      const message = providerFailureMessage(json, 500, "Task failed");
      throw new ProviderError("byteplus", "poll", message);
    }
  }

  throw new ProviderError("byteplus", "poll", "Task timed out");
}

function extractTaskId(json: CreateTaskResp): string | undefined {
  return (
    json.id ??
    json.task_id ??
    json.taskId ??
    json.data?.id ??
    json.data?.task_id ??
    json.data?.taskId
  );
}

function extractVideoUrl(json: PollResp): string | undefined {
  return (
    json.content?.video_url ??
    json.content?.url ??
    json.data?.content?.video_url ??
    json.data?.content?.url ??
    json.data?.video_url ??
    json.data?.url ??
    json.data?.output?.video_url ??
    json.data?.output?.url
  );
}

function providerFailureMessage(
  payload: Record<string, any> | null,
  status: number,
  statusText = "",
): string {
  if (!payload) return `HTTP ${status} ${statusText}`.trim();

  const error = payload.error;

  if (error && typeof error === "object") {
    if (error.message) return String(error.message).slice(0, 500);
    if (error.msg) return String(error.msg).slice(0, 500);
    return JSON.stringify(error).slice(0, 500);
  }

  const raw =
    payload.message ??
    payload.msg ??
    payload.code ??
    payload.error ??
    `HTTP ${status} ${statusText}`;

  if (typeof raw === "object") {
    return JSON.stringify(raw).slice(0, 500);
  }

  return String(raw).slice(0, 500);
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}