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
    expectedVersionToken?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.imageModels || !body.videoModels) {
    return NextResponse.json({ error: "Missing imageModels or videoModels arrays" }, { status: 400 });
  }

  let operatorId = "admin_session";
  try {
    const session = await auth();
    if (session?.userId) operatorId = session.userId;
  } catch {}

  try {
    const result = await saveModelConfigurationsAtomic({
      imageModels: body.imageModels,
      videoModels: body.videoModels,
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
