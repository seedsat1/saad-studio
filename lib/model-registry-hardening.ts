import prismadb from "@/lib/prismadb";
import { PROVIDER_REGISTRY, isProviderRoutingAllowed } from "@/lib/provider-registry";
import {
  normalizeDynamicImageModels,
  normalizeDynamicVideoModels,
  type DynamicImageModel,
  type DynamicVideoModel,
} from "@/lib/dynamic-model-loader";
import { resolveImageModelSource, resolveVideoModelSource } from "@/lib/model-source-map";
import { invalidatePricingCache } from "@/lib/pricing";

export const MODEL_REGISTRY_AUDIT_LOG_KEY = "model_registry_audit_log";

export class ModelConcurrencyError extends Error {
  constructor(message = "Model registry configuration was modified by another administrator. Please refresh.") {
    super(message);
    this.name = "ModelConcurrencyError";
  }
}

export type ModelFieldChange = {
  modelId: string;
  modality: "image" | "video";
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type ModelRegistryAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  action: "save_models" | "sync_catalog" | "delete_model" | string;
  changedModelsCount: number;
  changes: ModelFieldChange[];
};

export type ModelConfigVersionState = {
  imageUpdatedAt: string | null;
  videoUpdatedAt: string | null;
  versionToken: string;
};

export async function getModelConfigVersionState(): Promise<ModelConfigVersionState> {
  try {
    const [imgRow, vidRow] = await Promise.all([
      prismadb.platformConfig.findUnique({ where: { key: "dynamic_image_models" } }),
      prismadb.platformConfig.findUnique({ where: { key: "dynamic_video_models" } }),
    ]);

    const imgTime = imgRow?.updatedAt?.getTime() ?? 0;
    const vidTime = vidRow?.updatedAt?.getTime() ?? 0;
    const versionToken = `${imgTime}_${vidTime}`;

    return {
      imageUpdatedAt: imgRow?.updatedAt?.toISOString() || null,
      videoUpdatedAt: vidRow?.updatedAt?.toISOString() || null,
      versionToken,
    };
  } catch (err) {
    console.error("[getModelConfigVersionState] error:", err);
    return {
      imageUpdatedAt: null,
      videoUpdatedAt: null,
      versionToken: "0_0",
    };
  }
}

