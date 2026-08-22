import {
  PRODUCT_GENERATION_LIFECYCLE_TYPES,
  getProductFeatureLifecycleContract,
  type GenerationLifecycleContract,
  type ProductGenerationLifecycleType,
} from "@/lib/generation/lifecycle-contract";

export const PRODUCT_FEATURE_CATEGORIES = ["image", "video", "edit", "audio"] as const;
export const PRODUCT_FEATURE_STATES = ["active", "partial", "ui_only", "unknown"] as const;
export const PRODUCT_FEATURE_LIFECYCLES = ["inline", "task", "special_workflow", "workflow_job", "no_generation"] as const;
export const PRODUCT_FEATURE_ORCHESTRATION = ["inline", "task", "special", "workflow", "none"] as const;
export const PRODUCT_FEATURE_MODEL_STATUSES = ["connected", "partial", "none", "unknown"] as const;
export const PRODUCT_FEATURE_ROUTING_STATUSES = ["active", "standby", "disconnected", "not_applicable", "unknown"] as const;
export const PRODUCT_FEATURE_PRICING_STATUSES = ["core", "legacy", "fixed", "mixed", "none", "unknown"] as const;
export const PRODUCT_FEATURE_GENERATION_STATUSES = [
  "inline_orchestrated",
  "task_orchestrated",
  "special_workflow",
  "workflow_job",
  "no_generation",
] as const;
export const PRODUCT_FEATURE_PROVIDER_STATUSES = ["active", "standby", "mixed", "none", "unknown"] as const;
export const PRODUCT_FEATURE_OVERALL_CONTROLS = ["CONTROLLED", "PARTIAL", "UNCONTROLLED", "UNKNOWN"] as const;

export type ProductFeatureCategory = (typeof PRODUCT_FEATURE_CATEGORIES)[number];
export type ProductFeatureState = (typeof PRODUCT_FEATURE_STATES)[number];
export type ProductFeatureLifecycle = (typeof PRODUCT_FEATURE_LIFECYCLES)[number];
export type ProductFeatureOrchestration = (typeof PRODUCT_FEATURE_ORCHESTRATION)[number];
export type ProductFeatureModelStatus = (typeof PRODUCT_FEATURE_MODEL_STATUSES)[number];
export type ProductFeatureRoutingStatus = (typeof PRODUCT_FEATURE_ROUTING_STATUSES)[number];
export type ProductFeaturePricingStatus = (typeof PRODUCT_FEATURE_PRICING_STATUSES)[number];
export type ProductFeatureGenerationStatus = (typeof PRODUCT_FEATURE_GENERATION_STATUSES)[number];
export type ProductFeatureProviderStatus = (typeof PRODUCT_FEATURE_PROVIDER_STATUSES)[number];
export type ProductFeatureOverallControl = (typeof PRODUCT_FEATURE_OVERALL_CONTROLS)[number];

export type ProductFeatureControlFields = {
  modelStatus: ProductFeatureModelStatus;
  routingStatus: ProductFeatureRoutingStatus;
  pricingStatus: ProductFeaturePricingStatus;
  generationStatus: ProductFeatureGenerationStatus;
  providerStatus: ProductFeatureProviderStatus;
  overallControl: ProductFeatureOverallControl;
  controlReasons: string[];
};

export type ProductFeature = {
  id: string;
  category: ProductFeatureCategory;
  displayName: string;
  uiRoute: string | null;
  apiRoutes: string[];
  state: ProductFeatureState;
  lifecycle: ProductFeatureLifecycle;
  modelRefs: string[];
  providerRefs: string[];
  pricingRefs: string[];
  orchestration: ProductFeatureOrchestration;
  generationLifecycleType: ProductGenerationLifecycleType;
  lifecycleContractId: string;
  lifecycleContract: GenerationLifecycleContract | null;
  registryConnected: boolean;
  routingConnected: boolean;
  statusRoute: string | null;
  enabled: true;
  visible: true;
} & ProductFeatureControlFields;

type ProductFeatureInput = Omit<
  ProductFeature,
  "enabled" | "visible" | "generationLifecycleType" | "lifecycleContractId" | "lifecycleContract" | keyof ProductFeatureControlFields
>;

