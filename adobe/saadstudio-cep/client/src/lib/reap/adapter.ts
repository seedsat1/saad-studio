import {
  api,
  reap,
  type ReapAudiogramTemplate,
  type ReapCaptionPreset,
  type ReapCatalogEntry,
  type ReapCatalogResponse,
  type ReapLanguageOption,
  type ReapReframeOption,
  type ReapStatusResponse,
  type ReapTool,
  type ReapVoiceOption,
} from "../api";

const CATALOG_TTL_MS = 60_000;

let catalogCache: {
  value: ReapCatalogResponse;
  expiresAt: number;
} | null = null;

async function getCatalog(force = false): Promise<ReapCatalogResponse> {
  if (!force && catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.value;
  }
  const value = await reap.catalog();
  catalogCache = {
    value,
    expiresAt: Date.now() + CATALOG_TTL_MS,
  };
  return value;
}

export const reapAdapter = {
  upload: reap.uploadDirect,
  startJob: reap.start,
  pollJob: reap.status,
  runJob: reap.run,
  downloadAsset: api.downloadAsset,
  refreshCatalog: () => getCatalog(true),
  getCatalog: () => getCatalog(false),
  listLanguages: async (): Promise<ReapCatalogEntry<ReapLanguageOption>> => (await getCatalog(false)).languages,
  listCaptionPresets: async (): Promise<ReapCatalogEntry<ReapCaptionPreset>> => (await getCatalog(false)).captionPresets,
  listBrandTemplates: async (): Promise<ReapCatalogEntry<ReapCaptionPreset>> => (await getCatalog(false)).brandTemplates,
  listVoices: async (): Promise<ReapCatalogEntry<ReapVoiceOption>> => (await getCatalog(false)).voices,
  listDubbingLanguages: async (): Promise<ReapCatalogEntry<ReapLanguageOption>> => (await getCatalog(false)).dubbingLanguages,
  listReframeOptions: async (): Promise<ReapCatalogEntry<ReapReframeOption>> => (await getCatalog(false)).reframeOptions,
  listAudiogramTemplates: async (): Promise<ReapCatalogEntry<ReapAudiogramTemplate>> => (await getCatalog(false)).audiogramTemplates,
  diagnostics: async () => (await getCatalog(false)).diagnostics,
};

export type ReapAdapter = typeof reapAdapter;
export type { ReapCatalogEntry, ReapStatusResponse, ReapTool };
