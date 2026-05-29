/** Saad Studio API client.
 *
 * Wraps the existing /api/panel/* endpoints in the Next.js backend. Every
 * call adds the bearer token from auth.ts and parses JSON. Errors throw
 * with the server-provided message so the UI can surface them via toast.
 *
 * The base URL is configurable so the same build works against localhost,
 * staging, or production by changing the env file at build time. */

import { getToken, clearToken } from "./auth";

const DEFAULT_BASE = "https://www.saadstudio.app";
const OVERRIDE_KEY = "saadstudio.apiBase";

export function getApiBase(): string {
  try {
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override) return override.replace(/\/+$/, "");
  } catch { /* noop */ }
  const envBase = import.meta.env.VITE_SAAD_API as string | undefined;
  return (envBase ?? DEFAULT_BASE).replace(/\/+$/, "");
}

export function setApiBase(url: string) {
  const clean = url.trim().replace(/\/+$/, "");
  try { localStorage.setItem(OVERRIDE_KEY, clean); } catch { /* noop */ }
}

/** Convenience for code that just needs the current base. */
export const API_BASE = getApiBase();

export interface PanelMe {
  name: string | null;
  email: string | null;
  creditBalance: number;
  role?: string;
  isBanned?: boolean;
  subscription?: {
    planId: string | null;
    billingInterval: string | null;
    status?: string;
    currentPeriodEnd?: string;
  } | null;
}

export interface GenerationItem {
  id: string;
  kind: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  prompt?: string;
  model?: string;
  aspect?: string;
  durationSec?: number;
  createdAt: string;
}

export interface JobStatus {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress?: number;
  result?: GenerationItem | null;
  error?: string;
}

export interface TransitionPresetItem {
  id: string;
  name: string;
  category: string;
  previewVideoUrl: string;
  previewGradient: string;
  supportedInputs: string[];
  durationRange: [number, number];
  costMultiplier: number;
  engineType: string;
  motionProfile: string;
  description: string;
}

interface SignedUploadResponse {
  signedUrl: string;
  publicUrl: string;
  path: string;
  bucket: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new ApiError("Not signed in", 401);

