import { NextResponse } from "next/server";

import { verifyPanelToken } from "@/lib/panel-auth";

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
    uri?: string;
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
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
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
      "Render a video from a prompt. Optionally pass imageUrl (a concept from generate_storyboard) to do image-to-video.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        imageUrl: { type: "string", description: "Optional first-frame image URL (from a chosen storyboard concept)." },
        modelId: { type: "string", default: DEFAULT_VIDEO_MODEL },
        duration: { type: "number", default: 5 },
        aspectRatio: { type: "string", default: "16:9" },
        resolution: { type: "string", default: "1080p" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "balance",
    description: "Read the current Saad Studio credit balance.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "show_generations",
    description: "List the most recent generated images/videos for this account.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "job_status",
    description: "Look up a single generation by id (returns its public URL when ready).",
    inputSchema: {
      type: "object",
      properties: {
        generationId: { type: "string" },
      },
      required: ["generationId"],
    },
  },
  {
    name: "r2_upload_url",
    description:
      "Get a Cloudflare R2 signed PUT URL for uploading a source video that will be post-processed by Reap. The client uploads bytes directly to signedUrl; then pass publicUrl to reap_run as sourceUrl.",
    inputSchema: {
      type: "object",
      properties: {
        fileName: { type: "string", description: "Original filename (e.g. 'clip.mp4')." },
        contentType: { type: "string", description: "MIME type, e.g. 'video/mp4'.", default: "video/mp4" },
        assetType: { type: "string", default: "video" },
      },
      required: ["fileName"],
    },
  },
  {
    name: "reap_run",
    description:
      "Run a Reap.video post-production tool on an already-uploaded video. Tools: captions, reframe, dubbing, audiogram, transcription, edit-videos. Source must be a public URL (typically a Cloudflare R2 publicUrl from r2_upload_url). Reap is NEVER used for generation — only post-production.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          enum: ["captions", "reframe", "dubbing", "audiogram", "transcription", "edit-videos"],
        },
        sourceUrl: { type: "string", description: "Public URL of the source video (e.g. R2 publicUrl)." },
        filename: { type: "string", description: "Optional. Defaults to a slug derived from sourceUrl." },
        options: {
          type: "object",
          description:
            "Tool-specific options forwarded to Reap. Examples: { language: 'en', translationLanguage: 'ar' } for captions/dubbing; { orientation: 'square', resolution: 1080 } for reframe.",
        },
      },
      required: ["tool", "sourceUrl"],
    },
  },
  {
    name: "reap_status",
    description: "Poll a Reap project. Returns { status, url, urls, progress, ... }. On 'completed', url is R2-hosted.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        generationId: { type: "string", description: "Optional generationId returned from reap_run for ledger linkage." },
      },
      required: ["projectId"],
    },
  },
];

// MCP Apps UI resource — declared via resources/list, served by resources/read.
// Clients that understand MCP Apps render this widget inline in chat (like
// Higgsfield). Clients that don't will still receive the image_content block
// in the tool result as a fallback.
const GENERATE_IMAGE_UI_URI = "ui://saadstudio/generate-image";

const UI_RESOURCES = [
  {
    uri: GENERATE_IMAGE_UI_URI,
    name: "Saad Studio · generate_image",
    description:
      "Inline widget rendering the generated image with brand header, prompt summary, model/aspect badges, and download/fullscreen actions.",
    mimeType: "text/html+mcp",
  },
];

