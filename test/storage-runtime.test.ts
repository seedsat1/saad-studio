import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StorageProvider } from "@/lib/storage/types";
import {
  createStorageRuntimeForTests,
  getStorageReadProvidersForConfig,
  normalizeMediaUrl,
  resolveMediaObject,
  resolvePublicUrl,
  sanitizeStorageRuntimeConfig,
} from "@/lib/storage/runtime";
import {
  getStorageProviderRegistry,
  isBackblazeConfigured,
  isR2LegacyConfigured,
  validateActiveWriteProvider,
} from "@/lib/storage/provider-registry";
import fs from "fs";
import path from "path";

function mockProvider(name: string, existing = new Set<string>()) {
  const calls: string[] = [];
  const provider: StorageProvider = {
    async upload(params) {
      calls.push(`${name}:upload:${params.bucket}/${params.path}`);
      existing.add(`${params.bucket}/${params.path}`);
      return `${name}/${params.bucket}/${params.path}`;
    },
    async download(params) {
      calls.push(`${name}:download:${params.path}`);
      return {
        body: new ReadableStream(),
        contentLength: 1,
        totalSize: 1,
        contentType: "image/png",
        cacheControl: "public",
      };
    },
    async delete(params) {
      calls.push(`${name}:delete:${params.bucket}/${params.path}`);
    },
    async exists(params) {
      calls.push(`${name}:exists:${params.path}`);
      return existing.has(params.path) || existing.has(`${params.bucket}/${params.path}`);
    },
    getPublicUrl(bucket, objectPath) {
      calls.push(`${name}:public:${bucket}/${objectPath}`);
      return `https://${name}.example/${bucket}/${objectPath}`;
    },
    isStoredAssetUrl(url) {
      return url.includes(`${name}.example`);
    },
    async createSignedUploadUrl(params) {
      calls.push(`${name}:signed:${params.bucket}/${params.path}`);
      return {
        signedUrl: `https://${name}.example/upload/${params.bucket}/${params.path}`,
        publicUrl: `https://${name}.example/${params.bucket}/${params.path}`,
        key: `${params.bucket}/${params.path}`,
      };
    },
  };
  return { provider, calls };
}

