import prismadb from "@/lib/prismadb";
import type { StorageProvider } from "./types";
import {
  findStorageProviderDefinition,
  getStorageProvider,
  getStorageProviderRegistry,
  isBackblazeConfigured,
  validateActiveWriteProvider,
  type StorageProviderId,
} from "./provider-registry";

export type StorageDeliveryMode = "proxy" | "direct";
export type StoredMediaKind = "owned_storage" | "external_provider_url" | "unknown";

export type StorageRuntimeConfig = {
  activeWriteProvider: StorageProviderId;
  activeProvider: StorageProviderId;
  mediaDeliveryMode: StorageDeliveryMode;
  legacyReadEnabled: boolean;
  updatedAt?: string | null;
};

export type StorageProviderDescriptor = {
  id: StorageProviderId;
  label: string;
  displayName: string;
  role: "active" | "legacy_read_only";
  configured: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  legacyReadOnly: boolean;
  status: "configured" | "unavailable" | "disabled";
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  publicBaseUrl: string | null;
  lastError: string | null;
};

export type ResolvedMediaObject =
  | {
      kind: "owned_storage";
      bucket: string;
      path: string;
      objectKey: string;
      source: "api_media" | "storage_key" | "storage_url";
    }
  | {
      kind: "external_provider_url";
      url: string;
    }
  | {
      kind: "unknown";
      value: string;
    };

export type StorageHeadResult = {
  providerId: StorageProviderId;
  found: boolean;
  error?: string;
};

export type StorageReadResult = {
  providerId: StorageProviderId;
  providerLabel: string;
  response: Awaited<ReturnType<StorageProvider["download"]>>;
  attempts: StorageHeadResult[];
};

export const STORAGE_RUNTIME_CONFIG_KEY = "storage_runtime_config_v1";

export const DEFAULT_STORAGE_RUNTIME_CONFIG: StorageRuntimeConfig = {
  activeWriteProvider: "backblaze",
  activeProvider: "backblaze",
  mediaDeliveryMode: "proxy",
  legacyReadEnabled: true,
};

type ProviderEntry = {
  id: StorageProviderId;
  label: string;
  provider: StorageProvider;
};

export function normalizeObjectPath(path: string): string {
  return String(path || "").replace(/^\/+/, "").replace(/\\/g, "/");
}

export function objectKeyFor(bucket: string, path: string): string {
  const cleanBucket = normalizeObjectPath(bucket);
  const cleanPath = normalizeObjectPath(path);
  return cleanBucket ? `${cleanBucket}/${cleanPath}` : cleanPath;
}

export function splitObjectKey(objectKey: string): { bucket: string; path: string } {
  const clean = normalizeObjectPath(objectKey);
  const match = clean.match(/^(images|videos|audio|thumbnails|media)\/(.+)$/i);
  if (match) return { bucket: match[1], path: match[2] };
  return { bucket: "", path: clean };
}

export function isKnownStorageHost(host: string): boolean {
  const lower = host.toLowerCase();
  return (
    lower.includes("backblazeb2.com") ||
    lower.includes("r2.dev") ||
    lower.includes("media.saadstudio.app") ||
    lower.includes("saadstudio-storage") ||
    lower.includes("saadstudio.app") ||
    lower.includes("localhost") ||
    lower.includes("127.0.0.1")
  );
}

