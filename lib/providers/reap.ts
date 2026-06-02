/** Reap.video public automation API adapter.
 *
 * Wraps every endpoint at https://public.reap.video/api/v1/automation/*
 * so the panel route can dispatch the supported tools (captions, reframe,
 * dubbing, transcription, edit-videos / create-clips) through a single
 * normalized contract.
 *
 * Auth: REAP_API_KEY (Bearer).
 * Rate limit: 10 requests / minute per key â€” keep an eye on the
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
const BASE = normalizeReapBase(
  process.env.REAP_API_BASE ??
  "https://public.reap.video/api/v1/automation"
);

export type ReapTool =
  | "captions"
  | "reframe"
  | "dubbing"
  | "audiogram"
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
  /** Free-form metadata returned by the upstream â€” transcript JSON,
   *  caption text, dubbed language tag, etc. */
  metadata?: Record<string, unknown>;
  error?: string;
}

interface ReapProjectOutputs {
  urls: string[];
  metadata?: Record<string, unknown>;
}

export interface ReapStartParams {
  filename: string;
  /** Public URL the backend will stream into Reap's presigned S3 slot. */
  sourceUrl: string;
  tool: ReapTool;
  /** Tool-specific extras. Forwarded as-is to the /create-<tool> body. */
  options?: Record<string, unknown>;
}

export interface ReapPreset {
  id: string;
  label: string;
  name?: string;
  source?: "system" | "user" | string;
  preferences?: Record<string, unknown>;
}

export interface ReapRawLanguageOption {
  code: string;
  name?: string;
  displayName?: string;
}

export interface ReapLanguageCatalog {
  sourceLanguages: ReapRawLanguageOption[];
  targetLanguages: ReapRawLanguageOption[];
}

export interface ReapPresetDiagnostics {
  endpoint: string;
  status?: number;
  ok: boolean;
  rawCount: number;
  parsedCount: number;
  userPresetCount: number;
  hasSaad: boolean;
  sample: Array<Pick<ReapPreset, "id" | "label" | "name" | "source">>;
  error?: string;
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    const output = await fetchProjectOutputs(projectId);
    if (output.urls.length) {
      return {
        status,
        url: output.urls[0],
        urls: output.urls,
        metadata: mergeMetadata(dataAsRecord(data), output.metadata),
      };
    }
    return { status, metadata: dataAsRecord(data) };
  }

  if (status === "failed" || status === "invalid" || status === "expired") {
    return { status, error: firstString(data, ["error", "message", "reason"]) ?? `Project ${status}` };
  }

  // queued / processing / unknown â€” surface progress if available
  const progress = typeof data?.progress === "number" ? data.progress : undefined;
  return { status: (status as ReapStatus) || "processing", progress };
}

export async function listDubbingLanguages(): Promise<ReapLanguageCatalog> {
  ensureKey();
  const res = await reapFetch("/get-dubbing-languages");
  const data = await readJson(res, "get-dubbing-languages");
  return parseLanguageCatalog(data);
}

export async function listTranslationLanguages(): Promise<ReapLanguageCatalog> {
  ensureKey();
  const res = await reapFetch("/get-translation-languages");
  const data = await readJson(res, "get-translation-languages");
  return parseLanguageCatalog(data);
}

export async function listCaptionPresets(): Promise<ReapPreset[]> {
  ensureKey();
  const pages = await fetchAllPresetPages();
  return dedupePresets(pages.flatMap((data) => parsePresetList(data)));
}