  const url = path.startsWith("http") ? path : `${getApiBase()}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    throw new ApiError(`Network error: ${(err as Error).message}`, 0);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const msg = (data && typeof data === "object" && "error" in data)
      ? String((data as { error: unknown }).error)
      : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

function guessContentType(fileName: string, fallback = "application/octet-stream"): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "mp4": return "video/mp4";
    case "mov": return "video/quicktime";
    case "webm": return "video/webm";
    case "mkv": return "video/x-matroska";
    case "avi": return "video/avi";
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    case "m4a": return "audio/mp4";
    case "ogg": return "audio/ogg";
    case "aac": return "audio/aac";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return fallback;
  }
}

/** Translate the panel's pretty-name fields to the backend route's expected
 *  field names. The panel uses `model` / `aspect` / `durationSec` because
 *  that's how the dock components are wired; the Next.js routes expect
 *  `modelId` / `aspectRatio` / `duration`. Without this remap the backend
 *  silently falls back to its defaults and every generation looks identical. */
function toBackendShape(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v == null) continue;
    switch (k) {
      case "model":       out.modelId = v; break;
      case "aspect":      out.aspectRatio = v; break;
      case "durationSec": out.duration = v; break;
      default:            out[k] = v;
    }
  }
  return out;
}

function normalizeVideoJob(
  raw: unknown,
  requestBody: Record<string, unknown>,
): JobStatus {
  if (raw && typeof raw === "object") {
    const existing = raw as Partial<JobStatus>;
    if (existing.status && typeof existing.status === "string") {
      return existing as JobStatus;
    }
  }

  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const directUrl =
    (typeof data.videoUrl === "string" && data.videoUrl) ||
    (Array.isArray(data.videoUrls) && typeof data.videoUrls[0] === "string" ? data.videoUrls[0] : "") ||
    "";
  const baseId =
    (typeof data.generationId === "string" && data.generationId) ||
    (typeof data.taskId === "string" && data.taskId) ||
    `video-${Date.now()}`;

  if (directUrl) {
    return {
      id: baseId,
      status: "succeeded",
      progress: 100,
      result: {
        id: baseId,
        kind: "video",
        url: directUrl,
        prompt: typeof requestBody.prompt === "string" ? requestBody.prompt : undefined,
        model: typeof requestBody.model === "string" ? requestBody.model : undefined,
        aspect: typeof requestBody.aspect === "string" ? requestBody.aspect : undefined,
        durationSec: typeof requestBody.durationSec === "number" ? requestBody.durationSec : undefined,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (typeof data.taskId === "string" && data.taskId) {
    return {
      id: data.taskId,
      status: "queued",
      progress: 0,
      result: null,
    };
  }

  return {
    id: baseId,
    status: "failed",
    error: typeof data.error === "string" ? data.error : "Generation failed",
    result: null,
  };
}

function normalizeImageJob(
  raw: unknown,
  requestBody: Record<string, unknown>,
): JobStatus {
  if (raw && typeof raw === "object") {
    const existing = raw as Partial<JobStatus>;
    if (existing.status && typeof existing.status === "string") {
      return existing as JobStatus;
    }
  }

  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const directUrl =
    (typeof data.imageUrl === "string" && data.imageUrl) ||
    (Array.isArray(data.imageUrls) && typeof data.imageUrls[0] === "string" ? data.imageUrls[0] : "") ||
    "";
  const baseId =
    (typeof data.generationId === "string" && data.generationId) ||
    (typeof data.taskId === "string" && data.taskId) ||
    `image-${Date.now()}`;

  if (directUrl) {
    return {
      id: baseId,
      status: "succeeded",
      progress: 100,
      result: {
        id: baseId,
        kind: "image",
        url: directUrl,
        prompt: typeof requestBody.prompt === "string" ? requestBody.prompt : undefined,
        model: typeof requestBody.model === "string" ? requestBody.model : undefined,
        aspect: typeof requestBody.aspect === "string" ? requestBody.aspect : undefined,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (typeof data.taskId === "string" && data.taskId) {
    return {
      id: data.taskId,
      status: "queued",
      progress: 0,
      result: null,
    };
  }

  return {
    id: baseId,
    status: "failed",
    error: typeof data.error === "string" ? data.error : "Generation failed",
    result: null,
  };
}

export const api = {
  /** Current user + credits + subscription. */
  me: () => request<PanelMe>("/api/panel/me"),

  /** Lightweight credit balance fetch (for header refresh). */
  credits: () => request<{ creditBalance: number }>("/api/panel/credits"),

  /** Recent generations for the gallery strip. The exact endpoint may vary
   *  in your backend — adjust the path if your route differs. */
  recentGenerations: (limit = 12) =>
    request<{ items: GenerationItem[] }>(`/api/panel/generations?limit=${limit}`)
      .catch(() => ({ items: [] })),

  transitionPresets: () =>
    request<{ presets: TransitionPresetItem[] }>("/api/transitions/presets"),

  createUploadUrl: (body: { fileName: string; contentType: string; assetType?: string }) =>
    request<SignedUploadResponse>("/api/panel/upload-url", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteUpload: (body: { path: string; bucket: string }) =>
    request<{ deleted: boolean }>("/api/panel/upload-url", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  uploadFileToR2: async (file: File, assetType = "video"): Promise<string> => {
    const contentType = file.type || guessContentType(file.name);
    const signed = await api.createUploadUrl({
      fileName: file.name || "upload.bin",
      contentType,
      assetType,
    });
    const put = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!put.ok) {
      throw new ApiError(`Direct upload failed (${put.status})`, put.status);
    }
    return signed.publicUrl;
  },

  uploadLocalPathToR2: async (localPath: string, assetType = "video"): Promise<string> => {
    if (typeof window.cep === "undefined" || !window.cep_node) {
      throw new ApiError("Local path upload works only inside Adobe.", 400);
    }
    const fs = window.cep_node.require("fs") as typeof import("fs");
    const path = window.cep_node.require("path") as typeof import("path");
    if (!fs.existsSync(localPath)) {
      throw new ApiError("Local source file was not found.", 404);
    }

    const fileName = path.basename(localPath) || "upload.bin";
    const contentType = guessContentType(fileName);
    const signed = await api.createUploadUrl({ fileName, contentType, assetType });
    const body = fs.readFileSync(localPath) as Buffer;
    const put = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    if (!put.ok) {
      throw new ApiError(`Direct upload failed (${put.status})`, put.status);
    }
    return signed.publicUrl;
  },

  generate: {
    image: async (body: Record<string, unknown>) =>
      normalizeImageJob(
        await request<unknown>("/api/panel/generate/image", {
          method: "POST",
          body: JSON.stringify(toBackendShape(body)),
        }),
        body,
      ),
    video: async (body: Record<string, unknown>) =>
      normalizeVideoJob(
        await request<unknown>("/api/panel/generate/video", {
          method: "POST",
          body: JSON.stringify(toBackendShape(body)),
        }),
        body,
      ),
    avatarPro: (body: { imageUrl: string; audioUrl: string; prompt?: string }) =>
      request<JobStatus>("/api/panel/generate/avatar-pro", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    transition: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/transition", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    captions: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/captions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    tts: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/tts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    story: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/story", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    translate: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/translate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  /** Poll a job until it succeeds, fails, or times out. */
  pollJob: async (jobId: string, opts: { intervalMs?: number; timeoutMs?: number } = {}) => {
    const interval = opts.intervalMs ?? 2500;
    const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const job = await request<JobStatus>(`/api/panel/jobs/${jobId}`);
      if (job.status === "succeeded" || job.status === "failed") return job;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new ApiError("Job timed out", 408);
  },

  /** Download a generated asset to a local temp path so ExtendScript can
   *  import it. Uses CEP's Node `fs` + `https` when inside Adobe, falls
   *  back to a blob URL when in a browser preview. */
  downloadAsset: async (assetUrl: string, suggestedName: string): Promise<string> => {
    if (typeof window.cep === "undefined" || !window.cep_node) {
      return assetUrl;
    }
    const fs = window.cep_node.require("fs") as typeof import("fs");
    const path = window.cep_node.require("path") as typeof import("path");
    const os = window.cep_node.require("os") as typeof import("os");
    const dir = path.join(os.tmpdir(), "saadstudio");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${Date.now()}-${suggestedName}`);
    const buf = await fetch(assetUrl).then((r) => r.arrayBuffer());
    fs.writeFileSync(out, Buffer.from(buf));
    return out;
  },
};

export type SaadApi = typeof api;
