/** Reap.video public automation API adapter.
 *
 * Wraps every endpoint at https://public.reap.video/api/v1/automation/*
 * so the panel route can dispatch the supported tools (captions, reframe,
 * dubbing, transcription, edit-videos / create-clips) through a single
 * normalized contract.
 *
 * Auth: REAP_API_KEY (Bearer).
 * Rate limit: 10 requests / minute per key — keep an eye on the
 * X-RateLimit-Remaining header in production.
 *
 * Flow for every tool:
 *   1. getUploadUrl(filename)         -> { uploadId, uploadUrl }
 *   2. PUT the source video bytes to uploadUrl (the S3 presigned URL)
 *   3. POST /create-<tool>            -> { projectId }
 *   4. GET /get-project-status?...    -> queued | processing | completed | failed
 *   5. GET /get-project-clips?...     -> finalised URLs (create-clips only) */

import { ProviderError } from "./types";

const API_KEY = process.env.REAP_API_KEY ?? "";
const BASE = (
  process.env.REAP_API_BASE ??
  "https://public.reap.video/api/v1/automation"
).replace(/\/+$/, "");

export type ReapTool =
  | "captions"
  | "reframe"
  | "dubbing"
  | "transcription"
  | "edit-videos";

export type ReapStatus = "queued" | "processing" | "completed" | "failed" | "invalid" | "expired";

export interface ReapUploadTarget {
  uploadId: string;
  uploadUrl: string;
}

export interface ReapStartResult {
  projectId: string;
  uploadId: string;
}

