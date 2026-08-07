import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getDynamicImageModels,
  getDynamicVideoModels,
  saveDynamicImageModels,
  saveDynamicVideoModels,
  type DynamicImageModel,
  type DynamicVideoModel,
} from "@/lib/dynamic-model-loader";
import { getProviderFor } from "@/lib/provider-router";
import { invalidatePricingCache } from "@/lib/pricing";
import prismadb from "@/lib/prismadb";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const imageModels = await getDynamicImageModels();
    const videoModels = await getDynamicVideoModels();
    return NextResponse.json({ imageModels, videoModels });
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

  const { imageModels, videoModels } = body;

  if (!imageModels || !videoModels) {
    return NextResponse.json({ error: "Missing imageModels or videoModels arrays" }, { status: 400 });
  }

  try {
    // 1. Save JSON lists to PlatformConfig
    await saveDynamicImageModels(imageModels);
    await saveDynamicVideoModels(videoModels);

    // 2. Sync costs & active states to PricingConstitution
    const syncOperations = [];

    for (const model of imageModels) {
      let provider = "kie";
      try {
        provider = getProviderFor(model.id);
      } catch {
        // Fallback
      }
      syncOperations.push(
        prismadb.pricingConstitution.upsert({
          where: { id: model.id },
          create: {
            id: model.id,
            name: model.label,
            notes: model.sublabel || "Sync from models manager",
            type: "image",
            provider: provider,
            billing: "flat",
            userCreditsRate: model.creditCost ?? 2.0,
            isActive: model.isActive !== false,
          },
          update: {
            name: model.label,
            notes: model.sublabel || "Sync from models manager",
            userCreditsRate: model.creditCost ?? 2.0,
            isActive: model.isActive !== false,
          },
        })
      );
    }

    for (const model of videoModels) {
      let provider = "kie";
      try {
        provider = getProviderFor(model.id);
      } catch {
        // Fallback
      }
      const creditRate = (model as any).creditCost ?? 5.0;
      const billingType = model.capabilities?.durations?.length === 0 ? "flat" : "per_sec";

      syncOperations.push(
        prismadb.pricingConstitution.upsert({
          where: { id: model.id },
          create: {
            id: model.id,
            name: model.name,
            notes: model.description || "Sync from models manager",
            type: "video",
            provider: provider,
            billing: billingType,
            userCreditsRate: creditRate,
            isActive: model.isActive !== false,
          },
          update: {
            name: model.name,
            notes: model.description || "Sync from models manager",
            userCreditsRate: creditRate,
            isActive: model.isActive !== false,
          },
        })
      );
    }

    // Run updates in transaction
    await prismadb.$transaction(syncOperations);

    // Invalidate the pricing cache
    invalidatePricingCache();

    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[admin-models] POST error:", err);
    return NextResponse.json({ error: "Failed to save configurations" }, { status: 500 });
  }
}
