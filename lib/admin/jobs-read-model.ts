import prismadb from "@/lib/prismadb";

export const UNIFIED_JOB_STATUSES = ["queued", "processing", "completed", "failed", "cancelled"] as const;
export const JOB_SOURCE_TYPES = ["generation", "transition", "variation", "reap", "cinema"] as const;

export type UnifiedJobStatus = (typeof UNIFIED_JOB_STATUSES)[number];
export type JobSourceType = (typeof JOB_SOURCE_TYPES)[number];

export type JobDiagnosticCode =
  | "queued_too_long"
  | "processing_too_long"
  | "completed_result_but_processing"
  | "failed_job_generation_not_failed"
  | "provider_task_id_missing"
  | "provider_usage_missing";

export type JobDiagnostic = {
  code: JobDiagnosticCode;
  label: string;
  severity: "warning" | "error";
};

export type UnifiedJobView = {
  jobId: string;
  sourceType: JobSourceType;
  generationId: string | null;
  featureId: string | null;
  userId: string | null;
  modelId: string | null;
  provider: string | null;
  providerTaskId: string | null;
  routingSource: "control_center" | "legacy_fallback" | null;
  status: UnifiedJobStatus;
  rawStatus: string | null;
  /** True numeric progress (0-100) supplied by provider/worker if available; null if unproven */
  progress: number | null;
  /** True record creation timestamp in database */
  createdAt: string | null;
  /** True record last update timestamp if tracked by model, else null */
  updatedAt: string | null;
  /** True execution start timestamp only if explicitly tracked by source, else null */
  startedAt: string | null;
  /** True terminal completion timestamp only if explicitly tracked by source, else null */
  completedAt: string | null;
  error: string | null;
  creditsCharged: number | null;
  mediaUrl: string | null;
  result: string | null;
  refundState: "not_applicable" | "unknown" | "charged" | "refunded_or_rolled_back" | "free";
  providerUsage: {
    id: string;
    provider: string | null;
    providerModel: string | null;
    providerRequestId: string | null;
    status: string | null;
    providerCostUsd: number | null;
    providerCostSource: string | null;
  } | null;
  diagnostics: JobDiagnostic[];
};

export type JobsFilterInput = {
  status?: string | null;
  sourceType?: string | null;
  featureId?: string | null;
  provider?: string | null;
  modelId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  query?: string | null;
};