function feature(input: ProductFeatureInput): ProductFeature {
  const lifecycleContract = getProductFeatureLifecycleContract(input.id);

  return {
    ...input,
    ...deriveFeatureControl(input),
    generationLifecycleType: deriveProductGenerationLifecycleType(input.lifecycle, lifecycleContract),
    lifecycleContractId: lifecycleContract?.id ?? "unknown",
    lifecycleContract,
    enabled: true,
    visible: true,
  };
}

function control(fields: ProductFeatureControlFields): ProductFeatureControlFields {
  return fields;
}

const FEATURE_CONTROL_BY_ID: Record<string, ProductFeatureControlFields> = {
  "image-create-image": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Model-based image generation now resolves through Runtime Routing Control when an active route exists, with legacy fallback preserved for unmatched configs."],
  }),
  "image-prompt-extractor": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "fixed",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed OpenAI prompt extraction flow with explicit fixed pricing; model routing is not required."],
  }),
  "image-relight": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed WaveSpeed relight route with known pricing and provider; model routing is not required for this tool action."],
  }),
  "image-image-upscale": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed WaveSpeed upscale tool is wired through the inline orchestrator and central pricing."],
  }),
  "image-prompt": control({
    modelStatus: "none",
    routingStatus: "not_applicable",
    pricingStatus: "none",
    generationStatus: "no_generation",
    providerStatus: "none",
    overallControl: "CONTROLLED",
    controlReasons: ["Intentional no-generation prompt surface; no model, provider, routing, or pricing control is required."],
  }),
  "image-cinema-studio-image-2": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Approved UI feature exists, but the UI-to-backend generation link is not proven in the current Master Map."],
  }),
  "image-inpaint": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Model-based image inpaint now resolves through Runtime Routing Control when an active route exists, with legacy fallback preserved for unmatched configs."],
  }),
  "image-face-swap": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed WaveSpeed face-swap tool is wired through the inline orchestrator and central pricing."],
  }),
  "image-character-swap": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Approved UI feature exists, but no current backend generation route is proven for this surface."],
  }),
  "image-draw-to-edit": control({
    modelStatus: "partial",
    routingStatus: "not_applicable",
    pricingStatus: "none",
    generationStatus: "no_generation",
    providerStatus: "active",
    overallControl: "UNCONTROLLED",
    controlReasons: ["UI points at a draw action, but the proven edit-tool backend does not expose a priced generation lifecycle for it."],
  }),
  "video-hook-studio": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Hook Studio execution now resolves model provider routes through Runtime Routing Control when an active route exists, with route-local fallback preserved."],
  }),
  "video-cinema-flow": control({
    modelStatus: "partial",
    routingStatus: "unknown",
    pricingStatus: "mixed",
    generationStatus: "special_workflow",
    providerStatus: "mixed",
    overallControl: "PARTIAL",
    controlReasons: ["Feature delegates to mixed downstream image, video, and audio routes, so control status is only partially proven."],
  }),
  "video-cinema-edit": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "task_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Cinematic Veo task lifecycle is task-orchestrated with known Google provider and central pricing."],
  }),
  "video-storyboard-studio": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "legacy",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Storyboard has a proven fixed provider route and intentional legacy panel pricing."],
  }),
  "video-cinematic-styles": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Uses /api/video, which now resolves active model routes through Runtime Routing Control before falling back to legacy provider maps."],
  }),
  "video-video-extend": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "task_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Video Extend uses the cinematic task flow with known Google provider and central pricing."],
  }),
  "video-clipcraft-studio": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "legacy",
    generationStatus: "task_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["ClipCraft Reap lifecycle is task-orchestrated and intentionally keeps local Reap pricing."],
  }),
  "video-ai-canvas": control({
    modelStatus: "partial",
    routingStatus: "unknown",
    pricingStatus: "mixed",
    generationStatus: "special_workflow",
    providerStatus: "mixed",
    overallControl: "PARTIAL",
    controlReasons: ["Canvas delegates to node-based downstream generators, so model/provider/pricing control is mixed."],
  }),
  "video-assist": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "fixed",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Assist is a fixed OpenAI conversation action with explicit fixed pricing; model routing is not required."],
  }),
  "video-agent-studio": control({
    modelStatus: "partial",
    routingStatus: "unknown",
    pricingStatus: "mixed",
    generationStatus: "special_workflow",
    providerStatus: "mixed",
    overallControl: "PARTIAL",
    controlReasons: ["Agent Studio combines a planner with downstream generation routes, so effective control remains mixed."],
  }),
  "video-create-video": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Main video generation now resolves active model routes through Runtime Routing Control before falling back to legacy provider maps."],
  }),
  "video-transitions": control({
    modelStatus: "connected",
    routingStatus: "disconnected",
    pricingStatus: "core",
    generationStatus: "workflow_job",
    providerStatus: "standby",
    overallControl: "PARTIAL",
    controlReasons: ["Transitions records legacy routing metadata, but its workflow job still executes KIE only; KIE is standby and no active WaveSpeed parity route is proven."],
  }),
  "video-draw-to-video": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Draw to Video uses /api/video, which now resolves active model routes through Runtime Routing Control before legacy fallback."],
  }),
  "video-edit-video": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Edit Video uses /api/video, which now resolves active model routes through Runtime Routing Control before legacy fallback."],
  }),
  "video-lipsync-studio": control({
    modelStatus: "connected",
    routingStatus: "disconnected",
    pricingStatus: "legacy",
    generationStatus: "special_workflow",
    providerStatus: "mixed",
    overallControl: "PARTIAL",
    controlReasons: ["Lip-sync records legacy routing metadata, but the current action path resolves to KIE-specific upload/task execution while KIE is standby."],
  }),
  "video-video-upscale": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed WaveSpeed video upscale tool is wired through the inline orchestrator and central pricing."],
  }),
  "video-3d-studio": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["3D now resolves endpoint provider routes through Runtime Routing Control when an active WaveSpeed route exists, with legacy fallback preserved and KIE still blocked while standby."],
  }),
  "video-smart-cli": control({
    modelStatus: "partial",
    routingStatus: "unknown",
    pricingStatus: "mixed",
    generationStatus: "special_workflow",
    providerStatus: "mixed",
    overallControl: "PARTIAL",
    controlReasons: ["Smart CLI delegates execution to MCP/downstream tools, so effective model/provider/pricing control is mixed."],
  }),
  "edit-background-remove": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed WaveSpeed remove-bg tool is wired through the inline orchestrator and central pricing."],
  }),
  "edit-ai-inpainting": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Edit inpainting tool has known provider/model refs, central pricing, and inline orchestration."],
  }),
  "edit-upscale-enhance": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Fixed WaveSpeed upscale/enhance tool is wired through the inline orchestrator and central pricing."],
  }),
  "edit-style-transfer": control({
    modelStatus: "connected",
    routingStatus: "not_applicable",
    pricingStatus: "core",
    generationStatus: "inline_orchestrated",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Style transfer has a fixed WaveSpeed model route, central pricing, and inline orchestration."],
  }),
  "edit-smart-crop": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Approved UI feature exists, but no current backend generation route is proven for this surface."],
  }),
  "edit-colorize": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Approved UI feature exists, but no current UI route or backend generation route is proven for this surface."],
  }),
  "audio-text-to-music": control({
    modelStatus: "connected",
    routingStatus: "active",
    pricingStatus: "core",
    generationStatus: "special_workflow",
    providerStatus: "active",
    overallControl: "CONTROLLED",
    controlReasons: ["Text to Music now resolves audio provider routes through Runtime Routing Control when an active route exists, with legacy fallback preserved."],
  }),
  "audio-voice-cloning": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Voice-cloning API existence is noted, but the approved UI-to-backend generation link is unproven."],
  }),
  "audio-sound-effects": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Sound-effect API existence is noted, but the approved UI-to-backend generation link is unproven."],
  }),
  "audio-podcast-studio": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Approved UI feature exists, but no current backend generation route is proven for this surface."],
  }),
  "audio-music-stems": control({
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: "no_generation",
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["Approved UI feature exists, but no current UI route or backend generation route is proven for this surface."],
  }),
  "audio-lyrics-writer": control({
    modelStatus: "none",
    routingStatus: "not_applicable",
    pricingStatus: "none",
    generationStatus: "no_generation",
    providerStatus: "none",
    overallControl: "CONTROLLED",
    controlReasons: ["Intentional no-generation writing surface; no model, provider, routing, or pricing control is required."],
  }),
};

