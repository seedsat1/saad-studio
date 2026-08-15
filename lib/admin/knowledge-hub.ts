import { createHash, randomUUID } from "crypto";

import { getDynamicImageModels, getDynamicVideoModels, saveDynamicImageModels, saveDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { buildCentralModelDefinitions, getModelDefinitionFromList, type CentralModelDefinition } from "@/lib/model-definition-registry";
import prismadb from "@/lib/prismadb";

export const KNOWLEDGE_STORE_KEY = "knowledge_hub_v1";

export const KNOWLEDGE_PROVIDERS = [
  "google",
  "openai",
  "wavespeed",
  "byteplus",
  "kie",
  "elevenlabs",
  "reap",
  "runninghub",
  "custom",
] as const;

export const KNOWLEDGE_SOURCE_TYPES = ["url", "pasted_text", "markdown", "json"] as const;
export const KNOWLEDGE_DOCUMENT_STATUSES = ["imported", "parse_failed", "needs_review", "approved", "rejected", "outdated"] as const;

export type KnowledgeProvider = (typeof KNOWLEDGE_PROVIDERS)[number];
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];
export type KnowledgeDocumentStatus = (typeof KNOWLEDGE_DOCUMENT_STATUSES)[number];

export type KnowledgeSource = {
  id: string;
  provider: KnowledgeProvider;
  name: string;
  sourceType: KnowledgeSourceType;
  url: string | null;
  status: "active" | "import_failed" | "needs_review";
  lastImportedAt: string | null;
  lastCheckedAt: string | null;
  contentHash: string | null;
  version: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeDocument = {
  id: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  rawContent: string;
  normalizedText: string;
  importedAt: string;
  contentHash: string;
  status: KnowledgeDocumentStatus;
};

export type KnowledgeDraftField = {
  key: string;
  value: string;
  confidence: "low" | "medium" | "high";
  provenance: {
    sourceUrl: string | null;
    documentId: string;
    section: string | null;
  };
};

export type KnowledgeDraft = {
  id: string;
  sourceId: string;
  documentId: string;
  provider: KnowledgeProvider;
  status: "draft" | "approved" | "rejected";
  extractedAt: string;
  reviewedAt: string | null;
  fields: KnowledgeDraftField[];
  notes: string | null;
};

export type KnowledgeModelChangeField = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  provenance: KnowledgeDraftField["provenance"] & {
    approvedAt: string | null;
  };
};

export type KnowledgeModelChange = {
  id: string;
  draftId: string;
  documentId: string;
  modelId: string;
  status: "proposed" | "published" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  fields: KnowledgeModelChangeField[];
};

export type KnowledgeStore = {
  version: 1;
  sources: KnowledgeSource[];
  documents: KnowledgeDocument[];
  drafts: KnowledgeDraft[];
  modelChanges: KnowledgeModelChange[];
  updatedAt: string | null;
};

export type KnowledgeHubSummary = {
  sources: number;
  documents: number;
  drafts: number;
  approvedKnowledge: number;
  rejectedDrafts: number;
  importErrors: number;
  providers: Record<KnowledgeProvider, number>;
  proposedModelChanges: number;
  publishedModelChanges: number;
};

export type KnowledgeHubResult = KnowledgeStore & {
  ok: boolean;
  databaseAvailable: boolean;
  summary: KnowledgeHubSummary;
  error?: string;
};

export type KnowledgeImportInput = {
  provider: KnowledgeProvider;
  url: string;
  name?: string | null;
};

export type KnowledgeImportedPage = {
  url: string;
  finalUrl?: string | null;
  title?: string | null;
  contentType?: string | null;
  rawContent: string;
};

const MAX_IMPORTED_CHARS = 240_000;

export function emptyKnowledgeStore(): KnowledgeStore {
  return {
    version: 1,
    sources: [],
    documents: [],
    drafts: [],
    modelChanges: [],
    updatedAt: null,
  };
}

