/** Saad Studio API client.
 *
 * Wraps the existing /api/panel/* endpoints in the Next.js backend. Every
 * call adds the bearer token from auth.ts and parses JSON. Errors throw
 * with the server-provided message so the UI can surface them via toast.
 *
 * The base URL is configurable so the same build works against localhost,
 * staging, or production by changing the env file at build time. */

import { getToken, clearToken } from "./auth";
import { openExternal } from "./cep";
import { LOCAL_TRANSITION_PRESETS } from "./transition-presets";

const DEFAULT_BASE = "https://www.saadstudio.app";
const OVERRIDE_KEY = "saadstudio.apiBase";

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isAllowedProductionBase(url: string): boolean {
  return normalizeBase(url) === DEFAULT_BASE;
}

export function getApiBase(): string {
  try {
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override) {
      const clean = normalizeBase(override);
      if (import.meta.env.PROD && !isAllowedProductionBase(clean)) {
        localStorage.removeItem(OVERRIDE_KEY);
        return DEFAULT_BASE;
      }
      return clean;
    }
  } catch { /* noop */ }
  const envBase = import.meta.env.VITE_SAAD_API as string | undefined;
  const clean = normalizeBase(envBase ?? DEFAULT_BASE);
  if (import.meta.env.PROD && !isAllowedProductionBase(clean)) {
    return DEFAULT_BASE;
  }
  return clean;
}

export function setApiBase(url: string) {
  const clean = normalizeBase(url);
  if (import.meta.env.PROD && !isAllowedProductionBase(clean)) {
    try { localStorage.removeItem(OVERRIDE_KEY); } catch { /* noop */ }
    return;
  }
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

export interface TransitionProject {
  id: string;
  title: string;
  inputAUrl: string | null;
  inputAType: string;
  inputBUrl: string | null;
  inputBType: string;
  presetId: string | null;
  aspectRatio: string;
  duration: number;
  intensity: number;
  smoothness: number;
  cinematicStr: number;
  preserveFraming: boolean;
  subjectFocus: boolean;
  resolution: string;
  fps: number;
  enhance: boolean;
  updatedAt?: string;
  jobs?: TransitionPanelJob[];
  outputs?: TransitionOutput[];
}

export interface TransitionPanelJob {
  id: string;
  presetId: string;
  status: string;
  taskId: string | null;
  creditsCost: number;
  error: string | null;
  resultUrl: string | null;
  createdAt: string;
  output?: TransitionOutput | null;
}

export interface TransitionOutput {
  id: string;
  url: string;
  presetId: string;
  presetName: string;
  aspectRatio: string;
  duration: number;
  inputAUrl: string | null;
  inputBUrl: string | null;
  createdAt: string;
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

interface ParsedResponseBody {
  text: string;
  data: unknown;
}

let lastCreditsTopupOpenAt = 0;

export function getCreditsTopupUrl(): string {
  return `${getApiBase()}/payment?type=topup`;
}

export function openCreditsTopup() {
  const now = Date.now();
  if (now - lastCreditsTopupOpenAt < 5000) return;
  lastCreditsTopupOpenAt = now;
  openExternal(getCreditsTopupUrl());
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
    res = await fetch(url, {
      ...init,
      headers,
      // CEP loads index.html via file:// so Origin is "null". The backend
      // /api/panel/* CORS branch returns Allow-Origin: * for that case,
      // which is only honoured when credentials are omitted.
      mode: "cors",
      credentials: "omit",
      cache: init.cache ?? "no-store",
    });
  } catch (err) {
    throw new ApiError(`Network error: ${(err as Error).message}`, 0);
  }

  const { text, data } = await readResponseBody(res, url, "api.request");

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const msg = buildApiErrorMessage(res.status, data, text);
    if (res.status === 402) {
      openCreditsTopup();
      throw new ApiError(`${msg}. Opening the credit top-up page…`, res.status);
    }
    throw new ApiError(msg, res.status);
  }

  if (!text.trim()) {
    throw new ApiError(`Empty response from ${url} (${res.status}).`, res.status);
  }

  if (typeof data === "string") {
    throw new ApiError(
      `Expected JSON from ${url}, received text: ${snippet(data)}`,
      res.status,
    );
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

/** Diagnostic-only: prints URL, status, content-type, and the first 500
 *  chars of the response body before any JSON parse attempt. Active in
 *  every build until the user removes it — it does NOT change behaviour.
 *  See readResponseBody / readJsonSafely callers for the two parse sites. */
function logBeforeJsonParse(
  callSite: string,
  url: string,
  res: Response,
  text: string,
): void {
  try {
    // eslint-disable-next-line no-console
    console.log("[saadstudio diag]", {
      callSite,
      url,
      status: res.status,
      contentType: res.headers.get("content-type"),
      bodyLength: text.length,
      body: text.length > 500 ? `${text.slice(0, 500)}…` : text,
    });
  } catch { /* logging must never throw */ }
}

async function readResponseBody(
  res: Response,
  url: string,
  callSite: string,
): Promise<ParsedResponseBody> {
  const text = await res.text();
  logBeforeJsonParse(callSite, url, res, text);
  if (!text.trim()) return { text, data: null };
  return { text, data: safeJson(text) };
}

function snippet(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function buildApiErrorMessage(status: number, data: unknown, text: string): string {
  if (data && typeof data === "object") {
    if ("error" in data) return `Request failed (${status}): ${String((data as { error: unknown }).error)}`;
    if ("message" in data) return `Request failed (${status}): ${String((data as { message: unknown }).message)}`;
  }
  if (!text.trim()) return `Request failed (${status}): Empty response body.`;
  if (typeof data === "string") return `Request failed (${status}): ${snippet(data)}`;
  return `Request failed (${status}): ${snippet(text)}`;
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
      case "quality":     out.resolution = v; break;
      default:            out[k] = v;
    }
  }
  return out;
}

function extFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split("/").pop() ?? "";
    const match = /\.([a-zA-Z0-9]+)$/.exec(name);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function extFromContentType(contentType: string | null | undefined): string | null {
  const type = String(contentType ?? "").toLowerCase().split(";")[0].trim();
  switch (type) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "video/mp4": return "mp4";
    case "video/quicktime": return "mov";
    case "video/webm": return "webm";
    case "video/x-matroska": return "mkv";
    case "audio/mpeg": return "mp3";
    case "audio/wav":
    case "audio/x-wav": return "wav";
    case "audio/mp4": return "m4a";
    case "audio/ogg": return "ogg";
    default: return null;
  }
}

