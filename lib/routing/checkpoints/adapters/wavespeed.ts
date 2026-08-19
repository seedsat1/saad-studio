import type { CanonicalGenerationRequest } from "../canonical-request";

export interface WaveSpeedAdaptedPayload {
  endpoint: string;
  upstreamModel: string;
  body: Record<string, unknown>;
}

export function adaptWaveSpeedCheckpoint(
  request: CanonicalGenerationRequest,
  providerRoute?: string
): WaveSpeedAdaptedPayload {
  const model = providerRoute || request.logicalProductId;

  if (request.modality === "video") {
    const images = [
      ...(request.inputImage ? [request.inputImage] : []),
      ...(request.referenceImages || []),
    ];

    const body: Record<string, unknown> = {
      prompt: request.prompt,
      model,
      duration: request.durationSec || 5,
      resolution: request.resolution || "720p",
      aspect_ratio: request.aspectRatio || "16:9",
      quality: request.quality || "std",
      mode: request.mode || "std",
    };

    if (request.negativePrompt) {
      body.negative_prompt = request.negativePrompt;
    }

    if (request.firstFrame) {
      body.first_frame_url = request.firstFrame;
    }
    if (request.lastFrame) {
      body.last_frame_url = request.lastFrame;
    }

    if (images.length === 1) {
      body.image = images[0];
    } else if (images.length > 1) {
      body.images = images;
    }

    if (request.inputVideo) {
      body.video_url = request.inputVideo;
    }
    if (request.inputAudio) {
      body.audio_url = request.inputAudio;
    }

    if (Number.isFinite(request.seed)) {
      body.seed = request.seed;
    }

    if (request.motionControls) {
      body.motion_control = request.motionControls;
    }
    if (request.cameraControls) {
      body.camera_control = request.cameraControls;
    }

    return {
      endpoint: `models/${model}/run`,
      upstreamModel: model,
      body,
    };
  }

  // WaveSpeed Image
  const images = [
    ...(request.inputImage ? [request.inputImage] : []),
    ...(request.referenceImages || []),
  ];

  const body: Record<string, unknown> = {
    prompt: request.prompt,
    model,
    aspect_ratio: request.aspectRatio || "1:1",
    resolution: request.resolution || "1K",
    num_outputs: request.numOutputs || 1,
  };

  if (request.negativePrompt) {
    body.negative_prompt = request.negativePrompt;
  }
  if (images.length === 1) {
    body.image = images[0];
  } else if (images.length > 1) {
    body.images = images;
  }
  if (Number.isFinite(request.seed)) {
    body.seed = request.seed;
  }

  return {
    endpoint: `models/${model}/run`,
    upstreamModel: model,
    body,
  };
}
