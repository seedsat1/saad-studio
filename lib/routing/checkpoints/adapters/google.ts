import type { CanonicalGenerationRequest } from "../canonical-request";

export interface GoogleAdaptedPayload {
  endpoint: "vertex_veo" | "generative_interactions" | "imagen_generate";
  upstreamModel: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function adaptGoogleCheckpoint(
  request: CanonicalGenerationRequest,
  providerRoute?: string
): GoogleAdaptedPayload {
  const model = providerRoute || request.logicalProductId;

  if (request.modality === "video") {
    // Veo Video payload adaptation
    const isFast = model.includes("fast");
    const isLite = model.includes("lite");
    const durationSeconds = request.durationSec === 5 ? 5 : 8; // Google Veo supports 5s and 8s

    const aspect = request.aspectRatio === "9:16" ? "9:16" : "16:9";
    const resolution = request.resolution === "1080p" || request.resolution === "4k" ? request.resolution : "720p";

    const blocks: Array<Record<string, unknown>> = [{ type: "text", text: request.prompt }];
    if (request.negativePrompt) {
      blocks.push({ type: "negative_text", text: request.negativePrompt });
    }

    if (request.inputImage) {
      blocks.push({ type: "image", source_url: request.inputImage });
    }
    if (request.referenceImages && request.referenceImages.length > 0) {
      for (const imgUrl of request.referenceImages.slice(0, 3)) {
        blocks.push({ type: "reference_image", source_url: imgUrl });
      }
    }
    if (request.inputVideo) {
      blocks.push({ type: "video", source_url: request.inputVideo });
    }

    return {
      endpoint: "vertex_veo",
      upstreamModel: model,
      body: {
        model,
        tier: isLite ? "lite" : isFast ? "fast" : "pro",
        durationSeconds,
        aspectRatio: aspect,
        resolution,
        generate_audio: request.generateAudio === true,
        input: blocks,
        personGeneration: "ALLOW_ADULT",
      },
    };
  }

  // Google Image (Imagen 3 / Nano Banana) payload adaptation
  const isImagen = model.startsWith("imagen") || model.includes("/imagen");
  const aspect = request.aspectRatio || "1:1";
  const imageSize = request.resolution === "2K" ? "2K" : "1K";

  const blocks: Array<Record<string, unknown>> = [{ type: "text", text: request.prompt }];
  if (request.inputImage) {
    blocks.push({ type: "image", source_url: request.inputImage });
  }
  if (request.referenceImages && request.referenceImages.length > 0) {
    for (const imgUrl of request.referenceImages.slice(0, 4)) {
      blocks.push({ type: "image", source_url: imgUrl });
    }
  }

  return {
    endpoint: isImagen ? "imagen_generate" : "generative_interactions",
    upstreamModel: model,
    body: {
      model,
      input: blocks,
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: aspect,
        image_size: imageSize,
      },
      num_images: request.numOutputs || 1,
    },
  };
}
