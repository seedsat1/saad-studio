import type { CanonicalGenerationRequest } from "../canonical-request";

export interface OpenAIAdaptedPayload {
  endpoint: "images.generate" | "images.edit" | "videos.generate";
  upstreamModel: string;
  body: Record<string, unknown>;
}

function mapOpenAISize(aspect?: string, model?: string): "1024x1024" | "1536x1024" | "1024x1536" | "1792x1024" | "1024x1792" {
  const a = aspect || "1:1";
  const isDalle = (model || "").includes("dall-e");
  if (a === "16:9" || a === "4:3") return isDalle ? "1792x1024" : "1536x1024";
  if (a === "9:16" || a === "3:4") return isDalle ? "1024x1792" : "1024x1536";
  return "1024x1024";
}

export function adaptOpenAICheckpoint(
  request: CanonicalGenerationRequest,
  providerRoute?: string
): OpenAIAdaptedPayload {
  const model = providerRoute || request.logicalProductId;

  if (request.modality === "video") {
    // OpenAI Sora 2 video payload
    return {
      endpoint: "videos.generate",
      upstreamModel: model,
      body: {
        model,
        prompt: request.prompt,
        duration: request.durationSec === 10 ? 10 : 5,
        resolution: request.resolution === "1080p" ? "1080p" : "720p",
        aspect_ratio: request.aspectRatio === "9:16" ? "9:16" : "16:9",
        input_image: request.inputImage || undefined,
      },
    };
  }

  // OpenAI Image (DALL-E 3 / GPT-Image)
  const isEdit = Boolean(request.inputImage || (request.referenceImages && request.referenceImages.length > 0));
  const upstream = model.includes("dall-e-3") ? "dall-e-3" : "gpt-image-1";
  const size = mapOpenAISize(request.aspectRatio, upstream);
  const n = Math.max(1, Math.min(request.numOutputs || 1, 4));

  if (isEdit) {
    const refUrls = [
      ...(request.inputImage ? [request.inputImage] : []),
      ...(request.referenceImages || []),
    ];
    return {
      endpoint: "images.edit",
      upstreamModel: upstream,
      body: {
        model: upstream,
        prompt: request.prompt,
        size,
        n,
        image_urls: refUrls,
      },
    };
  }

  return {
    endpoint: "images.generate",
    upstreamModel: upstream,
    body: {
      model: upstream,
      prompt: request.prompt,
      size,
      quality: request.quality === "hd" ? "hd" : "standard",
      n,
      response_format: upstream === "dall-e-3" ? "url" : "b64_json",
    },
  };
}
