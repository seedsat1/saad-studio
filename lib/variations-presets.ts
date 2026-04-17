// ─── Variations Studio – Presets, Types & Routing ────────────────────────────
// Client + server safe. No direct API calls or server-only imports.

// ─── Core Types ───────────────────────────────────────────────────────────────

export type VariationMode = "storyboard" | "angles";
export type VariationGenMode = "standard" | "budget";
export type VariationModel = "nano-banana-pro" | "z-image";

export const KIE_VARIATION_MODEL_IDS: Record<VariationModel, string> = {
  "nano-banana-pro": "nano-banana-pro",
  "z-image": "z-image",
} as const;

export const VARIATION_CREDIT_COSTS: Record<VariationModel, number> = {
  "nano-banana-pro": 2,
  "z-image": 2,
} as const;

// ─── Storyboard Presets ───────────────────────────────────────────────────────

export type StoryboardPresetId =
  | "establishing_shot"
  | "wide_shot"
  | "medium_shot"
  | "close_up"
  | "over_the_shoulder"
  | "low_angle_shot"
  | "high_angle_shot"
  | "reaction_shot"
  | "detail_shot";

export interface StoryboardPreset {
  id: StoryboardPresetId;
  label: string;
  description: string;
  cameraLanguage: string;
  compositionLogic: string;
  // Hidden server-side prompt templates – never exposed to the client
  hiddenSystemPrompt: string;
  hiddenNegativePrompt: string;
  modelPreference: VariationModel;
  subjectWeight: number;
  environmentWeight: number;
  isIdentityCritical: boolean;
}

