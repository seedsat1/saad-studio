import { NextResponse } from "next/server";

import { verifyPanelToken } from "@/lib/panel-auth";
import { getFallbackUrls } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    protocolVersion?: string;
  };
};

type JsonRpcPayload = {
  jsonrpc: "2.0";
  id: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

type ToolResult = {
  content: ToolContent[];
  isError: boolean;
};

const DEFAULT_IMAGE_MODEL = "nano-banana-pro";
const DEFAULT_VIDEO_MODEL = "kling-3.0/video";

const tools = [
  {
    name: "generate_image",
    description: "Generate an image through Saad Studio using Nano Banana Pro.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Image prompt to generate." },
        modelId: { type: "string", default: DEFAULT_IMAGE_MODEL },
        aspectRatio: { type: "string", default: "1:1" },
        resolution: { type: "string", default: "1K" },
        numImages: { type: "number", default: 1 },
        negativePrompt: { type: "string" },
        imageUrl: { type: "string", description: "Optional reference image URL." },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_storyboard",
    description:
      "Generate multiple concept variations (storyboard candidates) from a single idea. Returns N image options the user can pick from before rendering a video.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The story idea or scene description." },
        numConcepts: {
          type: "number",
          description: "How many concept variations to generate (1-4). Default 4.",
          default: 4,
        },
        aspectRatio: { type: "string", default: "16:9" },
        style: {
          type: "string",
          description: "Optional style hint, e.g. 'cinematic', 'comic', 'noir', 'anime'.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_video",
    description:
      "Render a video from a prompt. Optionally pass imageUrl (a concept from generate_storyboard or from show_generations) to do image-to-video.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        imageUrl: { type: "string", description: "Optional first-frame image URL (from a chosen storyboard concept or an earlier generation)." },
        modelId: { type: "string", default: DEFAULT_VIDEO_MODEL },
        duration: { type: "number", default: 5 },
        aspectRatio: { type: "string", default: "16:9" },
        resolution: { type: "string", default: "1080p" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "show_generations",
    description:
      "List the most recent images/videos the user generated. Returns public URLs so Claude can reference an earlier image (e.g. as first frame for a new video via generate_video's imageUrl) or show the user their history.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "How many recent items to return (1-50). Default 10.", default: 10 },
        kind: {
          type: "string",
          description: "Filter by media kind. Omit for all.",
          enum: ["image", "video", "audio"],
        },
      },
    },
  },
  {
    name: "list_models",
    description:
      "List the image and video models available on Saad Studio, with their capabilities. Use before generate_image/generate_video when the user asks for a specific look, quality tier, or a named model.",
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          description: "Filter by kind. Omit for all.",
          enum: ["image", "video"],
        },
      },
    },
  },
];

const AVAILABLE_MODELS = [
  { id: "nano-banana-pro", kind: "image", label: "Nano Banana Pro", notes: "Default. Fast, photoreal, strong prompt adherence.", badges: ["default", "fast"] },
  { id: "nano-banana-2", kind: "image", label: "Nano Banana 2", notes: "Balanced quality/speed.", badges: [] },
  { id: "google/nano-banana", kind: "image", label: "Google Nano Banana", notes: "Google Imagen variant.", badges: [] },
  { id: "seedream/5-pro", kind: "image", label: "Seedream 5 Pro", notes: "ByteDance high-fidelity. Accepts reference images for edit mode.", badges: ["pro"] },
  { id: "seedream/5-lite", kind: "image", label: "Seedream 5 Lite", notes: "Cheaper Seedream tier.", badges: [] },
  { id: "flux-2/pro", kind: "image", label: "Flux 2 Pro", notes: "Black Forest Labs flagship.", badges: ["pro"] },
  { id: "gpt-image-2", kind: "image", label: "GPT Image 2", notes: "OpenAI image model. Slower, strong typography.", badges: [] },
  { id: "minimax-h3-reference-to-video", kind: "video", label: "Minimax H3", notes: "Minimax reference-to-video.", badges: ["new"] },
  { id: "kling-3.0/video", kind: "video", label: "Kling 3.0", notes: "Default video model. 5-10s, 1080p.", badges: ["default", "new"] },
  { id: "kling-video-o3", kind: "video", label: "Kling O3", notes: "Flagship Kling. Best fidelity.", badges: ["top"] },
  { id: "kling/v3-turbo-text-to-video", kind: "video", label: "Kling V3 Turbo", notes: "Faster Kling variant.", badges: ["fast"] },
  { id: "kling-v2.6-t2v", kind: "video", label: "Kling 2.6", notes: "Previous-gen Kling, cheaper and quick.", badges: ["fast"] },
  { id: "google/veo3.1-lite-text-to-video", kind: "video", label: "Google Veo 3.1 Lite", notes: "Lightweight Veo tier." },
  { id: "google/veo3.1-fast-text-to-video", kind: "video", label: "Google Veo 3.1 Fast", notes: "Faster Veo 3.1.", badges: ["fast"] },
  { id: "google/veo3.1-text-to-video", kind: "video", label: "Google Veo 3.1", notes: "Google flagship video, native audio.", badges: ["new"] },
  { id: "google/gemini-omni-flash", kind: "video", label: "Google Gemini Omni", notes: "Gemini Omni video generation.", badges: ["new"] },
  { id: "bytedance/seedance-v2/text-to-video-fast", kind: "video", label: "Seedance 2.0 Turbo", notes: "Fastest Seedance tier.", badges: ["fast"] },
  { id: "bytedance/seedance-v2/text-to-video-mini", kind: "video", label: "Seedance 2.0 Mini", notes: "Cheapest Seedance tier.", badges: ["fast"] },
  { id: "bytedance/seedance-v2/text-to-video", kind: "video", label: "Seedance 2.0", notes: "ByteDance flagship video, accepts reference images + audio.", badges: ["new"] },
];

function withMcpHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("MCP-Protocol-Version", "2024-11-05");
  return response;
}

function getOrigin(request: Request) {
  return new URL(request.url).origin;
}

function authChallenge(request: Request) {
  const origin = getOrigin(request);
  return new NextResponse(null, {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "MCP-Protocol-Version": "2024-11-05",
      "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="smart_cli.generate smart_cli.read"`,
    },
  });
}

function rpcPayload(id: unknown, result: unknown): JsonRpcPayload {
  return { jsonrpc: "2.0", id, result };
}

function rpcErrorPayload(id: unknown, code: number, message: string): JsonRpcPayload {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function rpcResponse(payload: JsonRpcPayload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "MCP-Protocol-Version": "2024-11-05",
    },
  });
}

function toolResult(value: unknown, isError = false): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    isError,
  };
}

// 25 MB cap on a single tool response payload (Claude.ai refuses much larger).
// Each image is base64 (~33% overhead). Cap individuals at 10 MB raw so we can
// fit ~2 hi-res images per response, and stop at 22 MB total to leave room for
// the JSON text block.
const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_INLINE_BYTES = 22 * 1024 * 1024;

function guessImageMimeFromUrl(url: string): string | null {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return null;
}

type InlineFetchOk = { ok: true; data: string; mimeType: string; bytes: number };
type InlineFetchErr = { ok: false; reason: string };

