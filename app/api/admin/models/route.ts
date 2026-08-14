import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getDynamicImageModels,
  getDynamicVideoModels,
  normalizeDynamicImageModels,
  normalizeDynamicVideoModels,
  saveDynamicImageModels,
  saveDynamicVideoModels,
  type DynamicImageModel,
  type DynamicVideoModel,
} from "@/lib/dynamic-model-loader";
import {
  resolveImageModelSource,
  resolveVideoModelSource,
  withImageSourceMetadata,
  withVideoSourceMetadata,
} from "@/lib/model-source-map";
import { invalidatePricingCache } from "@/lib/pricing";
import prismadb from "@/lib/prismadb";

async function syncPricingConstitution(imageModels: DynamicImageModel[], videoModels: DynamicVideoModel[]) {
  const syncOperations = [];

  for (const model of imageModels) {
    const source = resolveImageModelSource(model);
    syncOperations.push(
      prismadb.pricingConstitution.upsert({
        where: { id: model.id },
        create: {
          id: model.id,
          name: model.label,
          notes: model.sublabel || `Source: ${source.runtimeSourceLabel}`,
          type: "image",
          provider: source.pricingProvider,
          billing: "flat",
          userCreditsRate: model.creditCost ?? 2.0,
          isActive: model.isActive !== false,
        },
        update: {
          name: model.label,
          notes: model.sublabel || `Source: ${source.runtimeSourceLabel}`,
          provider: source.pricingProvider,
          userCreditsRate: model.creditCost ?? 2.0,
          isActive: model.isActive !== false,
        },
      }),
    );
  }

  for (const model of videoModels) {
    const source = resolveVideoModelSource(model);
    const creditRate = model.creditCost ?? 5.0;
    const billingType = model.capabilities?.durations?.length === 0 ? "flat" : "per_sec";

    syncOperations.push(
      prismadb.pricingConstitution.upsert({
        where: { id: model.id },
        create: {
          id: model.id,
          name: model.name,
          notes: model.description || `Source: ${source.runtimeSourceLabel}`,
          type: "video",
          provider: source.pricingProvider,
          billing: billingType,
          userCreditsRate: creditRate,
          isActive: model.isActive !== false,
        },
        update: {
          name: model.name,
          notes: model.description || `Source: ${source.runtimeSourceLabel}`,
          provider: source.pricingProvider,
          userCreditsRate: creditRate,
          isActive: model.isActive !== false,
        },
      }),
    );
  }

  if (syncOperations.length > 0) {
    await prismadb.$transaction(syncOperations);
  }
  invalidatePricingCache();
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const imageModels = await getDynamicImageModels();
    const videoModels = await getDynamicVideoModels();
    return NextResponse.json({
      imageModels: imageModels.map(withImageSourceMetadata),
      videoModels: videoModels.map(withVideoSourceMetadata),
    });
  } catch (err) {
    console.error("[admin-models] GET error:", err);
    return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { imageModels?: DynamicImageModel[]; videoModels?: DynamicVideoModel[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.imageModels || !body.videoModels) {
    return NextResponse.json({ error: "Missing imageModels or videoModels arrays" }, { status: 400 });
  }

  try {
    const imageModels = normalizeDynamicImageModels(body.imageModels);
    const videoModels = normalizeDynamicVideoModels(body.videoModels);

    await saveDynamicImageModels(imageModels);
    await saveDynamicVideoModels(videoModels);
    await syncPricingConstitution(imageModels, videoModels);

    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[admin-models] POST error:", err);
    return NextResponse.json({ error: "Failed to save configurations" }, { status: 500 });
  }
}

export async function PUT() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { syncKieModelCatalog } = await import("@/lib/kie-model-sync");
    const snapshot = await syncKieModelCatalog(true).catch(() => ({ detectedModels: [] }));

    const currentImageModels = await getDynamicImageModels();
    const currentVideoModels = await getDynamicVideoModels();
    const beforeImageIds = new Set(currentImageModels.map((model) => model.id.toLowerCase()));
    const beforeVideoIds = new Set(currentVideoModels.map((model) => model.id.toLowerCase()));

    const imageModels = normalizeDynamicImageModels(currentImageModels);
    const videoModels = normalizeDynamicVideoModels(currentVideoModels);

    await saveDynamicImageModels(imageModels);
    await saveDynamicVideoModels(videoModels);
    await syncPricingConstitution(imageModels, videoModels);

    const afterImageIds = new Set(imageModels.map((model) => model.id.toLowerCase()));
    const afterVideoIds = new Set(videoModels.map((model) => model.id.toLowerCase()));
    const newlyAddedCount =
      Array.from(afterImageIds).filter((id) => !beforeImageIds.has(id)).length +
      Array.from(afterVideoIds).filter((id) => !beforeVideoIds.has(id)).length;

    return NextResponse.json({
      success: true,
      newlyAddedCount,
      totalDetected: snapshot.detectedModels?.length || 0,
      normalized: true,
    });
  } catch (err) {
    console.error("[admin-models] PUT sync error:", err);
    return NextResponse.json({ error: "Failed to sync models updates catalog" }, { status: 500 });
  }
}
