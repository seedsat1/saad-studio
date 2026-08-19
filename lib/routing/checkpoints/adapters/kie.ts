import type { CanonicalGenerationRequest } from "../canonical-request";

export interface KIEAdaptedPayload {
  endpoint: string;
  upstreamModel: string;
  body: Record<string, unknown>;
}

export function adaptKIECheckpoint(
  request: CanonicalGenerationRequest,
  providerRoute?: string
): KIEAdaptedPayload {
  const model = providerRoute || request.logicalProductId;

  const inputObj: Record<string, unknown> = {
    prompt: request.prompt,
  };

  if (request.negativePrompt) {
    inputObj.negative_prompt = request.negativePrompt;
  }

  if (request.durationSec) {
    inputObj.duration = request.durationSec;
  }
  if (request.resolution) {
    inputObj.resolution = request.resolution;
  }
  if (request.aspectRatio) {
    inputObj.aspect_ratio = request.aspectRatio;
  }

  if (request.inputImage) {
    inputObj.image_url = request.inputImage;
  }
  if (request.referenceImages && request.referenceImages.length > 0) {
    inputObj.image_urls = request.referenceImages;
  }

  if (request.firstFrame) {
    inputObj.first_frame = request.firstFrame;
  }
  if (request.lastFrame) {
    inputObj.last_frame = request.lastFrame;
  }

  if (Number.isFinite(request.seed)) {
    inputObj.seed = request.seed;
  }

  return {
    endpoint: "jobs/create",
    upstreamModel: model,
    body: {
      model,
      input: inputObj,
    },
  };
}
