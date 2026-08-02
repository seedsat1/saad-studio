import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { defaultProvider, normalizeMediaUrl } from "@/lib/storage";
import { videoPosterStoragePath } from "@/lib/video-posters";

export const dynamic = "force-dynamic";

const POSTER_WIDTH = 480;
const POSTER_CACHE_CONTROL = "public, max-age=31536000, immutable";

function isVideoAssetType(assetType: string | null | undefined): boolean {
  return String(assetType || "").toLowerCase().includes("video");
}

function isRenderableVideoUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("task:") || lower.startsWith("failed:") || lower.startsWith("text:")) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

function resolveVideoUrl(mediaUrl: string | null | undefined, outputUrl: string | null | undefined): string | null {
  const media = String(mediaUrl || "").trim();
  const output = String(outputUrl || "").trim();
  const normalizedMedia = normalizeMediaUrl(media) || "";
  const normalizedOutput = normalizeMediaUrl(output) || "";
  if (isRenderableVideoUrl(normalizedMedia)) return normalizedMedia;
  if (isRenderableVideoUrl(normalizedOutput)) return normalizedOutput;
  if (isRenderableVideoUrl(media)) return media;
  if (isRenderableVideoUrl(output)) return output;
  return null;
}

function absoluteUrl(url: string, baseUrl: string): string {
  if (!url.startsWith("/")) return url;
  return `${baseUrl.replace(/\/+$/, "")}${url}`;
}

function getFfmpegPath(): string | null {
  try {
    const staticPath = require("ffmpeg-static");
    if (typeof staticPath === "string" && staticPath.trim()) return staticPath;
  } catch {}
  try {
    const installer = require("@ffmpeg-installer/ffmpeg");
    if (typeof installer?.path === "string" && installer.path.trim()) return installer.path;
  } catch {}
  return null;
}

function isImageLikeString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^data:image\//i.test(trimmed)) return true;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return false;
  return /\.(png|jpe?g|webp|avif)(\?|#|$)/i.test(trimmed) || /\/image\//i.test(trimmed) || /\/images\//i.test(trimmed) || /thumbnail/i.test(trimmed);
}

function findSourceImage(payload: unknown, depth = 0): string | null {
  if (!payload || depth > 5) return null;
  if (typeof payload === "string") return isImageLikeString(payload) ? payload : null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findSourceImage(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const priorityKeys = [
    "first_frame_url", "firstFrameUrl", "startImageUrl", "start_image_url",
    "image", "image_url", "imageUrl", "input_image", "inputImage",
    "sourceImage", "source_image", "publicImageUrl", "referenceImageUrl",
  ];
  for (const key of priorityKeys) {
    const found = findSourceImage(record[key], depth + 1);
    if (found) return found;
  }
  for (const [key, value] of Object.entries(record)) {
    if (/video|audio|prompt|model|duration|ratio|quality|task/i.test(key)) continue;
    const found = findSourceImage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

async function imageCandidateToBuffer(candidate: string, baseUrl: string): Promise<Buffer> {
  if (/^data:image\//i.test(candidate)) {
    const comma = candidate.indexOf(",");
    if (comma < 0) throw new Error("Invalid data image URL.");
    return Buffer.from(candidate.slice(comma + 1), "base64");
  }
  const response = await fetch(absoluteUrl(candidate, baseUrl), { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`Failed to fetch source image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function createWebpFromImage(source: Buffer): Promise<Buffer> {
  return sharp(source, { animated: false })
    .rotate()
    .resize({ width: POSTER_WIDTH, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
}

async function runFfmpeg(args: string[], timeoutMs = 60_000): Promise<void> {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) throw new Error("FFmpeg binary is not available.");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("FFmpeg poster extraction timed out."));
    }, timeoutMs);

    child.stderr.on("data", (chunk) => { stderr += String(chunk).slice(0, 1000); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}${stderr ? `: ${stderr.slice(-500)}` : ""}`));
    });
  });
}

