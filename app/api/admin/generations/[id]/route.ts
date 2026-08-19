import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl } from "@/lib/storage";
import { resolveOfficialProvider } from "@/lib/routing/checkpoint-matrix-builder";
import { resolveHumanToolName, inferModality } from "@/lib/admin/history-read-model";

export const dynamic = "force-dynamic";

function firstString(record: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const val = record[key];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return null;
}

function stringArray(record: Record<string, unknown> | null | undefined, keys: string[]): string[] {
  if (!record) return [];
  for (const key of keys) {
    const val = record[key];
    if (Array.isArray(val)) {
      return val.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return [];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const gen = await prismadb.generation.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true, creditBalance: true },
        },
        generationRequestSnapshot: true,
        providerUsageRecords: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!gen) {
      return NextResponse.json({ ok: false, error: "Generation not found" }, { status: 404 });
    }

    const snapshot = gen.generationRequestSnapshot;
    const payload = (snapshot?.requestPayload && typeof snapshot.requestPayload === "object"
      ? (snapshot.requestPayload as Record<string, unknown>)
      : null);

    // Extract reference media & inputs
    const rawRefImages = stringArray(payload, [
      "referenceImageUrls",
      "reference_images",
      "referenceImages",
      "ref_images",
      "image_urls",
      "imageUrls",
    ]);

    const singleRefImage = firstString(payload, [
      "image",
      "image_url",
      "imageUrl",
      "input_image",
      "inputImage",
      "source_image",
      "sourceImage",
      "init_image",
    ]);

    const referenceImageUrls = Array.from(
      new Set(
        [...rawRefImages, ...(singleRefImage ? [singleRefImage] : [])]
          .map((url) => normalizeMediaUrl(url))
          .filter((url): url is string => Boolean(url))
      )
    );

    const firstFrameUrl = normalizeMediaUrl(
      firstString(payload, ["first_frame_url", "firstFrameUrl", "first_frame", "firstFrame", "start_image", "startFrame"])
    );

    const lastFrameUrl = normalizeMediaUrl(
      firstString(payload, ["last_frame_url", "lastFrameUrl", "last_frame", "lastFrame", "end_image", "endFrame"])
    );

    const inputVideoUrl = normalizeMediaUrl(
      firstString(payload, ["input_video_url", "inputVideoUrl", "video_url", "videoUrl", "source_video", "sourceVideo"])
    );

    const inputAudioUrl = normalizeMediaUrl(
      firstString(payload, ["input_audio_url", "inputAudioUrl", "audio_url", "audioUrl", "source_audio", "sourceAudio"])
    );

    const rawOutputUrl = gen.outputUrl || gen.mediaUrl;
    let resolvedOutputUrl: string | null = null;
    if (rawOutputUrl && !rawOutputUrl.startsWith("failed:") && !rawOutputUrl.startsWith("error:") && !rawOutputUrl.startsWith("task:")) {
      try {
        resolvedOutputUrl = normalizeMediaUrl(rawOutputUrl);
      } catch {
        resolvedOutputUrl = rawOutputUrl;
      }
    }

    const officialProvider = resolveOfficialProvider(gen.modelUsed || "").name;
    const modality = inferModality(gen.assetType, gen.modelUsed);
    const toolName = resolveHumanToolName(gen.assetType, null, snapshot?.generationType);

    // Load ledger entries for this generation
    let ledgerEntries: Array<{ id: string; delta: number; reason: string; createdAt: string }> = [];
    try {
      const entries = await prismadb.$queryRaw<Array<{ id: string; delta: number; reason: string; createdAt: Date }>>`
        SELECT "id", "delta", "reason", "createdAt"
        FROM "CreditLedgerEntry"
        WHERE "generationId" = ${gen.id}
        ORDER BY "createdAt" DESC
      `;
      ledgerEntries = entries.map((e) => ({
        id: e.id,
        delta: e.delta,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      }));
    } catch {
      ledgerEntries = [];
    }

    return NextResponse.json({
      ok: true,
      detail: {
        id: gen.id,
        userId: gen.userId,
        user: gen.user,
        prompt: gen.prompt,
        negativePrompt: firstString(payload, ["negative_prompt", "negativePrompt"]),
        modelUsed: gen.modelUsed,
        officialProvider,
        executionProvider: gen.providerName,
        providerModel: gen.providerModel || null,
        providerRequestId: gen.providerRequestId || null,
        providerCostUsd: gen.providerCostUsd,
        providerCostSource: gen.providerCostSource || "unknown",
        customerCreditsCharged: gen.cost,
        status: gen.status,
        assetType: gen.assetType,
        toolName,
        modality,
        resolution: gen.resolution || snapshot?.resolution || null,
        aspectRatio: gen.aspectRatio || snapshot?.aspectRatio || (modality === "video" ? "16:9" : "1:1"),
        duration: gen.duration || snapshot?.duration || null,
        quality: gen.quality || snapshot?.quality || null,
        mode: snapshot?.mode || firstString(payload, ["mode"]),
        seed: firstString(payload, ["seed"]),
        cameraControls: payload?.camera_controls || payload?.cameraControls || null,
        motionControls: payload?.motion_controls || payload?.motionControls || null,
        rawUrl: rawOutputUrl,
        resolvedOutputUrl,
        posterUrl: gen.posterUrl ? normalizeMediaUrl(gen.posterUrl) : null,
        isFlagged: gen.isFlagged,
        isFavorite: gen.isFavorite,
        createdAt: gen.createdAt.toISOString(),
        inputs: {
          referenceImageUrls,
          firstFrameUrl,
          lastFrameUrl,
          inputVideoUrl,
          inputAudioUrl,
        },
        providerUsageRecords: gen.providerUsageRecords.map((r) => ({
          id: r.id,
          providerName: r.providerName,
          providerModel: r.providerModel,
          providerRequestId: r.providerRequestId,
          providerCostUsd: r.providerCostUsd,
          providerCostSource: r.providerCostSource,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
        creditLedgerEntries: ledgerEntries,
      },
    });
  } catch (error) {
    console.error("[api/admin/generations/[id] GET] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load generation detail" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prismadb.generation.delete({ where: { id: params.id } });
  } catch {
    // Record not found
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { action } = (await req.json()) as { action: string };

  if (action === "flag") {
    try {
      const gen = await prismadb.generation.findUnique({ where: { id: params.id } });
      if (gen) {
        await prismadb.generation.update({
          where: { id: params.id },
          data: { isFlagged: !gen.isFlagged },
        });
      }
    } catch {
      // Mock id
    }
  }

  return NextResponse.json({ ok: true });
}
