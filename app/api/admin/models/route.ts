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
    // Best-effort KIE updates sync
    const snapshot = await syncKieModelCatalog(true).catch(() => ({ detectedModels: [] }));

    const imageModels = await getDynamicImageModels();
    const videoModels = await getDynamicVideoModels();

    const existingImageIds = new Set(imageModels.map((m) => m.id.toLowerCase()));
    const existingVideoIds = new Set(videoModels.map((m) => m.id.toLowerCase()));

    let newlyAddedCount = 0;
    const newImageModels = [...imageModels];
    const newVideoModels = [...videoModels];

    // Define latest official Google, OpenAI, and WaveSpeed models to auto-populate
    const OFFICIAL_MODELS = [
      {
        id: "google/veo-3.1-generate-preview",
        name: "Google Veo 3.1",
        family: "google",
        family_label: "Google",
        family_color: "#1a73e8",
        badge: "NEW",
        description: "Google's state-of-the-art 8-second video generation model with native audio.",
        api_route: "google/veo-3.1-generate-preview",
        type: "video",
        creditCost: 15.0,
        capabilities: {
          requires_image: false,
          optional_image: true,
          requires_video: false,
          optional_video: true,
          has_end_frame: true,
          aspect_ratios: ["16:9", "9:16"],
          sizes: [],
          durations: [4, 6, 8],
          resolutions: ["720p", "1080p", "4k"],
          quality_param: "resolution",
          max_reference_images: 3,
          max_reference_videos: 1,
          max_reference_video_total_seconds: 15,
          max_reference_audios: 0,
          max_reference_audio_total_seconds: 0,
          has_negative_prompt: false,
          has_seed: true,
          has_cfg_scale: false,
          has_sound: true,
          sound_param: "sound",
          has_shot_type: false,
          has_multi_prompt: false,
          has_element_list: false,
          has_scene_control: false,
          has_orientation: false,
          has_omni_tabs: false,
        }
      },
      {
        id: "google/veo-3.1-lite-generate-preview",
        name: "Google Veo 3.1 Lite",
        family: "google",
        family_label: "Google",
        family_color: "#1a73e8",
        badge: "NEW",
        description: "Fast, low-cost video generation model with native audio.",
        api_route: "google/veo-3.1-lite-generate-preview",
        type: "video",
        creditCost: 8.0,
        capabilities: {
          requires_image: false,
          optional_image: true,
          requires_video: false,
          optional_video: false,
          has_end_frame: false,
          aspect_ratios: ["16:9", "9:16"],
          sizes: [],
          durations: [4, 6, 8],
          resolutions: ["720p", "1080p"],
          quality_param: "resolution",
          max_reference_images: 1,
          max_reference_videos: 0,
          max_reference_video_total_seconds: 0,
          max_reference_audios: 0,
          max_reference_audio_total_seconds: 0,
          has_negative_prompt: false,
          has_seed: true,
          has_cfg_scale: false,
          has_sound: true,
          sound_param: "sound",
          has_shot_type: false,
          has_multi_prompt: false,
          has_element_list: false,
          has_scene_control: false,
          has_orientation: false,
          has_omni_tabs: false,
        }
      },
      {
        id: "google/gemini-3.1-flash-image-preview",
        label: "Google Imagen 3 (Nano Banana 2)",
        sublabel: "Latest high-fidelity Google Image model",
        badge: "NEW",
        group: "Google",
        inputType: "text-to-image",
        aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
        maxImages: 4,
        maxRefImages: 0,
        creditCost: 2.0,
        type: "image",
        isActive: true
      },
      {
        id: "openai/dall-e-3",
        label: "OpenAI DALL-E 3",
        sublabel: "Photorealistic styling from OpenAI",
        badge: "PRO",
        group: "OpenAI",
        inputType: "text-to-image",
        aspectRatios: ["1:1", "16:9", "9:16"],
        maxImages: 1,
        maxRefImages: 0,
        creditCost: 5.0,
        type: "image",
        isActive: true
      },
      {
        id: "kwaivgi/kling-v3.0-pro/text-to-video",
        name: "Kling 3.0 Pro (WaveSpeed)",
        family: "wavespeed",
        family_label: "WaveSpeed",
        family_color: "#ea580c",
        badge: "PRO",
        description: "WaveSpeed routed Kling 3.0 Pro model.",
        api_route: "kwaivgi/kling-v3.0-pro/text-to-video",
        type: "video",
        creditCost: 10.0,
        capabilities: {
          requires_image: false,
          optional_image: true,
          requires_video: false,
          optional_video: false,
          has_end_frame: true,
          aspect_ratios: ["16:9", "9:16", "1:1"],
          sizes: [],
          durations: [5, 10, 15],
          resolutions: ["720p", "1080p"],
          quality_param: "resolution",
          max_reference_images: 1,
          max_reference_videos: 0,
          max_reference_video_total_seconds: 0,
          max_reference_audios: 0,
          max_reference_audio_total_seconds: 0,
          has_negative_prompt: true,
          has_seed: true,
          has_cfg_scale: true,
          has_sound: false,
          sound_param: "sound",
          has_shot_type: true,
          has_multi_prompt: true,
          has_element_list: false,
          has_scene_control: false,
          has_orientation: false,
          has_omni_tabs: false,
        }
      }
    ];

    // 1. Process Official Models First
    for (const m of OFFICIAL_MODELS as any[]) {
      const idLower = m.id.toLowerCase();
      if (m.type === "image" && !existingImageIds.has(idLower)) {
        newImageModels.push({
          id: m.id,
          label: m.label,
          sublabel: m.sublabel,
          badge: m.badge,
          group: m.group,
          inputType: m.inputType as any,
          aspectRatios: m.aspectRatios,
          maxImages: m.maxImages,
          maxRefImages: m.maxRefImages,
          creditCost: m.creditCost,
          isActive: m.isActive,
        });
        newlyAddedCount++;
        existingImageIds.add(idLower);
      } else if (m.type === "video" && !existingVideoIds.has(idLower)) {
        newVideoModels.push({
          id: m.id,
          name: m.name,
          family: m.family,
          family_label: m.family_label,
          family_color: m.family_color,
          badge: m.badge,
          description: m.description,
          api_route: m.api_route,
          route_confirmed: true,
          capabilities: m.capabilities as any,
          isActive: true,
          creditCost: m.creditCost,
        } as any);
        newlyAddedCount++;
        existingVideoIds.add(idLower);
      }
    }

    // 2. Fallback process KIE snapshot detections
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
        existingImageIds.add(idLower);
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
        existingVideoIds.add(idLower);
      }
    }

    if (newlyAddedCount > 0) {
      await saveDynamicImageModels(newImageModels);
      await saveDynamicVideoModels(newVideoModels);

      // Invalidate the cache to apply the costs to PricingConstitution
      const syncOperations = [];
      for (const model of newImageModels) {
        let provider = "google";
        if (model.id.startsWith("openai/")) provider = "openai";
        else if (model.id.startsWith("kling/") || model.id.startsWith("kwaivgi/")) provider = "wavespeed";
        syncOperations.push(
          prismadb.pricingConstitution.upsert({
            where: { id: model.id },
            create: {
              id: model.id,
              name: model.label,
              notes: model.sublabel || "Auto synced",
              type: "image",
              provider: provider,
              billing: "flat",
              userCreditsRate: model.creditCost ?? 2.0,
              isActive: model.isActive !== false,
            },
            update: {
              name: model.label,
              notes: model.sublabel || "Auto synced",
              userCreditsRate: model.creditCost ?? 2.0,
              isActive: model.isActive !== false,
            },
          })
        );
      }
      for (const model of newVideoModels) {
        let provider = "google";
        if (model.id.startsWith("openai/")) provider = "openai";
        else if (model.id.startsWith("kling/") || model.id.startsWith("kwaivgi/") || model.family === "wavespeed") provider = "wavespeed";
        const creditRate = (model as any).creditCost ?? 5.0;
        const billingType = model.capabilities?.durations?.length === 0 ? "flat" : "per_sec";
        syncOperations.push(
          prismadb.pricingConstitution.upsert({
            where: { id: model.id },
            create: {
              id: model.id,
              name: model.name,
              notes: model.description || "Auto synced",
              type: "video",
              provider: provider,
              billing: billingType,
              userCreditsRate: creditRate,
              isActive: model.isActive !== false,
            },
            update: {
              name: model.name,
              notes: model.description || "Auto synced",
              userCreditsRate: creditRate,
              isActive: model.isActive !== false,
            },
          })
        );
      }
      await prismadb.$transaction(syncOperations);
      invalidatePricingCache();
    }

    return NextResponse.json({
      success: true,
      newlyAddedCount,
      totalDetected: snapshot.detectedModels?.length || 0,
    });
  } catch (err) {
    console.error("[admin-models] PUT sync error:", err);
    return NextResponse.json({ error: "Failed to sync models updates catalog" }, { status: 500 });
  }
}
