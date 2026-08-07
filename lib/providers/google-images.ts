/** Google official image generation adapter.
 *
 * Supports:
 *   â€¢ Nano Banana (Gemini 2.5 Flash Image) â€” via @google/genai
 *   â€¢ Imagen 4 family (Ultra / standard / Fast) â€” via @google/genai
 *
 * Auth: reuses the same env keys as gemini-veo.ts so a single Google
 * key powers every Google call. Output: data URLs (base64) â€” the panel
 * route uploads them to R2 and replaces with permanent CDN URLs. */

import { GoogleGenAI } from "@google/genai";
import type { ImageGenInput, ProviderResult } from "./types";
import { ProviderError } from "./types";
import {
  getGoogleImageUpstreamModel,
  normalizeGoogleImageAspectRatio,
  normalizeGoogleImageSize,
} from "../google-image-model-specs";

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


export async function googleGenerateImage(input: ImageGenInput): Promise<ProviderResult> {
  const upstream = getGoogleImageUpstreamModel(input.modelId);
  if (!upstream) {
    throw new ProviderError("google", "model", `Unknown Google model: ${input.modelId}`);
  }
  const isImagen = upstream.startsWith("imagen");
  return isImagen
    ? imagenGenerate(upstream, input)
    : nanoBananaGenerate(upstream, input);
}

// â”€â”€â”€ Nano Banana (Gemini 2.5 Flash Image) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function nanoBananaGenerate(model: string, input: ImageGenInput): Promise<ProviderResult> {
  const fanout = clampNum(input.numImages, 1, 4);
  const results = await Promise.all(
    Array.from({ length: fanout }, () => nanoBananaGenerateOnce(model, input)),
  );
  const urls = results.flat().slice(0, fanout);
  if (!urls.length) {
    throw new ProviderError("google", "result", "Gemini returned no image data");
  }
  return { urls, provider: "google", metadata: { upstream: model } };
}

async function nanoBananaGenerateOnce(model: string, input: ImageGenInput): Promise<string[]> {
  if (!KEY) throw new ProviderError("google", "config", "GOOGLE_API_KEY not set");
  const blocks: Array<Record<string, unknown>> = [{ type: "text", text: input.prompt }];

  const refUrls = Array.from(new Set([...(input.imageUrls ?? []), ...(input.imageUrl ? [input.imageUrl] : [])]));
  for (const refUrl of refUrls) {
    const ref = await fetchAsInlineImage(refUrl);
    if (ref) blocks.push({ type: "image", mime_type: ref.inlineData.mimeType, data: ref.inlineData.data });
  }

  const aspectRatio = normalizeGoogleImageAspectRatio(model, input.aspectRatio);
  const imageSize = normalizeGoogleImageSize(model, input.resolution);
  // Google's /v1beta/interactions endpoint currently only accepts image/jpeg
  // for response_format.mime_type — image/png returns "not supported" 400.
  const responseFormat: Record<string, string> = {
    type: "image",
    mime_type: "image/jpeg",
    aspect_ratio: aspectRatio,
  };
  if (imageSize) responseFormat.image_size = imageSize;

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: blocks,
      response_format: responseFormat,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof json?.error?.message === "string" ? json.error.message : `Google image generation failed (${res.status})`;
    throw new ProviderError("google", "interactions", message);
  }

  return extractInteractionImageUrls(json);
}
function extractInteractionImageUrls(res: unknown): string[] {
  const out: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const rec = node as Record<string, unknown>;
    const image = (rec.output_image ?? rec.outputImage ?? rec.image) as Record<string, unknown> | undefined;
    const data = image?.data ?? image?.b64_json ?? rec.data;
    if (typeof data === "string" && data) {
      const mime = typeof image?.mime_type === "string"
        ? image.mime_type
        : typeof image?.mimeType === "string"
          ? image.mimeType
          : typeof rec.mime_type === "string"
            ? rec.mime_type
            : "image/png";
      out.push(`data:${mime};base64,${data}`);
    }
    for (const key of ["output", "content", "parts", "steps", "response", "result", "data"]) {
      visit(rec[key]);
    }
  };
  visit(res);
  return out.length ? out : extractInlineImageUrls(res);
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

// â”€â”€â”€ Imagen 4 family â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
