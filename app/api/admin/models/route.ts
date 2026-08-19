import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getDynamicImageModels,
  getDynamicVideoModels,
  type DynamicImageModel,
  type DynamicVideoModel,
} from "@/lib/dynamic-model-loader";
import {
  withImageSourceMetadata,
  withVideoSourceMetadata,
} from "@/lib/model-source-map";
import { buildCentralModelDefinitions } from "@/lib/model-definition-registry";
import { loadKnowledgeHub } from "@/lib/admin/knowledge-hub";
import {
  getModelConfigVersionState,
  loadModelRegistryAuditLog,
  saveModelConfigurationsAtomic,
  ModelConcurrencyError,
} from "@/lib/model-registry-hardening";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [imageModels, videoModels, versionState, auditLog, knowledge] = await Promise.all([
      getDynamicImageModels(),
      getDynamicVideoModels(),
      getModelConfigVersionState(),
      loadModelRegistryAuditLog(),
      loadKnowledgeHub(),
    ]);

    const modelDefinitions = buildCentralModelDefinitions({ imageModels, videoModels });

    return NextResponse.json({
      imageModels: imageModels.map(withImageSourceMetadata),
      videoModels: videoModels.map(withVideoSourceMetadata),
      modelDefinitions,
      pendingModelChanges: knowledge.modelChanges.filter((change) => change.status === "proposed"),
      knowledgeDrafts: knowledge.drafts || [],
      knowledgeSources: knowledge.sources || [],
      auditLog,
      versionToken: versionState.versionToken,
      versionState,
      sourceOfTruth: "dynamic model PlatformConfig normalized by Central Model Definition",
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

  let body: {
    imageModels?: DynamicImageModel[];
    videoModels?: DynamicVideoModel[];
    newModel?: {
      id: string;
      name: string;
      modality: "video" | "image" | "audio" | "3d";
      provider?: string;
      api_route?: string;
      text_api_route?: string;
      image_api_route?: string;
      family?: string;
      family_color?: string;
      durations?: number[];
      resolutions?: string[];
      aspectRatios?: string[];
      maxRefImages?: number;
      creditCost?: number;
      isActive?: boolean;
    };
    expectedVersionToken?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let finalImageModels = body.imageModels;
  let finalVideoModels = body.videoModels;

  if (body.newModel) {
    const { newModel } = body;
    if (!newModel.id || !newModel.name) {
      return NextResponse.json({ error: "Model ID and Name are required." }, { status: 400 });
    }

    const currentImages = await getDynamicImageModels();
    const currentVideos = await getDynamicVideoModels();
    const cleanId = newModel.id.trim().toLowerCase();

    if (newModel.modality === "video") {
      const exists = currentVideos.some(m => m.id.toLowerCase() === cleanId);
      if (exists) {
        return NextResponse.json({ error: `Video model with ID '${newModel.id}' already exists.` }, { status: 400 });
      }

      const createdVideo: DynamicVideoModel = {
        id: newModel.id.trim(),
        name: newModel.name.trim(),
        api_route: newModel.api_route?.trim() || newModel.id.trim(),
        text_api_route: newModel.text_api_route?.trim() || newModel.api_route?.trim() || newModel.id.trim(),
        image_api_route: newModel.image_api_route?.trim() || undefined,
        family: newModel.family?.trim() || "custom",
        family_label: (newModel.family?.trim() || "Custom").toUpperCase(),
        family_color: newModel.family_color || "#6366f1",
        badge: "NEW",
        description: `Custom registered model for ${newModel.name.trim()}`,
        route_confirmed: true,
        capabilities: {
          requires_image: false,
          optional_image: true,
          requires_video: false,
          optional_video: false,
          has_end_frame: false,
          aspect_ratios: Array.isArray(newModel.aspectRatios) && newModel.aspectRatios.length > 0 ? newModel.aspectRatios : ["16:9", "9:16", "1:1"],
          sizes: [],
          durations: Array.isArray(newModel.durations) && newModel.durations.length > 0 ? newModel.durations : [5, 10],
          resolutions: Array.isArray(newModel.resolutions) && newModel.resolutions.length > 0 ? newModel.resolutions : ["720p", "1080p"],
          quality_param: "resolution",
          max_reference_images: Number(newModel.maxRefImages) || 4,
          max_reference_videos: 0,
          max_reference_video_total_seconds: 0,
          max_reference_audios: 0,
          max_reference_audio_total_seconds: 0,
          has_negative_prompt: false,
          has_loop: false,
          has_seed: false,
          has_cfg_scale: false,
          has_sound: false,
          sound_param: "generate_audio",
          has_shot_type: false,
          has_multi_prompt: false,
          has_element_list: false,
          has_scene_control: false,
          has_orientation: false,
          has_omni_tabs: false,
        },
        creditCost: Number(newModel.creditCost) || 10,
        isActive: newModel.isActive !== false,
        isCustom: true,
      };
      finalVideoModels = [...currentVideos, createdVideo];
      finalImageModels = currentImages;
    } else {
      const exists = currentImages.some(m => m.id.toLowerCase() === cleanId);
      if (exists) {
        return NextResponse.json({ error: `Image model with ID '${newModel.id}' already exists.` }, { status: 400 });
      }

      const createdImage: DynamicImageModel = {
        id: newModel.id.trim(),
        label: newModel.name.trim(),
        sublabel: newModel.provider ? `${newModel.provider} · Custom` : "Custom Model",
        badge: "NEW",
        upstreamModelId: newModel.api_route?.trim() || newModel.id.trim(),
        text_api_route: newModel.text_api_route?.trim() || newModel.api_route?.trim() || newModel.id.trim(),
        image_api_route: newModel.image_api_route?.trim() || undefined,
        group: newModel.family?.trim() || "Custom",
        inputType: newModel.image_api_route ? "image-to-image" : "text-to-image",
        aspectRatios: Array.isArray(newModel.aspectRatios) && newModel.aspectRatios.length > 0 ? newModel.aspectRatios : ["16:9", "9:16", "1:1", "4:3", "3:4"],
        qualityParam: Array.isArray(newModel.resolutions) && newModel.resolutions.length > 0 ? newModel.resolutions : ["1K", "2K"],
        creditCost: Number(newModel.creditCost) || 2,
        maxImages: 4,
        maxRefImages: Number(newModel.maxRefImages) || 4,
        isActive: newModel.isActive !== false,
        isCustom: true,
      };
      finalImageModels = [...currentImages, createdImage];
      finalVideoModels = currentVideos;
    }
  }

  if (!finalImageModels || !finalVideoModels) {
    return NextResponse.json({ error: "Missing imageModels or videoModels arrays" }, { status: 400 });
  }

  let operatorId = "admin_session";
  try {
    const session = await auth();
    if (session?.userId) operatorId = session.userId;
  } catch {}

  try {
    const result = await saveModelConfigurationsAtomic({
      imageModels: finalImageModels,
      videoModels: finalVideoModels,
      expectedVersionToken: body.expectedVersionToken || null,
      operatorId,
      action: "save_models",
    });

    const newVersionState = await getModelConfigVersionState();

    return NextResponse.json({
      success: true,
      changesCount: result.changesCount,
      versionToken: newVersionState.versionToken,
      savedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err instanceof ModelConcurrencyError) {
      return NextResponse.json(
        { error: err.message, code: "CONCURRENCY_CONFLICT" },
        { status: 409 }
      );
    }
    console.error("[admin-models] POST error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save configurations" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { expectedVersionToken?: string | null } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {}

  let operatorId = "admin_session";
  try {
    const session = await auth();
    if (session?.userId) operatorId = session.userId;
  } catch {}

  try {
    const { syncKieModelCatalog } = await import("@/lib/kie-model-sync");
    const snapshot = await syncKieModelCatalog(true).catch(() => ({ detectedModels: [] }));

    const currentImageModels = await getDynamicImageModels();
    const currentVideoModels = await getDynamicVideoModels();
    const beforeImageIds = new Set(currentImageModels.map((model) => model.id.toLowerCase()));
    const beforeVideoIds = new Set(currentVideoModels.map((model) => model.id.toLowerCase()));

    await saveModelConfigurationsAtomic({
      imageModels: currentImageModels,
      videoModels: currentVideoModels,
      expectedVersionToken: body.expectedVersionToken || null,
      operatorId,
      action: "sync_catalog",
    });

    const afterImageModels = await getDynamicImageModels();
    const afterVideoModels = await getDynamicVideoModels();
    const afterImageIds = new Set(afterImageModels.map((model) => model.id.toLowerCase()));
    const afterVideoIds = new Set(afterVideoModels.map((model) => model.id.toLowerCase()));

    const newlyAddedCount =
      Array.from(afterImageIds).filter((id) => !beforeImageIds.has(id)).length +
      Array.from(afterVideoIds).filter((id) => !beforeVideoIds.has(id)).length;

    const newVersionState = await getModelConfigVersionState();

    return NextResponse.json({
      success: true,
      newlyAddedCount,
      totalDetected: snapshot.detectedModels?.length || 0,
      versionToken: newVersionState.versionToken,
      normalized: true,
    });
  } catch (err: any) {
    if (err instanceof ModelConcurrencyError) {
      return NextResponse.json(
        { error: err.message, code: "CONCURRENCY_CONFLICT" },
        { status: 409 }
      );
    }
    console.error("[admin-models] PUT sync error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to sync models updates catalog" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: string;
    modality?: "image" | "video";
    expectedVersionToken?: string | null;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Model ID is required for deletion." }, { status: 400 });
  }

  let operatorId = "admin_session";
  try {
    const session = await auth();
    if (session?.userId) operatorId = session.userId;
  } catch {}

  try {
    const currentImages = await getDynamicImageModels();
    const currentVideos = await getDynamicVideoModels();
    const cleanTargetId = body.id.trim().toLowerCase();

    let finalImages = currentImages;
    let finalVideos = currentVideos;
    let deleted = false;

    if (!body.modality || body.modality === "image") {
      const filtered = currentImages.filter(
        (m) => m.id.toLowerCase() !== cleanTargetId && m.label.toLowerCase() !== cleanTargetId
      );
      if (filtered.length !== currentImages.length) {
        finalImages = filtered;
        deleted = true;
      }
    }

    if (!deleted && (!body.modality || body.modality === "video")) {
      const filtered = currentVideos.filter(
        (m) => m.id.toLowerCase() !== cleanTargetId && m.name.toLowerCase() !== cleanTargetId
      );
      if (filtered.length !== currentVideos.length) {
        finalVideos = filtered;
        deleted = true;
      }
    }

    if (!deleted) {
      finalImages = currentImages.filter(
        (m) => m.id.toLowerCase() !== cleanTargetId && m.label.toLowerCase() !== cleanTargetId
      );
      finalVideos = currentVideos.filter(
        (m) => m.id.toLowerCase() !== cleanTargetId && m.name.toLowerCase() !== cleanTargetId
      );
    }

    await saveModelConfigurationsAtomic({
      imageModels: finalImages,
      videoModels: finalVideos,
      expectedVersionToken: null,
      operatorId,
      action: `delete_model:${body.id}`,
    });

    const newVersionState = await getModelConfigVersionState();

    return NextResponse.json({
      success: true,
      message: `Model '${body.id}' deleted successfully.`,
      versionToken: newVersionState.versionToken,
    });
  } catch (err: any) {
    if (err instanceof ModelConcurrencyError) {
      return NextResponse.json(
        { error: err.message, code: "CONCURRENCY_CONFLICT" },
        { status: 409 }
      );
    }
    console.error("[admin-models] DELETE error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete model" },
      { status: 500 }
    );
  }
}
