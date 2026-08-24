export type RuntimeSourceProvider =
  | "google"
  | "openai"
  | "wavespeed"
  | "byteplus"
  | "elevenlabs"
  | "kie"
  | "reap";

export type PricingProvider = "kie" | "wavespeed";

export interface ModelSourceMetadata {
  runtimeSource: RuntimeSourceProvider;
  runtimeSourceLabel: string;
  sourceModelId: string;
  pricingProvider: PricingProvider;
}

type ImageSourceInput = {
  id: string;
  upstreamModelId?: string;
};

type VideoSourceInput = {
  id: string;
  api_route?: string;
};

type AudioSourceInput = {
  id: string;
  name?: string;
};

const RUNTIME_SOURCE_LABELS: Record<RuntimeSourceProvider, string> = {
  google: "Google",
  openai: "OpenAI",
  wavespeed: "WaveSpeed",
  byteplus: "BytePlus",
  elevenlabs: "ElevenLabs",
  kie: "KIE.ai",
  reap: "Reap.video",
};

function normalizeRef(value: string | undefined | null): string {
  return (value || "").trim().toLowerCase();
}

function sourceToPricingProvider(source: RuntimeSourceProvider): PricingProvider {
  return source === "wavespeed" ? "wavespeed" : "kie";
}

function buildSource(source: RuntimeSourceProvider, sourceModelId: string): ModelSourceMetadata {
  return {
    runtimeSource: source,
    runtimeSourceLabel: RUNTIME_SOURCE_LABELS[source],
    sourceModelId,
    pricingProvider: sourceToPricingProvider(source),
  };
}

function isGoogleImageRef(ref: string): boolean {
  return (
    ref.startsWith("google/") ||
    ref.startsWith("nano-banana") ||
    ref.startsWith("gemini-") ||
    ref.startsWith("imagen") ||
    ref.includes("/imagen")
  );
}

function isOpenAIImageRef(ref: string): boolean {
  return ref.startsWith("gpt-image") || ref.startsWith("openai/") || ref.startsWith("dall-e");
}

export function resolveImageModelSource(model: ImageSourceInput): ModelSourceMetadata {
  const sourceModelId = model.upstreamModelId || model.id;
  const id = normalizeRef(model.id);
  const upstream = normalizeRef(model.upstreamModelId);
  const sourceRef = upstream || id;

  if (isGoogleImageRef(sourceRef) || isGoogleImageRef(id)) {
    return buildSource("google", sourceModelId);
  }

  if (isOpenAIImageRef(sourceRef) || isOpenAIImageRef(id)) {
    return buildSource("openai", sourceModelId);
  }

  return buildSource("wavespeed", sourceModelId);
}

export function resolveVideoModelSource(model: VideoSourceInput): ModelSourceMetadata {
  const sourceModelId = model.api_route || model.id;
  const route = normalizeRef(model.api_route);
  const id = normalizeRef(model.id);
  const sourceRef = route || id;

  if (sourceRef.startsWith("google/")) {
    return buildSource("google", sourceModelId);
  }

  if (
    sourceRef.startsWith("bytedance/") ||
    sourceRef.startsWith("minimax/") ||
    sourceRef.startsWith("kwaivgi/") ||
    sourceRef.startsWith("hailuo/") ||
    sourceRef.startsWith("alibaba/") ||
    sourceRef.startsWith("x-ai/") ||
    sourceRef.startsWith("wavespeed-ai/")
  ) {
    return buildSource("wavespeed", sourceModelId);
  }

  if (sourceRef.startsWith("reap/")) {
    return buildSource("reap", sourceModelId);
  }

  if (sourceRef.startsWith("byteplus/")) {
    return buildSource("byteplus", sourceModelId);
  }

  if (sourceRef.startsWith("openai/")) {
    return buildSource("openai", sourceModelId);
  }

  return buildSource("kie", sourceModelId);
}

export function resolveAudioModelSource(model: AudioSourceInput): ModelSourceMetadata {
  const sourceModelId = model.id;
  const id = normalizeRef(model.id);
  const name = normalizeRef(model.name);
  const sourceRef = `${id} ${name}`;

  if (sourceRef.includes("google/") || sourceRef.includes("lyria") || sourceRef.includes("gemini")) {
    return buildSource("google", sourceModelId);
  }

  if (sourceRef.includes("elevenlabs") || sourceRef.includes("eleven") || id.startsWith("el_")) {
    return buildSource("elevenlabs", sourceModelId);
  }

  if (
    sourceRef.includes("wavespeed") ||
    sourceRef.includes("mmaudio") ||
    sourceRef.includes("ace-step") ||
    sourceRef.includes("song-generation")
  ) {
    return buildSource("wavespeed", sourceModelId);
  }

  return buildSource("kie", sourceModelId);
}

export function withImageSourceMetadata<T extends ImageSourceInput>(model: T): T & ModelSourceMetadata {
  return { ...model, ...resolveImageModelSource(model) };
}

export function withVideoSourceMetadata<T extends VideoSourceInput>(model: T): T & ModelSourceMetadata {
  return { ...model, ...resolveVideoModelSource(model) };
}

export function withAudioSourceMetadata<T extends AudioSourceInput>(model: T): T & ModelSourceMetadata {
  return { ...model, ...resolveAudioModelSource(model) };
}
