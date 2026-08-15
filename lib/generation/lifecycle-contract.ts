export const GENERATION_LIFECYCLE_TYPES = ["inline", "task", "workflow_job", "special_workflow"] as const;
export const PRODUCT_GENERATION_LIFECYCLE_TYPES = [...GENERATION_LIFECYCLE_TYPES, "no_generation"] as const;

export type GenerationLifecycleType = (typeof GENERATION_LIFECYCLE_TYPES)[number];
export type ProductGenerationLifecycleType = (typeof PRODUCT_GENERATION_LIFECYCLE_TYPES)[number];

export type LifecycleSupport = "yes" | "no" | "mixed" | "not_applicable";

export type GenerationLifecycleContract = {
  id: string;
  lifecycleType: GenerationLifecycleType;
  entryRoutes: string[];
  providerResolution: string;
  pricingSource: string;
  chargeBehavior: string;
  taskBehavior: string;
  completionBehavior: string;
  failureRefundPolicy: string;
  multipleOutputsSupport: LifecycleSupport;
  freeGenerationSupport: LifecycleSupport;
  idempotencySupport: LifecycleSupport;
};

export const GENERATION_LIFECYCLE_CONTRACTS: Record<string, GenerationLifecycleContract> = {
  inline_tool: {
    id: "inline_tool",
    lifecycleType: "inline",
    entryRoutes: [
      "/api/generate/remove-bg",
      "/api/generate/face-swap",
      "/api/generate/edit-tool",
      "/api/generate/upscale",
      "/api/generate/watermark-remove",
      "/api/panel/generate/music",
    ],
    providerResolution: "Fixed route/provider owned by the route, with optional runtime routing only where already wired.",
    pricingSource: "Pricing Core or route-owned preserved pricing helper.",
    chargeBehavior: "runInlineGeneration calls spendCredits before provider execution.",
    taskBehavior: "Provider submit/poll runs inside the same request when needed.",
    completionBehavior: "runInlineGeneration calls setGenerationMediaUrl for the primary output.",
    failureRefundPolicy: "Route-selected refund/rollback behavior through runInlineGeneration.",
    multipleOutputsSupport: "no",
    freeGenerationSupport: "no",
    idempotencySupport: "not_applicable",
  },
  task_generation: {
    id: "task_generation",
    lifecycleType: "task",
    entryRoutes: [
      "/api/cinematic-video/generate",
      "/api/cinematic-video/status",
      "/api/panel/reap/start",
      "/api/panel/reap/status",
      "/api/clipcraft/start",
      "/api/clipcraft/status",
      "/api/studio-edit/start",
      "/api/studio-edit/status",
    ],
    providerResolution: "Known route/provider owned by the task route.",
    pricingSource: "Pricing Core or route-owned preserved pricing helper.",
    chargeBehavior: "runTaskGenerationStart calls spendCredits before provider submit.",
    taskBehavior: "Provider submit returns task id; task marker is saved with setGenerationTaskMarker.",
    completionBehavior: "Status/callback routes call completeTaskGeneration when behavior matches.",
    failureRefundPolicy: "Task routes use their preserved refund/rollback policy; helpers are used only when semantics match.",
    multipleOutputsSupport: "mixed",
    freeGenerationSupport: "no",
    idempotencySupport: "mixed",
  },
  workflow_job: {
    id: "workflow_job",
    lifecycleType: "workflow_job",
    entryRoutes: ["/api/transitions/generate", "/api/transitions/job/[id]"],
    providerResolution: "Workflow-owned provider resolution; currently KIE legacy metadata because KIE is standby in Routing Control.",
    pricingSource: "Transition pricing helper through Pricing Core compatibility.",
    chargeBehavior: "Workflow route calls spendCredits before provider submit.",
    taskBehavior: "TransitionJob owns workflow state and provider task id.",
    completionBehavior: "Transition status route updates transition outputs and Generation media when complete.",
    failureRefundPolicy: "Existing transition workflow refund behavior is preserved.",
    multipleOutputsSupport: "yes",
    freeGenerationSupport: "no",
    idempotencySupport: "no",
  },
  image_special_workflow: {
    id: "image_special_workflow",
    lifecycleType: "special_workflow",
    entryRoutes: ["/api/generate/image"],
    providerResolution: "Runtime Routing Control plus legacy provider fallback for Google/OpenAI/WaveSpeed branches.",
    pricingSource: "Pricing Core via getGenerationCost, with annual-free eligibility before paid charge.",
    chargeBehavior: "recordFreeGeneration for eligible annual free generations; spendCredits for paid generations.",
    taskBehavior: "OpenAI/Google return direct outputs; WaveSpeed submits and polls inside the request.",
    completionBehavior: "Primary output uses setGenerationMediaUrl; extra outputs use saveAdditionalGenerationUrls.",
    failureRefundPolicy: "Rollback semantics are preserved for charged failures.",
    multipleOutputsSupport: "yes",
    freeGenerationSupport: "yes",
    idempotencySupport: "no",
  },
  video_special_task_hybrid: {
    id: "video_special_task_hybrid",
    lifecycleType: "special_workflow",
    entryRoutes: ["/api/video"],
    providerResolution: "Runtime Routing Control where wired, with legacy provider fallback for Google/WaveSpeed/BytePlus/KIE branches.",
    pricingSource: "Pricing Core via getGenerationCost/getVideoCreditsByRouteAsync.",
    chargeBehavior: "Route-local spendCredits keeps provider-specific audit metadata and idempotency.",
    taskBehavior: "Provider-specific task prefixes are preserved: gvo:, ws:, ark:, veo:, veo1080:, veo4k:.",
    completionBehavior: "Status route uses completeTaskGeneration where equivalent to setGenerationMediaUrl.",
    failureRefundPolicy: "Custom refundGenerationCharge policy with clearMediaUrl is preserved; not forced into rollback helper.",
    multipleOutputsSupport: "mixed",
    freeGenerationSupport: "no",
    idempotencySupport: "yes",
  },
  audio_special_workflow: {
    id: "audio_special_workflow",
    lifecycleType: "special_workflow",
    entryRoutes: ["/api/generate/audio"],
    providerResolution: "Action router owns provider selection and KIE/WaveSpeed fallbacks.",
    pricingSource: "Pricing Core plus preserved legacy audio/avatar user-charge rules.",
    chargeBehavior: "Route-local spendCredits before action execution.",
    taskBehavior: "Mixed inline task submit/poll inside request, transcript-only actions, and video-output actions.",
    completionBehavior: "Route-local finalize keeps response shape and idempotency while media actions attach primary output.",
    failureRefundPolicy: "Existing route-level refundGenerationCharge behavior is preserved.",
    multipleOutputsSupport: "mixed",
    freeGenerationSupport: "no",
    idempotencySupport: "yes",
  },
  fixed_special_workflow: {
    id: "fixed_special_workflow",
    lifecycleType: "special_workflow",
    entryRoutes: ["/api/prompt-extractor", "/api/conversation"],
    providerResolution: "Fixed route-owned provider/model selection; Routing Control is not required.",
    pricingSource: "Fixed or route-owned pricing that is intentionally not model-routed.",
    chargeBehavior: "Route-local charge behavior is preserved.",
    taskBehavior: "Direct provider execution or route-owned non-task behavior.",
    completionBehavior: "Route-local response/finalization behavior is preserved.",
    failureRefundPolicy: "Route-local failure behavior is preserved.",
    multipleOutputsSupport: "no",
    freeGenerationSupport: "no",
    idempotencySupport: "mixed",
  },
  no_generation: {
    id: "no_generation",
    lifecycleType: "special_workflow",
    entryRoutes: [],
    providerResolution: "No generation provider.",
    pricingSource: "No generation pricing.",
    chargeBehavior: "No charge.",
    taskBehavior: "No task.",
    completionBehavior: "No completion.",
    failureRefundPolicy: "No refund policy.",
    multipleOutputsSupport: "not_applicable",
    freeGenerationSupport: "not_applicable",
    idempotencySupport: "not_applicable",
  },
};