export function resolveMediaObject(input: string | null | undefined): ResolvedMediaObject | null {
  const value = String(input || "").trim();
  if (!value) return null;
  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return { kind: "external_provider_url", url: value };
  }
  if (value.startsWith("task:") || value.startsWith("failed:") || value.startsWith("error:") || value.startsWith("text:")) {
    return { kind: "unknown", value };
  }

  let cleanValue = value.replace("/api/media/media/", "/api/media/");
  const apiMediaIndex = cleanValue.indexOf("/api/media/");
  if (apiMediaIndex !== -1) {
    const objectKey = normalizeObjectPath(cleanValue.slice(apiMediaIndex + "/api/media/".length));
    const { bucket, path } = splitObjectKey(objectKey);
    return { kind: "owned_storage", bucket, path, objectKey, source: "api_media" };
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    try {
      const parsed = new URL(cleanValue);
      if (!isKnownStorageHost(parsed.host)) {
        return { kind: "external_provider_url", url: cleanValue };
      }

      if (parsed.host === "f003.backblazeb2.com" && parsed.pathname.startsWith("/file/saadstudio-storage/")) {
        const objectKey = normalizeObjectPath(parsed.pathname.slice("/file/saadstudio-storage/".length));
        const { bucket, path } = splitObjectKey(objectKey);
        return { kind: "owned_storage", bucket, path, objectKey, source: "storage_url" };
      }

      const objectKey = normalizeObjectPath(parsed.pathname);
      const { bucket, path } = splitObjectKey(objectKey);
      if (bucket || /^(images|videos|audio|thumbnails|media)\//i.test(objectKey)) {
        return { kind: "owned_storage", bucket, path, objectKey: objectKeyFor(bucket, path), source: "storage_url" };
      }
      return { kind: "unknown", value };
    } catch {
      return { kind: "unknown", value };
    }
  }

  const relativeMatch = cleanValue.match(/^\/?(images|videos|audio|thumbnails|media)\/(.+)$/i);
  if (relativeMatch) {
    const bucket = relativeMatch[1];
    const path = relativeMatch[2];
    return { kind: "owned_storage", bucket, path, objectKey: objectKeyFor(bucket, path), source: "storage_key" };
  }

  // Handle bare filenames from uploaders (e.g. 1779051100463_46mikg.webp)
  if (!cleanValue.includes("/") && !cleanValue.includes(":") && /\.(webp|png|jpg|jpeg|gif|mp4|webm|mp3|wav|ogg|bin)$/i.test(cleanValue)) {
    const bucket = bucketForAssetType(cleanValue);
    return { kind: "owned_storage", bucket, path: cleanValue, objectKey: objectKeyFor(bucket, cleanValue), source: "storage_key" };
  }

  return { kind: "unknown", value };
}

export async function readStorageRuntimeConfig(): Promise<StorageRuntimeConfig> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key: STORAGE_RUNTIME_CONFIG_KEY } });
    if (!row?.value) return { ...DEFAULT_STORAGE_RUNTIME_CONFIG };
    const parsed = JSON.parse(row.value);
    return normalizeStoragePolicyForRuntime(sanitizeStorageRuntimeConfig(parsed));
  } catch {
    return { ...DEFAULT_STORAGE_RUNTIME_CONFIG };
  }
}

export async function writeStorageRuntimeConfig(input: Partial<StorageRuntimeConfig>): Promise<StorageRuntimeConfig> {
  const current = await readStorageRuntimeConfig();
  const next = sanitizeStorageRuntimeConfig({ ...current, ...input, updatedAt: new Date().toISOString() });
  const validation = validateActiveWriteProvider(next.activeWriteProvider);
  if (!validation.ok) throw new Error(validation.error);
  await prismadb.platformConfig.upsert({
    where: { key: STORAGE_RUNTIME_CONFIG_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: STORAGE_RUNTIME_CONFIG_KEY, value: JSON.stringify(next) },
  });
  return next;
}

