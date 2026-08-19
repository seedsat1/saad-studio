import type { RuntimeSourceProvider } from "@/lib/model-source-map";
import type { CanonicalGenerationRequest } from "./canonical-request";
import { getCheckpointCapability } from "./checkpoint-capabilities";
import { assertCanonicalRequestCompatibility } from "./checkpoint-validator";
import { adaptGoogleCheckpoint } from "./adapters/google";
import { adaptOpenAICheckpoint } from "./adapters/openai";
import { adaptBytePlusCheckpoint } from "./adapters/byteplus";
import { adaptWaveSpeedCheckpoint } from "./adapters/wavespeed";
import { adaptKIECheckpoint } from "./adapters/kie";

export interface CheckpointExecutionPackage {
  /** The immutable logical product identifier */
  logicalProductId: string;

  /** The original lab/owner provider that authored the model */
  officialProvider: string;

  /** The concrete provider selected to execute this checkpoint */
  selectedExecutionProvider: RuntimeSourceProvider;

  /** The concrete route/model slug on the selected provider */
  providerRoute: string;

  /** The normalized execution endpoint */
  endpoint: string;

  /** The upstream provider model identifier */
  upstreamModel: string;

  /** The exact, provider-compliant request payload ready for network dispatch */
  providerPayload: Record<string, unknown>;

  /** Trace metadata for audit logging */
  traceMetadata: {
    canonicalModality: string;
    hasNegativePrompt: boolean;
    hasReferenceImages: boolean;
    hasAudioRequested: boolean;
    normalizedAt: string;
  };
}

/**
 * Universal Checkpoint Normalization Dispatcher.
 * Transforms a Canonical Generation Request into the exact provider payload
 * required by the selected execution checkpoint after strict capability validation.
 */
export function normalizeAndAdaptCheckpointRequest(
  request: CanonicalGenerationRequest,
  target: {
    provider: RuntimeSourceProvider;
    route?: string;
    officialProvider?: string;
  }
): CheckpointExecutionPackage {
  const provider = target.provider;
  const providerRoute = target.route || request.logicalProductId;
  const officialProvider = target.officialProvider || request.officialProvider;

  // 1. Resolve capability descriptor
  const capability = getCheckpointCapability(provider, request.modality);

  // 2. Strict capability assertion (fails immediately if ANY requested feature is unsupported)
  assertCanonicalRequestCompatibility(request, capability);

  // 3. Delegate to provider-specific isolated adapter
  let endpoint = "";
  let upstreamModel = providerRoute;
  let providerPayload: Record<string, unknown> = {};

  switch (provider) {
    case "google": {
      const adapted = adaptGoogleCheckpoint(request, providerRoute);
      endpoint = adapted.endpoint;
      upstreamModel = adapted.upstreamModel;
      providerPayload = adapted.body;
      break;
    }
    case "openai": {
      const adapted = adaptOpenAICheckpoint(request, providerRoute);
      endpoint = adapted.endpoint;
      upstreamModel = adapted.upstreamModel;
      providerPayload = adapted.body;
      break;
    }
    case "byteplus": {
      const adapted = adaptBytePlusCheckpoint(request, providerRoute);
      endpoint = adapted.endpoint;
      upstreamModel = adapted.upstreamModel;
      providerPayload = adapted.body;
      break;
    }
    case "wavespeed": {
      const adapted = adaptWaveSpeedCheckpoint(request, providerRoute);
      endpoint = adapted.endpoint;
      upstreamModel = adapted.upstreamModel;
      providerPayload = adapted.body;
      break;
    }
    case "kie": {
      const adapted = adaptKIECheckpoint(request, providerRoute);
      endpoint = adapted.endpoint;
      upstreamModel = adapted.upstreamModel;
      providerPayload = adapted.body;
      break;
    }
    default:
      throw new Error(`Unsupported checkpoint provider adapter: ${provider}`);
  }

  return {
    logicalProductId: request.logicalProductId,
    officialProvider,
    selectedExecutionProvider: provider,
    providerRoute,
    endpoint,
    upstreamModel,
    providerPayload,
    traceMetadata: {
      canonicalModality: request.modality,
      hasNegativePrompt: Boolean(request.negativePrompt),
      hasReferenceImages: Boolean(request.referenceImages && request.referenceImages.length > 0),
      hasAudioRequested: request.generateAudio === true,
      normalizedAt: new Date().toISOString(),
    },
  };
}
