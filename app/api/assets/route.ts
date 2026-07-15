import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { deleteFromStorage } from "@/lib/supabase-storage";
import { reconcilePendingBytePlusGenerations } from "@/lib/providers/byteplus-reconcile";
import { normalizeMediaUrl } from "@/lib/r2-storage";

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
  if (lower.startsWith("error:") || lower.startsWith("error ")) return false;
  return true;
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
        return NextResponse.json({ error: "Asset context not found" }, { status: 404 });
      }

      const payload = context.generationRequestSnapshot?.requestPayload as any;
      const referenceImageUrls = collectStringArray(
        payload,
        ["reference_image_urls", "referenceImageUrls", "image_urls", "imageUrls"],
        3,
      );

      return NextResponse.json({
        id: context.id,
        providerRequestId: context.providerRequestId ?? undefined,
        modelRoute: context.modelUsed,
        providerModel: context.generationRequestSnapshot?.model ?? undefined,
        duration: context.generationRequestSnapshot?.duration ?? payload?.duration ?? undefined,
        aspectRatio: context.generationRequestSnapshot?.aspectRatio ?? payload?.aspect_ratio ?? payload?.aspectRatio ?? undefined,
        resolution: context.generationRequestSnapshot?.resolution ?? undefined,
        quality: context.generationRequestSnapshot?.quality ?? payload?.quality ?? payload?.mode ?? undefined,
        startImageUrl: firstString(payload, ["first_frame_url", "firstFrameUrl", "image", "image_url", "imageUrl"]) ?? undefined,
        endImageUrl: firstString(payload, ["last_frame_url", "lastFrameUrl", "end_image", "endImage", "last_image", "lastImage"]) ?? undefined,
        referenceImageUrls,
      });
    }

    const requestedType = (req.nextUrl.searchParams.get("type") || "all").toLowerCase();

    // Resolve this user's pending Seedance jobs before loading the gallery.
    // This works even when the original browser session was closed.
    await reconcilePendingBytePlusGenerations(5, userId).catch((error) => {
      console.error("[api/assets] BytePlus reconciliation failed", error);
    });

    const rows = await prismadb.generation.findMany({
      where: {
        userId,
        OR: [
          { mediaUrl: { not: null as string | null } },
          { outputUrl: { not: null as string | null } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mediaUrl: true,
        outputUrl: true,
        prompt: true,
        modelUsed: true,
        assetType: true,
        cost: true,
        createdAt: true,
        providerRequestId: true,
      },
    });

    const normalized = rows
      .map((row) => {
        const resolvedUrl = resolveAssetUrl(row.mediaUrl, row.outputUrl);
        return {
          ...row,
          resolvedUrl,
        };
      })
      .filter((row) => isRenderableAssetUrl(row.resolvedUrl))
      .map((row) => {
        const type = toAssetType(row.assetType);
        const mediaUrl = row.resolvedUrl;
        const isTextMarker = mediaUrl.startsWith("text:");

        return {
          id: row.id,
          type,
          url: isTextMarker ? undefined : mediaUrl,
          textContent: isTextMarker ? row.prompt : undefined,
          prompt: row.prompt,
          model: row.modelUsed,
          resolution: undefined,
          duration: undefined,
          date: row.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          createdAt: row.createdAt.toISOString(),
          cost: row.cost,
          providerRequestId: row.providerRequestId ?? undefined,
        };
      });

    const counts = {
      all: normalized.length,
      image: normalized.filter((a) => a.type === "image").length,
      video: normalized.filter((a) => a.type === "video").length,
      audio: normalized.filter((a) => a.type === "audio").length,
      "3d": normalized.filter((a) => a.type === "3d").length,
      text: normalized.filter((a) => a.type === "text").length,
    };

    const assets =
      requestedType === "all"
        ? normalized
        : normalized.filter((asset) => asset.type === requestedType);

    return NextResponse.json({ assets, counts }, { status: 200 });
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
      select: { id: true, assetType: true },
    });

    await prismadb.generation.deleteMany({
      where: { id: { in: safeIds }, userId },
    });

    // Best-effort storage cleanup, fire-and-forget per record.
    for (const record of records) {
      deleteFromStorage({ userId, generationId: record.id, assetType: record.assetType }).catch(() => {});
    }

    return NextResponse.json({ ok: true, deleted: records.length }, { status: 200 });
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

    const returnedAsset = {
      id: record.id,
      type,
      url,
      prompt: record.prompt,
      model: record.modelUsed,
      date: record.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      createdAt: record.createdAt.toISOString(),
      cost: 0,
    };

    return NextResponse.json({ asset: returnedAsset, ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
