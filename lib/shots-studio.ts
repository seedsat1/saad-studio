// ─── Shots Studio – Core Types, Presets, Packs & Routing ─────────────────────
// Client + server safe. No direct API calls or server-only imports.

// ─── Core Types ───────────────────────────────────────────────────────────────

export type ShotType =
  | "close_up"
  | "extreme_close_up"
  | "hero_shot"
  | "over_the_shoulder"
  | "reaction_shot"
  | "environmental_portrait"
  | "wide_shot"
  | "medium_shot"
  | "low_angle_shot"
  | "high_angle_shot"
  | "side_profile_shot"
  | "dutch_angle_shot"
  | "tracking_perspective_shot"
  | "establishing_shot"
  | "detail_shot";

export type GenerationMode = "standard" | "budget";

export type ShotModel = "nano-banana-pro" | "z-image";

export type ShotStatus = "pending" | "generating" | "success" | "failed" | "fallback";

// ─── Model-to-KIE mapping ─────────────────────────────────────────────────────

/** Internal KIE.ai API model identifiers */
export const KIE_SHOT_MODEL_IDS: Record<ShotModel, string> = {
  "nano-banana-pro": "nano-banana-pro",
  "z-image": "z-image",
} as const;

/** Credit cost per individual shot by routed model */
export const SHOT_CREDIT_COSTS: Record<ShotModel, number> = {
  "nano-banana-pro": 3,
  "z-image": 2,
} as const;

// ─── Routing Classification Sets ─────────────────────────────────────────────

/** Shot types where face/identity quality is critical – always prefer Nano Banana */
export const IDENTITY_CRITICAL_SHOTS = new Set<ShotType>([
  "close_up",
  "extreme_close_up",
  "hero_shot",
  "over_the_shoulder",
  "reaction_shot",
  "environmental_portrait",
]);

/** Shot types where scene composition outweighs facial identity – Z-Image acceptable in budget */
export const SCENE_WIDE_SHOTS = new Set<ShotType>([
  "establishing_shot",
  "wide_shot",
  "detail_shot",
  "dutch_angle_shot",
  "high_angle_shot",
  "medium_shot",
]);

// ─── Shot Preset Definition ───────────────────────────────────────────────────

export interface ShotPreset {
  type: ShotType;
  label: string;
  description: string;
  /** System-level prompt injected server-side; never exposed to client */
  systemPrompt: string;
  negativePrompt: string;
  /** Preferred aspect ratio for this shot type */
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  isIdentityCritical: boolean;
}

// ─── Shot Presets ─────────────────────────────────────────────────────────────

