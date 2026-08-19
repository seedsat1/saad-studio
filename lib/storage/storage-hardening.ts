import prismadb from "@/lib/prismadb";
import {
  DEFAULT_STORAGE_RUNTIME_CONFIG,
  STORAGE_RUNTIME_CONFIG_KEY,
  sanitizeStorageRuntimeConfig,
  type StorageRuntimeConfig,
} from "./runtime";
import {
  findStorageProviderDefinition,
} from "./provider-registry";

export const STORAGE_RUNTIME_AUDIT_LOG_KEY = "storage_runtime_audit_log";

export class StorageConcurrencyError extends Error {
  constructor(message = "Storage runtime policy was modified by another administrator. Please refresh.") {
    super(message);
    this.name = "StorageConcurrencyError";
  }
}

export type StorageFieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type StorageRuntimeAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  action: "update_storage_policy";
  changes: StorageFieldChange[];
};

export async function getStorageRuntimeVersionToken(): Promise<string> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: STORAGE_RUNTIME_CONFIG_KEY },
      select: { updatedAt: true, value: true },
    });

    if (!row) return "initial";
    if (row.updatedAt) return String(row.updatedAt.getTime());

    try {
      const parsed = JSON.parse(row.value);
      if (parsed.updatedAt) return String(new Date(parsed.updatedAt).getTime());
    } catch {
      // ignore parsing error
    }

    return "v1";
  } catch (err) {
    console.error("[getStorageRuntimeVersionToken] error:", err);
    return "error";
  }
}

export async function loadStorageAuditLog(): Promise<StorageRuntimeAuditEvent[]> {
  try {
    const row = await prismadb.platformConfig.findUnique({
      where: { key: STORAGE_RUNTIME_AUDIT_LOG_KEY },
    });
    if (!row?.value) return [];
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? (parsed as StorageRuntimeAuditEvent[]) : [];
  } catch (err) {
    console.error("[loadStorageAuditLog] error:", err);
    return [];
  }
}

export function validateStoragePolicyInput(input: Partial<StorageRuntimeConfig>): { ok: boolean; error?: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid storage policy input payload." };
  }

  if (input.activeWriteProvider) {
    const provider = findStorageProviderDefinition(input.activeWriteProvider);
    if (!provider) {
      return { ok: false, error: `Unknown storage provider: "${input.activeWriteProvider}".` };
    }
  }

  if (input.mediaDeliveryMode && input.mediaDeliveryMode !== "proxy" && input.mediaDeliveryMode !== "direct") {
    return { ok: false, error: 'mediaDeliveryMode must be "proxy" or "direct".' };
  }

  if (input.legacyReadEnabled !== undefined && typeof input.legacyReadEnabled !== "boolean") {
    return { ok: false, error: "legacyReadEnabled must be a boolean." };
  }

  return { ok: true };
}

export function computeStorageConfigDiff(
  currentConfig: StorageRuntimeConfig,
  nextConfig: StorageRuntimeConfig,
): StorageFieldChange[] {
  const changes: StorageFieldChange[] = [];
  const fieldsToCompare: Array<keyof Pick<StorageRuntimeConfig, "activeWriteProvider" | "mediaDeliveryMode" | "legacyReadEnabled">> = [
    "activeWriteProvider",
    "mediaDeliveryMode",
    "legacyReadEnabled",
  ];

  for (const field of fieldsToCompare) {
    if (currentConfig[field] !== nextConfig[field]) {
      changes.push({
        field,
        oldValue: currentConfig[field],
        newValue: nextConfig[field],
      });
    }
  }

  return changes;
}

export async function saveStorageRuntimeConfigAtomic(params: {
  input: Partial<StorageRuntimeConfig>;
  expectedVersionToken?: string | null;
  operatorId: string;
}): Promise<{
  config: StorageRuntimeConfig;
  versionToken: string;
  auditLog: StorageRuntimeAuditEvent[];
}> {
  const { input, expectedVersionToken, operatorId } = params;

  const validation = validateStoragePolicyInput(input);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  return await prismadb.$transaction(async (tx) => {
    // 1. Concurrency Check
    const currentRow = await tx.platformConfig.findUnique({
      where: { key: STORAGE_RUNTIME_CONFIG_KEY },
    });

    let currentVersionToken = "initial";
    let currentConfig: StorageRuntimeConfig = { ...DEFAULT_STORAGE_RUNTIME_CONFIG };

    if (currentRow) {
      currentVersionToken = currentRow.updatedAt ? String(currentRow.updatedAt.getTime()) : "v1";
      try {
        const parsed = JSON.parse(currentRow.value);
        currentConfig = sanitizeStorageRuntimeConfig(parsed);
        if (parsed.updatedAt && currentVersionToken === "v1") {
          currentVersionToken = String(new Date(parsed.updatedAt).getTime());
        }
      } catch {
        currentConfig = { ...DEFAULT_STORAGE_RUNTIME_CONFIG };
      }
    }

    if (expectedVersionToken && expectedVersionToken !== currentVersionToken) {
      throw new StorageConcurrencyError(
        `Storage policy concurrency conflict: expected token "${expectedVersionToken}" but found "${currentVersionToken}". Please refresh.`,
      );
    }

    // 2. Build Next Config
    const nowIso = new Date().toISOString();
    const nextConfig = sanitizeStorageRuntimeConfig({
      ...currentConfig,
      ...input,
      updatedAt: nowIso,
    });

    // 3. Compute Redacted Safe Diff
    const changes = computeStorageConfigDiff(currentConfig, nextConfig);

    // 4. Save Config
    const updatedRow = await tx.platformConfig.upsert({
      where: { key: STORAGE_RUNTIME_CONFIG_KEY },
      update: { value: JSON.stringify(nextConfig) },
      create: { key: STORAGE_RUNTIME_CONFIG_KEY, value: JSON.stringify(nextConfig) },
    });

    const nextVersionToken = updatedRow.updatedAt ? String(updatedRow.updatedAt.getTime()) : String(new Date(nowIso).getTime());

    // 5. Update Audit Trail if changes occurred
    let updatedAuditLog: StorageRuntimeAuditEvent[] = [];
    const auditRow = await tx.platformConfig.findUnique({
      where: { key: STORAGE_RUNTIME_AUDIT_LOG_KEY },
    });

    let existingAuditLog: StorageRuntimeAuditEvent[] = [];
    if (auditRow?.value) {
      try {
        const parsed = JSON.parse(auditRow.value);
        if (Array.isArray(parsed)) existingAuditLog = parsed;
      } catch {
        existingAuditLog = [];
      }
    }

    if (changes.length > 0) {
      const newAuditEvent: StorageRuntimeAuditEvent = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowIso,
        operatorId: operatorId || "admin_operator",
        action: "update_storage_policy",
        changes,
      };

      updatedAuditLog = [newAuditEvent, ...existingAuditLog].slice(0, 100);

      await tx.platformConfig.upsert({
        where: { key: STORAGE_RUNTIME_AUDIT_LOG_KEY },
        update: { value: JSON.stringify(updatedAuditLog) },
        create: { key: STORAGE_RUNTIME_AUDIT_LOG_KEY, value: JSON.stringify(updatedAuditLog) },
      });
    } else {
      updatedAuditLog = existingAuditLog;
    }

    return {
      config: nextConfig,
      versionToken: nextVersionToken,
      auditLog: updatedAuditLog,
    };
  });
}