export interface ReapStatusResult {
  status: ReapStatus;
  progress?: number;
  /** Final asset URL when the project completes. For create-clips this is
   *  the first clip; the full list is at urls[]. */
  url?: string;
  urls?: string[];
  /** Free-form metadata returned by the upstream — transcript JSON,
   *  caption text, dubbed language tag, etc. */
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface ReapStartParams {
  filename: string;
  /** Public URL the backend will stream into Reap's presigned S3 slot. */
  sourceUrl: string;
  tool: ReapTool;
  /** Tool-specific extras. Forwarded as-is to the /create-<tool> body. */
  options?: Record<string, unknown>;
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function startReapJob(params: ReapStartParams): Promise<ReapStartResult> {
  ensureKey();

  // 1) Reserve an upload slot.
  const { uploadId, uploadUrl } = await getUploadUrl(params.filename);

  // 2) Stream the source video into the slot.
  await streamToPresigned(params.sourceUrl, uploadUrl);

  // 3) Kick off the tool.
  const projectId = await createTool(params.tool, uploadId, params.options ?? {});

  return { projectId, uploadId };
}

export async function pollReapStatus(projectId: string): Promise<ReapStatusResult> {
  ensureKey();
  const res = await reapFetch(`/get-project-status?projectId=${encodeURIComponent(projectId)}`);
  const data = await readJson(res, "get-project-status");
  const status = String(data?.status ?? "").toLowerCase() as ReapStatus;

  if (status === "completed") {
    // Most tools surface the final URL on the status payload itself;
    // create-clips needs a follow-up call to get-project-clips.
    const directUrl = firstString(data, ["resultUrl", "outputUrl", "url", "videoUrl"]);
    if (directUrl) {
      return { status, url: directUrl, urls: [directUrl], metadata: dataAsRecord(data) };
    }
    const clips = await fetchProjectClips(projectId);
    if (clips.length) {
      return { status, url: clips[0], urls: clips, metadata: dataAsRecord(data) };
    }
    return { status, metadata: dataAsRecord(data) };
  }

  if (status === "failed" || status === "invalid" || status === "expired") {
    return { status, error: firstString(data, ["error", "message", "reason"]) ?? `Project ${status}` };
  }

  // queued / processing / unknown — surface progress if available
  const progress = typeof data?.progress === "number" ? data.progress : undefined;
  return { status: (status as ReapStatus) || "processing", progress };
}

export async function listDubbingLanguages(): Promise<Array<{ code: string; label: string }>> {
  ensureKey();
  try {
    const res = await reapFetch("/get-dubbing-languages");
    const data = await readJson(res, "get-dubbing-languages");
    const arr = Array.isArray(data?.languages) ? data.languages : Array.isArray(data) ? data : [];
    return arr
      .map((raw: unknown): { code: string; label: string } | null => {
        if (typeof raw === "string") return { code: raw, label: raw };
        if (raw && typeof raw === "object") {
          const r = raw as Record<string, unknown>;
          const code = typeof r.code === "string" ? r.code
                     : typeof r.language === "string" ? r.language
                     : typeof r.id === "string" ? r.id
                     : null;
          if (!code) return null;
          const label = typeof r.label === "string" ? r.label
                       : typeof r.name === "string" ? r.name
                       : code;
          return { code, label };
        }
        return null;
      })
      .filter((v: { code: string; label: string } | null): v is { code: string; label: string } => v !== null);
  } catch (err) {
    console.warn("[reap] listDubbingLanguages failed:", (err as Error).message);
    return [];
  }
}

export async function listCaptionPresets(): Promise<Array<{ id: string; label: string }>> {
  ensureKey();
  try {
    const res = await reapFetch("/get-all-presets");
    const data = await readJson(res, "get-all-presets");
    const arr = Array.isArray(data?.presets) ? data.presets : Array.isArray(data) ? data : [];
    return arr
      .map((raw: unknown): { id: string; label: string } | null => {
        if (typeof raw === "string") return { id: raw, label: raw };
        if (raw && typeof raw === "object") {
          const r = raw as Record<string, unknown>;
          const id = typeof r.id === "string" ? r.id
                   : typeof r.preset === "string" ? r.preset
                   : null;
          if (!id) return null;
          const label = typeof r.label === "string" ? r.label
                       : typeof r.name === "string" ? r.name
                       : id;
          return { id, label };
        }
        return null;
      })
      .filter((v: { id: string; label: string } | null): v is { id: string; label: string } => v !== null);
  } catch (err) {
    console.warn("[reap] listCaptionPresets failed:", (err as Error).message);
    return [];
  }
}

// ─── Internals ───────────────────────────────────────────────────────────

function ensureKey() {
  if (!API_KEY) throw new ProviderError("kie", "config", "REAP_API_KEY is not set on the server.");
}

async function getUploadUrl(filename: string): Promise<ReapUploadTarget> {
  const res = await reapFetch("/get-upload-url", {
    method: "POST",
    body: JSON.stringify({ filename }),
  });
  const data = await readJson(res, "get-upload-url");
  const uploadId = firstString(data, ["uploadId", "id"]);
  const uploadUrl = firstString(data, ["uploadUrl", "url", "presignedUrl"]);
  if (!uploadId || !uploadUrl) {
    throw new ProviderError("kie", "get-upload-url", "Response missing uploadId/uploadUrl");
  }
  return { uploadId, uploadUrl };
}

async function streamToPresigned(sourceUrl: string, presignedUrl: string): Promise<void> {
  // Fetch the source as a stream, then PUT it to the presigned URL.
  const src = await fetch(sourceUrl);
  if (!src.ok) {
    throw new ProviderError("kie", "fetch-source", `Source fetch failed: ${src.status} ${src.statusText}`);
  }
  const buffer = Buffer.from(await src.arrayBuffer());
  const contentType = src.headers.get("content-type") ?? "video/mp4";

  const put = await fetch(presignedUrl, {
    method: "PUT",
    body: new Uint8Array(buffer),
    headers: { "Content-Type": contentType },
  });
  if (!put.ok) {
    throw new ProviderError("kie", "upload", `Upload to Reap S3 failed: ${put.status} ${put.statusText}`);
  }
}

async function createTool(
  tool: ReapTool,
  uploadId: string,
  options: Record<string, unknown>,
): Promise<string> {
  const path =
    tool === "captions" ? "/create-captions" :
    tool === "reframe" ? "/create-reframe" :
    tool === "dubbing" ? "/create-dubbing" :
    tool === "transcription" ? "/create-transcription" :
    "/create-clips";

  const res = await reapFetch(path, {
    method: "POST",
    body: JSON.stringify({ uploadId, ...options }),
  });
  const data = await readJson(res, path.slice(1));
  const projectId = firstString(data, ["projectId", "id", "project"]);
  if (!projectId) {
    throw new ProviderError("kie", path.slice(1), "Response missing projectId");
  }
  return projectId;
}

async function fetchProjectClips(projectId: string): Promise<string[]> {
  try {
    const res = await reapFetch(`/get-project-clips?projectId=${encodeURIComponent(projectId)}`);
    const data = await readJson(res, "get-project-clips");
    const arr = Array.isArray(data?.clips) ? data.clips : Array.isArray(data) ? data : [];
    return arr
      .map((raw: unknown): string | null => {
        if (typeof raw === "string" && /^https?:\/\//i.test(raw)) return raw;
        if (raw && typeof raw === "object") {
          const r = raw as Record<string, unknown>;
          return firstString(r, ["url", "videoUrl", "outputUrl", "downloadUrl"]) ?? null;
        }
        return null;
      })
      .filter((v: string | null): v is string => v !== null);
  } catch {
    return [];
  }
}

async function reapFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${API_KEY}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" });
}

async function readJson(res: Response, label: string): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) throw new ProviderError("kie", label, `${res.status} ${res.statusText}`);
    return null;
  }
  let body: unknown;
  try { body = JSON.parse(text); }
  catch {
    if (!res.ok) throw new ProviderError("kie", label, `${res.status}: ${text.slice(0, 200)}`);
    throw new ProviderError("kie", label, `Non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const errMsg = body && typeof body === "object"
      ? firstString(body as Record<string, unknown>, ["error", "message", "detail"]) ?? `${res.status}`
      : `${res.status}`;
    throw new ProviderError("kie", label, errMsg);
  }
  return body && typeof body === "object" ? body as Record<string, unknown> : null;
}

function firstString(data: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!data) return undefined;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function dataAsRecord(data: Record<string, unknown> | null): Record<string, unknown> | undefined {
  if (!data) return undefined;
  return data;
}
