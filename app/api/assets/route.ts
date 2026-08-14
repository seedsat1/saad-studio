import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { deleteFromStorage } from "@/lib/supabase-storage";
import { reconcilePendingBytePlusGenerations } from "@/lib/providers/byteplus-reconcile";
import { normalizeMediaUrl } from "@/lib/r2-storage";
import { scheduleImageThumbnailGeneration } from "@/lib/image-thumbnails";
import { scheduleVideoPosterGeneration } from "@/lib/video-posters";

export const dynamic = "force-dynamic";

type AssetType = "image" | "video" | "audio" | "3d" | "text";

function toAssetType(raw: string): AssetType {
  const normalized = String(raw || "").toLowerCase();
  if (normalized.includes("image") || normalized === "storyboard" || normalized === "makeup" || normalized === "relight" || normalized === "thumbnail") return "image";
  if (normalized.includes("video") || normalized.includes("transition")) return "video";
  if (normalized.includes("audio")) return "audio";
  if (normalized === "3d") return "3d";

  // Text-like generation records (assist / conversation / code)
  if (normalized.includes("assist") || normalized.includes("conversation") || normalized.includes("code") || normalized.includes("text")) {
    return "text";
  }

  return "3d";
}

function isRenderableAssetUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("task:")) return false;
  if (lower.startsWith("failed:") || lower.startsWith("failed ")) return false;
  if (lower.startsWith("error:") || lower.startsWith("error ")) return false;
  return true;
}