export type JobsReadModelResult = {
  ok: boolean;
  databaseAvailable: boolean;
  jobs: UnifiedJobView[];
  summary: {
    totalDisplayed: number;
    byStatus: Record<UnifiedJobStatus, number>;
    bySource: Record<JobSourceType, number>;
    diagnostics: number;
  };
  sources: Array<{ sourceType: JobSourceType; linked: boolean; count: number; reason?: string }>;
  normalization: Record<string, UnifiedJobStatus>;
  diagnosticsCatalog: Array<{ code: JobDiagnosticCode; label: string }>;
  unlinkedSources: Array<{ sourceType: JobSourceType; reason: string }>;
  error?: string;
};

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const STATUS_NORMALIZATION: Record<string, UnifiedJobStatus> = {
  queued: "queued",
  pending: "queued",
  created: "queued",
  submitted: "processing",
  prepped: "processing",
  processing: "processing",
  running: "processing",
  in_progress: "processing",
  rendering: "processing",
  active: "processing",
  completed: "completed",
  complete: "completed",
  succeeded: "completed",
  success: "completed",
  done: "completed",
  ready: "completed",
  failed: "failed",
  failure: "failed",
  error: "failed",
  rejected: "failed",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const TASK_PREFIX_TO_FEATURE: Array<[string, string]> = [
  ["task:clipcraft:", "video-clipcraft-studio"],
  ["task:variation-job:", ""],
];

export const JOB_DIAGNOSTIC_CATALOG: Array<{ code: JobDiagnosticCode; label: string }> = [
  { code: "queued_too_long", label: "Queued too long" },
  { code: "processing_too_long", label: "Processing too long" },
  { code: "completed_result_but_processing", label: "Result exists but status is still processing" },
  { code: "failed_job_generation_not_failed", label: "Job failed but linked generation is not failed" },
  { code: "provider_task_id_missing", label: "Provider task id missing" },
  { code: "provider_usage_missing", label: "Provider usage missing" },
];

export function normalizeJobStatus(rawStatus: unknown, marker?: string | null, result?: string | null): UnifiedJobStatus {
  const markerText = typeof marker === "string" ? marker.trim() : "";
  if (markerText.startsWith("failed:")) return "failed";
  if (markerText.startsWith("task:")) return result ? "completed" : "processing";
  if (result) return "completed";

  const key = String(rawStatus ?? "").trim().toLowerCase().replaceAll("-", "_");
  return STATUS_NORMALIZATION[key] ?? "queued";
}

export function summarizeUnifiedJobs(jobs: UnifiedJobView[]) {
  return {
    totalDisplayed: jobs.length,
    byStatus: countByEnum(jobs, UNIFIED_JOB_STATUSES, (job) => job.status),
    bySource: countByEnum(jobs, JOB_SOURCE_TYPES, (job) => job.sourceType),
    diagnostics: jobs.reduce((sum, job) => sum + job.diagnostics.length, 0),
  };
}

export function mapGenerationToUnifiedJob(row: any, now: Date = new Date()): UnifiedJobView {
  const snapshot = row.generationRequestSnapshot ?? null;
  const requestPayload = asRecord(snapshot?.requestPayload);
  const routing = asRecord(requestPayload?.routing);
  const mediaUrl = nullableString(row.mediaUrl);
  const outputUrl = nullableString(row.outputUrl);
  const result = nonTaskResult(outputUrl) ?? nonTaskResult(mediaUrl);
  const taskId = nullableString(row.providerRequestId) ?? taskIdFromMarker(mediaUrl);
  const providerUsage = mapProviderUsage(row.providerUsageRecords?.[0]);
  const status = normalizeJobStatus(row.status, mediaUrl, result);
  const creditsCharged = toNumber(row.cost);
  const featureId = inferGenerationFeatureId(row, requestPayload);

  const job: UnifiedJobView = {
    jobId: row.id,
    sourceType: "generation",
    generationId: row.id,
    featureId,
    userId: nullableString(row.userId),
    modelId: nullableString(snapshot?.model) ?? nullableString(row.modelUsed),
    provider: nullableString(row.providerName) ?? providerUsage?.provider ?? nullableString(snapshot?.provider),
    providerTaskId: taskId,
    routingSource: routingSourceFrom(routing?.routingSource),
    status,
    rawStatus: nullableString(row.status),
    progress: null,
    createdAt: iso(row.createdAt),
    updatedAt: null,
    startedAt: null,
    completedAt: null,
    error: failedReasonFrom(mediaUrl) ?? null,
    creditsCharged,
    mediaUrl: result,
    result,
    refundState: inferRefundState(status, creditsCharged),
    providerUsage,
    diagnostics: [],
  };

  return { ...job, diagnostics: detectJobDiagnostics(job, now) };
}

export function mapTransitionJobToUnifiedJob(row: any, now: Date = new Date()): UnifiedJobView {
  const payload = asRecord(row.payload);
  const routing = asRecord(payload?.routing);
  const result = nullableString(row.resultUrl) ?? nullableString(row.output?.url);
  const status = normalizeJobStatus(row.status, nullableString(row.taskId), result);
  const job: UnifiedJobView = {
    jobId: row.id,
    sourceType: "transition",
    generationId: null,
    featureId: "video-transitions",
    userId: nullableString(row.userId),
    modelId: nullableString(payload?.modelId) ?? nullableString(payload?.selectedModelId) ?? nullableString(row.presetId),
    provider: nullableString(routing?.effectiveProvider) ?? "KIE.ai",
    providerTaskId: nullableString(row.taskId),
    routingSource: routingSourceFrom(routing?.routingSource) ?? "legacy_fallback",
    status,
    rawStatus: nullableString(row.status),
    progress: null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    startedAt: null,
    completedAt: null,
    error: nullableString(row.error),
    creditsCharged: toNumber(row.creditsCost),
    mediaUrl: result,
    result,
    refundState: inferRefundState(status, toNumber(row.creditsCost)),
    providerUsage: null,
    diagnostics: [],
  };
  return { ...job, diagnostics: detectJobDiagnostics(job, now) };
}

export function mapVariationJobToUnifiedJob(row: any, now: Date = new Date()): UnifiedJobView {
  const outputs = Array.isArray(row.outputs) ? row.outputs : [];
  const firstOutput = outputs[0] ?? null;
  const result = nullableString(firstOutput?.assetUrl);
  const taskId = nullableString(firstOutput?.kieTaskId);
  const creditsCharged = outputs.reduce((sum: number, output: any) => sum + (toNumber(output.creditCost) ?? 0), 0);
  const status = normalizeJobStatus(row.status, taskId, result);
  const job: UnifiedJobView = {
    jobId: row.id,
    sourceType: "variation",
    generationId: null,
    featureId: null,
    userId: nullableString(row.userId),
    modelId: nullableString(firstOutput?.modelUsed),
    provider: taskId ? "KIE.ai" : null,
    providerTaskId: taskId,
    routingSource: null,
    status,
    rawStatus: nullableString(row.status),
    progress: null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    startedAt: null,
    completedAt: null,
    error: nullableString(row.error),
    creditsCharged,
    mediaUrl: result,
    result,
    refundState: inferRefundState(status, creditsCharged),
    providerUsage: null,
    diagnostics: [],
  };
  return { ...job, diagnostics: detectJobDiagnostics(job, now) };
}

export function mapReapJobToUnifiedJob(row: any, now: Date = new Date()): UnifiedJobView {
  const outputUrls = parseStringArray(row.outputUrls);
  const options = asRecord(row.options);
  const status = normalizeJobStatus(row.status, `task:reap:${row.projectId}`, outputUrls[0] ?? null);
  const job: UnifiedJobView = {
    jobId: row.id,
    sourceType: "reap",
    generationId: null,
    featureId: null,
    userId: nullableString(row.userId),
    modelId: `reap:${nullableString(row.tool) ?? "unknown"}`,
    provider: "Reap",
    providerTaskId: nullableString(row.projectId),
    routingSource: null,
    status,
    rawStatus: nullableString(row.status),
    progress: null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    startedAt: null,
    completedAt: null,
    error: nullableString(row.error),
    creditsCharged: toNumber(row.creditsCost),
    mediaUrl: outputUrls[0] ?? null,
    result: outputUrls[0] ?? null,
    refundState: inferRefundState(status, toNumber(row.creditsCost)),
    providerUsage: null,
    diagnostics: [],
  };
  void options;
  return { ...job, diagnostics: detectJobDiagnostics(job, now) };
}

export function mapCinemaJobToUnifiedJob(row: any, now: Date = new Date()): UnifiedJobView {
  const payload = asRecord(row.payload);
  const status = normalizeJobStatus(row.status, nullableString(row.taskId), nullableString(row.resultUrl));
  const job: UnifiedJobView = {
    jobId: row.id,
    sourceType: "cinema",
    generationId: null,
    featureId: null,
    userId: nullableString(row.userId),
    modelId: nullableString(row.modelRoute),
    provider: "KIE.ai",
    providerTaskId: nullableString(row.taskId),
    routingSource: null,
    status,
    rawStatus: nullableString(row.status),
    progress: null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    startedAt: null,
    completedAt: null,
    error: nullableString(row.error),
    creditsCharged: toNumber(row.creditsCost),
    mediaUrl: nullableString(row.resultUrl),
    result: nullableString(row.resultUrl),
    refundState: inferRefundState(status, toNumber(row.creditsCost)),
    providerUsage: null,
    diagnostics: [],
  };
  void payload;
  return { ...job, diagnostics: detectJobDiagnostics(job, now) };
}

export function detectJobDiagnostics(job: UnifiedJobView, now: Date = new Date()): JobDiagnostic[] {
  const diagnostics: JobDiagnostic[] = [];
  const createdAt = job.createdAt ? Date.parse(job.createdAt) : NaN;
  const ageMs = Number.isFinite(createdAt) ? now.getTime() - createdAt : 0;

  if (job.status === "queued" && ageMs > THIRTY_MINUTES_MS) {
    diagnostics.push({ code: "queued_too_long", label: "Queued too long", severity: "warning" });
  }
  if (job.status === "processing" && ageMs > TWO_HOURS_MS) {
    diagnostics.push({ code: "processing_too_long", label: "Processing too long", severity: "warning" });
  }
  if (job.status === "processing" && job.result) {
    diagnostics.push({ code: "completed_result_but_processing", label: "Result exists but status is still processing", severity: "warning" });
  }
  if (job.status === "failed" && job.generationId && job.rawStatus && normalizeJobStatus(job.rawStatus) !== "failed") {
    diagnostics.push({ code: "failed_job_generation_not_failed", label: "Job failed but linked generation is not failed", severity: "error" });
  }
  if (job.status === "processing" && !job.providerTaskId) {
    diagnostics.push({ code: "provider_task_id_missing", label: "Provider task id missing", severity: "error" });
  }
  if (job.sourceType === "generation" && (job.creditsCharged ?? 0) > 0 && !job.providerUsage) {
    diagnostics.push({ code: "provider_usage_missing", label: "Provider usage missing", severity: "warning" });
  }

  return diagnostics;
}

export async function loadUnifiedJobs(filters: JobsFilterInput = {}, limit = 75): Promise<JobsReadModelResult> {
  const take = Math.max(1, Math.min(Math.floor(limit || 75), 200));
  const now = new Date();

  try {
    const [generations, transitions, variations, reaps, cinemas] = await Promise.all([
      prismadb.generation.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: {
          providerUsageRecords: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          generationRequestSnapshot: true,
        },
      }),
      prismadb.transitionJob.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: { output: true },
      }),
      prismadb.variationJob.findMany({
        orderBy: { createdAt: "desc" },
        take,
        include: {
          outputs: {
            orderBy: { createdAt: "asc" },
            take: 4,
          },
        },
      }),
      prismadb.reapJob.findMany({
        orderBy: { createdAt: "desc" },
        take,
      }),
      prismadb.cinemaJob.findMany({
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

    const jobs = [
      ...generations.map((row) => mapGenerationToUnifiedJob(row, now)),
      ...transitions.map((row) => mapTransitionJobToUnifiedJob(row, now)),
      ...variations.map((row) => mapVariationJobToUnifiedJob(row, now)),
      ...reaps.map((row) => mapReapJobToUnifiedJob(row, now)),
      ...cinemas.map((row) => mapCinemaJobToUnifiedJob(row, now)),
    ]
      .filter((job) => matchesJobFilters(job, filters))
      .sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""));

    const sources = buildSources(jobs);
    return {
      ok: true,
      databaseAvailable: true,
      jobs,
      summary: summarizeUnifiedJobs(jobs),
      sources,
      normalization: STATUS_NORMALIZATION,
      diagnosticsCatalog: JOB_DIAGNOSTIC_CATALOG,
      unlinkedSources: getUnlinkedSources(jobs),
    };
  } catch (error) {
    return {
      ok: false,
      databaseAvailable: false,
      jobs: [],
      summary: summarizeUnifiedJobs([]),
      sources: JOB_SOURCE_TYPES.map((sourceType) => ({ sourceType, linked: false, count: 0, reason: "Database unavailable." })),
      normalization: STATUS_NORMALIZATION,
      diagnosticsCatalog: JOB_DIAGNOSTIC_CATALOG,
      unlinkedSources: JOB_SOURCE_TYPES.map((sourceType) => ({ sourceType, reason: "Database unavailable." })),
      error: error instanceof Error ? error.message : "Unable to load jobs.",
    };
  }
}