async function extractWebpFromVideo(videoUrl: string, outputPath: string): Promise<void> {
  const attempts = [
    ["-ss", "0.75", "-i", videoUrl],
    ["-ss", "0", "-i", videoUrl],
    ["-i", videoUrl, "-ss", "0.75"],
  ];

  let lastError: unknown;
  for (const inputArgs of attempts) {
    try {
      await runFfmpeg([
        "-hide_banner", "-loglevel", "error", ...inputArgs,
        "-frames:v", "1", "-vf", `scale=${POSTER_WIDTH}:-2`,
        "-c:v", "libwebp", "-quality", "78", "-compression_level", "6", "-y", outputPath,
      ]);
      return;
    } catch (error) {
      lastError = error;
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to extract poster frame.");
}

function webpResponse(buffer: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

async function persistPoster(userId: string, generationId: string, buffer: Buffer): Promise<string | null> {
  const posterPath = videoPosterStoragePath(userId, generationId);
  try {
    const posterUrl = await defaultProvider.upload({
      bucket: "videos",
      path: posterPath,
      body: buffer,
      contentType: "image/webp",
      cacheControl: POSTER_CACHE_CONTROL,
    });
    await (prismadb.generation as any).update({
      where: { id: generationId },
      data: {
        posterUrl,
        posterStatus: "ready",
        posterGeneratedAt: new Date(),
        posterError: null,
      },
    });
    return posterUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Unknown poster upload error");
    await (prismadb.generation as any).update({
      where: { id: generationId },
      data: {
        posterStatus: "failed",
        posterError: message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 500),
      },
    }).catch(() => {});
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Asset id is required." }, { status: 400 });

  const row = await (prismadb.generation as any).findFirst({
    where: { id, userId },
    select: {
      id: true,
      userId: true,
      mediaUrl: true,
      outputUrl: true,
      assetType: true,
      posterUrl: true,
      generationRequestSnapshot: { select: { requestPayload: true } },
    },
  });

  if (!row || !isVideoAssetType(row.assetType)) {
    return NextResponse.json({ error: "Video asset not found." }, { status: 404 });
  }

  if (typeof row.posterUrl === "string" && row.posterUrl.trim()) {
    return NextResponse.redirect(normalizeMediaUrl(row.posterUrl) || row.posterUrl, { status: 307 });
  }

  const posterPath = videoPosterStoragePath(row.userId, row.id);
  const storedPosterUrl = defaultProvider.getPublicUrl("videos", posterPath);
  if (await defaultProvider.exists({ bucket: "videos", path: posterPath }).catch(() => false)) {
    await (prismadb.generation as any).update({
      where: { id: row.id },
      data: { posterUrl: storedPosterUrl, posterStatus: "ready", posterGeneratedAt: new Date(), posterError: null },
    }).catch(() => {});
    return NextResponse.redirect(storedPosterUrl, { status: 307 });
  }

  const payload = row.generationRequestSnapshot?.requestPayload;
  const sourceImage = findSourceImage(payload);
  if (sourceImage) {
    try {
      const source = await imageCandidateToBuffer(sourceImage, req.nextUrl.origin);
      const poster = await createWebpFromImage(source);
      const posterUrl = await persistPoster(row.userId, row.id, poster);
      if (posterUrl) return NextResponse.redirect(posterUrl, { status: 307 });
      return webpResponse(poster);
    } catch (error) {
      console.error("[api/assets/video-poster] source image poster failed", error instanceof Error ? error.message : error);
    }
  }

  const videoUrl = resolveVideoUrl(row.mediaUrl, row.outputUrl);
  if (!videoUrl) return NextResponse.json({ error: "No completed video URL is available." }, { status: 404 });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "saad-video-poster-api-"));
  const outputPath = path.join(tempDir, `${row.id}.webp`);
  try {
    await extractWebpFromVideo(absoluteUrl(videoUrl, req.nextUrl.origin), outputPath);
    const poster = await fs.readFile(outputPath);
    const posterUrl = await persistPoster(row.userId, row.id, poster);
    if (posterUrl) return NextResponse.redirect(posterUrl, { status: 307 });
    return webpResponse(poster);
  } catch (error) {
    console.error("[api/assets/video-poster] video poster failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Poster is not ready." }, { status: 404 });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}