export function validateModelConfigurations(
  imageModels: DynamicImageModel[],
  videoModels: DynamicVideoModel[]
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(imageModels) || imageModels.length === 0) {
    errors.push("imageModels array must not be empty.");
  } else {
    for (const model of imageModels) {
      if (!model.id || !model.id.trim()) {
        errors.push("Image model contains an empty or invalid id.");
        continue;
      }
      if (typeof model.creditCost === "number" && (Number.isNaN(model.creditCost) || model.creditCost < 0)) {
        errors.push(`Image model ${model.id} has an invalid negative or NaN creditCost.`);
      }

      const source = resolveImageModelSource(model);
      const providerEntry = PROVIDER_REGISTRY.find((p) => p.id === source.runtimeSource);
      if (!providerEntry) {
        errors.push(`Image model ${model.id} references unrecognized provider: ${source.runtimeSource}`);
      } else if (!providerEntry.modalities.includes("image")) {
        errors.push(`Provider ${providerEntry.name} does not support image modality for model ${model.id}`);
      }
    }
  }

  if (!Array.isArray(videoModels) || videoModels.length === 0) {
    errors.push("videoModels array must not be empty.");
  } else {
    for (const model of videoModels) {
      if (!model.id || !model.id.trim()) {
        errors.push("Video model contains an empty or invalid id.");
        continue;
      }
      if (typeof model.creditCost === "number" && (Number.isNaN(model.creditCost) || model.creditCost < 0)) {
        errors.push(`Video model ${model.id} has an invalid negative or NaN creditCost.`);
      }

      const source = resolveVideoModelSource(model);
      const providerEntry = PROVIDER_REGISTRY.find((p) => p.id === source.runtimeSource);
      if (!providerEntry) {
        errors.push(`Video model ${model.id} references unrecognized provider: ${source.runtimeSource}`);
      } else if (!providerEntry.modalities.includes("video")) {
        errors.push(`Provider ${providerEntry.name} does not support video modality for model ${model.id}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function computeModelDiffs(
  oldImageModels: DynamicImageModel[],
  newImageModels: DynamicImageModel[],
  oldVideoModels: DynamicVideoModel[],
  newVideoModels: DynamicVideoModel[]
): ModelFieldChange[] {
  const changes: ModelFieldChange[] = [];

  const oldImgMap = new Map(oldImageModels.map((m) => [m.id, m]));
  for (const newM of newImageModels) {
    const oldM = oldImgMap.get(newM.id);
    if (!oldM) {
      changes.push({ modelId: newM.id, modality: "image", field: "added", oldValue: null, newValue: true });
    } else {
      if (oldM.isActive !== newM.isActive) {
        changes.push({ modelId: newM.id, modality: "image", field: "isActive", oldValue: oldM.isActive, newValue: newM.isActive });
      }
      if (oldM.creditCost !== newM.creditCost) {
        changes.push({ modelId: newM.id, modality: "image", field: "creditCost", oldValue: oldM.creditCost, newValue: newM.creditCost });
      }
    }
  }

  const oldVidMap = new Map(oldVideoModels.map((m) => [m.id, m]));
  for (const newM of newVideoModels) {
    const oldM = oldVidMap.get(newM.id);
    if (!oldM) {
      changes.push({ modelId: newM.id, modality: "video", field: "added", oldValue: null, newValue: true });
    } else {
      const trackedFields: (keyof DynamicVideoModel)[] = [
        "isActive",
        "creditCost",
        "isDeleted",
        "text_api_route",
        "image_api_route",
        "video_api_route",
        "reference_api_route",
        "start_end_api_route",
      ];
      for (const field of trackedFields) {
        if (oldM[field] !== newM[field]) {
          changes.push({
            modelId: newM.id,
            modality: "video",
            field: field as string,
            oldValue: oldM[field] ?? null,
            newValue: newM[field] ?? null,
          });
        }
      }

      // Deep diff for pricingConfig (includes extend fields)
      const oldPricing = JSON.stringify(oldM.pricingConfig ?? {});
      const newPricing = JSON.stringify(newM.pricingConfig ?? {});
      if (oldPricing !== newPricing) {
        changes.push({
          modelId: newM.id,
          modality: "video",
          field: "pricingConfig",
          oldValue: oldM.pricingConfig ?? null,
          newValue: newM.pricingConfig ?? null,
        });
      }

      // Deep diff for capabilities
      const oldCaps = JSON.stringify(oldM.capabilities ?? {});
      const newCaps = JSON.stringify(newM.capabilities ?? {});
      if (oldCaps !== newCaps) {
        changes.push({
          modelId: newM.id,
          modality: "video",
          field: "capabilities",
          oldValue: oldM.capabilities ?? null,
          newValue: newM.capabilities ?? null,
        });
      }
    }
  }

  return changes;
}

export async function appendModelRegistryAuditLog(
  event: ModelRegistryAuditEvent,
  tx?: any
): Promise<void> {
  const db = tx || prismadb;
  try {
    const row = await db.platformConfig.findUnique({ where: { key: MODEL_REGISTRY_AUDIT_LOG_KEY } });
    let existing: ModelRegistryAuditEvent[] = [];
    if (row?.value) {
      try {
        existing = JSON.parse(row.value);
        if (!Array.isArray(existing)) existing = [];
      } catch {}
    }

    const updated = [event, ...existing].slice(0, 100);
    await db.platformConfig.upsert({
      where: { key: MODEL_REGISTRY_AUDIT_LOG_KEY },
      update: { value: JSON.stringify(updated) },
      create: { key: MODEL_REGISTRY_AUDIT_LOG_KEY, value: JSON.stringify(updated) },
    });
  } catch (err) {
    console.error("[appendModelRegistryAuditLog] error:", err);
  }
}

export async function loadModelRegistryAuditLog(): Promise<ModelRegistryAuditEvent[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key: MODEL_REGISTRY_AUDIT_LOG_KEY } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveModelConfigurationsAtomic(options: {
  imageModels: DynamicImageModel[];
  videoModels: DynamicVideoModel[];
  expectedVersionToken?: string | null;
  operatorId?: string;
  action?: "save_models" | "sync_catalog" | "delete_model" | string;
}): Promise<{ success: boolean; changesCount: number }> {
  const currentVersion = await getModelConfigVersionState();
  if (options.expectedVersionToken && options.expectedVersionToken !== currentVersion.versionToken) {
    throw new ModelConcurrencyError();
  }

  const normalizedImageModels = normalizeDynamicImageModels(options.imageModels);
  const normalizedVideoModels = normalizeDynamicVideoModels(options.videoModels);

  const validation = validateModelConfigurations(normalizedImageModels, normalizedVideoModels);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Load old models to compute accurate audit diffs
  const [oldImgRow, oldVidRow] = await Promise.all([
    prismadb.platformConfig.findUnique({ where: { key: "dynamic_image_models" } }),
    prismadb.platformConfig.findUnique({ where: { key: "dynamic_video_models" } }),
  ]);
  const oldImgList: DynamicImageModel[] = oldImgRow?.value ? JSON.parse(oldImgRow.value) : [];
  const oldVidList: DynamicVideoModel[] = oldVidRow?.value ? JSON.parse(oldVidRow.value) : [];

  const changes = computeModelDiffs(oldImgList, normalizedImageModels, oldVidList, normalizedVideoModels);

  // Execute atomic transaction for:
  // 1. dynamic_image_models upsert
  // 2. dynamic_video_models upsert
  // 3. PricingConstitution upserts
  await prismadb.$transaction(async (tx) => {
    // 1. Save Image Models
    await tx.platformConfig.upsert({
      where: { key: "dynamic_image_models" },
      update: { value: JSON.stringify(normalizedImageModels) },
      create: { key: "dynamic_image_models", value: JSON.stringify(normalizedImageModels) },
    });

    // 2. Save Video Models
    await tx.platformConfig.upsert({
      where: { key: "dynamic_video_models" },
      update: { value: JSON.stringify(normalizedVideoModels) },
      create: { key: "dynamic_video_models", value: JSON.stringify(normalizedVideoModels) },
    });

    // 3. Sync PricingConstitution for Image Models
    for (const model of normalizedImageModels) {
      const source = resolveImageModelSource(model);
      await tx.pricingConstitution.upsert({
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
      });
    }

    // 4. Sync PricingConstitution for Video Models
    for (const model of normalizedVideoModels) {
      const source = resolveVideoModelSource(model);
      const creditRate = model.creditCost ?? 5.0;
      const billingType = model.capabilities?.durations?.length === 0 ? "flat" : "per_sec";

      await tx.pricingConstitution.upsert({
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
      });
    }

    // 5. Append Audit Event inside transaction
    if (changes.length > 0) {
      await appendModelRegistryAuditLog(
        {
          id: `model_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          operatorId: options.operatorId || "admin",
          action: options.action || "save_models",
          changedModelsCount: changes.length,
          changes,
        },
        tx
      );
    }
  });

  invalidatePricingCache();

  return { success: true, changesCount: changes.length };
}