export const STORYBOARD_PRESETS: Record<StoryboardPresetId, StoryboardPreset> = {
  establishing_shot: {
    id: "establishing_shot",
    label: "Establishing Shot",
    description: "Wide contextual frame that grounds the scene in its world",
    cameraLanguage: "ultra-wide, environmental context",
    compositionLogic: "reveal environment and placement of subject",
    hiddenSystemPrompt:
      "Generate a cinematic establishing shot based on the reference image. Preserve subject identity, environment, and scene logic while widening the framing to reveal more surrounding context and world-building.",
    hiddenNegativePrompt:
      "no random scenery replacement, no identity drift, no duplicated subjects, no broken perspective, no unrelated background",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.6,
    environmentWeight: 0.9,
    isIdentityCritical: false,
  },
  wide_shot: {
    id: "wide_shot",
    label: "Wide Shot",
    description: "Full scene view with clean, realistic framing expansion",
    cameraLanguage: "wide, full body in environment",
    compositionLogic: "subject fully visible with surrounding world",
    hiddenSystemPrompt:
      "Generate a cinematic wide shot from the reference image while preserving the subject and environment, expanding the frame in a clean and realistic way.",
    hiddenNegativePrompt:
      "no warped anatomy, no duplicated people, no geometry distortion, no environment mismatch",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.7,
    environmentWeight: 0.8,
    isIdentityCritical: false,
  },
  medium_shot: {
    id: "medium_shot",
    label: "Medium Shot",
    description: "Balanced narrative framing from waist up",
    cameraLanguage: "medium, waist-to-head framing",
    compositionLogic: "balanced subject-environment relationship",
    hiddenSystemPrompt:
      "Generate a cinematic medium shot from the reference image with balanced narrative framing, preserving identity, emotion, and environment.",
    hiddenNegativePrompt:
      "no identity drift, no awkward crop, no extra limbs, no duplicate subject",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.75,
    environmentWeight: 0.7,
    isIdentityCritical: true,
  },
  close_up: {
    id: "close_up",
    label: "Close-Up",
    description: "Tight face frame with precise identity preservation",
    cameraLanguage: "close, head-and-shoulders",
    compositionLogic: "emotional presence, identity lock",
    hiddenSystemPrompt:
      "Generate a cinematic close-up from the reference image. Preserve facial identity, lighting continuity, and emotional realism.",
    hiddenNegativePrompt:
      "no broken face, no extra features, no asymmetrical eyes, no blurry subject",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.95,
    environmentWeight: 0.3,
    isIdentityCritical: true,
  },
  over_the_shoulder: {
    id: "over_the_shoulder",
    label: "Over-the-Shoulder",
    description: "Behind-subject perspective with narrative depth",
    cameraLanguage: "OTS, partial profile in foreground",
    compositionLogic: "subject shoulder visible, scene ahead in focus",
    hiddenSystemPrompt:
      "Generate a cinematic over-the-shoulder shot from the reference image with narrative framing while preserving subject and environment continuity.",
    hiddenNegativePrompt:
      "no broken anatomy, no fake extra person, no unusable framing, no face corruption",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.85,
    environmentWeight: 0.7,
    isIdentityCritical: true,
  },
  low_angle_shot: {
    id: "low_angle_shot",
    label: "Low Angle Shot",
    description: "Dramatic low-camera perspective with authority feel",
    cameraLanguage: "low-angle, looking up at subject",
    compositionLogic: "dramatic perspective, power composition",
    hiddenSystemPrompt:
      "Generate a cinematic low-angle shot from the reference image, preserving identity and environment while increasing dramatic perspective.",
    hiddenNegativePrompt:
      "no body stretching, no broken perspective, no scene mismatch",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.8,
    environmentWeight: 0.6,
    isIdentityCritical: false,
  },
  high_angle_shot: {
    id: "high_angle_shot",
    label: "High Angle Shot",
    description: "Elevated viewpoint with readable wide composition",
    cameraLanguage: "high-angle, looking down at subject",
    compositionLogic: "elevated perspective, readable scene",
    hiddenSystemPrompt:
      "Generate a cinematic high-angle shot from the reference image while preserving the scene and subject in a readable, realistic, elevated composition.",
    hiddenNegativePrompt:
      "no floating anatomy, no broken proportions, no environment collapse",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.7,
    environmentWeight: 0.8,
    isIdentityCritical: false,
  },
  reaction_shot: {
    id: "reaction_shot",
    label: "Reaction Shot",
    description: "Emotional response capture with identity lock",
    cameraLanguage: "medium-close, emotional read",
    compositionLogic: "emotional presence, psychological weight",
    hiddenSystemPrompt:
      "Generate a cinematic reaction shot from the reference image, emphasizing emotional response and psychological presence while preserving identity and atmosphere.",
    hiddenNegativePrompt:
      "no cartoon exaggeration, no facial corruption, no identity drift, no random background replacement",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.9,
    environmentWeight: 0.4,
    isIdentityCritical: true,
  },
  detail_shot: {
    id: "detail_shot",
    label: "Detail / Insert Shot",
    description: "Meaningful texture, gesture, or object detail",
    cameraLanguage: "macro/tight detail, insert frame",
    compositionLogic: "meaningful detail in context",
    hiddenSystemPrompt:
      "Generate a cinematic detail shot from the reference image focusing on a meaningful visual detail, gesture, texture, or object while preserving the world and tone of the original frame.",
    hiddenNegativePrompt:
      "no unrelated object, no unusable crop, no blur overload, no texture corruption",
    modelPreference: "nano-banana-pro",
    subjectWeight: 0.5,
    environmentWeight: 0.5,
    isIdentityCritical: false,
  },
};

// ─── Default 9-Shot Storyboard Pack ──────────────────────────────────────────

export const DEFAULT_STORYBOARD_9: StoryboardPresetId[] = [
  "establishing_shot",
  "wide_shot",
  "medium_shot",
  "close_up",
  "over_the_shoulder",
  "low_angle_shot",
  "high_angle_shot",
  "reaction_shot",
  "detail_shot",
];

export const STORYBOARD_PACK_4: StoryboardPresetId[] = [
  "establishing_shot",
  "medium_shot",
  "close_up",
  "detail_shot",
];

export const STORYBOARD_PACK_6: StoryboardPresetId[] = [
  "establishing_shot",
  "wide_shot",
  "medium_shot",
  "close_up",
  "reaction_shot",
  "detail_shot",
];

// ─── Angles Presets ───────────────────────────────────────────────────────────

export type AnglesPresetId =
  | "ext_long_shot"
  | "long_shot"
  | "closeup"
  | "medium_long"
  | "extreme_closeup"
  | "low_angle"
  | "back_view"
  | "med_closeup"
  | "ots"
  | "high_angle"
  | "wide"
  | "pov"
  | "aerial"
  | "eye_level"
  | "profile"
  | "three_quarter";