export async function inspectCaptionPresets(): Promise<ReapPresetDiagnostics> {
  const endpoint = `${BASE}/get-all-presets?pageSize=100`;
  try {
    ensureKey();
    const pages = await fetchAllPresetPages();
    const raw = pages.flatMap((data) => extractPresetArray(data));
    const presets = dedupePresets(pages.flatMap((data) => parsePresetList(data)));

    return {
      endpoint,
      status: 200,
      ok: true,
      rawCount: raw.length,
      parsedCount: presets.length,
      userPresetCount: presets.filter((preset) => preset.source === "user").length,
      hasSaad: presets.some((preset) => /saad/i.test(`${preset.label} ${preset.name ?? ""} ${preset.id}`)),
      sample: presets.slice(0, 8).map(({ id, label, name, source }) => ({ id, label, name, source })),
    };
  } catch (err) {
    return {
      endpoint,
      ok: false,
      rawCount: 0,
      parsedCount: 0,
      userPresetCount: 0,
      hasSaad: false,
      sample: [],
      error: (err as Error).message,
    };
  }
}

/** Exposed so the panel can request a Reap presigned URL and push the
 *  source clip there directly (skipping the R2 round-trip). */
export async function requestReapUploadUrl(filename: string): Promise<ReapUploadTarget> {
  ensureKey();
  return getUploadUrl(filename);
}

export function normalizeReapOptions(tool: ReapTool, raw: Record<string, unknown>): Record<string, unknown> {
  if (tool === "audiogram") {
    const transcriptionScriptRaw =
      pickString(raw.transcriptionScript) ??
      pickString(raw.script) ??
      "native";
    const transcriptionScript = transcriptionScriptRaw.toLowerCase() === "roman" ||
      transcriptionScriptRaw.toLowerCase() === "latin"
        ? "roman"
        : "native";
    const resolution = Number(raw.resolution ?? raw.exportResolution ?? 720);
    const translationLanguage =
      pickString(raw.translationLanguage) ??
      pickString(raw.translateTo);

    return stripUndefined({
      template: pickString(raw.template),
      templateId: pickString(raw.templateId),
      brandTemplateId: pickString(raw.brandTemplateId),
      text: pickString(raw.text),
      logoUploadId: pickString(raw.logoUploadId),
      backgroundUploadId: pickString(raw.backgroundUploadId),
      language: pickString(raw.language),
      translationLanguage: translationLanguage && translationLanguage !== "none" ? translationLanguage : undefined,
      transcriptionScript,
      orientation: pickString(raw.orientation) ?? "square",
      resolution: [720, 1080, 1440, 2160].includes(resolution) ? resolution : 720,
    });
  }

  if (tool !== "captions") return stripUndefined(raw);

  const translationLanguage =
    pickString(raw.translationLanguage) ??
    pickString(raw.translateTo) ??
    pickString(raw.dubbingLanguage);

  const transcriptionScriptRaw =
    pickString(raw.transcriptionScript) ??
    pickString(raw.script) ??
    "native";

  const transcriptionScript = transcriptionScriptRaw.toLowerCase() === "roman" ||
    transcriptionScriptRaw.toLowerCase() === "latin"
      ? "roman"
      : "native";

  const resolution = Number(raw.resolution ?? raw.exportResolution ?? 720);

  return stripUndefined({
    captionsPreset: pickString(raw.captionsPreset) ?? "system_beasty",
    language: pickString(raw.language),
    translationLanguage: translationLanguage && translationLanguage !== "none" ? translationLanguage : undefined,
    transcriptionScript,
    enableEmojis: Boolean(raw.enableEmojis),
    enableHighlights: Boolean(raw.enableHighlights),
    resolution: [720, 1080, 1440, 2160].includes(resolution) ? resolution : 720,
  });
}

/** Same flow as startReapJob() but assumes the source is already in
 *  Reap's S3 (uploadId obtained via requestReapUploadUrl). Avoids the
 *  double-upload when the panel can push the file directly. */
export async function startReapJobWithUploadId(params: {
  tool: ReapTool;
  uploadId: string;
  options?: Record<string, unknown>;
}): Promise<{ projectId: string }> {
  ensureKey();
  const projectId = await createTool(params.tool, params.uploadId, params.options ?? {});
  return { projectId };
}

// â”€â”€â”€ Internals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ensureKey() {
  if (!API_KEY) throw new ProviderError("kie", "config", "REAP_API_KEY is not set on the server.");
}

