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

  generate: {
    image: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/image", {
        method: "POST",
        body: JSON.stringify(toBackendShape(body)),
      }),
    video: (body: Record<string, unknown>) =>
      request<JobStatus>("/api/panel/generate/video", {
        method: "POST",
        body: JSON.stringify(toBackendShape(body)),
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