function deriveFeatureControl(input: ProductFeatureInput): ProductFeatureControlFields {
  const controlFields = FEATURE_CONTROL_BY_ID[input.id];
  if (controlFields) return controlFields;

  return {
    modelStatus: "unknown",
    routingStatus: "unknown",
    pricingStatus: "unknown",
    generationStatus: deriveGenerationStatus(input.lifecycle),
    providerStatus: "unknown",
    overallControl: "UNKNOWN",
    controlReasons: ["No control mapping exists for this approved feature id."],
  };
}

function deriveGenerationStatus(lifecycle: ProductFeatureLifecycle): ProductFeatureGenerationStatus {
  if (lifecycle === "inline") return "inline_orchestrated";
  if (lifecycle === "task") return "task_orchestrated";
  return lifecycle;
}

function deriveProductGenerationLifecycleType(
  lifecycle: ProductFeatureLifecycle,
  lifecycleContract: GenerationLifecycleContract | null,
): ProductGenerationLifecycleType {
  if (lifecycle === "no_generation") return "no_generation";
  return lifecycleContract?.lifecycleType ?? lifecycle;
}

export const PRODUCT_FEATURE_REGISTRY: ProductFeature[] = [
  feature({
    id: "image-create-image",
    category: "image",
    displayName: "Create Image",
    uiRoute: "/image?tool=create",
    apiRoutes: ["/api/generate/image"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected image model"],
    providerRefs: ["google", "openai", "wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-prompt-extractor",
    category: "image",
    displayName: "Prompt Extractor",
    uiRoute: "/prompt-extractor",
    apiRoutes: ["/api/prompt-extractor"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["PROMPT_EXTRACTOR_MODEL", "gpt-4o"],
    providerRefs: ["openai"],
    pricingRefs: ["PROMPT_EXTRACTOR_CREDIT_COST"],
    orchestration: "special",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-relight",
    category: "image",
    displayName: "Relight",
    uiRoute: "/image?tool=relight",
    apiRoutes: ["/api/generate/image"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["seedream/4.5-edit"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-image-upscale",
    category: "image",
    displayName: "Image Upscale",
    uiRoute: "/image?tool=upscale",
    apiRoutes: ["/api/generate/upscale"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["tool:upscale"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-prompt",
    category: "image",
    displayName: "Prompt",
    uiRoute: "/image",
    apiRoutes: [],
    state: "ui_only",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-cinema-studio-image-2",
    category: "image",
    displayName: "Cinema Studio Image 2.0",
    uiRoute: "/shots",
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-inpaint",
    category: "image",
    displayName: "Inpaint",
    uiRoute: "/image?tool=inpaint",
    apiRoutes: ["/api/generate/image"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected edit image model"],
    providerRefs: ["google", "wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-face-swap",
    category: "image",
    displayName: "Face Swap",
    uiRoute: "/image?tool=face-swap",
    apiRoutes: ["/api/generate/face-swap"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["tool:face-swap"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-character-swap",
    category: "image",
    displayName: "Character Swap",
    uiRoute: "/apps/tool/character-swap",
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "image-draw-to-edit",
    category: "image",
    displayName: "Draw to Edit",
    uiRoute: "/edit?tool=draw",
    apiRoutes: ["/api/generate/edit-tool"],
    state: "partial",
    lifecycle: "no_generation",
    modelRefs: ["draw action"],
    providerRefs: ["wavespeed"],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "video-hook-studio",
    category: "video",
    displayName: "Hook Studio",
    uiRoute: "/hook-studio",
    apiRoutes: ["/api/hook-studio/generate"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected hook model"],
    providerRefs: ["google", "wavespeed"],
    pricingRefs: ["getHookStudioCreditsAsync"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/video?taskId=",
  }),
  feature({
    id: "video-cinema-flow",
    category: "video",
    displayName: "Cinema Flow",
    uiRoute: "/cinema-flow",
    apiRoutes: ["/api/cinema-flow/chat", "/api/generate/image", "/api/video", "/api/generate/audio"],
    state: "partial",
    lifecycle: "special_workflow",
    modelRefs: ["mixed downstream"],
    providerRefs: ["downstream"],
    pricingRefs: ["mixed downstream"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "mixed downstream",
  }),
  feature({
    id: "video-cinema-edit",
    category: "video",
    displayName: "Cinema Edit",
    uiRoute: "/cinematic-video",
    apiRoutes: ["/api/cinematic-video/generate"],
    state: "active",
    lifecycle: "task",
    modelRefs: ["Veo tier pricing id"],
    providerRefs: ["google"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "task",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/cinematic-video/status",
  }),
  feature({
    id: "video-storyboard-studio",
    category: "video",
    displayName: "Storyboard Studio",
    uiRoute: "/storyboard",
    apiRoutes: ["/api/runninghub/storyboard-production"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["bytedance/seedream-v4.5/edit"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["local quality credits per panel"],
    orchestration: "special",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "video-cinematic-styles",
    category: "video",
    displayName: "Cinematic Styles",
    uiRoute: "/apps/tool/cinematic-styles",
    apiRoutes: ["/api/video/quote", "/api/video"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected video model"],
    providerRefs: ["api/video logic"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/video?taskId=",
  }),
  feature({
    id: "video-video-extend",
    category: "video",
    displayName: "Video Extend",
    uiRoute: "/video-extend",
    apiRoutes: ["/api/cinematic-video/generate", "/api/video-extend/stitch"],
    state: "active",
    lifecycle: "task",
    modelRefs: ["Veo extend"],
    providerRefs: ["google"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "task",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/cinematic-video/status",
  }),
  feature({
    id: "video-clipcraft-studio",
    category: "video",
    displayName: "ClipCraft Studio",
    uiRoute: "/clipcraft-studio",
    apiRoutes: ["/api/clipcraft/start"],
    state: "active",
    lifecycle: "task",
    modelRefs: ["clipcraft:{tool}"],
    providerRefs: ["reap"],
    pricingRefs: ["local Reap credits"],
    orchestration: "task",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/clipcraft/status",
  }),
  feature({
    id: "video-ai-canvas",
    category: "video",
    displayName: "AI Canvas",
    uiRoute: "/canvas",
    apiRoutes: ["/api/generate/image", "/api/video", "/api/generate/audio", "/api/music", "/api/generate/upscale", "/api/conversation"],
    state: "partial",
    lifecycle: "special_workflow",
    modelRefs: ["node-based"],
    providerRefs: ["downstream"],
    pricingRefs: ["downstream"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "mixed downstream",
  }),
  feature({
    id: "video-assist",
    category: "video",
    displayName: "Assist",
    uiRoute: "/conversation",
    apiRoutes: ["/api/conversation"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["gpt-4"],
    providerRefs: ["openai"],
    pricingRefs: ["ASSIST_CHAT_CREDITS"],
    orchestration: "special",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "video-agent-studio",
    category: "video",
    displayName: "Agent Studio",
    uiRoute: "/agent-studio",
    apiRoutes: ["/api/agent-studio/run", "/api/video", "/api/generate/image"],
    state: "partial",
    lifecycle: "special_workflow",
    modelRefs: ["gpt-4 planner", "downstream"],
    providerRefs: ["openai", "downstream"],
    pricingRefs: ["ASSIST_CHAT_CREDITS", "downstream"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "downstream",
  }),
  feature({
    id: "video-create-video",
    category: "video",
    displayName: "Create Video",
    uiRoute: "/video?tool=create-video",
    apiRoutes: ["/api/video"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected video modelRoute"],
    providerRefs: ["google", "kie", "wavespeed", "byteplus"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/video?taskId=",
  }),
  feature({
    id: "video-transitions",
    category: "video",
    displayName: "Transitions",
    uiRoute: "/apps/tool/transitions",
    apiRoutes: ["/api/transitions/generate"],
    state: "active",
    lifecycle: "workflow_job",
    modelRefs: ["kling-3.0/video", "bytedance/seedance-2-mini"],
    providerRefs: ["kie"],
    pricingRefs: ["calcTransitionCreditsForModel"],
    orchestration: "workflow",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/transitions/job/[id]",
  }),
  feature({
    id: "video-draw-to-video",
    category: "video",
    displayName: "Draw to Video",
    uiRoute: "/apps/tool/draw-to-video",
    apiRoutes: ["/api/video"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected video model"],
    providerRefs: ["api/video logic"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/video?taskId=",
  }),
  feature({
    id: "video-edit-video",
    category: "video",
    displayName: "Edit Video",
    uiRoute: "/video-edit",
    apiRoutes: ["/api/video"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["active modelRoute"],
    providerRefs: ["api/video logic"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/video?taskId=",
  }),
  feature({
    id: "video-lipsync-studio",
    category: "video",
    displayName: "Lipsync Studio",
    uiRoute: "/lipsync",
    apiRoutes: ["/api/generate/audio"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["lip-sync model"],
    providerRefs: ["kie", "wavespeed"],
    pricingRefs: ["audio/avatar user charge core"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "video-video-upscale",
    category: "video",
    displayName: "Video Upscale",
    uiRoute: "/edit?tool=upscale",
    apiRoutes: ["/api/generate/upscale"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["tool:upscale"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "video-3d-studio",
    category: "video",
    displayName: "3D Studio",
    uiRoute: "/3d",
    apiRoutes: ["/api/3d"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["endpointKey", "modelId"],
    providerRefs: ["kie", "wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "/api/3d?taskId=",
  }),
  feature({
    id: "video-smart-cli",
    category: "video",
    displayName: "Smart CLI",
    uiRoute: "/smart-cli",
    apiRoutes: ["/api/smart-cli/mcp"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["MCP tools"],
    providerRefs: ["delegated"],
    pricingRefs: ["delegated"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: "delegated",
  }),
  feature({
    id: "edit-background-remove",
    category: "edit",
    displayName: "Background Remove",
    uiRoute: "/edit?tool=bgremove",
    apiRoutes: ["/api/generate/remove-bg"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["tool:remove-bg"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "edit-ai-inpainting",
    category: "edit",
    displayName: "AI Inpainting",
    uiRoute: "/edit?tool=inpaint",
    apiRoutes: ["/api/generate/edit-tool"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["edit model"],
    providerRefs: ["google", "wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "edit-upscale-enhance",
    category: "edit",
    displayName: "Upscale & Enhance",
    uiRoute: "/edit?tool=upscale",
    apiRoutes: ["/api/generate/upscale"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["tool:upscale"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "edit-style-transfer",
    category: "edit",
    displayName: "Style Transfer",
    uiRoute: "/edit?tool=style",
    apiRoutes: ["/api/generate/edit-tool"],
    state: "active",
    lifecycle: "inline",
    modelRefs: ["qwen2/image-edit"],
    providerRefs: ["wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "inline",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "edit-smart-crop",
    category: "edit",
    displayName: "Smart Crop",
    uiRoute: "/edit/crop",
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "edit-colorize",
    category: "edit",
    displayName: "Colorize",
    uiRoute: null,
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "audio-text-to-music",
    category: "audio",
    displayName: "Text to Music",
    uiRoute: "/audio",
    apiRoutes: ["/api/music"],
    state: "active",
    lifecycle: "special_workflow",
    modelRefs: ["selected audio model"],
    providerRefs: ["google", "wavespeed"],
    pricingRefs: ["getGenerationCost"],
    orchestration: "special",
    registryConnected: true,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "audio-voice-cloning",
    category: "audio",
    displayName: "Voice Cloning",
    uiRoute: "/audio",
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: ["voice-cloning API exists but UI link unproven"],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "audio-sound-effects",
    category: "audio",
    displayName: "Sound Effects",
    uiRoute: "/audio",
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: ["sound-effect API exists but UI link unproven"],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "audio-podcast-studio",
    category: "audio",
    displayName: "Podcast Studio",
    uiRoute: "/audio",
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "audio-music-stems",
    category: "audio",
    displayName: "Music Stems",
    uiRoute: null,
    apiRoutes: [],
    state: "unknown",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
  feature({
    id: "audio-lyrics-writer",
    category: "audio",
    displayName: "Lyrics Writer",
    uiRoute: "/audio",
    apiRoutes: [],
    state: "ui_only",
    lifecycle: "no_generation",
    modelRefs: [],
    providerRefs: [],
    pricingRefs: [],
    orchestration: "none",
    registryConnected: false,
    routingConnected: false,
    statusRoute: null,
  }),
];

export const APPROVED_PRODUCT_FEATURE_IDS = PRODUCT_FEATURE_REGISTRY.map((feature) => feature.id);

export function getProductFeatureSummary(features: ProductFeature[] = PRODUCT_FEATURE_REGISTRY) {
  return {
    total: features.length,
    byCategory: countBy(features, (feature) => feature.category),
    byState: countBy(features, (feature) => feature.state),
    byLifecycle: countBy(features, (feature) => feature.lifecycle),
    byGenerationLifecycleType: countBy(features, (feature) => feature.generationLifecycleType),
    byOrchestration: countBy(features, (feature) => feature.orchestration),
    byModelStatus: countBy(features, (feature) => feature.modelStatus),
    byRoutingStatus: countBy(features, (feature) => feature.routingStatus),
    byPricingStatus: countBy(features, (feature) => feature.pricingStatus),
    byGenerationStatus: countBy(features, (feature) => feature.generationStatus),
    byProviderStatus: countBy(features, (feature) => feature.providerStatus),
    byOverallControl: countBy(features, (feature) => feature.overallControl),
    registryConnected: features.filter((feature) => feature.registryConnected).length,
    routingConnected: features.filter((feature) => feature.routingConnected).length,
  };
}

export function validateProductFeatureRegistry(features: ProductFeature[] = PRODUCT_FEATURE_REGISTRY): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (features.length !== 40) {
    errors.push(`Expected exactly 40 product features, found ${features.length}.`);
  }

  for (const item of features) {
    if (ids.has(item.id)) {
      errors.push(`Duplicate feature id: ${item.id}.`);
    }
    ids.add(item.id);

    if (!PRODUCT_FEATURE_CATEGORIES.includes(item.category)) {
      errors.push(`Invalid category for ${item.id}: ${item.category}.`);
    }
    if (!PRODUCT_FEATURE_STATES.includes(item.state)) {
      errors.push(`Invalid state for ${item.id}: ${item.state}.`);
    }
    if (!PRODUCT_FEATURE_LIFECYCLES.includes(item.lifecycle)) {
      errors.push(`Invalid lifecycle for ${item.id}: ${item.lifecycle}.`);
    }
    if (!PRODUCT_GENERATION_LIFECYCLE_TYPES.includes(item.generationLifecycleType)) {
      errors.push(`Invalid generation lifecycle type for ${item.id}: ${item.generationLifecycleType}.`);
    }
    if (item.lifecycle !== "no_generation" && item.lifecycleContract?.lifecycleType !== item.generationLifecycleType) {
      errors.push(`Lifecycle contract mismatch for ${item.id}: ${item.lifecycleContractId}.`);
    }
    if (!PRODUCT_FEATURE_ORCHESTRATION.includes(item.orchestration)) {
      errors.push(`Invalid orchestration for ${item.id}: ${item.orchestration}.`);
    }
    if (!PRODUCT_FEATURE_MODEL_STATUSES.includes(item.modelStatus)) {
      errors.push(`Invalid model status for ${item.id}: ${item.modelStatus}.`);
    }
    if (!PRODUCT_FEATURE_ROUTING_STATUSES.includes(item.routingStatus)) {
      errors.push(`Invalid routing status for ${item.id}: ${item.routingStatus}.`);
    }
    if (!PRODUCT_FEATURE_PRICING_STATUSES.includes(item.pricingStatus)) {
      errors.push(`Invalid pricing status for ${item.id}: ${item.pricingStatus}.`);
    }
    if (!PRODUCT_FEATURE_GENERATION_STATUSES.includes(item.generationStatus)) {
      errors.push(`Invalid generation status for ${item.id}: ${item.generationStatus}.`);
    }
    if (!PRODUCT_FEATURE_PROVIDER_STATUSES.includes(item.providerStatus)) {
      errors.push(`Invalid provider status for ${item.id}: ${item.providerStatus}.`);
    }
    if (!PRODUCT_FEATURE_OVERALL_CONTROLS.includes(item.overallControl)) {
      errors.push(`Invalid overall control for ${item.id}: ${item.overallControl}.`);
    }
    if (!item.controlReasons.length) {
      errors.push(`Control mapping must include at least one reason for ${item.id}.`);
    }
    if (item.enabled !== true || item.visible !== true) {
      errors.push(`Product registry flags must stay true for ${item.id}.`);
    }
  }

  return errors;
}

function countBy<T extends string>(features: ProductFeature[], pick: (feature: ProductFeature) => T): Record<T, number> {
  return features.reduce(
    (acc, item) => {
      const key = pick(item);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}
