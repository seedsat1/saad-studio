import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import prismadb from "@/lib/prismadb";
import { defaultProvider, normalizeMediaUrl } from "@/lib/storage";

type PosterStatus = "pending" | "processing" | "ready" | "failed" | "ready_video_frame";

type PosterResult = {
  id: string;
  status: "skipped" | "ready" | "failed";
  posterUrl?: string | null;
  reason?: string;
  error?: string;
};

const POSTER_WIDTH = 480;
const POSTER_CACHE_CONTROL = "public, max-age=31536000, immutable";
const VIDEO_FRAME_POSTER_STATUS: PosterStatus = "ready_video_frame";
const POSTER_RETRY_STATUSES: PosterStatus[] = ["pending", "failed", "ready"];

function isVideoAssetType(assetType: string | null | undefined): boolean {
  return String(assetType || "").toLowerCase().includes("video");
}

function isRenderableVideoUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url.startsWith("task:") || url.startsWith("failed:") || url.startsWith("text:")) return false;
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

function absoluteUrlForFfmpeg(url: string): string {
  if (!url.startsWith("/")) return url;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  return base ? `${base.replace(/\/+$/, "")}${url}` : url;
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

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown poster error");
  return message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 500);
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

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk).slice(0, 1000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}${stderr ? `: ${stderr.slice(-500)}` : ""}`));
    });
  });
}

async function extractPoster(inputUrl: string, outputPath: string): Promise<void> {
  const attempts = [
    ["-ss", "0", "-i", inputUrl],
    ["-ss", "0.25", "-i", inputUrl],
    ["-ss", "0.75", "-i", inputUrl],
    ["-i", inputUrl, "-ss", "0"],
  ];

  let lastError: unknown;
  for (const inputArgs of attempts) {
    try {
      await runFfmpeg([
        "-hide_banner",
        "-loglevel",
        "error",
        ...inputArgs,
        "-frames:v",
        "1",
        "-vf",
        `scale=${POSTER_WIDTH}:-2`,
        "-c:v",
        "libwebp",
        "-quality",
        "78",
        "-compression_level",
        "6",
        "-y",
        outputPath,
      ]);
      return;
    } catch (error) {
      lastError = error;
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to extract poster frame.");
}

export function videoPosterStoragePath(userId: string, generationId: string): string {
  return `posters/${userId}/${generationId}.webp`;
}

export async function ensureVideoPosterForGeneration(generationId: string): Promise<PosterResult> {
  if (!generationId) return { id: generationId, status: "failed", error: "Missing generation id" };

  const generation = await (prismadb.generation as any).findUnique({
    where: { id: generationId },
    select: {
      id: true,
      userId: true,
      mediaUrl: true,
      outputUrl: true,
      assetType: true,
      posterUrl: true,
      posterStatus: true,
    },
  });

  if (!generation) return { id: generationId, status: "skipped", reason: "not_found" };
  if (!isVideoAssetType(generation.assetType)) return { id: generation.id, status: "skipped", reason: "not_video" };
  if (generation.posterUrl && generation.posterStatus === VIDEO_FRAME_POSTER_STATUS) {
    return { id: generation.id, status: "skipped", posterUrl: generation.posterUrl, reason: "video_frame_poster_exists" };
  }

  const claim = await (prismadb.generation as any).updateMany({
    where: {
      id: generation.id,
      OR: [
        { posterUrl: null, posterStatus: { in: POSTER_RETRY_STATUSES } },
        { posterUrl: { not: null }, posterStatus: { not: VIDEO_FRAME_POSTER_STATUS } },
      ],
    },
    data: {
      posterStatus: "processing",
      posterError: null,
    },
  });

  if (!claim?.count) {
    return { id: generation.id, status: "skipped", reason: generation.posterStatus || "already_claimed" };
  }

  const videoUrl = absoluteUrlForFfmpeg(resolveVideoUrl(generation.mediaUrl, generation.outputUrl) || "");
  if (!isRenderableVideoUrl(videoUrl)) {
    const posterError = "No completed video URL is available for poster generation.";
    await (prismadb.generation as any).update({
      where: { id: generation.id },
      data: { posterStatus: "failed", posterError },
    }).catch(() => {});
    return { id: generation.id, status: "failed", error: posterError };
  }

  const posterPath = videoPosterStoragePath(generation.userId, generation.id);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "saad-video-poster-"));
  const outputPath = path.join(tempDir, `${generation.id}.webp`);

  try {
    await extractPoster(videoUrl, outputPath);
    const posterBuffer = await fs.readFile(outputPath);
    const posterUrl = await defaultProvider.upload({
      bucket: "videos",
      path: posterPath,
      body: posterBuffer,
      contentType: "image/webp",
      cacheControl: POSTER_CACHE_CONTROL,
    });

    await (prismadb.generation as any).update({
      where: { id: generation.id },
      data: {
        posterUrl,
        posterStatus: VIDEO_FRAME_POSTER_STATUS,
        posterGeneratedAt: new Date(),
        posterError: null,
      },
    });

    return { id: generation.id, status: "ready", posterUrl };
  } catch (error) {
    const posterError = compactError(error);
    await (prismadb.generation as any).update({
      where: { id: generation.id },
      data: {
        posterStatus: "failed",
        posterError,
      },
    }).catch(() => {});
    return { id: generation.id, status: "failed", error: posterError };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function scheduleVideoPosterGeneration(generationId: string, context = "video-poster"): void {
  if (!generationId) return;

  const run = () => {
    void ensureVideoPosterForGeneration(generationId).catch((error) => {
      console.error(`[${context}] Failed to generate video poster:`, error instanceof Error ? error.message : error);
    });
  };

  if (typeof setImmediate === "function") setImmediate(run);
  else setTimeout(run, 0);
}

export async function processVideoPosterBatch(params: {
  limit?: number;
  userId?: string;
  retryFailed?: boolean;
} = {}) {
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 10)));
  const statuses: PosterStatus[] = params.retryFailed === false ? ["pending"] : POSTER_RETRY_STATUSES;
  const where: any = {
    OR: [
      { posterUrl: null, posterStatus: { in: statuses } },
      { posterUrl: { not: null }, posterStatus: { not: VIDEO_FRAME_POSTER_STATUS } },
    ],
    AND: [
      {
        OR: [
          { mediaUrl: { not: null } },
          { outputUrl: { not: null } },
        ],
      },
    ],
    assetType: { contains: "video", mode: "insensitive" },
  };
  if (params.userId) where.userId = params.userId;

  const rows = await (prismadb.generation as any).findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: PosterResult[] = [];
  for (const row of rows) {
    results.push(await ensureVideoPosterForGeneration(row.id));
  }

  return {
    requested: limit,
    scanned: rows.length,
    ready: results.filter((result) => result.status === "ready").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}