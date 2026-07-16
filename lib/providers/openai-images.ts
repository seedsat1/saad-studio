/** OpenAI official image generation adapter.
 *
 * Supports gpt-image-1 (the current production model behind DALL·E).
 * Auth: OPENAI_API_KEY. Output: data URLs (base64) — the panel route
 * uploads them to R2 and replaces with permanent CDN URLs. */

import OpenAI from "openai";
import type { ImageGenInput, ProviderResult } from "./types";
import { ProviderError } from "./types";

const API_KEY = process.env.OPENAI_API_KEY ?? "";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!API_KEY) throw new ProviderError("openai", "config", "OPENAI_API_KEY not set");
  if (!_client) _client = new OpenAI({ apiKey: API_KEY });
  return _client;
}

/** Internal id → OpenAI upstream model id. */
const MODEL_MAP: Record<string, string> = {
  "gpt-image-1":                  "gpt-image-1",
  "gpt-image-2-text-to-image":    "gpt-image-1",   // alias until gpt-image-2 GA
  "gpt-image/1.5-text-to-image":  "gpt-image-1",   // alias
  "dall-e-3":                     "dall-e-3",
  "openai/dall-e-3":              "dall-e-3",
};

/** OpenAI supports these sizes; map our internal aspect+resolution. */
function sizeFor(aspect: string | undefined, resolution: string | undefined): "1024x1024" | "1792x1024" | "1024x1792" {
  const a = aspect ?? "1:1";
  if (a === "16:9" || a === "4:3") return "1792x1024";
  if (a === "9:16" || a === "3:4") return "1024x1792";
  // resolution is informational for OpenAI — size encodes both aspect and resolution
  void resolution;
  return "1024x1024";
}

export async function openaiGenerateImage(input: ImageGenInput): Promise<ProviderResult> {
  const upstream = MODEL_MAP[input.modelId];
  if (!upstream) {
    throw new ProviderError("openai", "model", `Unknown OpenAI model: ${input.modelId}`);
  }

  const size = sizeFor(input.aspectRatio, input.resolution);
  const n = Math.max(1, Math.min(input.numImages ?? 1, 4));

  // Image-to-image / edit flow — OpenAI exposes a separate `images.edit`
  // endpoint. We use that when an imageUrl is present.
  if ((input.imageUrl || input.imageUrls?.length) && upstream === "gpt-image-1") {
    return openaiEdit(upstream, input, size, n);
  }

  let res;
  try {
    res = await client().images.generate({
      model: upstream,
      prompt: input.prompt,
      size,
      n,
      // gpt-image-1 always returns b64; dall-e-3 returns URL by default.
      response_format: upstream === "dall-e-3" ? "url" : undefined,
    });
  } catch (err) {
    throw new ProviderError("openai", "images.generate", (err as Error).message);
  }

  const urls = (res.data ?? []).map((item) => {
    if (item.url) return item.url;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  }).filter((u): u is string => u !== null);

  if (!urls.length) {
    throw new ProviderError("openai", "result", "no images in response");
  }
  return { urls, provider: "openai", metadata: { upstream } };
}

async function openaiEdit(
  upstream: string,
  input: ImageGenInput,
  size: "1024x1024" | "1792x1024" | "1024x1792",
  n: number,
): Promise<ProviderResult> {
  const refUrls = Array.from(new Set([...(input.imageUrls ?? []), ...(input.imageUrl ? [input.imageUrl] : [])])).slice(0, 16);
  if (!refUrls.length) throw new ProviderError("openai", "edit", "imageUrl required");

  const files = await Promise.all(refUrls.map(async (url, index) => {
    const buf = await fetchBuffer(url);
    const blob = new Blob([new Uint8Array(buf)], { type: "image/png" });
    return new File([blob], `ref-${index + 1}.png`, { type: "image/png" });
  }));

  let res;
  try {
    // gpt-image-1 accepts more sizes than the DALL·E 2 types the SDK
    // exposes for `images.edit`; cast to silence the narrower union.
    res = await client().images.edit({
      model: upstream,
      image: (files.length === 1 ? files[0] : files) as unknown as Parameters<OpenAI["images"]["edit"]>[0]["image"],
      prompt: input.prompt,
      size: size as unknown as "1024x1024",
      n,
    });
  } catch (err) {
    throw new ProviderError("openai", "images.edit", (err as Error).message);
  }

  const urls = (res.data ?? []).map((item) => {
    if (item.url) return item.url;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  }).filter((u): u is string => u !== null);

  if (!urls.length) {
    throw new ProviderError("openai", "result", "no images in edit response");
  }
  return { urls, provider: "openai", metadata: { upstream, mode: "edit" } };
}

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const m = url.match(/^data:[^;]+;base64,(.+)$/);
    if (!m) throw new ProviderError("openai", "fetch", "invalid data URL");
    return Buffer.from(m[1], "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new ProviderError("openai", "fetch", `${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}
