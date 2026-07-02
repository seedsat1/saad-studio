/** Google official image generation adapter.
 *
 * Supports:
 *   • Nano Banana (Gemini 2.5 Flash Image) — via @google/genai
 *   • Imagen 4 family (Ultra / standard / Fast) — via @google/genai
 *
 * Auth: reuses the same env keys as gemini-veo.ts so a single Google
 * key powers every Google call. Output: data URLs (base64) — the panel
 * route uploads them to R2 and replaces with permanent CDN URLs. */

import { GoogleGenAI } from "@google/genai";
import type { ImageGenInput, ProviderResult } from "./types";
import { ProviderError } from "./types";

const KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  "";

let _client: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (!KEY) throw new ProviderError("google", "config", "GOOGLE_API_KEY not set");
  if (!_client) _client = new GoogleGenAI({ apiKey: KEY });
  return _client;
}

/** Internal id → upstream Gemini model id. */
const MODEL_MAP: Record<string, string> = {
  "nano-banana-pro":      "gemini-3-pro-image-preview",
  "nano-banana-2":        "gemini-3.1-flash-image",
  "nano-banana-2-lite":   "gemini-3.1-flash-lite-image",
  "google/nano-banana":   "gemini-2.5-flash-image",
  "google/nano-banana-edit": "gemini-2.5-flash-image",
  "google/imagen4":       "imagen-4.0-generate-001",
  "google/imagen4-ultra": "imagen-4.0-ultra-generate-001",
  "google/imagen4-fast":  "imagen-4.0-fast-generate-001",
};

export async function googleGenerateImage(input: ImageGenInput): Promise<ProviderResult> {
  const upstream = MODEL_MAP[input.modelId];
  if (!upstream) {
    throw new ProviderError("google", "model", `Unknown Google model: ${input.modelId}`);
  }
  const isImagen = upstream.startsWith("imagen");
  return isImagen
    ? imagenGenerate(upstream, input)
    : nanoBananaGenerate(upstream, input);
}

// ─── Nano Banana (Gemini 2.5 Flash Image) ──────────────────────────────

async function nanoBananaGenerate(model: string, input: ImageGenInput): Promise<ProviderResult> {
  const parts: Array<Record<string, unknown>> = [{
    text: withImageControlHints(input.prompt, input.aspectRatio, input.resolution),
  }];

  // Image-to-image / edit: attach a reference image inline.
  if (input.imageUrl) {
    const ref = await fetchAsInlineImage(input.imageUrl);
    if (ref) parts.unshift(ref);
  }

  let res;
  try {
    res = await client().models.generateContent({
      model,
      contents: [{ role: "user", parts }],
    });
  } catch (err) {
    throw new ProviderError("google", "generateContent", (err as Error).message);
  }

  const urls = extractInlineImageUrls(res);
  if (!urls.length) {
    throw new ProviderError("google", "result", "Gemini returned no image data");
  }
  return { urls, provider: "google", metadata: { upstream: model } };
}

interface GenAiResponseLike {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
  }>;
}

function extractInlineImageUrls(res: unknown): string[] {
  const r = res as GenAiResponseLike;
  const out: string[] = [];
  for (const cand of r.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      const inline = part.inlineData;
      if (inline?.data) {
        const mime = inline.mimeType ?? "image/png";
        out.push(`data:${mime};base64,${inline.data}`);
      }
    }
  }
  return out;
}

// ─── Imagen 4 family ───────────────────────────────────────────────────

interface ImagenResponseLike {
  generatedImages?: Array<{ image?: { imageBytes?: string; mimeType?: string } }>;
}

async function imagenGenerate(model: string, input: ImageGenInput): Promise<ProviderResult> {
  const aspect = normalizeAspect(input.aspectRatio);
  const hintedPrompt = withImageControlHints(input.prompt, input.aspectRatio, input.resolution);
  let res;
  try {
    res = await client().models.generateImages({
      model,
      prompt: hintedPrompt,
      config: {
        numberOfImages: clampNum(input.numImages, 1, 4),
        aspectRatio: aspect,
      },
    });
  } catch (err) {
    throw new ProviderError("google", "generateImages", (err as Error).message);
  }

  const r = res as ImagenResponseLike;
  const urls = (r.generatedImages ?? [])
    .map((g) => {
      const data = g.image?.imageBytes;
      const mime = g.image?.mimeType ?? "image/png";
      return data ? `data:${mime};base64,${data}` : null;
    })
    .filter((u): u is string => u !== null);

  if (!urls.length) {
    throw new ProviderError("google", "result", "Imagen returned no image data");
  }
  return { urls, provider: "google", metadata: { upstream: model } };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function normalizeAspect(a: string | undefined): string {
  // Imagen accepts: "1:1", "3:4", "4:3", "9:16", "16:9"
  const allowed = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);
  if (a && allowed.has(a)) return a;
  return "1:1";
}

function clampNum(n: number | undefined, min: number, max: number): number {
  const x = typeof n === "number" ? n : min;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function withImageControlHints(prompt: string, aspectRatio?: string, resolution?: string): string {
  const hints: string[] = [];
  if (aspectRatio) hints.push(`aspect ratio ${aspectRatio}`);
  if (resolution) hints.push(`target quality ${resolution}`);
  if (!hints.length) return prompt;
  return `${prompt.trim()}\n\nOutput requirements: ${hints.join(", ")}.`.trim();
}

async function fetchAsInlineImage(url: string): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    return { inlineData: { data: m[2], mimeType: m[1] } };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/png";
    return { inlineData: { data: buf.toString("base64"), mimeType: mime } };
  } catch {
    return null;
  }
}