export const SHOT_PRESETS: Record<ShotType, ShotPreset> = {
  close_up: {
    type: "close_up",
    label: "Close-Up",
    description: "Tight frame on face with sharp facial detail",
    systemPrompt:
      "Cinematic close-up portrait, tight face framing filling most of the frame, sharp detailed eyes and skin texture, shallow depth of field, professional studio or natural lighting, high-end photography quality, 50mm lens look",
    negativePrompt:
      "wide angle, full body, crowds, background distraction, blurry face, out of focus, low resolution, watermark, text",
    aspectRatio: "4:3",
    isIdentityCritical: true,
  },
  extreme_close_up: {
    type: "extreme_close_up",
    label: "Extreme Close-Up",
    description: "Ultra-tight frame for maximum emotion and intensity",
    systemPrompt:
      "Extreme close-up shot, face fills entire frame, ultra-tight framing showing only eyes nose and mouth region, intense emotional expression, ultra-sharp macro detail on facial features, cinematic intensity, macro lens precision",
    negativePrompt:
      "full body, wide shot, environment visible, low quality, blurry, soft focus on face, distance shot",
    aspectRatio: "4:3",
    isIdentityCritical: true,
  },
  hero_shot: {
    type: "hero_shot",
    label: "Hero Shot",
    description: "Powerful, commanding subject presence",
    systemPrompt:
      "Hero shot portrait, subject centered and commanding attention, upper body to full body framing, powerful heroic stance, dramatic professional cinematic lighting from below or side, epic cinematic quality, strong confident posing, movie poster quality",
    negativePrompt:
      "weak composition, cluttered background, unflattering angle, low quality, casual snapshot, slouching",
    aspectRatio: "9:16",
    isIdentityCritical: true,
  },
  over_the_shoulder: {
    type: "over_the_shoulder",
    label: "Over The Shoulder",
    description: "Behind-subject depth perspective",
    systemPrompt:
      "Over-the-shoulder shot, camera positioned slightly behind and above subject shoulder looking outward, subject shoulder and partial profile visible in foreground as silhouette, scene or second character visible ahead in soft focus, cinematic depth of field, storytelling composition, film-quality framing",
    negativePrompt:
      "direct face forward, completely flat perspective, no depth, low quality, no foreground element",
    aspectRatio: "16:9",
    isIdentityCritical: true,
  },
  reaction_shot: {
    type: "reaction_shot",
    label: "Reaction Shot",
    description: "Authentic emotional response captured",
    systemPrompt:
      "Reaction shot, medium close-up capturing genuine emotional response, natural unguarded authentic expression, cinematic documentary-style framing, emotion clearly visible in face, candid professional photography quality, observational framing",
    negativePrompt:
      "posed stiff expression, artificial smile, wide shot, obscured face, low quality, looking at camera",
    aspectRatio: "4:3",
    isIdentityCritical: true,
  },
  environmental_portrait: {
    type: "environmental_portrait",
    label: "Environmental Portrait",
    description: "Subject in meaningful contextual setting",
    systemPrompt:
      "Environmental portrait, subject naturally placed within their contextual environment, medium or three-quarter shot showing subject and meaningful surroundings, editorial photography style, relationship between person and environment tells a story, professional lighting balancing subject and background",
    negativePrompt:
      "plain studio backdrop, no environment context, low quality, generic background, cropped environment",
    aspectRatio: "16:9",
    isIdentityCritical: true,
  },
  wide_shot: {
    type: "wide_shot",
    label: "Wide Shot",
    description: "Full figure with environmental context",
    systemPrompt:
      "Wide shot, full subject figure visible within expansive environmental context, establishing subject relationship to space, cinematic wide lens composition, rich environmental storytelling, 24mm or 35mm cinematic lens look",
    negativePrompt:
      "extreme close-up, tight crop, missing environment, low quality, claustrophobic framing",
    aspectRatio: "16:9",
    isIdentityCritical: false,
  },
  medium_shot: {
    type: "medium_shot",
    label: "Medium Shot",
    description: "Waist-up balanced versatile framing",
    systemPrompt:
      "Medium shot, subject framed from approximately waist upward, balanced natural composition, versatile cinematographic angle, natural conversational perspective, professional photography, 50mm lens look",
    negativePrompt:
      "extreme close-up, full body wide, low quality, unflattering angle, cut off at knees",
    aspectRatio: "4:3",
    isIdentityCritical: false,
  },
  low_angle_shot: {
    type: "low_angle_shot",
    label: "Low Angle",
    description: "Looking up for power and dominance",
    systemPrompt:
      "Low angle shot, camera positioned below subject level looking upward, powerful imposing perspective, sky or ceiling visible above subject, subject appears towering and dominant, dramatic upward perspective cinematography, worm's eye view composition",
    negativePrompt:
      "eye level, bird's eye, looking down, flat perspective, low quality, overhead",
    aspectRatio: "9:16",
    isIdentityCritical: false,
  },
  high_angle_shot: {
    type: "high_angle_shot",
    label: "High Angle",
    description: "Bird's-eye view for vulnerability or scale",
    systemPrompt:
      "High angle shot, camera positioned above subject looking down, overhead or strongly elevated perspective, revealing environmental layout and scale, cinematic top-down or elevated angle, dramatic use of space and depth below, bird's eye view cinematography",
    negativePrompt:
      "eye level, looking up, ground level angle, low quality, worm's eye",
    aspectRatio: "16:9",
    isIdentityCritical: false,
  },
  side_profile_shot: {
    type: "side_profile_shot",
    label: "Side Profile",
    description: "Clean geometric profile silhouette",
    systemPrompt:
      "Side profile shot, subject facing directly perpendicular to camera showing clean profile silhouette, architectural portrait composition, strong defined profile lines, elegant geometric composition, professional photography, clean background for emphasis",
    negativePrompt:
      "three-quarter turn, fully facing camera, back of head only, low quality, unclear profile",
    aspectRatio: "4:3",
    isIdentityCritical: false,
  },
  dutch_angle_shot: {
    type: "dutch_angle_shot",
    label: "Dutch Angle",
    description: "Tilted frame for tension and unease",
    systemPrompt:
      "Dutch angle shot, camera frame tilted approximately 20 degrees creating a strong diagonal horizon line, psychological tension and dramatic unease, thriller or suspense mood, dynamic off-kilter composition, cinematic unsettling atmosphere",
    negativePrompt:
      "straight horizon, level camera, static dull composition, low quality, completely tilted beyond 45 degrees",
    aspectRatio: "16:9",
    isIdentityCritical: false,
  },
  tracking_perspective_shot: {
    type: "tracking_perspective_shot",
    label: "Tracking Shot",
    description: "Motion and movement implied through composition",
    systemPrompt:
      "Tracking perspective shot, dynamic movement implied through composition and camera angle, sense of cinematic motion and speed, following-subject camera angle, directional environmental blur or implied forward motion, action camera cinematography, kinetic energy in frame",
    negativePrompt:
      "completely frozen static, stiff lifeless composition, no sense of movement, low quality",
    aspectRatio: "16:9",
    isIdentityCritical: false,
  },
  establishing_shot: {
    type: "establishing_shot",
    label: "Establishing Shot",
    description: "Wide context-setting scene opener",
    systemPrompt:
      "Establishing shot, very wide environmental view, setting and location clearly visible and established, scene-setting composition used to open a sequence, cinematic landscape or architectural wide angle photography, rich environment detail, sense of place and atmosphere",
    negativePrompt:
      "close-up, tight crop, abstracting the environment, low quality, missing location context",
    aspectRatio: "16:9",
    isIdentityCritical: false,
  },
  detail_shot: {
    type: "detail_shot",
    label: "Detail Shot",
    description: "Close focus on specific object or texture",
    systemPrompt:
      "Extreme detail shot, very close focus on specific object texture or material element, macro photography style, sharp precise material and texture representation, product or prop highlight, ultra-detailed surface rendering, shallow depth of field isolating detail",
    negativePrompt:
      "wide angle, full scene, person in focus, low quality, blurry detail, unfocused",
    aspectRatio: "1:1",
    isIdentityCritical: false,
  },
};