export interface AnglesPreset {
  id: AnglesPresetId;
  label: string;
  description: string;
  reframingLogic: string;
  hiddenSystemPrompt: string;
  hiddenNegativePrompt: string;
  modelPreference: VariationModel;
  framingStrength: number;
  preservationStrength: number;
}

export const ANGLES_PRESETS: Record<AnglesPresetId, AnglesPreset> = {
  ext_long_shot: {
    id: "ext_long_shot",
    label: "Ext. long shot",
    description: "Extreme wide establishing frame, subject very small in environment",
    reframingLogic: "extreme wide pull showing vast environment",
    hiddenSystemPrompt:
      "Generate an extreme long shot cinematic reframe of the reference image. The subject should appear very small within a vast, detailed environment. Preserve identity and scene logic while dramatically expanding the frame outward.",
    hiddenNegativePrompt:
      "no random scenery, no identity drift, no duplicated subjects, no cropped environment edges",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.9,
    preservationStrength: 0.75,
  },
  long_shot: {
    id: "long_shot",
    label: "Long shot",
    description: "Full body visible within spacious environment",
    reframingLogic: "wide frame, subject full-body visible in scene",
    hiddenSystemPrompt:
      "Generate a long shot cinematic reframe from the reference image. Show the full body of the subject clearly while placing them within a spacious, well-defined environment.",
    hiddenNegativePrompt:
      "no cut-off limbs, no scene replacement, no environment mismatch, no distorted proportions",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.75,
    preservationStrength: 0.8,
  },
  closeup: {
    id: "closeup",
    label: "Closeup",
    description: "Face and upper chest — emotionally direct framing",
    reframingLogic: "tight face crop, high emotional presence",
    hiddenSystemPrompt:
      "Generate a cinematic closeup reframe from the reference image. Focus tightly on the subject's face and upper chest. Preserve identity, skin detail, and expression with high fidelity.",
    hiddenNegativePrompt:
      "no face damage, no identity drift, no background noise, no unnatural cropping artifacts",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.65,
    preservationStrength: 0.95,
  },
  medium_long: {
    id: "medium_long",
    label: "Medium long",
    description: "Thigh-to-head framing in natural scene context",
    reframingLogic: "subject from thighs up with scene context",
    hiddenSystemPrompt:
      "Generate a medium long shot reframe from the reference image. Frame the subject from roughly mid-thigh upward, within a clear and natural scene context.",
    hiddenNegativePrompt:
      "no floating subjects, no scene jump, no crop at knees, no distorted proportions",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.65,
    preservationStrength: 0.85,
  },
  extreme_closeup: {
    id: "extreme_closeup",
    label: "Extreme closeup",
    description: "Eyes, mouth, or key detail — intense macro framing",
    reframingLogic: "extreme crop on specific facial feature or detail",
    hiddenSystemPrompt:
      "Generate an extreme closeup reframe from the reference image, intensely cropping on one defining detail — eyes, lips, or a signature object. Preserve texture, identity, and sharpness.",
    hiddenNegativePrompt:
      "no blurry output, no identity distortion, no random crop artifacts, no noise",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.55,
    preservationStrength: 0.98,
  },
  low_angle: {
    id: "low_angle",
    label: "Low angle",
    description: "Camera below subject looking up — powerful and imposing",
    reframingLogic: "low camera position, upward perspective, dramatic power",
    hiddenSystemPrompt:
      "Generate a low angle shot reframe from the reference image. The camera should appear positioned below the subject looking upward, conveying power and dominance. Preserve subject identity and scene continuity.",
    hiddenNegativePrompt:
      "no distorted body proportions, no broken perspective geometry, no floating subject",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.8,
    preservationStrength: 0.8,
  },
  back_view: {
    id: "back_view",
    label: "Back view",
    description: "Subject seen from behind, scene fully preserved",
    reframingLogic: "rotate perspective to show subject's back to camera",
    hiddenSystemPrompt:
      "Generate a back view reframe from the reference image, showing the subject from behind while preserving the same scene, environment, and continuity. Maintain clothing, hair, and posture coherence.",
    hiddenNegativePrompt:
      "no identity collapse, no environment change, no ghost artifacts, no broken posture",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.85,
    preservationStrength: 0.8,
  },
  med_closeup: {
    id: "med_closeup",
    label: "Med. closeup",
    description: "Chest-up framing — standard interview or portrait feel",
    reframingLogic: "frame from chest up, balanced portrait composition",
    hiddenSystemPrompt:
      "Generate a medium closeup reframe from the reference image. Frame from the chest upward, creating a balanced and natural portrait composition while preserving identity and scene context.",
    hiddenNegativePrompt:
      "no chin cut-off, no background replacement, no identity drift, no geometric distortion",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.6,
    preservationStrength: 0.9,
  },
  ots: {
    id: "ots",
    label: "OTS",
    description: "Over-the-shoulder — reveals subject and implied scene partner",
    reframingLogic: "camera behind shoulder looking toward subject or scene",
    hiddenSystemPrompt:
      "Generate an over-the-shoulder shot from the reference image. Camera should be positioned behind one shoulder looking toward subject or scene, implying an off-screen presence. Preserve scene and identity.",
    hiddenNegativePrompt:
      "no random extra people, no broken scene geometry, no identity corruption",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.8,
    preservationStrength: 0.8,
  },
  high_angle: {
    id: "high_angle",
    label: "High angle",
    description: "Camera above subject looking down — exposing and vulnerable",
    reframingLogic: "elevated camera position, downward perspective",
    hiddenSystemPrompt:
      "Generate a high angle shot reframe from the reference image. Camera should appear elevated above the subject looking downward, creating a vulnerable or observational perspective. Preserve identity and scene.",
    hiddenNegativePrompt:
      "no stretched proportions, no floating environment, no broken geometry",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.8,
    preservationStrength: 0.8,
  },
  wide: {
    id: "wide",
    label: "Wide",
    description: "Wide lens framing — full environment context",
    reframingLogic: "expand frame wide, full environment visible",
    hiddenSystemPrompt:
      "Generate a wide shot reframe from the reference image with full environment context clearly visible. Preserve subject identity and scene logic while ensuring the wider frame feels natural and cinematic.",
    hiddenNegativePrompt:
      "no warped edges, no environment mismatch, no random objects introduced",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.7,
    preservationStrength: 0.8,
  },
  pov: {
    id: "pov",
    label: "POV",
    description: "First-person point of view — immersive perspective",
    reframingLogic: "first-person immersive camera placement",
    hiddenSystemPrompt:
      "Generate a first-person point-of-view (POV) reframe from the reference image. The scene should appear as if viewed through the subject's own eyes, fully immersive and realistic.",
    hiddenNegativePrompt:
      "no floating camera artifacts, no distorted horizon, no broken immersion",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.9,
    preservationStrength: 0.7,
  },
  aerial: {
    id: "aerial",
    label: "Aerial",
    description: "Bird's-eye view — overhead drone-style perspective",
    reframingLogic: "top-down aerial overhead camera",
    hiddenSystemPrompt:
      "Generate an aerial overhead shot from the reference image as if captured from directly above by a drone. Show the scene from a top-down perspective while preserving scene identity and environment.",
    hiddenNegativePrompt:
      "no floating subjects, no broken top-down geometry, no unrelated environment",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.95,
    preservationStrength: 0.7,
  },
  eye_level: {
    id: "eye_level",
    label: "Eye level",
    description: "Neutral eye-level camera — natural and grounded",
    reframingLogic: "camera at subject eye height, neutral perspective",
    hiddenSystemPrompt:
      "Generate an eye-level reframe from the reference image with the camera placed exactly at the subject's eye level for a natural, neutral perspective. Preserve identity, scene, and all visual continuity.",
    hiddenNegativePrompt:
      "no tilted horizon, no unnatural perspective shift, no scene change",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.5,
    preservationStrength: 0.95,
  },
  profile: {
    id: "profile",
    label: "Profile",
    description: "Side view — clean 90-degree lateral framing",
    reframingLogic: "rotate to pure side profile of subject",
    hiddenSystemPrompt:
      "Generate a profile shot from the reference image, showing the subject from a pure 90-degree side angle. Preserve posture, clothing, and scene continuity while achieving a clean lateral composition.",
    hiddenNegativePrompt:
      "no face distortion, no body warp, no background change, no double-exposure artifacts",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.85,
    preservationStrength: 0.85,
  },
  three_quarter: {
    id: "three_quarter",
    label: "3/4 view",
    description: "Three-quarter angle — classic cinematic diagonal framing",
    reframingLogic: "45-degree diagonal angle from subject",
    hiddenSystemPrompt:
      "Generate a three-quarter angle shot from the reference image. The camera should be positioned at approximately 45 degrees to the subject, creating a classic and flattering diagonal cinematic framing.",
    hiddenNegativePrompt:
      "no identity collapse, no awkward crop, no geometry distortion, no scene replacement",
    modelPreference: "nano-banana-pro",
    framingStrength: 0.75,
    preservationStrength: 0.85,
  },
};

