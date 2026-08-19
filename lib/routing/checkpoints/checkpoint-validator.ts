import type { CanonicalGenerationRequest } from "./canonical-request";
import type { ProviderCheckpointCapability } from "./checkpoint-capabilities";

export class CheckpointCapabilityMismatchError extends Error {
  public readonly code = "CHECKPOINT_CAPABILITY_MISMATCH";
  public readonly logicalProductId: string;
  public readonly selectedProvider: string;
  public readonly unsupportedParameters: string[];
  public readonly details: Record<string, unknown>;

  constructor(input: {
    logicalProductId: string;
    selectedProvider: string;
    unsupportedParameters: string[];
    details?: Record<string, unknown>;
    message?: string;
  }) {
    const msg =
      input.message ||
      `Selected checkpoint [${input.selectedProvider}] for logical product [${input.logicalProductId}] cannot satisfy requested capabilities: ${input.unsupportedParameters.join(", ")}`;
    super(msg);
    this.name = "CheckpointCapabilityMismatchError";
    this.logicalProductId = input.logicalProductId;
    this.selectedProvider = input.selectedProvider;
    this.unsupportedParameters = input.unsupportedParameters;
    this.details = input.details || {};
  }
}

export interface CheckpointValidationResult {
  valid: boolean;
  unsupportedParameters: string[];
  errors: string[];
}

/**
 * Validates a Canonical Generation Request against a Provider Checkpoint Capability.
 * Strictest invariant: NEVER silently discard a requested feature. If incompatible, fail explicitly.
 */
export function validateCanonicalRequestAgainstCheckpoint(
  request: CanonicalGenerationRequest,
  capability: ProviderCheckpointCapability
): CheckpointValidationResult {
  const unsupportedParameters: string[] = [];
  const errors: string[] = [];

  // 1. Modality support
  if (!capability.supportedModalities.includes(request.modality)) {
    unsupportedParameters.push(`modality:${request.modality}`);
    errors.push(`Provider [${capability.provider}] does not support modality [${request.modality}].`);
  }

  // 2. Negative prompt
  if (request.negativePrompt && !capability.supportsNegativePrompt) {
    unsupportedParameters.push("negativePrompt");
    errors.push(`Provider [${capability.provider}] does not support negative prompts.`);
  }

  // 3. Audio generation in video
  if (request.generateAudio === true && !capability.supportsAudioGeneration) {
    unsupportedParameters.push("generateAudio");
    errors.push(`Provider [${capability.provider}] does not support native synchronized audio generation.`);
  }

  // 4. First and Last frame dual-frame interpolation
  if ((request.firstFrame || request.lastFrame) && !capability.supportsFirstLastFrames) {
    unsupportedParameters.push("firstLastFrames");
    errors.push(`Provider [${capability.provider}] does not support explicit first/last frame dual interpolation.`);
  }

  // 5. Reference images count limit
  if (request.referenceImages && request.referenceImages.length > 0) {
    if (!capability.supportsReferenceImages) {
      unsupportedParameters.push("referenceImages");
      errors.push(`Provider [${capability.provider}] does not support multi-image reference inputs.`);
    } else if (capability.maxReferenceImages && request.referenceImages.length > capability.maxReferenceImages) {
      unsupportedParameters.push(`referenceImages:max_${capability.maxReferenceImages}`);
      errors.push(
        `Requested ${request.referenceImages.length} reference images exceeds provider limit of ${capability.maxReferenceImages}.`
      );
    }
  }

  // 6. Video input
  if (request.inputVideo && !capability.supportsInputVideo) {
    unsupportedParameters.push("inputVideo");
    errors.push(`Provider [${capability.provider}] does not support reference video inputs.`);
  }

  // 7. Motion & Camera controls
  if (request.motionControls && !capability.supportsMotionControls) {
    unsupportedParameters.push("motionControls");
    errors.push(`Provider [${capability.provider}] does not support character / motion trajectory controls.`);
  }
  if (request.cameraControls && !capability.supportsCameraControls) {
    unsupportedParameters.push("cameraControls");
    errors.push(`Provider [${capability.provider}] does not support explicit camera controls.`);
  }

  // 8. Multi-output fanout
  if (request.numOutputs && request.numOutputs > 1) {
    if (!capability.supportsMultiOutput) {
      unsupportedParameters.push("numOutputs");
      errors.push(`Provider [${capability.provider}] does not support multi-output generation.`);
    } else if (capability.maxOutputs && request.numOutputs > capability.maxOutputs) {
      unsupportedParameters.push(`numOutputs:max_${capability.maxOutputs}`);
      errors.push(`Requested ${request.numOutputs} outputs exceeds provider limit of ${capability.maxOutputs}.`);
    }
  }

  // 9. Duration bounds
  if (request.durationSec && capability.allowedDurationsSec && capability.allowedDurationsSec.length > 0) {
    if (!capability.allowedDurationsSec.includes(request.durationSec)) {
      unsupportedParameters.push(`durationSec:${request.durationSec}`);
      errors.push(
        `Duration ${request.durationSec}s is not supported by [${capability.provider}]. Allowed: ${capability.allowedDurationsSec.join(", ")}s.`
      );
    }
  }

  return {
    valid: unsupportedParameters.length === 0,
    unsupportedParameters,
    errors,
  };
}

/**
 * Asserts compatibility or throws CheckpointCapabilityMismatchError.
 */
export function assertCanonicalRequestCompatibility(
  request: CanonicalGenerationRequest,
  capability: ProviderCheckpointCapability
): void {
  const res = validateCanonicalRequestAgainstCheckpoint(request, capability);
  if (!res.valid) {
    throw new CheckpointCapabilityMismatchError({
      logicalProductId: request.logicalProductId,
      selectedProvider: capability.provider,
      unsupportedParameters: res.unsupportedParameters,
      details: { errors: res.errors, capability: capability.checkpointId },
    });
  }
}