async function fetchInlineImage(url: string): Promise<InlineFetchOk | InlineFetchErr> {
  // Panel APIs return storage-relative paths ("images/user_xxx/abc.jpg")
  // that fetch() can't parse. getFallbackUrls expands them into the ordered
  // list of absolute CDN URLs (Backblaze B2 → /api/media → R2). We stop at
  // the first host that returns bytes so Claude actually gets the image.
  const candidates = getFallbackUrls(url).filter((candidate) =>
    /^https?:\/\//i.test(candidate),
  );
  if (candidates.length === 0) return { ok: false, reason: "no_absolute_url" };

  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) {
        failures.push(`http_${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength === 0) {
        failures.push("empty_body");
        continue;
      }
      if (buffer.byteLength > MAX_INLINE_IMAGE_BYTES) {
        return { ok: false, reason: `too_large_${buffer.byteLength}` };
      }
      const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
      const mimeType = headerMime.startsWith("image/")
        ? headerMime
        : guessImageMimeFromUrl(candidate) ?? "image/png";
      return { ok: true, data: buffer.toString("base64"), mimeType, bytes: buffer.byteLength };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      failures.push(`fetch_failed:${msg.slice(0, 60)}`);
    }
  }
  return { ok: false, reason: failures.join("|") || "all_candidates_failed" };
}

type InlineCollection = {
  blocks: ToolContent[];
  diagnostics: { attached: number; skipped: number; reasons: string[] };
};

async function collectInlineImages(urls: string[]): Promise<InlineCollection> {
  const fetched = await Promise.all(urls.map(fetchInlineImage));
  const blocks: ToolContent[] = [];
  const reasons: string[] = [];
  let total = 0;
  let attached = 0;
  let skipped = 0;
  for (const item of fetched) {
    if (!item.ok) {
      skipped += 1;
      reasons.push(item.reason);
      continue;
    }
    if (total + item.data.length > MAX_TOTAL_INLINE_BYTES) {
      skipped += 1;
      reasons.push("payload_cap_reached");
      continue;
    }
    blocks.push({ type: "image", data: item.data, mimeType: item.mimeType });
    total += item.data.length;
    attached += 1;
  }
  return { blocks, diagnostics: { attached, skipped, reasons } };
}

function toolResultWithImages(value: unknown, collection: InlineCollection): ToolResult {
  const annotated = typeof value === "object" && value !== null
    ? { ...(value as Record<string, unknown>), _inlineImages: collection.diagnostics }
    : { value, _inlineImages: collection.diagnostics };
  return {
    content: [
      ...collection.blocks,
      { type: "text", text: JSON.stringify(annotated, null, 2) },
    ],
    isError: false,
  };
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

function hasValidToken(request: Request) {
  const token = getBearerToken(request);
  return Boolean(token && verifyPanelToken(token));
}

function normalizeToolName(name: unknown) {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  const unprefixed = trimmed.includes(":") ? trimmed.split(":").pop() : trimmed;
  return unprefixed ?? trimmed;
}

function normalizeToolArgs(args: Record<string, unknown>) {
  const nested = args.params;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return args;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function panelFetch(
  request: Request,
  path: string,
  init: RequestInit,
  token: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = new URL(path, request.url);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function callGenerateImage(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const prompt = asString(args.prompt).trim();
  if (!prompt) return toolResult({ error: "Missing prompt." }, true);

  const body = {
    prompt,
    modelId: asString(args.modelId, DEFAULT_IMAGE_MODEL),
    aspectRatio: asString(args.aspectRatio, "1:1"),
    resolution: asString(args.resolution, "1K"),
    numImages: asNumber(args.numImages, 1),
    negativePrompt: asString(args.negativePrompt) || undefined,
    imageUrl: asString(args.imageUrl) || undefined,
  };

  const res = await panelFetch(request, "/api/panel/generate/image", {
    method: "POST",
    body: JSON.stringify(body),
  }, token);

  if (!res.ok) {
    return toolResult(
      { status: "failed", modelId: body.modelId, error: (res.data as { error?: string })?.error ?? "Image generation failed." },
      true,
    );
  }

  const data = res.data as { imageUrls?: string[]; imageUrl?: string | null; generationId?: string };
  const urls = Array.isArray(data.imageUrls) && data.imageUrls.length
    ? data.imageUrls
    : data.imageUrl ? [data.imageUrl] : [];
  const collection = await collectInlineImages(urls);

  return toolResultWithImages(
    { status: "completed", modelId: body.modelId, ...data },
    collection,
  );
}

async function callGenerateStoryboard(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const idea = asString(args.prompt).trim();
  if (!idea) return toolResult({ error: "Missing prompt." }, true);

  const requested = asNumber(args.numConcepts, 4);
  const numConcepts = Math.max(1, Math.min(4, Math.floor(requested)));
  const aspectRatio = asString(args.aspectRatio, "16:9");
  const style = asString(args.style).trim();

  const styleClause = style ? `, ${style} style` : "";
  const compositionClause = ", cinematic composition, key lighting, clear focal subject";
  const fullPrompt = `${idea}${styleClause}${compositionClause}`;

  const res = await panelFetch(request, "/api/panel/generate/image", {
    method: "POST",
    body: JSON.stringify({
      prompt: fullPrompt,
      modelId: DEFAULT_IMAGE_MODEL,
      aspectRatio,
      resolution: "1K",
      numImages: numConcepts,
    }),
  }, token);

  if (!res.ok) {
    return toolResult(
      { status: "failed", error: (res.data as { error?: string })?.error ?? "Storyboard generation failed." },
      true,
    );
  }

  const data = res.data as { imageUrls?: string[]; imageUrl?: string; generationId?: string };
  const urls = Array.isArray(data.imageUrls) ? data.imageUrls : data.imageUrl ? [data.imageUrl] : [];

  const concepts = urls.map((url, index) => ({
    conceptId: `${index + 1}`,
    imageUrl: url,
    label: `Concept ${index + 1}`,
  }));

  const collection = await collectInlineImages(urls);

  return toolResultWithImages({
    status: "completed",
    idea,
    style: style || null,
    aspectRatio,
    concepts,
    nextStep:
      "Ask the user to pick a concept (1-N), then call generate_video with imageUrl set to that concept's imageUrl.",
    generationId: data.generationId ?? null,
  }, collection);
}

async function callGenerateVideo(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const prompt = asString(args.prompt).trim();
  if (!prompt) return toolResult({ error: "Missing prompt." }, true);

  const body = {
    prompt,
    modelId: asString(args.modelId, DEFAULT_VIDEO_MODEL),
    duration: asNumber(args.duration, 5),
    aspectRatio: asString(args.aspectRatio, "16:9"),
    resolution: asString(args.resolution, "1080p"),
    imageUrl: asString(args.imageUrl) || undefined,
  };

  const res = await panelFetch(request, "/api/panel/generate/video", {
    method: "POST",
    body: JSON.stringify(body),
  }, token);

  if (!res.ok) {
    return toolResult(
      { status: "failed", modelId: body.modelId, error: (res.data as { error?: string })?.error ?? "Video generation failed." },
      true,
    );
  }

  return toolResult({ status: "completed", modelId: body.modelId, ...(res.data as object) });
}

async function callShowGenerations(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const rawLimit = Math.floor(asNumber(args.limit, 10));
  const limit = Math.max(1, Math.min(50, rawLimit));
  const kind = asString(args.kind).toLowerCase();
  const query = new URLSearchParams({ limit: String(limit) });
  if (kind === "image" || kind === "video" || kind === "audio") {
    query.set("kind", kind);
  }

  const res = await panelFetch(
    request,
    `/api/panel/generations?${query.toString()}`,
    { method: "GET" },
    token,
  );
  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to list generations." },
      true,
    );
  }

  const data = res.data as { items?: Array<Record<string, unknown>>; hasMore?: boolean };
  const items = data.items ?? [];
  const imageUrls = items
    .filter((item) => item.kind === "image" && typeof item.url === "string")
    .slice(0, 4)
    .map((item) => item.url as string);
  const collection = await collectInlineImages(imageUrls);

  return toolResultWithImages({
    items,
    hasMore: data.hasMore ?? false,
    hint: "To reuse an image as the first frame of a new video, call generate_video with imageUrl set to that item's url.",
  }, collection);
}

function callListModels(args: Record<string, unknown>): ToolResult {
  const kind = asString(args.kind).toLowerCase();
  const models = kind === "image" || kind === "video"
    ? AVAILABLE_MODELS.filter((model) => model.kind === kind)
    : AVAILABLE_MODELS;
  return toolResult({
    defaults: { image: DEFAULT_IMAGE_MODEL, video: DEFAULT_VIDEO_MODEL },
    models,
    hint: "Pass any model id to generate_image or generate_video via the modelId parameter. Omit modelId to use the default.",
  });
}

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  request: Request,
): Promise<ToolResult> {
  const token = getBearerToken(request);
  if (!token) {
    return toolResult(
      { status: "auth_required", error: "Missing Authorization: Bearer ssp_... header." },
      true,
    );
  }

  switch (name) {
    case "generate_image":
      return callGenerateImage(request, args, token);
    case "generate_storyboard":
      return callGenerateStoryboard(request, args, token);
    case "generate_video":
      return callGenerateVideo(request, args, token);
    case "show_generations":
      return callShowGenerations(request, args, token);
    case "list_models":
      return callListModels(args);
    default:
      return toolResult({ error: `Unknown tool: ${name}` }, true);
  }
}

async function handleRpcPayload(body: JsonRpcRequest, request: Request): Promise<JsonRpcPayload | null> {
  const id = body?.id ?? null;
  const method = body?.method;

  if (!method) return rpcErrorPayload(id, -32600, "Invalid request");
  if (method.startsWith("notifications/")) return null;

  if (method === "initialize") {
    return rpcPayload(id, {
      protocolVersion: body?.params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "saad-studio-smart-cli", version: "0.2.0" },
    });
  }

  if (method === "ping") return rpcPayload(id, {});
  if (method === "tools/list") return rpcPayload(id, { tools });

  if (method === "tools/call") {
    const requestedName = body?.params?.name;
    const name = normalizeToolName(requestedName);
    const args = normalizeToolArgs(body?.params?.arguments ?? {});
    const tool = tools.find((item) => item.name === name);
    if (!tool) return rpcErrorPayload(id, -32602, `Unknown tool: ${String(requestedName ?? "missing")}`);
    const result = await dispatchTool(name, args, request);
    return rpcPayload(id, result);
  }

  return rpcErrorPayload(id, -32601, "Method not found");
}

async function handleRpc(body: JsonRpcRequest, request: Request) {
  const payload = await handleRpcPayload(body, request);
  if (!payload) {
    return new NextResponse(null, {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": "2024-11-05",
      },
    });
  }
  return rpcResponse(payload);
}

export async function GET(request: Request) {
  if (!hasValidToken(request)) return authChallenge(request);
  return withMcpHeaders(NextResponse.json({
    name: "Saad Studio Smart CLI",
    description: "MCP-compatible endpoint for Saad Studio creative briefs.",
    tools: tools.map(({ name, description }) => ({ name, description })),
  }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!hasValidToken(request)) return authChallenge(request);

  if (Array.isArray(body)) {
    const results = (await Promise.all(
      body.map((item) => handleRpcPayload(item, request)),
    )).filter((item): item is JsonRpcPayload => Boolean(item));
    return withMcpHeaders(NextResponse.json(results));
  }

  return handleRpc(body, request);
}