// ─── Default Angles Pack ──────────────────────────────────────────────────────

export const DEFAULT_ANGLES_6: AnglesPresetId[] = [
  "ext_long_shot",
  "long_shot",
  "closeup",
  "medium_long",
  "low_angle",
  "high_angle",
];

export const ANGLES_PACK_4: AnglesPresetId[] = [
  "ext_long_shot",
  "closeup",
  "low_angle",
  "high_angle",
];

export const ANGLES_PACK_8: AnglesPresetId[] = [
  "ext_long_shot",
  "long_shot",
  "closeup",
  "medium_long",
  "extreme_closeup",
  "low_angle",
  "back_view",
  "high_angle",
];

// ─── Model Routing ────────────────────────────────────────────────────────────

export function routeVariationModel(
  mode: VariationMode,
  genMode: VariationGenMode,
  isIdentityCritical: boolean,
  consistencyLock: boolean,
): VariationModel {
  if (consistencyLock) return "nano-banana-pro";

  if (genMode === "standard") return "nano-banana-pro";

  // Budget mode
  if (mode === "storyboard") {
    return isIdentityCritical ? "nano-banana-pro" : "z-image";
  }
  // Angles budget – most are safe for z-image
  return "z-image";
}

// ─── Build Preset List for a Generation Run ──────────────────────────────────