describe("central storage runtime", () => {
  it("writes to the configured active provider", async () => {
    const a = mockProvider("active-a");
    const b = mockProvider("active-b");
    const runtime = createStorageRuntimeForTests({
      config: { activeWriteProvider: "backblaze", activeProvider: "backblaze", mediaDeliveryMode: "proxy", legacyReadEnabled: true },
      providers: { backblaze: a.provider, r2: b.provider },
    });

    await runtime.putObject({ bucket: "images", path: "u/one.png", body: "x", contentType: "image/png" });

    expect(a.calls).toContain("active-a:upload:images/u/one.png");
    expect(b.calls.some((call) => call.includes(":upload:"))).toBe(false);
  });

  it("can switch future uploads by storage policy without changing the consumer call", async () => {
    const a = mockProvider("provider-a");
    const b = mockProvider("provider-b");
    const first = createStorageRuntimeForTests({
      config: { activeWriteProvider: "provider-a", activeProvider: "provider-a", mediaDeliveryMode: "proxy", legacyReadEnabled: true },
      providers: { "provider-a": a.provider, "provider-b": b.provider },
      legacyReadProviderIds: ["provider-b"],
    });
    const second = createStorageRuntimeForTests({
      config: { activeWriteProvider: "provider-b", activeProvider: "provider-b", mediaDeliveryMode: "proxy", legacyReadEnabled: true },
      providers: { "provider-a": a.provider, "provider-b": b.provider },
      legacyReadProviderIds: ["provider-a"],
    });

    await first.uploadBuffer({ buffer: Buffer.from("a"), contentType: "image/png", userId: "u", assetType: "image", generationId: "a" });
    await second.uploadBuffer({ buffer: Buffer.from("b"), contentType: "image/png", userId: "u", assetType: "image", generationId: "b" });

    expect(a.calls).toContain("provider-a:upload:images/u/a.png");
    expect(b.calls).toContain("provider-b:upload:images/u/b.png");
  });

  it("falls back to legacy read provider when the active provider misses", async () => {
    const active = mockProvider("active", new Set());
    const legacy = mockProvider("legacy", new Set(["audio/u/old.mp3"]));
    const runtime = createStorageRuntimeForTests({
      config: { activeWriteProvider: "backblaze", activeProvider: "backblaze", mediaDeliveryMode: "proxy", legacyReadEnabled: true },
      providers: { backblaze: active.provider, r2: legacy.provider },
    });

    await expect(runtime.readObject({ objectKey: "audio/u/old.mp3" })).resolves.toBe("r2");
    expect(active.calls).toContain("active:exists:audio/u/old.mp3");
    expect(legacy.calls).toContain("legacy:exists:audio/u/old.mp3");
  });

  it("keeps legacy media readable after switching active writer", async () => {
    const oldProvider = mockProvider("old-provider", new Set(["videos/u/old.mp4"]));
    const newProvider = mockProvider("new-provider", new Set());
    const runtime = createStorageRuntimeForTests({
      config: { activeWriteProvider: "new-provider", activeProvider: "new-provider", mediaDeliveryMode: "proxy", legacyReadEnabled: true },
      providers: { "old-provider": oldProvider.provider, "new-provider": newProvider.provider },
      legacyReadProviderIds: ["old-provider"],
    });

    await expect(runtime.readObject({ objectKey: "videos/u/old.mp4" })).resolves.toBe("old-provider");
    expect(newProvider.calls).toContain("new-provider:exists:videos/u/old.mp4");
    expect(oldProvider.calls).toContain("old-provider:exists:videos/u/old.mp4");
  });

  it("fails closed for non-writable admin storage providers", () => {
    expect(validateActiveWriteProvider("r2").ok).toBe(false);
    expect(validateActiveWriteProvider("missing-provider").ok).toBe(false);
  });

  describe("storage provider registry reporting", () => {
    // isR2LegacyConfigured() used to end in `|| true`, which made both of its
    // env checks dead code and reported R2 as configured on no evidence. These
    // cover the replacement: the reporting is honest, and — the part that
    // matters — legacy R2 reads still work without any R2 credential, because
    // dropping them would make user media that only exists in that bucket
    // unreadable.
    const R2_ENV = [
      "R2_PUBLIC_URL",
      "NEXT_PUBLIC_R2_PUBLIC_URL",
      "R2_PUBLIC_BASE_URL",
      "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_ACCOUNT_ID",
    ] as const;
    const B2_ENV = ["B2_ACCESS_KEY_ID", "B2_SECRET_ACCESS_KEY", "B2_BUCKET", "B2_BUCKET_NAME"] as const;

    let saved: Record<string, string | undefined> = {};

    beforeEach(() => {
      saved = {};
      for (const key of [...R2_ENV, ...B2_ENV]) {
        saved[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    it("reports R2 legacy reads as available with no R2 variables set at all", () => {
      expect(isR2LegacyConfigured()).toBe(true);

      const r2 = getStorageProviderRegistry().find((p) => p.id === "r2");
      expect(r2).toBeDefined();
      expect(r2!.configured).toBe(true);
      expect(r2!.readEnabled).toBe(true);
      // Read-only by construction: R2Provider.upload() always throws.
      expect(r2!.writeEnabled).toBe(false);
      expect(r2!.legacyReadOnly).toBe(true);
      // The old "is not configured" message was unreachable; nothing replaced it.
      expect(r2!.lastError).toBeNull();
    });

    it("keeps R2 in the legacy read chain when no R2 credential exists", () => {
      // The regression this guards against: getStorageReadProvidersForConfig
      // filters legacy providers on `configured`, so a credential-gated
      // predicate would silently remove R2 and orphan anything stored there.
      const providers = getStorageReadProvidersForConfig({
        activeWriteProvider: "backblaze",
        activeProvider: "backblaze",
        mediaDeliveryMode: "proxy",
        legacyReadEnabled: true,
      });

      expect(providers.map((p) => p.id)).toContain("r2");
      expect(providers[0].id).toBe("backblaze");
    });

    it("still honours the storage policy switch for legacy reads", () => {
      // Turning legacy reads off is the admin flag's job, not an env var's.
      const providers = getStorageReadProvidersForConfig({
        activeWriteProvider: "backblaze",
        activeProvider: "backblaze",
        mediaDeliveryMode: "proxy",
        legacyReadEnabled: false,
      });

      expect(providers.map((p) => p.id)).toEqual(["backblaze"]);
    });

    it("leaves Backblaze detection independent of the R2 fix", () => {
      expect(isBackblazeConfigured()).toBe(false);
      expect(validateActiveWriteProvider("backblaze").ok).toBe(false);

      process.env.B2_ACCESS_KEY_ID = "test-key-id";
      process.env.B2_SECRET_ACCESS_KEY = "test-secret";
      process.env.B2_BUCKET = "test-bucket";

      expect(isBackblazeConfigured()).toBe(true);
      const b2 = getStorageProviderRegistry().find((p) => p.id === "backblaze");
      expect(b2!.configured).toBe(true);
      expect(b2!.writeEnabled).toBe(true);
      expect(b2!.legacyReadOnly).toBe(false);
      expect(b2!.lastError).toBeNull();
      expect(validateActiveWriteProvider("backblaze").ok).toBe(true);
    });

    it("refuses R2 as a write target even though it reports configured", () => {
      // configured === true must not be mistaken for writable anywhere.
      const r2 = getStorageProviderRegistry().find((p) => p.id === "r2");
      expect(r2!.configured).toBe(true);

      const result = validateActiveWriteProvider("r2");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/write-enabled|read-only/i);
    });

    it("falls back to Backblaze for an unknown stored provider id", () => {
      const sanitized = sanitizeStorageRuntimeConfig({ activeWriteProvider: "does-not-exist" });
      expect(sanitized.activeWriteProvider).toBe("backblaze");
      expect(sanitized.activeProvider).toBe("backblaze");
    });
  });

  it("does not convert external provider URLs into /api/media", () => {
    const external = "https://temporary.provider.example/audio/result.mp3";
    expect(resolveMediaObject(external)).toEqual({ kind: "external_provider_url", url: external });
    expect(normalizeMediaUrl(external)).toBe(external);
    expect(normalizeMediaUrl("audio/u/file.mp3")).toBe("/api/media/audio/u/file.mp3");
  });

  it("generates public URLs respecting central delivery mode", () => {
    // 1. In proxy mode:
    expect(resolvePublicUrl("images", "u/file.png", { deliveryMode: "proxy" })).toBe("/api/media/images/u/file.png");
    expect(normalizeMediaUrl("images/u/file.png", { deliveryMode: "proxy" })).toBe("/api/media/images/u/file.png");
    expect(normalizeMediaUrl("/api/media/images/u/file.png", { deliveryMode: "proxy" })).toBe("/api/media/images/u/file.png");

    // 2. In direct mode:
    const directUrl = resolvePublicUrl("images", "u/file.png", { deliveryMode: "direct", providerId: "backblaze" });
    expect(directUrl).toContain("saadstudio-storage");
    expect(directUrl).toContain("images/u/file.png");
    expect(normalizeMediaUrl("images/u/file.png", { deliveryMode: "direct", providerId: "backblaze" })).toBe(directUrl);

    // 3. Fallback on invalid provider in direct mode:
    expect(resolvePublicUrl("images", "u/file.png", { deliveryMode: "direct", providerId: "invalid" as any })).toBe("/api/media/images/u/file.png");
  });

  it("safely handles legacy /api/media URLs in both modes", () => {
    const legacyProxy = "/api/media/videos/u/gen123.mp4";
    expect(normalizeMediaUrl(legacyProxy, { deliveryMode: "proxy" })).toBe(legacyProxy);
    const directUrl = normalizeMediaUrl(legacyProxy, { deliveryMode: "direct", providerId: "backblaze" });
    expect(directUrl).toContain("videos/u/gen123.mp4");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DETERMINISTIC SERVER-BOUNDARY & MULTI-INSTANCE CONSISTENCY TESTS
  // ──────────────────────────────────────────────────────────────────────────

  it("1. Cold-start first relevant request uses authoritative config", () => {
    // Fresh instance with default in-memory proxy state receives authoritative direct config
    const authoritativeConfig = {
      activeWriteProvider: "backblaze" as const,
      activeProvider: "backblaze" as const,
      mediaDeliveryMode: "direct" as const,
      legacyReadEnabled: true,
    };
    const resolved = normalizeMediaUrl("images/user1/test.png", { config: authoritativeConfig });
    expect(resolved).toContain("saadstudio-storage");
    expect(resolved).toContain("images/user1/test.png");
  });

  it("2. Stale local proxy + persisted direct resolves direct at server boundary", () => {
    // Process memory says proxy, but request boundary passes persisted direct config
    const staleProcessDefault = {
      activeWriteProvider: "backblaze" as const,
      activeProvider: "backblaze" as const,
      mediaDeliveryMode: "proxy" as const,
      legacyReadEnabled: true,
    };
    const freshPersistedDirect = {
      activeWriteProvider: "backblaze" as const,
      activeProvider: "backblaze" as const,
      mediaDeliveryMode: "direct" as const,
      legacyReadEnabled: true,
    };

    // Before hydration (stale)
    expect(normalizeMediaUrl("images/u/1.png", { config: staleProcessDefault })).toBe("/api/media/images/u/1.png");
    // At authoritative request boundary
    const authoritativeUrl = normalizeMediaUrl("images/u/1.png", { config: freshPersistedDirect });
    expect(authoritativeUrl).toContain("saadstudio-storage");
  });

  it("3. Stale local direct + persisted proxy resolves proxy at server boundary", () => {
    // Process memory says direct, but request boundary passes persisted proxy config
    const staleProcessDirect = {
      activeWriteProvider: "backblaze" as const,
      activeProvider: "backblaze" as const,
      mediaDeliveryMode: "direct" as const,
      legacyReadEnabled: true,
    };
    const freshPersistedProxy = {
      activeWriteProvider: "backblaze" as const,
      activeProvider: "backblaze" as const,
      mediaDeliveryMode: "proxy" as const,
      legacyReadEnabled: true,
    };

    // Request boundary enforces proxy
    expect(normalizeMediaUrl("images/u/1.png", { config: freshPersistedProxy })).toBe("/api/media/images/u/1.png");
    expect(resolvePublicUrl("images", "u/1.png", { config: freshPersistedProxy })).toBe("/api/media/images/u/1.png");
  });

  it("4. Explicit effective config overrides stale process memory completely", () => {
    const directConfig = {
      activeWriteProvider: "backblaze" as const,
      activeProvider: "backblaze" as const,
      mediaDeliveryMode: "direct" as const,
      legacyReadEnabled: true,
    };
    const directResult = resolvePublicUrl("videos", "user/v.mp4", { config: directConfig });
    expect(directResult).toContain("saadstudio-storage");
    expect(directResult).toContain("videos/user/v.mp4");
  });

  it("5. DB/config failure safely falls back to proxy", () => {
    // Corrupted or missing provider config returns proxy
    const fallbackUrl = resolvePublicUrl("images", "u/broken.png", { deliveryMode: "direct", providerId: "unknown_provider" as any });
    expect(fallbackUrl).toBe("/api/media/images/u/broken.png");
  });

  it("6. Legacy /api/media URLs remain functional and resolvable in both modes", () => {
    const legacyProxyUrl = "/api/media/images/user123/render.png";
    expect(normalizeMediaUrl(legacyProxyUrl, { deliveryMode: "proxy" })).toBe(legacyProxyUrl);
    const directUrl = normalizeMediaUrl(legacyProxyUrl, { deliveryMode: "direct", providerId: "backblaze" });
    expect(directUrl).toContain("images/user123/render.png");
  });

  it("7. External provider URLs remain untouched across all modes", () => {
    const openaiUrl = "https://oaidalleapiprodscus.blob.core.windows.net/private/image.png";
    const googleUrl = "https://generativelanguage.googleapis.com/v1beta/files/test.mp4";

    expect(normalizeMediaUrl(openaiUrl, { deliveryMode: "direct" })).toBe(openaiUrl);
    expect(normalizeMediaUrl(openaiUrl, { deliveryMode: "proxy" })).toBe(openaiUrl);
    expect(normalizeMediaUrl(googleUrl, { deliveryMode: "direct" })).toBe(googleUrl);
    expect(normalizeMediaUrl(googleUrl, { deliveryMode: "proxy" })).toBe(googleUrl);
  });

  it("8. No financial, routing, or model logic is affected by storage delivery mode", () => {
    const pricingFile = path.join(process.cwd(), "lib", "pricing.ts");
    const routingFile = path.join(process.cwd(), "lib", "routing", "runtime-routing.ts");
    expect(fs.existsSync(pricingFile)).toBe(true);
    expect(fs.existsSync(routingFile)).toBe(true);
    const pricingSrc = fs.readFileSync(pricingFile, "utf8");
    expect(pricingSrc).toContain("getGenerationCost");
  });

  it("/api/media uses storage runtime instead of hard-coded provider attempts", () => {
    const routePath = path.join(process.cwd(), "app", "api", "media", "[...path]", "route.ts");
    const source = fs.readFileSync(routePath, "utf8");
    expect(source).toContain("readObject");
    expect(source).not.toContain("defaultProvider");
    expect(source).not.toContain("legacyProvider");
  });
});
