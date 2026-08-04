import { createWriteStream } from "node:fs";
import { basename } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { clearToken, loadToken, runLogin, CONFIG_DIR } from "./auth.js";
import {
  generateImage,
  generateVideo,
  getBalance,
  listGenerations,
  type GenerationItem,
} from "./api.js";
import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL } from "./config.js";

function print(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function warn(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

function fail(msg: string, code = 1): never {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

export async function loginCommand(opts: { noBrowser?: boolean }): Promise<void> {
  const existing = await loadToken();
  if (existing) {
    print("Already signed in. Run 'saadstudio logout' first to switch accounts.");
    return;
  }
  print("Starting Saad Studio sign-in...");
  await runLogin({ noBrowser: opts.noBrowser });
  print("Signed in. Token saved to " + CONFIG_DIR + "/token.json");
}

export async function logoutCommand(): Promise<void> {
  const removed = await clearToken();
  print(removed ? "Signed out." : "No token to remove.");
}

export async function whoamiCommand(): Promise<void> {
  const token = await loadToken();
  if (!token) fail("Not signed in. Run: saadstudio login");
  const expiresAt = new Date(token.expiresAt).toISOString();
  print(`Signed in.\n  scope:     ${token.scope}\n  expires:   ${expiresAt}\n  token dir: ${CONFIG_DIR}`);
}

export async function balanceCommand(opts: { json?: boolean }): Promise<void> {
  const data = await getBalance();
  if (opts.json) {
    print(JSON.stringify(data, null, 2));
    return;
  }
  const credits = typeof data.credits === "number" ? data.credits : "unknown";
  const plan = typeof data.plan === "string" ? data.plan : "unknown";
  print(`Credits: ${credits}\nPlan:    ${plan}`);
}

interface GenerateImageOpts {
  model?: string;
  aspect?: string;
  resolution?: string;
  num?: string;
  negative?: string;
  ref?: string;
  out?: string;
  json?: boolean;
}

export async function generateImageCommand(prompt: string, opts: GenerateImageOpts): Promise<void> {
  if (!prompt || !prompt.trim()) fail("Missing prompt.");
  const numImages = opts.num ? Math.max(1, Math.floor(Number(opts.num))) : 1;
  if (opts.num && Number.isNaN(numImages)) fail("--num must be a number.");

  process.stderr.write("Generating image...\n");
  const result = await generateImage({
    prompt: prompt.trim(),
    modelId: opts.model ?? DEFAULT_IMAGE_MODEL,
    aspectRatio: opts.aspect ?? "1:1",
    resolution: opts.resolution ?? "1K",
    numImages,
    negativePrompt: opts.negative,
    imageUrl: opts.ref,
  });

  if (opts.json) {
    print(JSON.stringify(result, null, 2));
    return;
  }

  const urls = collectUrls(result.imageUrls, result.imageUrl);
  if (urls.length === 0) {
    warn("Generation completed but returned no image URL.");
    print(JSON.stringify(result, null, 2));
    return;
  }

  urls.forEach((url) => print(url));

  if (opts.out) {
    if (urls.length > 1) warn(`Downloading first image only (--out); ${urls.length} were generated.`);
    await downloadTo(urls[0], opts.out);
    print(`Saved to ${opts.out}`);
  }
}

interface GenerateVideoOpts {
  model?: string;
  image?: string;
  duration?: string;
  aspect?: string;
  resolution?: string;
  out?: string;
  json?: boolean;
}

export async function generateVideoCommand(prompt: string, opts: GenerateVideoOpts): Promise<void> {
  if (!prompt || !prompt.trim()) fail("Missing prompt.");
  const duration = opts.duration ? Number(opts.duration) : 5;
  if (opts.duration && Number.isNaN(duration)) fail("--duration must be a number.");

  process.stderr.write("Generating video (this can take a minute)...\n");
  const result = await generateVideo({
    prompt: prompt.trim(),
    modelId: opts.model ?? DEFAULT_VIDEO_MODEL,
    imageUrl: opts.image,
    duration,
    aspectRatio: opts.aspect ?? "16:9",
    resolution: opts.resolution ?? "1080p",
  });

  if (opts.json) {
    print(JSON.stringify(result, null, 2));
    return;
  }

  const urls = collectUrls(result.videoUrls, result.videoUrl);
  if (urls.length === 0) {
    warn("Video job accepted but no URL returned yet — may still be processing.");
    print(JSON.stringify(result, null, 2));
    return;
  }

  urls.forEach((url) => print(url));

  if (opts.out) {
    await downloadTo(urls[0], opts.out);
    print(`Saved to ${opts.out}`);
  }
}

interface GenerationsOpts {
  limit?: string;
  kind?: string;
  json?: boolean;
}

export async function generationsCommand(opts: GenerationsOpts): Promise<void> {
  const limit = opts.limit ? Math.max(1, Math.min(100, Math.floor(Number(opts.limit)))) : 10;
  const kind = normalizeKind(opts.kind);
  const page = await listGenerations({ limit, kind });
  if (opts.json) {
    print(JSON.stringify(page, null, 2));
    return;
  }
  if (page.items.length === 0) {
    print("No generations yet.");
    return;
  }
  for (const item of page.items) {
    print(formatGenerationRow(item));
  }
  if (page.hasMore) print("(more available)");
}

interface ModelsOpts {
  kind?: string;
  json?: boolean;
}

// Kept in sync with app/api/smart-cli/mcp/route.ts AVAILABLE_MODELS.
const KNOWN_MODELS = [
  { id: "nano-banana-pro", kind: "image", label: "Nano Banana Pro (default)" },
  { id: "nano-banana-2", kind: "image", label: "Nano Banana 2" },
  { id: "google/nano-banana", kind: "image", label: "Google Nano Banana" },
  { id: "seedream/5-pro", kind: "image", label: "Seedream 5 Pro" },
  { id: "seedream/5-lite", kind: "image", label: "Seedream 5 Lite" },
  { id: "flux-2/pro", kind: "image", label: "Flux 2 Pro" },
  { id: "gpt-image-2", kind: "image", label: "GPT Image 2" },
  { id: "kling-3.0/video", kind: "video", label: "Kling 3.0 (default)" },
  { id: "seedance/2.0", kind: "video", label: "Seedance 2.0" },
  { id: "google/veo3", kind: "video", label: "Google Veo 3" },
  { id: "wan/2.2", kind: "video", label: "Wan 2.2" },
  { id: "sora-2/video", kind: "video", label: "Sora 2" },
];

export async function modelsCommand(opts: ModelsOpts): Promise<void> {
  const kind = normalizeKind(opts.kind);
  const list = kind ? KNOWN_MODELS.filter((m) => m.kind === kind) : KNOWN_MODELS;
  if (opts.json) {
    print(JSON.stringify({ models: list }, null, 2));
    return;
  }
  for (const model of list) {
    print(`  ${model.id.padEnd(24)} ${model.label}`);
  }
}

function collectUrls(...values: Array<string[] | string | undefined>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) if (item) out.push(item);
    } else if (value) {
      out.push(value);
    }
  }
  return out;
}

function normalizeKind(raw: string | undefined): "image" | "video" | "audio" | undefined {
  if (!raw) return undefined;
  const value = raw.toLowerCase();
  if (value === "image" || value === "video" || value === "audio") return value;
  fail(`--kind must be image, video, or audio`);
}

function formatGenerationRow(item: GenerationItem): string {
  const date = new Date(item.createdAt).toISOString().replace("T", " ").slice(0, 16);
  const prompt = (item.prompt ?? "").replaceAll(/\s+/g, " ").slice(0, 60);
  return `${date}  ${item.kind.padEnd(5)}  ${item.id.slice(0, 12)}  ${item.url}\n                                     ${prompt}`;
}

async function downloadTo(url: string, out: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
  const target = out.endsWith("/") || out.endsWith("\\") ? `${out}${basename(new URL(url).pathname)}` : out;
  await pipeline(Readable.fromWeb(res.body as import("stream/web").ReadableStream<Uint8Array>), createWriteStream(target));
}