function matchesJobFilters(job: UnifiedJobView, filters: JobsFilterInput): boolean {
  if (filters.status && filters.status !== "all" && job.status !== filters.status) return false;
  if (filters.sourceType && filters.sourceType !== "all" && job.sourceType !== filters.sourceType) return false;
  if (filters.featureId && filters.featureId !== "all" && (job.featureId ?? "unknown") !== filters.featureId) return false;
  if (filters.provider && filters.provider !== "all" && !contains(job.provider, filters.provider)) return false;
  if (filters.modelId && filters.modelId !== "all" && !contains(job.modelId, filters.modelId)) return false;
  if (filters.dateFrom && job.createdAt && Date.parse(job.createdAt) < Date.parse(filters.dateFrom)) return false;
  if (filters.dateTo && job.createdAt && Date.parse(job.createdAt) > Date.parse(filters.dateTo)) return false;
  if (filters.query) {
    const query = filters.query.toLowerCase();
    const haystack = [
      job.jobId,
      job.generationId,
      job.featureId,
      job.modelId,
      job.provider,
      job.providerTaskId,
      job.rawStatus,
      job.error,
      job.routingSource,
      job.sourceType,
    ].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function inferGenerationFeatureId(row: any, payload: Record<string, unknown> | null): string | null {
  const explicit = nullableString(payload?.featureId);
  if (explicit) return explicit;

  const model = String(row.modelUsed ?? "").toLowerCase();
  const assetType = String(row.assetType ?? "").toLowerCase();
  const marker = String(row.mediaUrl ?? "");
  const prompt = String(row.prompt ?? "").toLowerCase();

  for (const [prefix, featureId] of TASK_PREFIX_TO_FEATURE) {
    if (marker.startsWith(prefix)) return featureId || null;
  }
  if (model === "clipcraft" || model.startsWith("clipcraft:")) return "video-clipcraft-studio";
  if (model.includes("image-background-remover")) return "edit-background-remove";
  if (model.includes("image-face-swap")) return "image-face-swap";
  if (model.includes("image-upscaler") && assetType.includes("video")) return "video-video-upscale";
  if (model.includes("image-upscaler")) return null;
  if (model.includes("veo") && prompt.includes("cinematic")) return "video-cinema-edit";
  return null;
}

function buildSources(jobs: UnifiedJobView[]) {
  return JOB_SOURCE_TYPES.map((sourceType) => {
    const sourceJobs = jobs.filter((job) => job.sourceType === sourceType);
    const linked = sourceJobs.some((job) => Boolean(job.featureId));
    return {
      sourceType,
      linked,
      count: sourceJobs.length,
      ...(linked ? {} : { reason: sourceJobs.length ? "No approved Product Feature link is proven from stored job metadata." : "No local rows loaded." }),
    };
  });
}

function getUnlinkedSources(jobs: UnifiedJobView[]) {
  return JOB_SOURCE_TYPES
    .filter((sourceType) => jobs.some((job) => job.sourceType === sourceType && !job.featureId))
    .map((sourceType) => ({
      sourceType,
      reason: "At least one row from this source lacks a provable approved feature id in stored metadata.",
    }));
}

function countByEnum<T extends string, V>(items: V[], keys: readonly T[], pick: (item: V) => T): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const item of items) counts[pick(item)] += 1;
  return counts;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return new Date(value).toISOString();
  return null;
}