function normalizeReapBase(value: string): string {
  const base = value.replace(/\/+$/, "");
  return /\/automation$/i.test(base) ? base : `${base}/automation`;
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
  if (tool === "audiogram") {
    try {
      return await createToolAt("/create-audiogram", uploadId, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/404|not found|cannot post/i.test(message)) throw err;
      return createToolAt("/create-clips", uploadId, {
        ...options,
        addAudiogram: true,
        captionsPreset: pickString(options.brandTemplateId) ?? pickString(options.templateId),
      });
    }
  }

  const path =
    tool === "captions" ? "/create-captions" :
    tool === "reframe" ? "/create-reframe" :
    tool === "dubbing" ? "/create-dubbing" :
    tool === "transcription" ? "/create-transcription" :
    "/create-clips";

  return createToolAt(path, uploadId, options);
}

async function createToolAt(
  path: string,
  uploadId: string,
  options: Record<string, unknown>,
): Promise<string> {
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

async function fetchProjectOutputs(projectId: string): Promise<ReapProjectOutputs> {
  const outputUrls: string[] = [];
  let outputMetadata: Record<string, unknown> | undefined;

  // Read details first: transcription/caption projects expose SRT URLs in
  // data.urls, while get-project-clips may only expose a rendered video.
  try {
    const res = await reapFetch(`/get-project-details?projectId=${encodeURIComponent(projectId)}`);
    const data = await readJson(res, "get-project-details");
    outputUrls.push(...extractUrlsFromDetails(data));
    outputMetadata = dataAsRecord(data);
  } catch { /* continue to clips */ }

  // get-project-clips works for clipping projects and sometimes returns
  // rendered clip URLs for other project types.
  try {
    const res = await reapFetch(`/get-project-clips?projectId=${encodeURIComponent(projectId)}`);
    const data = await readJson(res, "get-project-clips");
    const arr = Array.isArray(data?.clips) ? data.clips : Array.isArray(data) ? data : [];
    const clips = arr
      .map((raw: unknown): string | null => {
        if (typeof raw === "string" && /^https?:\/\//i.test(raw)) return raw;
        if (raw && typeof raw === "object") {
          const r = raw as Record<string, unknown>;
          return firstString(r, ["clipUrl", "url", "videoUrl", "outputUrl", "downloadUrl"]) ?? null;
        }
        return null;
      })
      .filter((v: string | null): v is string => v !== null);
    outputUrls.push(...clips);
    outputMetadata = mergeMetadata(outputMetadata, dataAsRecord(data));
  } catch { /* ignore clips fallback failure */ }

  return {
    urls: Array.from(new Set(outputUrls)),
    metadata: outputMetadata,
  };
}
function extractUrlsFromDetails(data: Record<string, unknown> | null): string[] {
  if (!data) return [];
  const urls: string[] = [];

  // Common pattern: data.urls is an object keyed by asset name.
  const urlBag = data.urls;
  if (urlBag && typeof urlBag === "object" && !Array.isArray(urlBag)) {
    for (const value of Object.values(urlBag as Record<string, unknown>)) {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        urls.push(value);
      }
    }
  }

  // Top-level direct fields as a fallback.
  const direct = firstString(data, [
    "outputUrl", "videoUrl", "url", "downloadUrl",
    "captionedVideoUrl", "reframedVideoUrl", "dubbedVideoUrl",
  ]);
  if (direct) urls.unshift(direct);

  // Deduplicate while preserving order.
  return Array.from(new Set(urls));
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

function mergeMetadata(
  base: Record<string, unknown> | undefined,
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!base) return extra;
  if (!extra) return base;
  return { ...base, ...extra };
}

function extractPresetArray(data: Record<string, unknown> | unknown[] | null): unknown[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.presets) ? data.presets
    : Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.data) ? data.data
    : [];
}