export const PRODUCT_FEATURE_LIFECYCLE_CONTRACT_BY_ID: Record<string, keyof typeof GENERATION_LIFECYCLE_CONTRACTS> = {
  "image-create-image": "image_special_workflow",
  "image-prompt-extractor": "fixed_special_workflow",
  "image-relight": "image_special_workflow",
  "image-image-upscale": "inline_tool",
  "image-prompt": "no_generation",
  "image-cinema-studio-image-2": "no_generation",
  "image-inpaint": "image_special_workflow",
  "image-face-swap": "inline_tool",
  "image-character-swap": "no_generation",
  "image-draw-to-edit": "no_generation",
  "video-hook-studio": "video_special_task_hybrid",
  "video-cinema-flow": "video_special_task_hybrid",
  "video-cinema-edit": "task_generation",
  "video-storyboard-studio": "video_special_task_hybrid",
  "video-cinematic-styles": "video_special_task_hybrid",
  "video-video-extend": "task_generation",
  "video-clipcraft-studio": "task_generation",
  "video-ai-canvas": "video_special_task_hybrid",
  "video-assist": "fixed_special_workflow",
  "video-agent-studio": "video_special_task_hybrid",
  "video-create-video": "video_special_task_hybrid",
  "video-transitions": "workflow_job",
  "video-draw-to-video": "video_special_task_hybrid",
  "video-edit-video": "video_special_task_hybrid",
  "video-lipsync-studio": "audio_special_workflow",
  "video-video-upscale": "inline_tool",
  "video-3d-studio": "video_special_task_hybrid",
  "video-smart-cli": "video_special_task_hybrid",
  "edit-background-remove": "inline_tool",
  "edit-ai-inpainting": "inline_tool",
  "edit-upscale-enhance": "inline_tool",
  "edit-style-transfer": "inline_tool",
  "edit-smart-crop": "no_generation",
  "edit-colorize": "no_generation",
  "audio-text-to-music": "audio_special_workflow",
  "audio-voice-cloning": "no_generation",
  "audio-sound-effects": "no_generation",
  "audio-podcast-studio": "no_generation",
  "audio-music-stems": "no_generation",
  "audio-lyrics-writer": "no_generation",
};

export function getProductFeatureLifecycleContract(featureId: string): GenerationLifecycleContract | null {
  const contractId = PRODUCT_FEATURE_LIFECYCLE_CONTRACT_BY_ID[featureId];
  return contractId ? GENERATION_LIFECYCLE_CONTRACTS[contractId] : null;
}