export function sanitizeStorageRuntimeConfig(input: unknown): StorageRuntimeConfig {
  const value = (input && typeof input === "object" ? input : {}) as Partial<StorageRuntimeConfig>;
  const requestedProvider = value.activeWriteProvider ?? value.activeProvider ?? "backblaze";
  const activeWriteProvider: StorageProviderId = findStorageProviderDefinition(requestedProvider) ? requestedProvider : "backblaze";
  const mediaDeliveryMode: StorageDeliveryMode = value.mediaDeliveryMode === "direct" ? "direct" : "proxy";
  return {
    activeWriteProvider,
    activeProvider: activeWriteProvider,
    mediaDeliveryMode,
    legacyReadEnabled: value.legacyReadEnabled !== false,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

function normalizeStoragePolicyForRuntime(config: StorageRuntimeConfig): StorageRuntimeConfig {
  const validation = validateActiveWriteProvider(config.activeWriteProvider);
  if (validation.ok) return config;
  console.warn(
    `[storage-runtime] Invalid activeWriteProvider "${config.activeWriteProvider}" in stored policy; using Backblaze fallback. Reason: ${validation.error}`,
  );
  return {
    ...config,
    activeWriteProvider: DEFAULT_STORAGE_RUNTIME_CONFIG.activeWriteProvider,
    activeProvider: DEFAULT_STORAGE_RUNTIME_CONFIG.activeWriteProvider,
  };
}

export async function getActiveStorageProvider(): Promise<ProviderEntry> {
  const config = await readStorageRuntimeConfig();
  return providerEntry(config.activeWriteProvider);
}

export async function getStorageReadProviders(): Promise<ProviderEntry[]> {
  const config = await readStorageRuntimeConfig();
  return getStorageReadProvidersForConfig(config);
}

export function getStorageReadProvidersForConfig(config: StorageRuntimeConfig): ProviderEntry[] {
  const providers = [providerEntry(config.activeWriteProvider)];
  if (config.legacyReadEnabled) {
    for (const definition of getStorageProviderRegistry()) {
      if (definition.id === config.activeWriteProvider) continue;
      if (!definition.configured || !definition.readEnabled) continue;
      if (definition.legacyReadOnly || definition.id === "backblaze") {
        providers.push(providerEntry(definition.id));
      }
    }
  }
  return providers;
}

function providerEntry(id: StorageProviderId): ProviderEntry {
  const definition = findStorageProviderDefinition(id);
  return {
    id,
    label: definition?.displayName ?? id,
    provider: getStorageProvider(id),
  };
}

export function getStorageProviderDescriptors(config: StorageRuntimeConfig): StorageProviderDescriptor[] {
  return getStorageProviderRegistry().map((provider) => ({
    id: provider.id,
    label: provider.displayName,
    displayName: provider.displayName,
    role: config.activeWriteProvider === provider.id ? "active" : "legacy_read_only",
    configured: provider.configured,
    readEnabled: provider.readEnabled && (provider.id === config.activeWriteProvider || config.legacyReadEnabled),
    writeEnabled: provider.writeEnabled,
    legacyReadOnly: provider.legacyReadOnly,
    status: provider.status,
    bucket: provider.bucket,
    region: provider.region,
    endpoint: provider.endpoint,
    publicBaseUrl: provider.publicBaseUrl,
    lastError: provider.id !== config.activeWriteProvider && !config.legacyReadEnabled ? "Legacy reads disabled by storage policy." : provider.lastError,
  }));
}

export async function putObject(params: {
  bucket: string;
  path: string;
  body: Buffer | Uint8Array | string | Blob;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const active = await getActiveStorageProvider();
  await active.provider.upload(params);
  return objectKeyFor(params.bucket, params.path);
}

export async function uploadBuffer(params: {
  buffer: Buffer | ArrayBuffer;
  contentType: string;
  userId: string;
  assetType: string;
  generationId: string;
  fileName?: string;
}): Promise<string | null> {
  try {
    const bucket = bucketForAssetType(params.assetType);
    const ext = params.fileName ? `.${params.fileName.split(".").pop()}` : extensionFromContentType(params.contentType);
    const path = `${params.userId}/${params.generationId}${ext}`;
    const body = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);
    return await putObject({
      bucket,
      path,
      body,
      contentType: params.contentType,
      cacheControl: "public, max-age=2592000, immutable",
    });
  } catch (error) {
    console.error("[storage-runtime] uploadBuffer failed:", error);
    return null;
  }
}

export async function uploadFromUrl(params: {
  remoteUrl: string;
  userId: string;
  assetType: string;
  generationId: string;
}): Promise<string | null> {
  const { remoteUrl, userId, assetType, generationId } = params;
  if (!remoteUrl.startsWith("http://") && !remoteUrl.startsWith("https://")) return null;
  try {
    const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    const bucket = bucketForAssetType(assetType);
    const ext = extensionFromContentType(contentType);
    const path = `${userId}/${generationId}${ext}`;
    return await putObject({
      bucket,
      path,
      body: buffer,
      contentType,
      cacheControl: "public, max-age=2592000, immutable",
    });
  } catch (error) {
    console.error("[storage-runtime] uploadFromUrl failed:", error);
    return null;
  }
}

export async function createSignedUploadUrl(params: {
  bucket: string;
  path: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
  const active = await getActiveStorageProvider();
  const result = await active.provider.createSignedUploadUrl(params);
  return {
    signedUrl: result.signedUrl,
    publicUrl: resolvePublicUrl(params.bucket, params.path, { deliveryMode: "proxy" }),
    key: objectKeyFor(params.bucket, params.path),
  };
}

export async function deleteObject(params: { bucket: string; path: string }): Promise<void> {
  const active = await getActiveStorageProvider();
  await active.provider.delete(params);
}

export async function readObject(params: { objectKey: string; range?: string }): Promise<StorageReadResult | null> {
  const providers = await getStorageReadProviders();
  const attempts: StorageHeadResult[] = [];
  const rawKey = params.objectKey.replace(/^\/+/, "");
  const candidates = [rawKey];
  const prefixMatch = rawKey.match(/^(images|videos|audio|thumbnails|media)\/(.+)$/i);
  if (prefixMatch) {
    candidates.push(prefixMatch[2]);
  } else {
    candidates.push(`images/${rawKey}`);
    candidates.push(`videos/${rawKey}`);
  }

  for (const entry of providers) {
    for (const keyToTry of candidates) {
      try {
        const found = await entry.provider.exists({ bucket: "", path: keyToTry });
        attempts.push({ providerId: entry.id, found });
        if (found) {
          const response = await entry.provider.download({ bucket: "", path: keyToTry, range: params.range });
          return { providerId: entry.id, providerLabel: entry.label, response, attempts };
        }
      } catch (error) {
        attempts.push({ providerId: entry.id, found: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  return null;
}

export async function headObject(params: { objectKey: string }): Promise<StorageHeadResult[]> {
  const providers = await getStorageReadProviders();
  const attempts: StorageHeadResult[] = [];
  const rawKey = params.objectKey.replace(/^\/+/, "");
  const candidates = [rawKey];
  const prefixMatch = rawKey.match(/^(images|videos|audio|thumbnails|media)\/(.+)$/i);
  if (prefixMatch) {
    candidates.push(prefixMatch[2]);
  } else {
    candidates.push(`images/${rawKey}`);
    candidates.push(`videos/${rawKey}`);
  }

  for (const entry of providers) {
    for (const keyToTry of candidates) {
      try {
        const found = await entry.provider.exists({ bucket: "", path: keyToTry });
        attempts.push({ providerId: entry.id, found });
        if (found) return attempts;
      } catch (error) {
        attempts.push({ providerId: entry.id, found: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  return attempts;
}

export function resolvePublicUrl(
  bucket: string,
  path: string,
  options: { deliveryMode?: StorageDeliveryMode; providerId?: StorageProviderId } = {},
): string {
  const deliveryMode = options.deliveryMode ?? DEFAULT_STORAGE_RUNTIME_CONFIG.mediaDeliveryMode;
  const key = objectKeyFor(bucket, path);
  if (deliveryMode === "proxy" || !options.providerId) return `/api/media/${key}`;
  return getStorageProvider(options.providerId).getPublicUrl(bucket, path);
}

export async function resolveProviderPublicUrl(bucket: string, path: string): Promise<string> {
  const active = await getActiveStorageProvider();
  return active.provider.getPublicUrl(bucket, path);
}

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  const resolved = resolveMediaObject(url);
  if (!resolved) return null;
  if (resolved.kind === "owned_storage") return `/api/media/${resolved.objectKey}`;
  if (resolved.kind === "external_provider_url") return resolved.url;
  return resolved.value;
}

export function isStoredAssetUrl(url: string): boolean {
  const resolved = resolveMediaObject(url);
  return resolved?.kind === "owned_storage";
}

export function bucketForAssetType(assetType: string): string {
  const type = assetType.toLowerCase();
  if (type.includes("video") || type.includes("cinema") || type.includes("transition")) return "videos";
  if (type.includes("audio") || type.includes("music")) return "audio";
  if (type.includes("thumbnail")) return "thumbnails";
  return "images";
}

export function extensionFromContentType(ct: string): string {
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("mp4")) return ".mp4";
  if (ct.includes("webm")) return ".webm";
  if (ct.includes("mp3") || ct.includes("mpeg")) return ".mp3";
  if (ct.includes("wav")) return ".wav";
  if (ct.includes("ogg")) return ".ogg";
  if (ct.includes("pdf")) return ".pdf";
  if (ct.includes("json")) return ".json";
  return ".bin";
}

export function createStorageRuntimeForTests(input: {
  config: StorageRuntimeConfig;
  providers: Record<string, StorageProvider>;
  legacyReadProviderIds?: StorageProviderId[];
}) {
  const active = () => ({
    id: input.config.activeWriteProvider,
    label: input.config.activeWriteProvider,
    provider: input.providers[input.config.activeWriteProvider],
  });
  const readers = () => {
    const list = [active()];
    if (input.config.legacyReadEnabled) {
      for (const id of input.legacyReadProviderIds ?? ["r2"]) {
        if (id !== input.config.activeWriteProvider && input.providers[id]) {
          list.push({ id, label: id, provider: input.providers[id] });
        }
      }
    }
    return list;
  };
  return {
    async putObject(params: Parameters<StorageProvider["upload"]>[0]) {
      await active().provider.upload(params);
      return objectKeyFor(params.bucket, params.path);
    },
    async uploadBuffer(params: {
      buffer: Buffer | ArrayBuffer;
      contentType: string;
      userId: string;
      assetType: string;
      generationId: string;
      fileName?: string;
    }) {
      const bucket = bucketForAssetType(params.assetType);
      const ext = params.fileName ? `.${params.fileName.split(".").pop()}` : extensionFromContentType(params.contentType);
      const path = `${params.userId}/${params.generationId}${ext}`;
      await active().provider.upload({
        bucket,
        path,
        body: Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer),
        contentType: params.contentType,
        cacheControl: "public, max-age=2592000, immutable",
      });
      return objectKeyFor(bucket, path);
    },
    async readObject(params: { objectKey: string }) {
      for (const entry of readers()) {
        if (await entry.provider.exists({ bucket: "", path: params.objectKey })) return entry.id;
      }
      return null;
    },
  };
}
