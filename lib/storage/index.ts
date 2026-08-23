export * from "./types";
import { getStorageProvider } from "./provider-registry";
import type { StorageProvider } from "./types";
import {
  deleteObject,
  getActiveStorageProvider,
  headObject,
  objectKeyFor,
  readObject,
  resolvePublicUrl,
} from "./runtime";

export const defaultProvider: StorageProvider = {
  async upload(params) {
    const active = await getActiveStorageProvider();
    return active.provider.upload(params);
  },
  async download(params) {
    const read = await readObject({ objectKey: objectKeyFor(params.bucket, params.path), range: params.range });
    if (!read) throw new Error(`Storage object not found: ${objectKeyFor(params.bucket, params.path)}`);
    return read.response;
  },
  async delete(params) {
    await deleteObject(params);
  },
  async exists(params) {
    const attempts = await headObject({ objectKey: objectKeyFor(params.bucket, params.path) });
    return attempts.some((attempt) => attempt.found);
  },
  getPublicUrl(bucket, path) {
    return resolvePublicUrl(bucket, path);
  },
  isStoredAssetUrl(url) {
    return Boolean(url && (url.includes("/api/media/") || url.includes("backblazeb2.com") || url.includes("r2.dev") || url.includes("saadstudio-storage")));
  },
  async createSignedUploadUrl(params) {
    const active = await getActiveStorageProvider();
    const signed = await active.provider.createSignedUploadUrl(params);
    return {
      ...signed,
      publicUrl: resolvePublicUrl(params.bucket, params.path),
      key: objectKeyFor(params.bucket, params.path),
    };
  },
};
export const legacyProvider = getStorageProvider("r2");

export {
  DEFAULT_STORAGE_RUNTIME_CONFIG,
  STORAGE_RUNTIME_CONFIG_KEY,
  bucketForAssetType,
  createSignedUploadUrl,
  deleteObject,
  getActiveStorageProvider,
  getStorageProviderDescriptors,
  getStorageReadProvidersForConfig,
  getStorageReadProviders,
  getStorageRuntimeConfigSync,
  setStorageRuntimeConfigCache,
  headObject,
  isStoredAssetUrl,
  normalizeMediaUrl,
  objectKeyFor,
  putObject,
  readObject,
  readStorageRuntimeConfig,
  resolveMediaObject,
  resolveProviderPublicUrl,
  resolvePublicUrl,
  sanitizeStorageRuntimeConfig,
  splitObjectKey,
  uploadBuffer,
  uploadFromUrl,
  writeStorageRuntimeConfig,
  extensionFromContentType,
  type ResolvedMediaObject,
  type StorageDeliveryMode,
  type StorageProviderDescriptor,
  type StorageRuntimeConfig,
} from "./runtime";

export {
  findStorageProviderDefinition,
  getStorageProvider,
  getStorageProviderRegistry,
  getWritableStorageProviders,
  isBackblazeConfigured,
  validateActiveWriteProvider,
  type StorageProviderDefinition,
  type StorageProviderId,
  type StorageProviderStatus,
} from "./provider-registry";

export {
  STORAGE_RUNTIME_AUDIT_LOG_KEY,
  StorageConcurrencyError,
  getStorageRuntimeVersionToken,
  loadStorageAuditLog,
  validateStoragePolicyInput,
  saveStorageRuntimeConfigAtomic,
  type StorageFieldChange,
  type StorageRuntimeAuditEvent,
} from "./storage-hardening";