export async function loadKnowledgeHub(): Promise<KnowledgeHubResult> {
  try {
    const row = await prismadb.platformConfig.findUnique({ where: { key: KNOWLEDGE_STORE_KEY } });
    const store = parseKnowledgeStore(row?.value);
    return {
      ok: true,
      databaseAvailable: true,
      ...store,
      summary: summarizeKnowledgeStore(store),
    };
  } catch (error) {
    const store = emptyKnowledgeStore();
    return {
      ok: false,
      databaseAvailable: false,
      ...store,
      summary: summarizeKnowledgeStore(store),
      error: error instanceof Error ? error.message : "Unable to load Knowledge Hub.",
    };
  }
}

export async function importKnowledgeUrl(input: KnowledgeImportInput): Promise<KnowledgeHubResult> {
  const provider = normalizeKnowledgeProvider(input.provider);
  const url = normalizeImportUrl(input.url);
  const page = await fetchKnowledgePage(url);
  const store = await readWritableKnowledgeStore();
  const next = createKnowledgeImportFromContent(store, {
    provider,
    sourceName: input.name || page.title || providerLabel(provider),
    page,
  });
  await writeKnowledgeStore(next);
  return {
    ok: true,
    databaseAvailable: true,
    ...next,
    summary: summarizeKnowledgeStore(next),
  };
}

export async function reviewKnowledgeDraft(draftId: string, status: "approved" | "rejected"): Promise<KnowledgeHubResult> {
  const store = await readWritableKnowledgeStore();
  const now = new Date().toISOString();
  const next: KnowledgeStore = {
    ...store,
    drafts: store.drafts.map((draft) =>
      draft.id === draftId
        ? {
            ...draft,
            status,
            reviewedAt: now,
          }
        : draft,
    ),
    documents: store.documents.map((document) => {
      const draft = store.drafts.find((item) => item.id === draftId);
      if (!draft || draft.documentId !== document.id) return document;
      return { ...document, status: status === "approved" ? "approved" : "rejected" };
    }),
    updatedAt: now,
  };
  await writeKnowledgeStore(next);
  return {
    ok: true,
    databaseAvailable: true,
    ...next,
    summary: summarizeKnowledgeStore(next),
  };
}

export async function proposeModelChangeFromKnowledge(draftId: string, modelId?: string | null): Promise<KnowledgeHubResult> {
  const store = await readWritableKnowledgeStore();
  const draft = store.drafts.find((item) => item.id === draftId);
  if (!draft) throw new Error("Knowledge draft not found.");
  if (draft.status !== "approved") throw new Error("Only approved Knowledge can propose model changes.");

  const [imageModels, videoModels] = await Promise.all([getDynamicImageModels(), getDynamicVideoModels()]);
  const definitions = buildCentralModelDefinitions({ imageModels, videoModels });
  const targetModelId = modelId?.trim() || inferDraftModelId(draft, definitions);
  if (!targetModelId) throw new Error("Unable to infer target modelId. Select a model before proposing changes.");
  const current = getModelDefinitionFromList(targetModelId, definitions);
  if (!current) throw new Error(`Model definition not found for ${targetModelId}.`);

  const fields = buildKnowledgeModelChangeFields(draft, current);
  if (!fields.length) throw new Error("No supported model definition changes were extracted from this Knowledge draft.");

  const now = new Date().toISOString();
  const change: KnowledgeModelChange = {
    id: randomUUID(),
    draftId,
    documentId: draft.documentId,
    modelId: current.modelId,
    status: "proposed",
    createdAt: now,
    reviewedAt: null,
    publishedAt: null,
    fields,
  };

  const next: KnowledgeStore = {
    ...store,
    modelChanges: [change, ...store.modelChanges],
    updatedAt: now,
  };
  await writeKnowledgeStore(next);
  return { ok: true, databaseAvailable: true, ...next, summary: summarizeKnowledgeStore(next) };
}

