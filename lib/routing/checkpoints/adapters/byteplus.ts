import type { CanonicalGenerationRequest } from "../canonical-request";

export interface BytePlusAdaptedPayload {
  endpoint: "contents/generations/tasks";
  upstreamModel: string;
  body: Record<string, unknown>;
}

export function adaptBytePlusCheckpoint(
  request: CanonicalGenerationRequest,
  providerRoute?: string
): BytePlusAdaptedPayload {
  const model = providerRoute || request.logicalProductId;

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: request.prompt },
  ];

  if (request.firstFrame) {
    content.push({ type: "image_url", image_url: { url: request.firstFrame }, role: "first_frame" });
  } else if (request.inputImage) {
    content.push({ type: "image_url", image_url: { url: request.inputImage } });
  }

  if (request.lastFrame) {
    content.push({ type: "image_url", image_url: { url: request.lastFrame }, role: "last_frame" });
  }

  if (request.referenceImages && request.referenceImages.length > 0) {
    for (const ref of request.referenceImages.slice(0, 2)) {
      content.push({ type: "image_url", image_url: { url: ref }, role: "reference" });
    }
  }

  const duration = request.durationSec === 10 ? "10s" : "5s";
  const ratio = request.aspectRatio || "16:9";
  const resolution = request.resolution === "1080p" ? "1080p" : request.resolution === "480p" ? "480p" : "720p";

  return {
    endpoint: "contents/generations/tasks",
    upstreamModel: model,
    body: {
      model,
      content,
      ratio,
      resolution,
      duration,
      generate_audio: false,
      negative_prompt: request.negativePrompt || undefined,
      seed: request.seed || undefined,
    },
  };
}