// ─── Shot Packs ───────────────────────────────────────────────────────────────

export interface ShotPack {
  id: string;
  label: string;
  description: string;
  shots: ShotType[];
  badge?: string;
  icon?: string;
}

export const SHOT_PACKS: ShotPack[] = [
  {
    id: "portrait",
    label: "Portrait Pack",
    description: "Identity-focused shots for faces and characters",
    badge: "POPULAR",
    icon: "👤",
    shots: ["hero_shot", "close_up", "reaction_shot", "environmental_portrait"],
  },
  {
    id: "coverage",
    label: "Coverage Pack",
    description: "Full scene and directional coverage angles",
    icon: "🎬",
    shots: ["wide_shot", "medium_shot", "over_the_shoulder", "side_profile_shot", "detail_shot"],
  },
  {
    id: "cinematic",
    label: "Cinematic Pack",
    description: "Dramatic director angles and dynamic shots",
    icon: "🎥",
    shots: [
      "establishing_shot",
      "low_angle_shot",
      "high_angle_shot",
      "dutch_angle_shot",
      "tracking_perspective_shot",
    ],
  },
  {
    id: "full",
    label: "Full Pack",
    description: "Curated selection spanning all major shot types",
    badge: "BEST VALUE",
    icon: "✨",
    shots: [
      "hero_shot",
      "close_up",
      "reaction_shot",
      "wide_shot",
      "medium_shot",
      "establishing_shot",
      "low_angle_shot",
      "dutch_angle_shot",
    ],
  },
];