export async function reviewKnowledgeModelChange(changeId: string, status: "rejected" | "published"): Promise<KnowledgeHubResult> {
  if (status === "rejected") {
    const store = await readWritableKnowledgeStore();
    const now = new Date().toISOString();
    const next: KnowledgeStore = {
      ...store,
      modelChanges: store.modelChanges.map((change) =>
        change.id === changeId ? { ...change, status: "rejected", reviewedAt: now } : change,
      ),
      updatedAt: now,
    };
    await writeKnowledgeStore(next);
    return { ok: true, databaseAvailable: true, ...next, summary: summarizeKnowledgeStore(next) };
  }

  return publishKnowledgeModelChange(changeId);
}

export function createKnowledgeImportFromContent(
  store: KnowledgeStore,
  input: {
    provider: KnowledgeProvider;
    sourceName: string;
    page: KnowledgeImportedPage;
  },
): KnowledgeStore {
  const now = new Date().toISOString();
  const normalizedText = normalizeKnowledgeText(input.page.rawContent, input.page.contentType);
  const rawContent = trimImportedContent(input.page.rawContent);
  const contentHash = hashContent(normalizedText || rawContent);
  const sourceUrl = input.page.finalUrl || input.page.url;
  const existingSource = store.sources.find((source) => source.url === sourceUrl && source.provider === input.provider);
  const sourceId = existingSource?.id ?? randomUUID();
  const documentId = randomUUID();
  const source: KnowledgeSource = {
    id: sourceId,
    provider: input.provider,
    name: input.sourceName.trim() || providerLabel(input.provider),
    sourceType: "url",
    url: sourceUrl,
    status: normalizedText ? "active" : "needs_review",
    lastImportedAt: now,
    lastCheckedAt: now,
    contentHash,
    version: contentHash.slice(0, 12),
    error: null,
    createdAt: existingSource?.createdAt ?? now,
    updatedAt: now,
  };
  const document: KnowledgeDocument = {
    id: documentId,
    sourceId,
    sourceUrl,
    title: input.page.title || inferTitle(normalizedText) || input.sourceName || sourceUrl,
    rawContent,
    normalizedText,
    importedAt: now,
    contentHash,
    status: normalizedText ? "imported" : "parse_failed",
  };
  const draft: KnowledgeDraft = {
    id: randomUUID(),
    sourceId,
    documentId,
    provider: input.provider,
    status: "draft",
    extractedAt: now,
    reviewedAt: null,
    fields: extractDraftFields(document, input.provider),
    notes: null,
  };

  return {
    version: 1,
    sources: [source, ...store.sources.filter((item) => item.id !== sourceId)],
    documents: [document, ...store.documents],
    drafts: [draft, ...store.drafts],
    modelChanges: store.modelChanges ?? [],
    updatedAt: now,
  };
}

export function summarizeKnowledgeStore(store: KnowledgeStore): KnowledgeHubSummary {
  const providers = Object.fromEntries(KNOWLEDGE_PROVIDERS.map((provider) => [provider, 0])) as Record<KnowledgeProvider, number>;
  for (const source of store.sources) providers[source.provider] += 1;
  return {
    sources: store.sources.length,
    documents: store.documents.length,
    drafts: store.drafts.filter((draft) => draft.status === "draft").length,
    approvedKnowledge: store.drafts.filter((draft) => draft.status === "approved").length,
    rejectedDrafts: store.drafts.filter((draft) => draft.status === "rejected").length,
    importErrors: store.sources.filter((source) => source.status === "import_failed").length,
    providers,
    proposedModelChanges: store.modelChanges.filter((change) => change.status === "proposed").length,
    publishedModelChanges: store.modelChanges.filter((change) => change.status === "published").length,
  };
}

export function normalizeKnowledgeProvider(value: unknown): KnowledgeProvider {
  const text = String(value ?? "").toLowerCase().trim();
  return KNOWLEDGE_PROVIDERS.includes(text as KnowledgeProvider) ? (text as KnowledgeProvider) : "custom";
}

export function normalizeImportUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Only HTTP/HTTPS URLs are allowed.");
  if (isBlockedHost(url.hostname)) throw new Error("Private, localhost, and link-local hosts are not allowed.");
  url.hash = "";
  return url.toString();
}