export function buildStoryboardPlan(count: 4 | 6 | 9): StoryboardPresetId[] {
  if (count === 4) return STORYBOARD_PACK_4;
  if (count === 6) return STORYBOARD_PACK_6;
  return DEFAULT_STORYBOARD_9;
}

export function buildAnglesPlan(count: 4 | 6 | 8): AnglesPresetId[] {
  if (count === 4) return ANGLES_PACK_4;
  if (count === 8) return ANGLES_PACK_8;
  return DEFAULT_ANGLES_6;
}

// ─── Credit Estimation ────────────────────────────────────────────────────────

export interface VariationCostEstimate {
  totalCredits: number;
  perOutput: { presetId: string; model: VariationModel; credits: number }[];
}

export function estimateVariationCost(
  mode: VariationMode,
  genMode: VariationGenMode,
  outputCount: number,
  consistencyLock: boolean,
): VariationCostEstimate {
  let presetIds: string[];

  if (mode === "storyboard") {
    const safeCount = ([4, 6, 9].includes(outputCount) ? outputCount : 9) as 4 | 6 | 9;
    presetIds = buildStoryboardPlan(safeCount);
  } else {
    const safeCount = ([4, 6, 8].includes(outputCount) ? outputCount : 6) as 4 | 6 | 8;
    presetIds = buildAnglesPlan(safeCount);
  }

  const perOutput = presetIds.map((id) => {
    const isIdentityCritical =
      mode === "storyboard"
        ? (STORYBOARD_PRESETS[id as StoryboardPresetId]?.isIdentityCritical ?? true)
        : true; // angles always preserve identity

    const model = routeVariationModel(mode, genMode, isIdentityCritical, consistencyLock);
    return { presetId: id, model, credits: VARIATION_CREDIT_COSTS[model] };
  });

  const totalCredits = perOutput.reduce((s, o) => s + o.credits, 0);
  return { totalCredits, perOutput };
}
