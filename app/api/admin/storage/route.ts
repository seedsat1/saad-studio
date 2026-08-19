import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getStorageProviderDescriptors,
  getStorageReadProvidersForConfig,
  getWritableStorageProviders,
  headObject,
  objectKeyFor,
  readStorageRuntimeConfig,
  resolveMediaObject,
} from "@/lib/storage";
import {
  getStorageRuntimeVersionToken,
  loadStorageAuditLog,
  saveStorageRuntimeConfigAtomic,
  StorageConcurrencyError,
} from "@/lib/storage/storage-hardening";

export const dynamic = "force-dynamic";

function buildSummary(config: Awaited<ReturnType<typeof readStorageRuntimeConfig>>) {
  const providers = getStorageProviderDescriptors(config);
  const active = providers.find((provider) => provider.id === config.activeWriteProvider) ?? providers[0];
  const legacy = providers.filter((provider) => provider.role === "legacy_read_only" && provider.readEnabled);
  const writableProviders = getWritableStorageProviders().map((provider) => provider.id);
  const readChain = getStorageReadProvidersForConfig(config).map((provider: { id: string }) => provider.id);
  const mediaGatewayReady = Boolean(active?.readEnabled);
  const directCouplingRemaining = [
    "Hook Studio static reference thumbnails still include direct Backblaze URLs.",
    "Some client-side product pages still contain durable-base-url fallbacks for old media references.",
  ];

  return {
    activeWriteProvider: config.activeWriteProvider,
    activeProvider: config.activeWriteProvider,
    activeProviderLabel: active?.label ?? config.activeWriteProvider,
    mediaDeliveryMode: config.mediaDeliveryMode,
    legacyReadEnabled: config.legacyReadEnabled,
    providers,
    writableProviders,
    readChain,
    health: {
      activeConfigured: Boolean(active?.configured),
      writeEnabled: Boolean(active?.writeEnabled),
      readEnabled: Boolean(active?.readEnabled),
      mediaGatewayReady,
      writeHealth: active?.writeEnabled ? "configured_only" : "unavailable",
      readHealth: active?.readEnabled ? "available_via_runtime" : "unavailable",
      legacyReadHealth: legacy.length ? "available_via_runtime" : "disabled",
    },
    policy: {
      source: "PlatformConfig",
      key: "storage_runtime_config_v1",
      storesSecrets: false,
    },
    directCouplingRemaining,
    sourceOfTruth: "PlatformConfig storage_runtime_config_v1 + environment secrets + StorageProvider adapters",
  };
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [config, versionToken, auditLog] = await Promise.all([
      readStorageRuntimeConfig(),
      getStorageRuntimeVersionToken(),
      loadStorageAuditLog(),
    ]);

    return NextResponse.json({
      ok: true,
      config,
      versionToken,
      auditLog,
      summary: buildSummary(config),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin-storage] GET error:", error);
    return NextResponse.json({ error: "Failed to load storage runtime status" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = auth();
    const operatorId = userId || "clerk_admin";

    const body = await req.json().catch(() => ({}));
    const expectedVersionToken = typeof body?.expectedVersionToken === "string" ? body.expectedVersionToken : null;

    const result = await saveStorageRuntimeConfigAtomic({
      input: {
        activeWriteProvider: body.activeWriteProvider,
        mediaDeliveryMode: body.mediaDeliveryMode,
        legacyReadEnabled: body.legacyReadEnabled,
      },
      expectedVersionToken,
      operatorId,
    });

    return NextResponse.json({
      ok: true,
      config: result.config,
      versionToken: result.versionToken,
      auditLog: result.auditLog,
      summary: buildSummary(result.config),
    });
  } catch (error: any) {
    if (error instanceof StorageConcurrencyError) {
      return NextResponse.json({ error: error.message, code: "STORAGE_CONCURRENCY_CONFLICT" }, { status: 409 });
    }

    console.error("[admin-storage] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to save storage policy" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawPath = typeof body?.mediaPath === "string" ? body.mediaPath.trim() : "";
    if (!rawPath) {
      return NextResponse.json({ error: "mediaPath is required" }, { status: 400 });
    }

    const resolved = resolveMediaObject(rawPath);
    if (!resolved || resolved.kind !== "owned_storage") {
      return NextResponse.json({
        ok: true,
        mediaPath: rawPath,
        kind: resolved?.kind ?? "unknown",
        diagnostic: "Input is not a proven storage-owned media object.",
        attempts: [],
      });
    }

    const objectKey = objectKeyFor(resolved.bucket, resolved.path);
    const attempts = await headObject({ objectKey });
    return NextResponse.json({
      ok: true,
      mediaPath: rawPath,
      kind: "owned_storage",
      objectKey,
      found: attempts.some((attempt) => attempt.found),
      attempts,
    });
  } catch (error) {
    console.error("[admin-storage] diagnostics error:", error);
    return NextResponse.json({ error: "Storage diagnostic failed" }, { status: 500 });
  }
}