async function fetchAllPresetPages(): Promise<Array<Record<string, unknown> | unknown[] | null>> {
  const pageSize = 100;
  const pages: Array<Record<string, unknown> | unknown[] | null> = [];
  let totalPages: number | undefined;

  for (let page = 1; page <= (totalPages ?? 25); page++) {
    const res = await reapFetch(`/get-all-presets?page=${page}&pageSize=${pageSize}`);
    const data = await readJson(res, "get-all-presets");
    pages.push(data);

    const record = data && !Array.isArray(data) ? data : null;
    const parsedTotalPages = Number(record?.totalPages ?? record?.pages);
    if (Number.isFinite(parsedTotalPages) && parsedTotalPages > 0) {
      totalPages = Math.min(Math.floor(parsedTotalPages), 25);
    }

    const items = extractPresetArray(data);
    if (!items.length) break;
    if (totalPages && page >= totalPages) break;
    if (!totalPages && items.length < pageSize) break;
  }

  return pages;
}

function dedupePresets(presets: ReapPreset[]): ReapPreset[] {
  const seen = new Set<string>();
  const out: ReapPreset[] = [];
  for (const preset of presets) {
    if (seen.has(preset.id)) continue;
    seen.add(preset.id);
    out.push(preset);
  }
  return out;
}

function parsePresetList(data: Record<string, unknown> | unknown[] | null): ReapPreset[] {
  return extractPresetArray(data)
    .map((raw: unknown): ReapPreset | null => {
      if (typeof raw === "string") return { id: raw, label: raw };
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id
                 : typeof r.preset === "string" ? r.preset
                 : null;
        if (!id) return null;
        const name = typeof r.name === "string" ? r.name : undefined;
        const label = typeof r.label === "string" ? r.label : name ?? id;
        const source = typeof r.source === "string" ? r.source : undefined;
        const preferences = r.preferences && typeof r.preferences === "object" && !Array.isArray(r.preferences)
          ? r.preferences as Record<string, unknown>
          : undefined;
        return { id, label, name, source, preferences };
      }
      return null;
    })
    .filter((v: ReapPreset | null): v is ReapPreset => v !== null);
}

function summarizeError(data: Record<string, unknown> | unknown[] | null, text: string, status: number): string {
  if (data && !Array.isArray(data)) {
    return firstString(data, ["error", "message", "detail"]) ?? `HTTP ${status}`;
  }
  return text.trim().slice(0, 200) || `HTTP ${status}`;
}

function parseLanguageCatalog(data: Record<string, unknown> | null): ReapLanguageCatalog {
  const sourceLanguages = parseLanguageOptions(data?.sourceLanguages);
  const targetLanguages = parseLanguageOptions(data?.targetLanguages);

  // Some old or undocumented payloads expose a flat list; keep it as a safe fallback
  // so the caller still receives a usable contract.
  if (!sourceLanguages.length && !targetLanguages.length) {
    const fallback = parseLanguageOptions(
      Array.isArray(data?.languages) ? data.languages
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data) ? data.data
        : [],
    );
    return {
      sourceLanguages: fallback,
      targetLanguages: [],
    };
  }

  return { sourceLanguages, targetLanguages };
}

function parseLanguageOptions(value: unknown): ReapRawLanguageOption[] {
  const arr = Array.isArray(value) ? value : [];
  return arr
    .map((raw: unknown): ReapRawLanguageOption | null => {
      if (typeof raw === "string") return { code: raw, name: raw, displayName: raw };
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        const code = typeof r.code === "string" ? r.code
          : typeof r.language === "string" ? r.language
          : typeof r.id === "string" ? r.id
          : null;
        if (!code) return null;
        const name = typeof r.name === "string" ? r.name
          : typeof r.label === "string" ? r.label
          : code;
        const displayName = typeof r.displayName === "string" ? r.displayName : name;
        return { code, name, displayName };
      }
      return null;
    })
    .filter((v: ReapRawLanguageOption | null): v is ReapRawLanguageOption => v !== null);
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