function decodeStatusMarker(raw: string): string | undefined {
  const value = String(raw || "").trim();
  const lower = value.toLowerCase();
  const marker = lower.startsWith("failed:") ? "failed:" : lower.startsWith("error:") ? "error:" : "";
  if (!marker) return undefined;
  const encoded = value.slice(marker.length).trim();
  if (!encoded) return "Generation failed.";
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function isFailedGeneration(row: { status?: string | null; mediaUrl?: string | null; outputUrl?: string | null }): boolean {
  const status = String(row.status || "").trim().toLowerCase();
  if (["failed", "error", "cancelled", "canceled"].includes(status)) return true;
  const media = String(row.mediaUrl || "").trim().toLowerCase();
  const output = String(row.outputUrl || "").trim().toLowerCase();
  return media.startsWith("failed:") || media.startsWith("error:") || output.startsWith("failed:") || output.startsWith("error:");
}

function generationFailureReason(row: { mediaUrl?: string | null; outputUrl?: string | null; posterError?: string | null }): string {
  return decodeStatusMarker(String(row.mediaUrl || ""))
    || decodeStatusMarker(String(row.outputUrl || ""))
    || "Generation failed. Credits were returned. Please retry or delete this result.";
}
function resolveAssetUrl(mediaUrl: string | null, outputUrl: string | null): string {
  const media = String(mediaUrl || "").trim();
  const output = String(outputUrl || "").trim();

  // Preserve text markers used by text/code generations.
  if (media.startsWith("text:")) return media;
  
  // Normalize media and output URLs
  const normalizedMedia = normalizeMediaUrl(media) || "";
  const normalizedOutput = normalizeMediaUrl(output) || "";
  
  if (normalizedMedia && !normalizedMedia.startsWith("task:")) return normalizedMedia;
  if (normalizedOutput) return normalizedOutput;
  return "";
}

function firstNumberParam(req: NextRequest, key: string, fallback: number, min: number, max: number): number {
  const raw = Number(req.nextUrl.searchParams.get(key));
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

function buildAssetTypeWhere(type: string): any {
  if (type === "image") {
    return {
      OR: [
        { assetType: { contains: "image", mode: "insensitive" } },
        { assetType: { contains: "storyboard", mode: "insensitive" } },
        { assetType: { contains: "makeup", mode: "insensitive" } },
        { assetType: { contains: "relight", mode: "insensitive" } },
        { assetType: { contains: "thumbnail", mode: "insensitive" } },
      ],
    };
  }
  if (type === "video") return { assetType: { contains: "video", mode: "insensitive" } };
  if (type === "audio") return { assetType: { contains: "audio", mode: "insensitive" } };
  if (type === "3d") return { assetType: "3d" };
  if (type === "text") {
    return {
      OR: [
        { assetType: { contains: "assist", mode: "insensitive" } },
        { assetType: { contains: "conversation", mode: "insensitive" } },
        { assetType: { contains: "code", mode: "insensitive" } },
        { assetType: { contains: "text", mode: "insensitive" } },
      ],
    };
  }
  return {};
}

function galleryThumbnailUrl(id: string, type: AssetType): string | undefined {
  if (type !== "image") return undefined;
  return `/api/assets/thumbnail?id=${encodeURIComponent(id)}`;
}
function videoPosterUrl(id: string, type: AssetType, storedPosterUrl?: string | null): string | undefined {
  if (type !== "video") return undefined;
  const normalizedPoster = normalizeMediaUrl(String(storedPosterUrl || "").trim());
  if (normalizedPoster) return normalizedPoster;
  return undefined;
}
function galleryImageDimensions(resolution?: string | null, aspectRatio?: string | null): { width?: number; height?: number } {
  const rawResolution = String(resolution || "").trim();
  const exact = rawResolution.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/i);
  if (exact) {
    return { width: Number(exact[1]), height: Number(exact[2]) };
  }

  const ratio = String(aspectRatio || rawResolution || "1:1").trim().toLowerCase();
  const ratioMatch = ratio.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/);
  if (!ratioMatch) return { width: 1024, height: 1024 };

  const w = Number(ratioMatch[1]);
  const h = Number(ratioMatch[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return { width: 1024, height: 1024 };

  if (w === h) return { width: 1024, height: 1024 };
  if (w > h) return { width: Math.round(1024 * (w / h)), height: 1024 };
  return { width: 1024, height: Math.round(1024 * (h / w)) };
}
function normalizeProviderTaskId(raw: string): string {
  if (!raw.startsWith("gen-")) return raw;
  const unwrapped = raw.slice(4);
  const knownProviderPrefixes = ["gvo:", "ark:", "ws:", "veo:", "veo1080:", "veo4k:"];
  return knownProviderPrefixes.some((prefix) => unwrapped.startsWith(prefix))
    ? unwrapped
    : raw;
}

function collectStringArray(payload: any, keys: string[], max = 3): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const value = payload?.[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === "string" && item.trim()) out.push(item);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function firstString(payload: any, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestedContextId = req.nextUrl.searchParams.get("contextId");
    if (requestedContextId) {
      const normalizedContextId = normalizeProviderTaskId(requestedContextId);
      const context = await prismadb.generation.findFirst({
        where: {
          userId,
          OR: [
            { id: requestedContextId },
            { id: normalizedContextId },
            { providerRequestId: requestedContextId },
            { providerRequestId: normalizedContextId },
            { mediaUrl: { startsWith: `task:${requestedContextId}` } },
            { mediaUrl: { startsWith: `task:${normalizedContextId}` } },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          modelUsed: true,
          providerRequestId: true,
          mediaUrl: true,
          outputUrl: true,
          generationRequestSnapshot: {
            select: {
              model: true,
              duration: true,
              resolution: true,
              aspectRatio: true,
              quality: true,
              requestPayload: true,
            },
          },
        },
      });

      if (!context) {
        return NextResponse.json({
          ok: true,
          contextFound: false,
          startImageUrl: undefined,
          endImageUrl: undefined,
          referenceImageUrls: [],
          referenceVideoUrls: [],
          referenceAudioUrls: [],
        }, { status: 200 });
      }

      const payload = context.generationRequestSnapshot?.requestPayload as any;
      const referenceImageUrls = collectStringArray(
        payload,
        ["reference_image_urls", "referenceImageUrls", "image_urls", "imageUrls", "reference_images", "referenceImages"],
        9,
      );
      const referenceVideoUrls = collectStringArray(
        payload,
        ["reference_video_urls", "referenceVideoUrls", "video_urls", "videoUrls", "reference_videos", "referenceVideos"],
        3,
      );
      const referenceAudioUrls = collectStringArray(
        payload,
        ["reference_audio_urls", "referenceAudioUrls", "audio_urls", "audioUrls", "reference_audios", "referenceAudios"],
        3,
      );

      return NextResponse.json({
        ok: true,
        contextFound: true,
        id: context.id,
        providerRequestId: context.providerRequestId ?? undefined,
        modelRoute: context.modelUsed,
        providerModel: context.generationRequestSnapshot?.model ?? undefined,
        duration: context.generationRequestSnapshot?.duration ?? payload?.duration ?? undefined,
        aspectRatio: context.generationRequestSnapshot?.aspectRatio ?? payload?.aspect_ratio ?? payload?.aspectRatio ?? undefined,
        resolution: context.generationRequestSnapshot?.resolution ?? undefined,
        quality: context.generationRequestSnapshot?.quality ?? payload?.quality ?? payload?.mode ?? undefined,
        startImageUrl: firstString(payload, ["first_frame_url", "firstFrameUrl", "image", "image_url", "imageUrl", "startFrame"]) ?? undefined,
        endImageUrl: firstString(payload, ["last_frame_url", "lastFrameUrl", "end_image", "endImage", "last_image", "lastImage", "endFrame"]) ?? undefined,
        referenceImageUrls,
        referenceVideoUrls,
        referenceAudioUrls,
      });
    }

    const requestedType = (req.nextUrl.searchParams.get("type") || "all").toLowerCase();
    const limit = firstNumberParam(req, "limit", 25, 1, 25);
    const page = firstNumberParam(req, "page", 0, 0, 10_000);
    const skip = page * limit;
    const typeWhere = requestedType === "all" ? {} : buildAssetTypeWhere(requestedType);
    const baseWhere = {
      userId,
      OR: [
        { mediaUrl: { not: null as string | null } },
        { outputUrl: { not: null as string | null } },
        { status: "failed" },
        { status: "error" },
        { status: "cancelled" },
        { status: "canceled" },
      ],
    };

    // Resolve this user's pending Seedance jobs before loading the gallery.
    // This works even when the original browser session was closed.
    await reconcilePendingBytePlusGenerations(5, userId).catch((error) => {
      console.error("[api/assets] BytePlus reconciliation failed", error);
    });

    const [totalForFilter, allCount, imageCount, videoCount, audioCount, threeDCount, textCount, rows] = await Promise.all([
      prismadb.generation.count({ where: { AND: [baseWhere, typeWhere] } as any }),
      prismadb.generation.count({ where: baseWhere }),
      prismadb.generation.count({ where: { AND: [baseWhere, buildAssetTypeWhere("image")] } as any }),
      prismadb.generation.count({ where: { AND: [baseWhere, buildAssetTypeWhere("video")] } as any }),
      prismadb.generation.count({ where: { AND: [baseWhere, buildAssetTypeWhere("audio")] } as any }),
      prismadb.generation.count({ where: { AND: [baseWhere, buildAssetTypeWhere("3d")] } as any }),
      prismadb.generation.count({ where: { AND: [baseWhere, buildAssetTypeWhere("text")] } as any }),
      (prismadb.generation as any).findMany({
        where: { AND: [baseWhere, typeWhere] } as any,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit + 1,
        select: {
          id: true,
          mediaUrl: true,
          outputUrl: true,
          status: true,
          prompt: true,
          modelUsed: true,
          assetType: true,
          cost: true,
          isFavorite: true,
          createdAt: true,
          providerRequestId: true,
          resolution: true,
          aspectRatio: true,
          duration: true,
          generationRequestSnapshot: {
            select: { requestPayload: true },
          },
          posterUrl: true,
          posterStatus: true,
          posterGeneratedAt: true,
          posterError: true,
        },
      }),
    ]);

    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > limit;

    const normalized = pageRows
      .map((row: any) => {
        const resolvedUrl = resolveAssetUrl(row.mediaUrl, row.outputUrl);
        const failed = isFailedGeneration(row);
        return {
          ...row,
          resolvedUrl,
          failed,
        };
      })
      .filter((row: any) => row.failed || isRenderableAssetUrl(row.resolvedUrl))
      .map((row: any) => {
        const type = toAssetType(row.assetType);
        const mediaUrl = row.failed ? `failed:${row.id}` : row.resolvedUrl;
        const isTextMarker = mediaUrl.startsWith("text:");
        const dimensions = type === "image" ? galleryImageDimensions(row.resolution, row.aspectRatio) : {};
        const posterIsVideoFrame = type === "video" && row.posterStatus === "ready_video_frame";
        const videoPoster = videoPosterUrl(row.id, type, row.posterUrl);
        return {
          id: row.id,
          type,
          url: isTextMarker ? undefined : mediaUrl,
          originalUrl: isTextMarker ? undefined : mediaUrl,
          thumbnailUrl: isTextMarker ? undefined : galleryThumbnailUrl(row.id, type),
          posterUrl: videoPoster,
          posterStatus: type === "video" ? (row.failed ? "failed" : (posterIsVideoFrame ? "ready_video_frame" : (row.posterStatus ?? "pending"))) : undefined,
          status: row.failed ? "failed" : (row.status ?? undefined),
          isFailed: Boolean(row.failed),
          failureReason: row.failed ? generationFailureReason(row) : undefined,
          creditsRefunded: row.failed ? true : undefined,
          posterGeneratedAt: row.posterGeneratedAt ? row.posterGeneratedAt.toISOString() : undefined,
          posterError: type === "video" ? (row.posterError ?? undefined) : undefined,
          textContent: isTextMarker ? row.prompt : undefined,
          prompt: row.prompt,
          model: row.modelUsed,
          resolution: row.resolution ?? row.aspectRatio ?? undefined,
          width: dimensions.width,
          height: dimensions.height,
          duration: row.duration ?? undefined,
          date: row.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          createdAt: row.createdAt.toISOString(),
          cost: row.cost,
          isFavorite: Boolean(row.isFavorite),
          providerRequestId: row.providerRequestId ?? undefined,
        };
      });

    const counts = {
      all: allCount,
      image: imageCount,
      video: videoCount,
      audio: audioCount,
      "3d": threeDCount,
      text: textCount,
    };

    return NextResponse.json({ assets: normalized, counts, page, limit, total: totalForFilter, hasMore }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load assets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Accept either { id: "..." } or { ids: ["...", "..."] } for bulk delete.
    const singleId = typeof body?.id === "string" ? body.id : "";
    const bulkIds = Array.isArray(body?.ids)
      ? (body.ids as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
    const ids = bulkIds.length > 0 ? bulkIds : (singleId ? [singleId] : []);
    if (ids.length === 0) {
      return NextResponse.json({ error: "Asset id(s) required." }, { status: 400 });
    }
    // Hard cap to avoid abuse.
    const safeIds = ids.slice(0, 200);

    const records = await prismadb.generation.findMany({
      where: { id: { in: safeIds }, userId },
      select: { id: true, assetType: true, mediaUrl: true, outputUrl: true, posterUrl: true },
    });

    const cleanupResults = await Promise.all(records.map((record) => deleteFromStorage({
      userId,
      generationId: record.id,
      assetType: record.assetType,
      mediaUrl: record.mediaUrl,
      outputUrl: record.outputUrl,
      posterUrl: record.posterUrl,
    })));

    const cleanup = cleanupResults.reduce(
      (acc, result) => ({
        attempted: acc.attempted + result.attempted,
        failed: acc.failed + result.failed,
        failures: [...acc.failures, ...result.failures],
      }),
      { attempted: 0, failed: 0, failures: [] as Array<{ bucket: string; path: string; error: string }> },
    );

    if (cleanup.failed > 0) {
      console.error("[api/assets] Storage cleanup failed; database delete aborted", cleanup.failures.slice(0, 20));
      return NextResponse.json({
        ok: false,
        error: "Storage cleanup failed. Asset was not deleted from history.",
        storageCleanup: cleanup,
      }, { status: 502 });
    }

    await prismadb.generation.deleteMany({
      where: { id: { in: records.map((record) => record.id) }, userId },
    });

    return NextResponse.json({ ok: true, deleted: records.length, storageCleanup: cleanup }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, filename, mimeType } = await req.json().catch(() => ({}));
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const type = String(mimeType || "").startsWith("video") ? "video" : "image";

    const record = await prismadb.generation.create({
      data: {
        userId,
        mediaUrl: url,
        prompt: filename || "Manually Uploaded",
        modelUsed: "Upload",
        assetType: type,
        status: "COMPLETED",
        cost: 0,
      }
    });

    const uploadedPosterUrl: string | undefined = undefined;
    const uploadedPosterStatus: string | undefined = type === "video" ? "pending" : undefined;
    if (type === "video") {
      scheduleVideoPosterGeneration(record.id, "api-assets-upload-video");
    }
    if (type === "image") {
      scheduleImageThumbnailGeneration(record.id, "api-assets-upload-image");
    }

    const returnedAsset = {
      id: record.id,
      type,
      url,
      originalUrl: url,
      thumbnailUrl: type === "image" ? galleryThumbnailUrl(record.id, "image") : undefined,
      posterUrl: uploadedPosterUrl,
      posterStatus: uploadedPosterStatus,
      prompt: record.prompt,
      model: record.modelUsed,
      date: record.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      createdAt: record.createdAt.toISOString(),
      cost: 0,
      isFavorite: false,
    };

    return NextResponse.json({ asset: returnedAsset, ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