/** Resolve a shot pack by ID */
export function getShotPack(packId: string): ShotPack | undefined {
  return SHOT_PACKS.find((p) => p.id === packId);
}

// ─── Model Routing ────────────────────────────────────────────────────────────

/**
 * Determine which backend model should generate a specific shot.
 *
 * Priority order (per spec):
 * 1. Consistency lock → always Nano Banana
 * 2. Budget mode + non-identity-critical → Z-Image
 * 3. Budget mode + identity-critical → Nano Banana
 * 4. Standard mode → always Nano Banana
 */
export function routeShotModel(
  shotType: ShotType,
  mode: GenerationMode,
  consistencyLock: boolean,
): ShotModel {
  if (consistencyLock) return "nano-banana-pro";

  const isIdentityCritical = IDENTITY_CRITICAL_SHOTS.has(shotType);

  if (mode === "budget") {
    return isIdentityCritical ? "nano-banana-pro" : "z-image";
  }

  // Standard mode: Nano Banana for all shots (quality matters)
  return "nano-banana-pro";
}

// ─── Cost Estimation ──────────────────────────────────────────────────────────

export interface CostBreakdownItem {
  shotType: ShotType;
  model: ShotModel;
  cost: number;
  isIdentityCritical: boolean;
}

export interface CostEstimate {
  total: number;
  shotCount: number;
  breakdown: CostBreakdownItem[];
}

/**
 * Estimate total credits for a list of shot types given mode and consistency lock.
 * Safe to call on client or server.
 */
export function estimateShotCredits(
  shotTypes: ShotType[],
  mode: GenerationMode,
  consistencyLock: boolean,
): CostEstimate {
  const breakdown: CostBreakdownItem[] = shotTypes.map((shotType) => {
    const model = routeShotModel(shotType, mode, consistencyLock);
    return {
      shotType,
      model,
      cost: SHOT_CREDIT_COSTS[model],
      isIdentityCritical: IDENTITY_CRITICAL_SHOTS.has(shotType),
    };
  });

  return {
    total: breakdown.reduce((sum, b) => sum + b.cost, 0),
    shotCount: shotTypes.length,
    breakdown,
  };
}

// ─── Mode Labels ──────────────────────────────────────────────────────────────

export const MODE_CONFIG: Record<
  GenerationMode,
  { label: string; sublabel: string; description: string; color: string }
> = {
  standard: {
    label: "Standard",
    sublabel: "Better quality",
    description: "Uses Nano Banana for all shots — best identity consistency",
    color: "violet",
  },
  budget: {
    label: "Budget",
    sublabel: "Lower cost",
    description: "Routes scene-wide shots to Z-Image — saves credits",
    color: "emerald",
  },
};

// ─── Normalized Output (shared type – client + server) ────────────────────────

export interface NormalizedShotOutput {
  /** Compound ID: generationId_index */
  output_id: string;
  shot_type: ShotType;
  model_used: ShotModel;
  mode_used: GenerationMode;
  asset_url: string | null;
  thumbnail_url: string | null;
  generation_status: "success" | "failed" | "fallback";
  credit_cost: number;
  fallback_used: boolean;
  error_message?: string;
  created_at: string;
}