const GENERATE_IMAGE_WIDGET_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Saad Studio</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0a0f1c;color:#e2e8f0;padding:14px;border:1px solid rgba(34,211,238,.18);border-radius:14px;font-size:14px}
.hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.lg{width:30px;height:30px;background:linear-gradient(135deg,#22d3ee,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px;letter-spacing:.5px}
.br{font-size:13px;color:#94a3b8}
.br strong{color:#fff;font-weight:700}
.tl{color:#67e8f9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.pr{font-size:13.5px;line-height:1.55;color:#cbd5e1;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pr.ex{-webkit-line-clamp:unset;display:block}
.tg{background:none;border:none;padding:0 0 12px 0;color:#67e8f9;cursor:pointer;font-size:12px;font-weight:600}
.bg{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.bd{background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.22);color:#67e8f9;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600}
.fr{position:relative;border-radius:10px;overflow:hidden;background:#04060c;border:1px solid rgba(255,255,255,.06)}
.fr img{width:100%;height:auto;display:block}
.st{position:absolute;top:10px;left:10px;background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.45);color:#6ee7b7;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.3px;backdrop-filter:blur(6px)}
.ac{position:absolute;top:10px;right:10px;display:flex;gap:6px}
.bt{background:rgba(8,12,22,.85);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;backdrop-filter:blur(6px)}
.bt:hover{background:rgba(34,211,238,.18);border-color:rgba(34,211,238,.45)}
.empty{color:#64748b;font-size:13px;padding:24px;text-align:center}
</style></head><body>
<div id="root" class="empty">Waiting for image data...</div>
<script>(function(){
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function read(){
  var o=window.openai&&window.openai.toolOutput;
  if(o)return o;
  var m=window.mcp&&(window.mcp.toolOutput||window.mcp.output||window.mcp.structuredContent);
  if(m)return m;
  if(window.__mcp_output__)return window.__mcp_output__;
  return null;
}
function render(d){
  var root=document.getElementById('root');
  if(!d||!d.imageUrl){root.className='empty';root.textContent='No image data.';return}
  var url=esc(d.imageUrl),pr=esc(d.prompt||""),mo=esc(d.modelId||""),ar=esc(d.aspectRatio||"");
  root.className='';
  root.innerHTML=
    '<div class="hd"><div class="lg">SS</div><div class="br"><strong>Saad Studio</strong> · <span class="tl">generate_image</span></div></div>'+
    (pr?'<div class="pr" id="p">'+pr+'</div><button class="tg" id="t">Show more</button>':'')+
    '<div class="bg">'+(mo?'<span class="bd">'+mo+'</span>':'')+(ar?'<span class="bd">'+ar+'</span>':'')+'</div>'+
    '<div class="fr"><span class="st">✓ Done</span><div class="ac">'+
    '<a class="bt" href="'+url+'" download target="_blank" rel="noopener">Download</a>'+
    '<a class="bt" href="'+url+'" target="_blank" rel="noopener">Fullscreen</a>'+
    '</div><img src="'+url+'" alt="Generated image"></div>';
  var p=document.getElementById('p'),t=document.getElementById('t');
  if(p&&t){t.addEventListener('click',function(){p.classList.toggle('ex');t.textContent=p.classList.contains('ex')?'Show less':'Show more'});requestAnimationFrame(function(){if(p.scrollHeight<=p.clientHeight+2)t.style.display='none'})}
}
var d=read();
if(d){render(d);return}
window.addEventListener('message',function(e){if(e&&e.data){var x=e.data.toolOutput||e.data.output||e.data.structuredContent||(e.data.type==='tool_output'?e.data.payload:null);if(x)render(x)}});
var n=0,t=setInterval(function(){n++;var x=read();if(x){clearInterval(t);render(x)}else if(n>30){clearInterval(t);var r=document.getElementById('root');if(r&&r.className==='empty')r.textContent='Image data not available.'}},100);
})();</script>
</body></html>`;

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
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0) return { ok: false, reason: "empty_body" };
    if (buffer.byteLength > MAX_INLINE_IMAGE_BYTES) {
      return { ok: false, reason: `too_large_${buffer.byteLength}` };
    }
    const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const mimeType = headerMime.startsWith("image/")
      ? headerMime
      : guessImageMimeFromUrl(url) ?? "image/png";
    return { ok: true, data: buffer.toString("base64"), mimeType, bytes: buffer.byteLength };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, reason: `fetch_failed:${msg.slice(0, 80)}` };
  }
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

function toolResultWithImages(
  value: unknown,
  collection: InlineCollection,
  extras?: {
    structuredContent?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  },
): ToolResult {
  const annotated = typeof value === "object" && value !== null
    ? { ...(value as Record<string, unknown>), _inlineImages: collection.diagnostics }
    : { value, _inlineImages: collection.diagnostics };
  const result: ToolResult = {
    content: [
      ...collection.blocks,
      { type: "text", text: JSON.stringify(annotated, null, 2) },
    ],
    isError: false,
  };
  if (extras?.structuredContent) result.structuredContent = extras.structuredContent;
  if (extras?.meta) result._meta = extras.meta;
  return result;
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

  const structuredContent = urls[0]
    ? {
        status: "completed",
        imageUrl: urls[0],
        imageUrls: urls,
        prompt,
        modelId: body.modelId,
        aspectRatio: body.aspectRatio,
        resolution: body.resolution,
        generationId: data.generationId ?? null,
      }
    : undefined;

  // Three _meta variants for maximum compatibility across MCP Apps clients.
  // Clients ignore unknown _meta keys, so sending all three is safe.
  const meta = urls[0]
    ? {
        "ui/resourceUri": GENERATE_IMAGE_UI_URI,
        ui: { resourceUri: GENERATE_IMAGE_UI_URI },
        "openai/outputTemplate": GENERATE_IMAGE_UI_URI,
      }
    : undefined;

  return toolResultWithImages(
    { status: "completed", modelId: body.modelId, ...data },
    collection,
    { structuredContent, meta },
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

async function callBalance(request: Request, token: string): Promise<ToolResult> {
  const res = await panelFetch(request, "/api/panel/credits", { method: "GET" }, token);
  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to read balance." },
      true,
    );
  }
  return toolResult(res.data);
}

async function callShowGenerations(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const limit = Math.max(1, Math.min(50, Math.floor(asNumber(args.limit, 10))));
  const res = await panelFetch(
    request,
    `/api/panel/generations?limit=${limit}`,
    { method: "GET" },
    token,
  );
  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to list generations." },
      true,
    );
  }
  return toolResult(res.data);
}

async function callJobStatus(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const generationId = asString(args.generationId).trim();
  if (!generationId) return toolResult({ error: "Missing generationId." }, true);

  // The panel API doesn't expose a single-generation GET, so fetch the recent
  // list and filter. 50 is the panel-side maximum.
  const res = await panelFetch(
    request,
    "/api/panel/generations?limit=50",
    { method: "GET" },
    token,
  );
  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to look up job." },
      true,
    );
  }

  const items = (res.data as { items?: Array<{ id: string }> }).items ?? [];
  const match = items.find((item) => item.id === generationId);
  if (!match) {
    return toolResult({
      status: "pending_or_unknown",
      generationId,
      message:
        "Not visible in the latest 50 generations. It may still be processing, may have failed, or may be older than the recent window.",
    });
  }
  return toolResult({ status: "ready", ...match });
}

async function callR2UploadUrl(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const fileName = asString(args.fileName).trim();
  if (!fileName) return toolResult({ error: "Missing fileName." }, true);

  const res = await panelFetch(request, "/api/panel/upload-url", {
    method: "POST",
    body: JSON.stringify({
      fileName,
      contentType: asString(args.contentType, "video/mp4"),
      assetType: asString(args.assetType, "video"),
    }),
  }, token);

  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to get R2 signed URL." },
      true,
    );
  }

  const data = res.data as { signedUrl?: string; publicUrl?: string; path?: string; bucket?: string };
  return toolResult({
    status: "ready",
    signedUrl: data.signedUrl,
    publicUrl: data.publicUrl,
    path: data.path,
    bucket: data.bucket,
    nextStep:
      "Client must PUT the video bytes to signedUrl with the same Content-Type. Then call reap_run with sourceUrl=publicUrl.",
  });
}

async function callReapRun(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const tool = asString(args.tool).trim();
  const sourceUrl = asString(args.sourceUrl).trim();
  const allowedTools = ["captions", "reframe", "dubbing", "audiogram", "transcription", "edit-videos"];

  if (!tool || !allowedTools.includes(tool)) {
    return toolResult({ error: `tool must be one of: ${allowedTools.join(", ")}` }, true);
  }
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return toolResult({ error: "sourceUrl must be an http(s) URL (e.g. R2 publicUrl)." }, true);
  }

  const rawOptions = args.options;
  const options = rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)
    ? (rawOptions as Record<string, unknown>)
    : {};

  const res = await panelFetch(request, "/api/panel/reap/start", {
    method: "POST",
    body: JSON.stringify({
      tool,
      sourceUrl,
      filename: asString(args.filename) || undefined,
      options,
    }),
  }, token);

  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to start Reap job." },
      true,
    );
  }
  return toolResult({ status: "queued", ...(res.data as object) });
}

async function callReapStatus(
  request: Request,
  args: Record<string, unknown>,
  token: string,
): Promise<ToolResult> {
  const projectId = asString(args.projectId).trim();
  if (!projectId) return toolResult({ error: "Missing projectId." }, true);

  const generationId = asString(args.generationId).trim();
  const query = new URLSearchParams({ projectId });
  if (generationId) query.set("generationId", generationId);

  const res = await panelFetch(
    request,
    `/api/panel/reap/status?${query.toString()}`,
    { method: "GET" },
    token,
  );

  if (!res.ok) {
    return toolResult(
      { error: (res.data as { error?: string })?.error ?? "Failed to read Reap status." },
      true,
    );
  }
  return toolResult(res.data);
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
    case "balance":
      return callBalance(request, token);
    case "show_generations":
      return callShowGenerations(request, args, token);
    case "job_status":
      return callJobStatus(request, args, token);
    case "r2_upload_url":
      return callR2UploadUrl(request, args, token);
    case "reap_run":
      return callReapRun(request, args, token);
    case "reap_status":
      return callReapStatus(request, args, token);
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
    console.log("[smart-cli/mcp] initialize", {
      clientProtocolVersion: body?.params?.protocolVersion,
    });
    return rpcPayload(id, {
      protocolVersion: body?.params?.protocolVersion ?? "2024-11-05",
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false, subscribe: false },
      },
      serverInfo: { name: "saad-studio-smart-cli", version: "0.3.0" },
    });
  }

  if (method === "ping") return rpcPayload(id, {});
  if (method === "tools/list") return rpcPayload(id, { tools });

  if (method === "resources/list") {
    console.log("[smart-cli/mcp] resources/list");
    return rpcPayload(id, { resources: UI_RESOURCES });
  }

  if (method === "resources/read") {
    const uri = body?.params?.uri;
    console.log("[smart-cli/mcp] resources/read", { uri });
    if (uri === GENERATE_IMAGE_UI_URI) {
      return rpcPayload(id, {
        contents: [
          {
            uri,
            mimeType: "text/html+mcp",
            text: GENERATE_IMAGE_WIDGET_HTML,
          },
        ],
      });
    }
    return rpcErrorPayload(id, -32602, `Unknown resource URI: ${String(uri ?? "missing")}`);
  }

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