function taskIdFromMarker(mediaUrl: string | null): string | null {
  if (!mediaUrl?.startsWith("task:")) return null;
  return mediaUrl.slice("task:".length) || null;
}

function nonTaskResult(url: string | null): string | null {
  if (!url || url.startsWith("task:") || url.startsWith("failed:")) return null;
  return url;
}

function failedReasonFrom(mediaUrl: string | null): string | null {
  if (!mediaUrl?.startsWith("failed:")) return null;
  return mediaUrl.slice("failed:".length) || "Generation failed";
}

function routingSourceFrom(value: unknown): UnifiedJobView["routingSource"] {
  return value === "control_center" || value === "legacy_fallback" ? value : null;
}

function inferRefundState(status: UnifiedJobStatus, credits: number | null): UnifiedJobView["refundState"] {
  if (!credits || credits <= 0) return status === "failed" ? "refunded_or_rolled_back" : "free";
  if (status === "failed") return "unknown";
  if (status === "completed" || status === "processing" || status === "queued") return "charged";
  return "unknown";
}

function mapProviderUsage(value: any): UnifiedJobView["providerUsage"] {
  if (!value) return null;
  return {
    id: String(value.id),
    provider: nullableString(value.providerName),
    providerModel: nullableString(value.providerModel),
    providerRequestId: nullableString(value.providerRequestId),
    status: nullableString(value.status),
    providerCostUsd: toNumber(value.providerCostUsd),
    providerCostSource: nullableString(value.providerCostSource),
  };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  if (typeof value === "string") {
    try {
      return parseStringArray(JSON.parse(value));
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function contains(value: string | null, query: string): boolean {
  return String(value ?? "").toLowerCase().includes(query.toLowerCase());
}
