// ============================================================
// Hollywood AI Studio — Model Routing Configuration
// ============================================================
// Central registry: every AI model, provider, and fallback chain.
// API_INTEGRATION_POINT: Add real API keys and endpoint URLs here.
// ============================================================

export type ModelCategory =
  | 'scriptWriting' | 'promptRefinement' | 'continuityQA'
  | 'imageGenPrimary' | 'imageGenSecondary' | 'imageEditing'
  | 'videoGenPrimary' | 'videoGenSecondary' | 'videoGenFallback'
  | 'ttsPrimary' | 'ttsFast' | 'voiceCloning' | 'transcription';

export interface ModelRoute {
  primary: string;
  fallback: string | null;
  provider: string;
  endpoint?: string;       // API_INTEGRATION_POINT
  apiKeyEnv?: string;      // API_INTEGRATION_POINT
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
}

export const MODEL_ROUTING: Record<ModelCategory, ModelRoute> = {
  // ── Text/Script ──────────────────────────────────────────
  scriptWriting: {
    primary: 'gpt-5.4',
    fallback: 'gpt-5.4-mini',
    provider: 'OpenAI',
    endpoint: undefined, // API_INTEGRATION_POINT: https://api.openai.com/v1/chat/completions
    apiKeyEnv: 'OPENAI_API_KEY',
    enabled: true,
    maxRetries: 3,
    timeoutMs: 30000,
  },
  promptRefinement: {
    primary: 'gpt-5.4-mini',
    fallback: 'gpt-5.4',
    provider: 'OpenAI',
    endpoint: undefined,
    apiKeyEnv: 'OPENAI_API_KEY',
    enabled: true,
    maxRetries: 2,
    timeoutMs: 15000,
  },
  continuityQA: {
    primary: 'gpt-5.4-mini',
    fallback: null,
    provider: 'OpenAI',
    endpoint: undefined,
    apiKeyEnv: 'OPENAI_API_KEY',
    enabled: true,
    maxRetries: 2,
    timeoutMs: 20000,
  },

  // ── Image Generation ─────────────────────────────────────
  imageGenPrimary: {
    primary: 'Imagen 4 Ultra',
    fallback: 'FLUX',
    provider: 'Google Vertex',
    endpoint: undefined, // API_INTEGRATION_POINT: Vertex AI endpoint
    apiKeyEnv: 'GOOGLE_VERTEX_KEY',
    enabled: true,
    maxRetries: 3,
    timeoutMs: 60000,
  },
  imageGenSecondary: {
    primary: 'FLUX',
    fallback: 'Imagen 4 Ultra',
    provider: 'Configured Provider',
    endpoint: undefined, // API_INTEGRATION_POINT: FLUX provider endpoint
    apiKeyEnv: 'FLUX_API_KEY',
    enabled: true,
    maxRetries: 3,
    timeoutMs: 60000,
  },
  imageEditing: {
    primary: 'NanoBanana Pro',
    fallback: 'Imagen 4 Ultra',
    provider: 'NanoBanana',
    endpoint: undefined, // API_INTEGRATION_POINT
    apiKeyEnv: 'NANOBANANA_API_KEY',
    enabled: false, // disabled until provider is configured
    maxRetries: 2,
    timeoutMs: 45000,
  },

  // ── Video Generation ─────────────────────────────────────
  videoGenPrimary: {
    primary: 'Kling 3',
    fallback: 'Seedance 2',
    provider: 'Kling',
    endpoint: undefined, // API_INTEGRATION_POINT
    apiKeyEnv: 'KLING_API_KEY',
    enabled: true,
    maxRetries: 3,
    timeoutMs: 120000,
  },
  videoGenSecondary: {
    primary: 'Seedance 2',
    fallback: 'Sora 2',
    provider: 'Seedance',
    endpoint: undefined, // API_INTEGRATION_POINT
    apiKeyEnv: 'SEEDANCE_API_KEY',
    enabled: true,
    maxRetries: 3,
    timeoutMs: 120000,
  },
  videoGenFallback: {
    primary: 'Sora 2 Pro',
    fallback: 'Sora 2',
    provider: 'OpenAI',
    endpoint: undefined, // API_INTEGRATION_POINT
    apiKeyEnv: 'OPENAI_API_KEY',
    enabled: false, // enable when Sora access is available
    maxRetries: 2,
    timeoutMs: 180000,
  },

  // ── Audio/Voice ──────────────────────────────────────────
  ttsPrimary: {
    primary: 'eleven_v3',
    fallback: 'eleven_turbo_v2_5',
    provider: 'ElevenLabs',
    endpoint: undefined, // API_INTEGRATION_POINT: https://api.elevenlabs.io/v1/text-to-speech
    apiKeyEnv: 'ELEVENLABS_API_KEY',
    enabled: true,
    maxRetries: 3,
    timeoutMs: 30000,
  },
  ttsFast: {
    primary: 'eleven_turbo_v2_5',
    fallback: 'eleven_v3',
    provider: 'ElevenLabs',
    endpoint: undefined,
    apiKeyEnv: 'ELEVENLABS_API_KEY',
    enabled: true,
    maxRetries: 2,
    timeoutMs: 15000,
  },
  voiceCloning: {
    primary: 'ElevenLabs PVC',
    fallback: null,
    provider: 'ElevenLabs',
    endpoint: undefined, // API_INTEGRATION_POINT
    apiKeyEnv: 'ELEVENLABS_API_KEY',
    enabled: true,
    maxRetries: 1,
    timeoutMs: 300000, // 5 min for PVC
  },
  transcription: {
    primary: 'gpt-4o-transcribe',
    fallback: null,
    provider: 'OpenAI',
    endpoint: undefined, // API_INTEGRATION_POINT
    apiKeyEnv: 'OPENAI_API_KEY',
    enabled: true,
    maxRetries: 2,
    timeoutMs: 60000,
  },
};

// ── Failover Logic ──────────────────────────────────────────
// API_INTEGRATION_POINT: Implement real failover in service adapters

export function resolveModel(category: ModelCategory): string {
  const route = MODEL_ROUTING[category];
  if (route.enabled) return route.primary;
  if (route.fallback) {
    console.warn(`[ModelRouter] ${route.primary} disabled, falling back to ${route.fallback}`);
    return route.fallback;
  }
  throw new Error(`[ModelRouter] No available model for ${category}`);
}

export function getProviderForCategory(category: ModelCategory): string {
  return MODEL_ROUTING[category].provider;
}