function parseKnowledgeStore(value: string | null | undefined): KnowledgeStore {
  if (!value) return emptyKnowledgeStore();
  try {
    const parsed = JSON.parse(value);
    return {
      version: 1,
      sources: Array.isArray(parsed?.sources) ? parsed.sources : [],
      documents: Array.isArray(parsed?.documents) ? parsed.documents : [],
      drafts: Array.isArray(parsed?.drafts) ? parsed.drafts : [],
      modelChanges: Array.isArray(parsed?.modelChanges) ? parsed.modelChanges : [],
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return emptyKnowledgeStore();
  }
}

async function readWritableKnowledgeStore(): Promise<KnowledgeStore> {
  const result = await loadKnowledgeHub();
  if (!result.databaseAvailable) throw new Error("Cannot write Knowledge Hub: database is unavailable.");
  return {
    version: 1,
    sources: result.sources,
    documents: result.documents,
    drafts: result.drafts,
    modelChanges: result.modelChanges,
    updatedAt: result.updatedAt,
  };
}

function inferDraftModelId(draft: KnowledgeDraft, definitions: CentralModelDefinition[]): string | null {
  const modelFields = draft.fields.filter((field) => field.key === "model_id" || field.key === "endpoint");
  for (const field of modelFields) {
    const value = field.value.trim();
    const match = getModelDefinitionFromList(value, definitions);
    if (match) return match.modelId;
  }
  return null;
}

function firstField(draft: KnowledgeDraft, key: string): KnowledgeDraftField | null {
  return draft.fields.find((field) => field.key === key) ?? null;
}

function valuesFromDraft(draft: KnowledgeDraft, pattern: RegExp): KnowledgeDraftField[] {
  return draft.fields.filter((field) => pattern.test(field.value));
}

function distinctStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseOptions(text: string, regex: RegExp): string[] {
  const matches = Array.from(text.matchAll(regex)).map((match) => match[1] || match[0]);
  return distinctStrings(matches.map((value) => value.toLowerCase()));
}

function buildKnowledgeModelChangeFields(draft: KnowledgeDraft, current: CentralModelDefinition): KnowledgeModelChangeField[] {
  const fields: KnowledgeModelChangeField[] = [];
  const approvedAt = draft.reviewedAt;
  const add = (field: string, oldValue: unknown, newValue: unknown, provenance: KnowledgeDraftField["provenance"]) => {
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
    fields.push({ field, oldValue, newValue, provenance: { ...provenance, approvedAt } });
  };

  const modelField = firstField(draft, "model_id");
  if (modelField && modelField.value !== current.sourceModelId) {
    add("sourceModelId", current.sourceModelId, modelField.value, modelField.provenance);
  }

  const endpointField = firstField(draft, "endpoint");
  if (endpointField && endpointField.value !== current.sourceModelId) {
    add("sourceModelId", current.sourceModelId, endpointField.value, endpointField.provenance);
  }

  const parameterFields = valuesFromDraft(draft, /\b(resolution|quality|aspect|duration|reference)\b/i);
  for (const field of parameterFields) {
    const text = field.value;
    const resolutions = parseOptions(text, /\b(480p|720p|768p|1080p|2k|4k|8k|standard|pro)\b/gi);
    if (resolutions.length) {
      const currentOptions = parameterOptions(current, "resolution").map(String);
      add("parameters.resolution.options", currentOptions, distinctStrings([...currentOptions, ...resolutions]), field.provenance);
    }

    const durations = Array.from(text.matchAll(/\b([1-9]|[12][0-9]|30)\s*(?:s|sec|secs|second|seconds)\b/gi))
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    if (durations.length) {
      const currentOptions = parameterOptions(current, "duration").map(Number).filter(Number.isFinite);
      add("parameters.duration.options", currentOptions, Array.from(new Set([...currentOptions, ...durations])).sort((a, b) => a - b), field.provenance);
    }

    const ratios = parseOptions(text, /\b([0-9]{1,2}:[0-9]{1,2})\b/g);
    if (ratios.length) {
      const currentOptions = parameterOptions(current, "aspectRatio").map(String);
      add("parameters.aspectRatio.options", currentOptions, distinctStrings([...currentOptions, ...ratios]), field.provenance);
    }

    const refs = text.match(/\b(?:max(?:imum)?\s*)?(?:reference images?|images?)\D{0,24}([1-9][0-9]?)/i);
    if (refs) {
      const nextMax = Number(refs[1]);
      if (Number.isFinite(nextMax) && nextMax > current.inputs.referenceImages.max) {
        add("inputs.referenceImages.max", current.inputs.referenceImages.max, nextMax, field.provenance);
      }
    }
  }

  return fields.slice(0, 20);
}

function parameterOptions(definition: CentralModelDefinition, parameterId: string): Array<string | number | boolean> {
  return definition.parameters.find((parameter) => parameter.id === parameterId)?.options ?? [];
}

async function publishKnowledgeModelChange(changeId: string): Promise<KnowledgeHubResult> {
  const store = await readWritableKnowledgeStore();
  const change = store.modelChanges.find((item) => item.id === changeId);
  if (!change) throw new Error("Model change not found.");
  if (change.status !== "proposed") throw new Error("Only proposed model changes can be published.");

  const [imageModels, videoModels] = await Promise.all([getDynamicImageModels(), getDynamicVideoModels()]);
  let updated = false;
  const nextImageModels = imageModels.map((model) => {
    if (model.id !== change.modelId) return model;
    updated = true;
    return applyChangeFieldsToImageModel(model, change.fields);
  });
  const nextVideoModels = videoModels.map((model) => {
    if (model.id !== change.modelId) return model;
    updated = true;
    return applyChangeFieldsToVideoModel(model, change.fields);
  });
  if (!updated) throw new Error(`Model ${change.modelId} was not found in production model registries.`);

  await saveDynamicImageModels(nextImageModels);
  await saveDynamicVideoModels(nextVideoModels);

  const now = new Date().toISOString();
  const next: KnowledgeStore = {
    ...store,
    modelChanges: store.modelChanges.map((item) =>
      item.id === changeId ? { ...item, status: "published", reviewedAt: now, publishedAt: now } : item,
    ),
    updatedAt: now,
  };
  await writeKnowledgeStore(next);
  return { ok: true, databaseAvailable: true, ...next, summary: summarizeKnowledgeStore(next) };
}

function applyChangeFieldsToImageModel(model: import("@/lib/dynamic-model-loader").DynamicImageModel, fields: KnowledgeModelChangeField[]) {
  const next = { ...model };
  for (const field of fields) {
    if (field.field === "sourceModelId" && typeof field.newValue === "string") next.upstreamModelId = field.newValue;
    if (field.field === "parameters.resolution.options" && Array.isArray(field.newValue)) next.qualityParam = field.newValue.map(String);
    if (field.field === "parameters.aspectRatio.options" && Array.isArray(field.newValue)) next.aspectRatios = field.newValue.map(String);
    if (field.field === "inputs.referenceImages.max" && Number.isFinite(Number(field.newValue))) next.maxRefImages = Number(field.newValue);
  }
  return next;
}

function applyChangeFieldsToVideoModel(model: import("@/lib/dynamic-model-loader").DynamicVideoModel, fields: KnowledgeModelChangeField[]) {
  const next = { ...model, capabilities: { ...model.capabilities } };
  for (const field of fields) {
    if (field.field === "sourceModelId" && typeof field.newValue === "string") next.api_route = field.newValue;
    if (field.field === "parameters.resolution.options" && Array.isArray(field.newValue)) next.capabilities.resolutions = field.newValue.map(String);
    if (field.field === "parameters.duration.options" && Array.isArray(field.newValue)) next.capabilities.durations = field.newValue.map(Number).filter(Number.isFinite);
    if (field.field === "parameters.aspectRatio.options" && Array.isArray(field.newValue)) next.capabilities.aspect_ratios = field.newValue.map(String);
    if (field.field === "inputs.referenceImages.max" && Number.isFinite(Number(field.newValue))) next.capabilities.max_reference_images = Number(field.newValue);
  }
  return next;
}

async function writeKnowledgeStore(store: KnowledgeStore) {
  await prismadb.platformConfig.upsert({
    where: { key: KNOWLEDGE_STORE_KEY },
    update: { value: JSON.stringify(store) },
    create: { key: KNOWLEDGE_STORE_KEY, value: JSON.stringify(store) },
  });
}

async function fetchKnowledgePage(url: string): Promise<KnowledgeImportedPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html, text/markdown, text/plain, application/json;q=0.9, */*;q=0.1",
        "user-agent": "SaadStudioKnowledgeHub/1.0",
      },
    });
    if (!response.ok) throw new Error(`Import failed with HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type");
    const rawContent = (await response.text()).slice(0, MAX_IMPORTED_CHARS);
    return {
      url,
      finalUrl: response.url || url,
      title: extractHtmlTitle(rawContent),
      contentType,
      rawContent,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeKnowledgeText(raw: string, contentType?: string | null): string {
  const limited = trimImportedContent(raw);
  if (contentType?.includes("json")) return limited;
  return limited
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDraftFields(document: KnowledgeDocument, provider: KnowledgeProvider): KnowledgeDraftField[] {
  const text = document.normalizedText;
  const fields: KnowledgeDraftField[] = [];
  const add = (key: string, value: string, confidence: KnowledgeDraftField["confidence"], section: string | null = null) => {
    if (!value.trim()) return;
    const duplicate = fields.some((field) => field.key === key && field.value === value.trim());
    if (duplicate) return;
    fields.push({
      key,
      value: value.trim().slice(0, 500),
      confidence,
      provenance: {
        sourceUrl: document.sourceUrl,
        documentId: document.id,
        section,
      },
    });
  };

  add("provider", provider, "high", "source selection");
  for (const match of Array.from(text.matchAll(/\b(?:model|modelId|model_id|endpoint|url|path)\s*[:=]\s*["'`]?([A-Za-z0-9_./:-]{3,120})/gi))) {
    add(match[0].toLowerCase().includes("endpoint") || match[0].toLowerCase().includes("url") ? "endpoint" : "model_id", match[1], "medium", "pattern match");
  }
  for (const match of Array.from(text.matchAll(/\b(?:duration|resolution|quality|aspect[_ -]?ratio|callback|webhook|authentication|authorization|api key|task id|status)\b[^.]{0,180}/gi))) {
    const lower = match[0].toLowerCase();
    const key = lower.includes("duration")
      ? "limit"
      : lower.includes("resolution") || lower.includes("quality") || lower.includes("aspect")
      ? "parameter"
      : lower.includes("callback") || lower.includes("webhook")
      ? "callback"
      : lower.includes("auth") || lower.includes("api key")
      ? "authentication"
      : lower.includes("task") || lower.includes("status")
      ? "task_status_api"
      : "capability";
    add(key, match[0], "low", "keyword window");
  }
  for (const match of Array.from(text.matchAll(/\$[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*(?:credits?|tokens?|usd|seconds?|s\b)/gi))) {
    add("pricing_or_limit_reference", match[0], "low", "numeric reference");
  }
  return fields.slice(0, 80);
}

function extractHtmlTitle(raw: string): string | null {
  const match = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function inferTitle(text: string): string | null {
  const firstLine = text.split(/[.\n]/).find((line) => line.trim().length > 8);
  return firstLine?.trim().slice(0, 120) || null;
}

function hashContent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function trimImportedContent(value: string): string {
  return String(value ?? "").slice(0, MAX_IMPORTED_CHARS);
}

function providerLabel(provider: KnowledgeProvider): string {
  return provider === "custom" ? "Custom Provider" : provider;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d+)\./);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}
