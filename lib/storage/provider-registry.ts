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

/**
 * Whether the legacy Cloudflare R2 read path is available.
 *
 * The old body was `Boolean(R2_PUBLIC_URL || NEXT_PUBLIC_R2_PUBLIC_URL || true)`.
 * The trailing `|| true` made the whole expression a constant and both env
 * checks dead code, so the admin storage page and /api/health reported R2 as
 * "configured" on the strength of nothing. That misreporting is what is fixed
 * here: the dead checks are gone and the real condition is stated outright.
 *
 * The real condition is unconditional, and deliberately so. R2 in this codebase
 * is read-only access to a *public* bucket whose URL is a compile-time constant
 * in `R2Provider` (lib/storage/r2.ts) — no credential makes it work and no
 * missing credential makes it stop. `R2Provider.upload()` always throws, so it
 * can never be a write target.
 *
 * Gating it on `R2_PUBLIC_URL` instead would be actively harmful. That variable
 * is unset in production, so the predicate would become false,
 * `getStorageReadProvidersForConfig()` filters legacy providers on `configured`
 * (lib/storage/runtime.ts:266), R2 would drop out of the `readObject()` fallback
 * chain, and any user media that exists only in that bucket would stop being
 * served.
 *
 * To switch legacy reads off, use the `legacyReadEnabled` flag in the storage
 * runtime config (Admin → Storage). That is the control built for the job, it is
 * audited, and it does not depend on starving the process of an env var.
 */
export function isR2LegacyConfigured(): boolean {
  return true;
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
      // No error branch: the read endpoint is a built-in public URL, so there is
      // no credential whose absence could put this provider in a failed state.
      // A read that fails fails per-object, and readObject() records that in its
      // `attempts` list rather than here.
      lastError: null,
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
