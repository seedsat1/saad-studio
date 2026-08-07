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

export async function PUT() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { syncKieModelCatalog } = await import("@/lib/kie-model-sync");
    const snapshot = await syncKieModelCatalog(true);

    const imageModels = await getDynamicImageModels();
    const videoModels = await getDynamicVideoModels();

    const existingImageIds = new Set(imageModels.map((m) => m.id.toLowerCase()));
    const existingVideoIds = new Set(videoModels.map((m) => m.id.toLowerCase()));

    let newlyAddedCount = 0;
    const newImageModels = [...imageModels];
    const newVideoModels = [...videoModels];

    for (const dm of snapshot.detectedModels || []) {
      const idLower = dm.id.toLowerCase();
      if (dm.kind === "image" && !existingImageIds.has(idLower)) {
        newImageModels.push({
          id: dm.id,
          label: dm.label,
          sublabel: dm.family,
          badge: "NEW",
          group: "Auto-Synced",
          inputType: "text-to-image",
          aspectRatios: ["1:1", "16:9", "9:16"],
          maxImages: 1,
          maxRefImages: 0,
          creditCost: 2.0,
          isActive: true,
        });
        newlyAddedCount++;
      } else if (dm.kind === "video" && !existingVideoIds.has(idLower)) {
        newVideoModels.push({
          id: dm.id,
          name: dm.label,
          family: dm.family.toLowerCase(),
          family_label: dm.family,
          family_color: "#7c3aed",
          badge: "NEW",
          description: `Auto-synced from KIE API updates.`,
          api_route: dm.id,
          route_confirmed: true,
          capabilities: {
            requires_image: false,
            optional_image: false,
            requires_video: false,
            optional_video: false,
            has_end_frame: false,
            aspect_ratios: ["16:9", "9:16"],
            sizes: [],
            durations: [8],
            resolutions: ["720p"],
            quality_param: "resolution",
            max_reference_images: 0,
            max_reference_videos: 0,
            max_reference_video_total_seconds: 0,
            max_reference_audios: 0,
            max_reference_audio_total_seconds: 0,
            has_negative_prompt: false,
            has_seed: false,
            has_cfg_scale: false,
            has_sound: false,
            sound_param: "sound",
            has_shot_type: false,
            has_multi_prompt: false,
            has_element_list: false,
            has_scene_control: false,
            has_orientation: false,
            has_omni_tabs: false,
          },
          isActive: true,
          creditCost: 5.0,
        } as any);
        newlyAddedCount++;
      }
    }

    if (newlyAddedCount > 0) {
      await saveDynamicImageModels(newImageModels);
      await saveDynamicVideoModels(newVideoModels);
    }

    return NextResponse.json({
      success: true,
      newlyAddedCount,
      totalDetected: snapshot.detectedModels?.length || 0,
    });
  } catch (err) {
    console.error("[admin-models] PUT sync error:", err);
    return NextResponse.json({ error: "Failed to sync KIE models updates catalog" }, { status: 500 });
  }
}
