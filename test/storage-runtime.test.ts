import { describe, expect, it } from "vitest";
import type { StorageProvider } from "@/lib/storage/types";
import {
  createStorageRuntimeForTests,
  normalizeMediaUrl,
  resolveMediaObject,
  resolvePublicUrl,
} from "@/lib/storage/runtime";
import { validateActiveWriteProvider } from "@/lib/storage/provider-registry";
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

  it("does not convert external provider URLs into /api/media", () => {
    const external = "https://temporary.provider.example/audio/result.mp3";
    expect(resolveMediaObject(external)).toEqual({ kind: "external_provider_url", url: external });
    expect(normalizeMediaUrl(external)).toBe(external);
    expect(normalizeMediaUrl("audio/u/file.mp3")).toBe("/api/media/audio/u/file.mp3");
  });

  it("generates public URLs through provider abstraction modes", () => {
    expect(resolvePublicUrl("images", "u/file.png", { deliveryMode: "proxy" })).toBe("/api/media/images/u/file.png");
    expect(resolvePublicUrl("images", "u/file.png", { deliveryMode: "direct" })).toBe("/api/media/images/u/file.png");
    expect(resolvePublicUrl("images", "u/file.png", { deliveryMode: "direct", providerId: "backblaze" })).toContain("images/u/file.png");
  });

  it("/api/media uses storage runtime instead of hard-coded provider attempts", () => {
    const routePath = path.join(process.cwd(), "app", "api", "media", "[...path]", "route.ts");
    const source = fs.readFileSync(routePath, "utf8");
    expect(source).toContain("readObject");
    expect(source).not.toContain("defaultProvider");
    expect(source).not.toContain("legacyProvider");
  });
});