function replaceExtension(fileName: string, ext: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base}.${ext}`;
}

async function imageBlobToPng(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Image decode failed."));
      node.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width || 1024;
    canvas.height = image.naturalHeight || image.height || 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => {
        if (!out) {
          reject(new Error("PNG conversion failed."));
          return;
        }
        resolve(out);
      }, "image/png");
    });
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
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

  deleteGeneration: (id: string) =>
    request<{ deleted: boolean }>(`/api/panel/generations/${id}`, {
      method: "DELETE",
    }),

  transitionPresets: async () => {
    try {
      return await request<{ presets: TransitionPresetItem[] }>("/api/panel/transitions/presets");
    } catch {
      try {
        return await request<{ presets: TransitionPresetItem[] }>("/api/transitions/presets");
      } catch {
        return { presets: [...LOCAL_TRANSITION_PRESETS] as TransitionPresetItem[] };
      }
    }
  },

  transitionProjects: () =>
    request<{ projects: TransitionProject[] }>("/api/panel/transitions/project"),

  transitionProject: (id: string) =>
    request<{ project: TransitionProject }>(`/api/panel/transitions/project/${id}`),

  createTransitionProject: (body: Record<string, unknown>) =>
    request<{ project: TransitionProject }>("/api/panel/transitions/project", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTransitionProject: (id: string, body: Record<string, unknown>) =>
    request<{ project: TransitionProject }>(`/api/panel/transitions/project/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  generateTransitionProject: (body: Record<string, unknown>) =>
    request<{
      jobId: string;
      taskId: string;
      status: string;
      creditsCharged: number;
      remainingCredits?: number;
    }>("/api/panel/transitions/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  transitionJob: (id: string) =>
    request<{ job: TransitionPanelJob }>(`/api/panel/transitions/job/${id}`),

  pollTransitionJob: async (jobId: string, opts: { intervalMs?: number; timeoutMs?: number } = {}) => {
    const interval = opts.intervalMs ?? 3000;
    const timeout = opts.timeoutMs ?? 8 * 60 * 1000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const { job } = await api.transitionJob(jobId);
      if (job.status === "completed" || job.status === "failed") return job;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new ApiError("Transition job timed out", 408);
  },

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
    const fileBuffer = fs.readFileSync(localPath) as Buffer;
    const body = new Uint8Array(fileBuffer);
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
    expand: (body: {
      inputUrl: string;
      inputKind: "image" | "video";
      aspectRatio: string;
      prompt?: string;
      width?: number;
      height?: number;
      outputFormat?: "png" | "jpeg" | "webp";
    }) =>
      request<JobStatus>("/api/panel/generate/expand", {
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
    const response = await fetch(assetUrl);
    if (!response.ok) {
      throw new ApiError(`Download failed (${response.status})`, response.status);
    }
    const originalBlob = await response.blob();
    const contentType = response.headers.get("content-type") || originalBlob.type || "";
    const isImage = contentType.toLowerCase().startsWith("image/");
    const finalBlob = isImage ? await imageBlobToPng(originalBlob) : originalBlob;
    const finalExt = isImage
      ? "png"
      : extFromContentType(contentType) || extFromUrl(assetUrl) || guessContentType(suggestedName, "bin").split("/").pop() || "bin";
    const outName = replaceExtension(suggestedName, finalExt);
    const out = path.join(dir, `${Date.now()}-${outName}`);
    const buf = await finalBlob.arrayBuffer();
    fs.writeFileSync(out, new Uint8Array(buf));
    return out;
  },
};

export type SaadApi = typeof api;

// ─── Reap.video tools (captions / reframe / dubbing / transcription / edit) ─

export type ReapTool =
  | "captions"
  | "reframe"
  | "dubbing"
  | "transcription"
  | "edit-videos";

export interface ReapStartResponse {
  projectId: string;
  generationId: string;
  creditsCharged: number;
  status: string;
}

export interface ReapStatusResponse {
  status: "queued" | "processing" | "completed" | "failed" | "invalid" | "expired";
  progress?: number;
  url?: string | null;
  urls?: string[];
  metadata?: Record<string, unknown>;
  error?: string;
}

export const reap = {
  start: (body: { tool: ReapTool; sourceUrl: string; filename?: string; options?: Record<string, unknown>; prompt?: string }) =>
    request<ReapStartResponse>("/api/panel/reap/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  status: (projectId: string, generationId?: string) => {
    const qs = new URLSearchParams({ projectId });
    if (generationId) qs.set("generationId", generationId);
    return request<ReapStatusResponse>(`/api/panel/reap/status?${qs.toString()}`);
  },

  dubbingLanguages: () =>
    request<{ languages: Array<{ code: string; label: string }> }>("/api/panel/reap/dubbing-languages")
      .catch(() => ({ languages: [] as Array<{ code: string; label: string }> })),

  captionPresets: () =>
    request<{ presets: Array<{ id: string; label: string }> }>("/api/panel/reap/caption-presets")
      .catch(() => ({ presets: [] as Array<{ id: string; label: string }> })),

  /** End-to-end runner used by the tool pages: start → poll until done. */
  run: async (
    args: {
      tool: ReapTool;
      sourceUrl: string;
      filename?: string;
      options?: Record<string, unknown>;
      prompt?: string;
    },
    onStatus?: (s: ReapStatusResponse) => void,
  ): Promise<ReapStatusResponse & { projectId: string; generationId: string }> => {
    const started = await reap.start(args);
    const startTime = Date.now();
    const timeoutMs = 20 * 60 * 1000;
    const intervalMs = 4000;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const status = await reap.status(started.projectId, started.generationId);
      onStatus?.(status);
      if (status.status === "completed" || status.status === "failed"
        || status.status === "invalid" || status.status === "expired") {
        return { ...status, projectId: started.projectId, generationId: started.generationId };
      }
    }
    throw new ApiError("Reap job timed out after 20 minutes.", 408);
  },
};
