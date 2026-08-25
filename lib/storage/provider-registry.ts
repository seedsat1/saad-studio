import { BackblazeProvider } from "./backblaze";
import { R2Provider } from "./r2";
import { SupabaseStorageProvider } from "./supabase";
import type { StorageProvider } from "./types";

export type StorageProviderId = "backblaze" | "r2" | "supabase" | (string & {});
export type StorageProviderStatus = "configured" | "unavailable" | "disabled";

export type StorageProviderDefinition = {
  id: StorageProviderId;
  displayName: string;
  provider: StorageProvider;
  configured: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  legacyReadOnly: boolean;
  status: StorageProviderStatus;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  publicBaseUrl: string | null;
  lastError: string | null;
};

const providerSingletons: Record<string, StorageProvider> = {
  backblaze: new BackblazeProvider(),
  r2: new R2Provider(),
  supabase: new SupabaseStorageProvider(),
};

export function isBackblazeConfigured(): boolean {
  return Boolean(
    process.env.B2_ACCESS_KEY_ID &&
      process.env.B2_SECRET_ACCESS_KEY &&
      (process.env.B2_BUCKET || process.env.B2_BUCKET_NAME),
  );
}

export function isR2LegacyConfigured(): boolean {
  return Boolean(process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || true);
}

export function getStorageProvider(id: StorageProviderId): StorageProvider {
  const provider = providerSingletons[id];
  if (!provider) throw new Error(`Unknown storage provider: ${id}`);
  return provider;
}

export function getStorageProviderRegistry(): StorageProviderDefinition[] {
  const backblazeConfigured = isBackblazeConfigured();
  const r2Configured = isR2LegacyConfigured();

  return [
    {
      id: "backblaze",
      displayName: "Backblaze B2",
      provider: getStorageProvider("backblaze"),
      configured: backblazeConfigured,
      readEnabled: backblazeConfigured,
      writeEnabled: backblazeConfigured,
      legacyReadOnly: false,
      status: backblazeConfigured ? "configured" : "unavailable",
      bucket: process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || "saadstudio-storage",
      region: process.env.B2_REGION || "eu-central-003",
      endpoint: safeEndpoint(process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com"),
      publicBaseUrl: safeEndpoint(
        process.env.B2_PUBLIC_URL ||
          process.env.B2_PUBLIC_BASE_URL ||
          process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL ||
          process.env.NEXT_PUBLIC_B2_PUBLIC_URL ||
          "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com",
      ),
      lastError: backblazeConfigured ? null : "Missing Backblaze B2 storage credentials or bucket.",
    },
    {
      id: "r2",
      displayName: "Cloudflare R2 Legacy",
      provider: getStorageProvider("r2"),
      configured: r2Configured,
      readEnabled: r2Configured,
      writeEnabled: false,
      legacyReadOnly: true,
      status: r2Configured ? "configured" : "unavailable",
      bucket: null,
      region: null,
      endpoint: "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev",
      publicBaseUrl: "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev",
      lastError: r2Configured ? null : "Legacy R2 public read endpoint is not configured.",
    },
    {
      id: "supabase",
      displayName: "Supabase Storage Legacy",
      provider: getStorageProvider("supabase"),
      configured: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      readEnabled: true,
      writeEnabled: false,
      legacyReadOnly: true,
      status: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ? "configured" : "unavailable",
      bucket: "images",
      region: null,
      endpoint: safeEndpoint(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      publicBaseUrl: safeEndpoint(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      lastError: null,
    },
  ];
}

export function findStorageProviderDefinition(id: StorageProviderId): StorageProviderDefinition | null {
  return getStorageProviderRegistry().find((provider) => provider.id === id) ?? null;
}

export function getWritableStorageProviders(): StorageProviderDefinition[] {
  return getStorageProviderRegistry().filter((provider) => provider.configured && provider.writeEnabled);
}

export function validateActiveWriteProvider(id: StorageProviderId): { ok: true } | { ok: false; error: string } {
  const provider = findStorageProviderDefinition(id);
  if (!provider) return { ok: false, error: `Unknown storage provider: ${id}` };
  if (!provider.configured) return { ok: false, error: `${provider.displayName} is not configured.` };
  if (!provider.writeEnabled) return { ok: false, error: `${provider.displayName} is not write-enabled.` };
  if (provider.legacyReadOnly) return { ok: false, error: `${provider.displayName} is legacy read-only.` };
  return { ok: true };
}

function safeEndpoint(value: string | undefined): string | null {
  const clean = String(value || "").trim();
  if (!clean) return null;
  try {
    const url = new URL(clean);
    return `${url.protocol}//${url.host}`;
  } catch {
    return clean.replace(/[?#].*$/, "");
  }
}
