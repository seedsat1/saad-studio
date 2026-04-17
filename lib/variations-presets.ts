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
      "CAMERA: extreme wide angle lens, 14mm focal length. REFRAME this scene as an establishing shot — pull the camera FAR BACK to reveal the entire surrounding environment. The subject should occupy only 15-20% of the frame. Show the full location: sky, ground, horizon, surrounding structures. The viewer should understand WHERE this scene takes place. Wide cinematic composition, deep depth of field.",
    hiddenNegativePrompt:
      "no close-up, no tight crop, no zoomed in, no portrait framing, no duplicated subjects, no identity drift",
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
      "CAMERA: wide angle lens, 24mm focal length. REFRAME to show the subject's FULL BODY from head to feet, standing within the environment. Subject takes about 40% of the vertical frame. Include ground beneath feet and sky above head. Balanced composition showing both the person/object and their surroundings equally. Natural wide framing.",
    hiddenNegativePrompt:
      "no cropped body, no tight framing, no close-up, no cut-off limbs, no distorted proportions",
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
      "CAMERA: standard lens, 50mm focal length. REFRAME as a MEDIUM SHOT — crop from the waist UP. The subject fills roughly 60% of the frame. Show shoulders, torso, and head clearly. Background visible but secondary. This is a conversational, narrative distance. Shallow-medium depth of field, subject is the clear focus.",
    hiddenNegativePrompt:
      "no full body, no extreme wide, no extreme close-up, no awkward crop, no duplicate subject",
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
      "CAMERA: portrait lens, 85mm focal length, shallow depth of field f/1.8. REFRAME as a TIGHT CLOSE-UP — show ONLY the head and upper shoulders. The face fills 70-80% of the frame. Background should be heavily blurred (bokeh). Focus on eyes, expression, skin texture, facial details. Intimate, emotional distance. This is NOT a wide shot.",
    hiddenNegativePrompt:
      "no wide shot, no full body, no environment focus, no blurry face, no identity drift, no extra features",
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
      "CAMERA: 35mm lens, positioned BEHIND the subject. REFRAME as an OVER-THE-SHOULDER shot — the camera is placed behind one shoulder of the subject, looking outward at the scene ahead. We see the back of the subject's head and shoulder in the left/right foreground (blurred), while the environment stretches out in front of them in focus. This creates narrative depth and POV feeling.",
    hiddenNegativePrompt:
      "no frontal face, no standard angle, no broken anatomy, no fake extra person, no face corruption",
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
      "CAMERA: 28mm wide lens, placed at GROUND LEVEL looking UPWARD. REFRAME with a dramatic LOW ANGLE — the camera is on the ground shooting up at the subject. The subject appears tall, powerful, and dominant against the sky. Sky and clouds should be prominently visible above/behind the subject. Converging vertical lines. The viewer feels small looking up. This is a power shot.",
    hiddenNegativePrompt:
      "no eye-level shot, no high angle, no looking down, no standard perspective, no body stretching",
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
      "CAMERA: 35mm lens, positioned HIGH ABOVE looking DOWNWARD at 45-60 degrees. REFRAME with a HIGH ANGLE — the camera is elevated above the scene looking down at the subject from above. The ground/floor is prominently visible. The subject appears smaller, more vulnerable. We see the top of the head, shoulders from above. The environment below is clearly visible in a bird's-eye-like perspective.",
    hiddenNegativePrompt:
      "no eye-level, no low angle, no looking up, no standard perspective, no floating anatomy",
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
      "CAMERA: 85mm portrait lens, f/2.0 shallow depth of field. REFRAME as a REACTION SHOT — focus tightly on the subject's FACE showing an emotional response. Frame from chest up with the face as the absolute center of attention. Capture a moment of intense emotion — surprise, awe, determination, or contemplation. The eyes tell the story. Blurred background, all attention on the facial expression.",
    hiddenNegativePrompt:
      "no wide shot, no environment focus, no neutral expression, no cartoon exaggeration, no identity drift",
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
      "CAMERA: macro lens, 100mm, extremely tight crop, f/2.8. REFRAME as a DETAIL INSERT SHOT — zoom in EXTREMELY CLOSE on one specific meaningful detail from the scene: hands, an object being held, a texture, a tool, a badge, fabric pattern, or a key prop. The detail should fill the ENTIRE frame. No face visible, no full body. This is about texture, material, and storytelling through small details. Extreme shallow depth of field.",
    hiddenNegativePrompt:
      "no full body, no face, no wide shot, no standard framing, no unrelated object, no blur overload",
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
      "CAMERA ANGLE: extreme wide angle 14mm, subject very tiny in frame. Recreate this exact scene but pull the camera EXTREMELY FAR BACK. The subject should be very small (10-15% of frame), surrounded by vast open environment. Show the full landscape, sky, and ground. This is an environmental establishing shot where the location dominates.",
    hiddenNegativePrompt:
      "no close-up, no tight crop, no portrait, no zoomed in, no duplicated subjects",
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
      "CAMERA ANGLE: wide 24mm lens, full body framing. Show the subject's COMPLETE BODY from head to feet within the full environment. Subject takes 30-40% of vertical frame. Ground visible below feet, sky above. Both subject and environment equally important in composition.",
    hiddenNegativePrompt:
      "no cut-off limbs, no tight crop, no close-up, no portrait framing, no distorted proportions",
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
      "CAMERA ANGLE: 85mm portrait lens, tight face crop, f/1.8 bokeh. ZOOM IN CLOSE — show ONLY the face and upper shoulders. The face fills 70% of the frame. Background completely blurred. Focus on eyes, skin texture, expression. This is an intimate emotional portrait, NOT a wide shot.",
    hiddenNegativePrompt:
      "no wide shot, no full body, no environment, no blurry face, no identity drift",
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
      "CAMERA ANGLE: 50mm standard lens, medium-long framing. Frame the subject from MID-THIGH upward. Subject takes about 50-60% of vertical frame. Natural balanced composition between person and environment. Some background context visible but subject is primary focus.",
    hiddenNegativePrompt:
      "no extreme wide, no extreme close-up, no cut at knees, no floating subjects",
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
      "CAMERA ANGLE: macro 100mm lens, EXTREME CLOSE-UP. Zoom EXTREMELY TIGHT on ONE specific detail — just the eyes, or just the mouth, or just the hands holding something. This detail fills the ENTIRE frame edge to edge. Extreme shallow depth of field. Ultra-detailed texture. No full face, no body, just one intense detail.",
    hiddenNegativePrompt:
      "no full face, no full body, no wide shot, no standard framing, no blurry output",
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
      "CAMERA ANGLE: camera placed on the GROUND looking UPWARD at the subject. Low angle 28mm wide lens. The subject towers above the camera, appearing powerful and dominant. SKY prominently visible behind/above the subject. Converging vertical lines create dramatic perspective. The viewer is looking UP from below.",
    hiddenNegativePrompt:
      "no eye-level, no looking down, no high angle, no standard straight-on perspective",
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
      "CAMERA ANGLE: camera positioned BEHIND the subject, 35mm lens. Show the subject FROM THE BACK — we see their back, shoulders, back of head, facing away from camera. The subject is looking outward at the scene in front of them. Same environment but viewed from behind the subject. Maintain clothing, posture, and scene coherence.",
    hiddenNegativePrompt:
      "no frontal view, no face visible, no environment change, no identity collapse",
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
      "CAMERA ANGLE: 70mm lens, medium close-up framing. Frame from CHEST UPWARD — head and upper body only. Subject fills 65% of frame. Slightly blurred background. This is a standard interview/portrait distance. Clear face, natural expression, professional composition.",
    hiddenNegativePrompt:
      "no full body, no extreme close, no wide shot, no chin cut-off, no identity drift",
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
      "CAMERA ANGLE: over-the-shoulder shot, 35mm lens. Position camera BEHIND one shoulder of the subject. The foreground shows the BLURRED back of head and shoulder on one side of frame. The background/scene stretches out in front. Creates depth and narrative tension. We see what the subject sees.",
    hiddenNegativePrompt:
      "no standard frontal, no random extra people, no broken geometry, no identity corruption",
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
      "CAMERA ANGLE: camera HIGH ABOVE looking DOWN at 45-60 degrees. The subject is seen from ABOVE — we see the top of head, shoulders from overhead. GROUND/FLOOR prominently visible around the subject. Creates a feeling of vulnerability and smallness. The perspective is clearly elevated, like looking down from a balcony or crane.",
    hiddenNegativePrompt:
      "no eye-level, no looking up, no low angle, no standard perspective, no floating subjects",
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
      "CAMERA ANGLE: wide angle 20mm lens. Pull back to show the FULL ENVIRONMENT with the subject in context. The scene should feel spacious and open. Subject takes about 25-35% of frame. Environment details clearly visible all around — architecture, landscape, atmosphere. Cinematic wide composition.",
    hiddenNegativePrompt:
      "no tight crop, no close-up, no portrait, no warped edges, no environment mismatch",
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
      "CAMERA ANGLE: first-person POV through the subject's eyes. Show EXACTLY what the subject would see from their eye position. Hands may be visible at bottom of frame. The subject themselves are NOT visible — only what's in front of them. Immersive first-person perspective like a video game viewpoint.",
    hiddenNegativePrompt:
      "no subject visible, no third-person view, no standard camera angle, no floating artifacts",
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
      "CAMERA ANGLE: DIRECTLY OVERHEAD looking straight down, drone/bird's-eye view. The camera is positioned directly ABOVE the scene shooting DOWNWARD at 90 degrees. We see the TOP of everything — top of heads, top of objects, the ground/floor pattern. This is a flat top-down aerial perspective like a drone shot.",
    hiddenNegativePrompt:
      "no side view, no eye-level, no standard angle, no tilted horizon, no floating subjects",
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
      "CAMERA ANGLE: camera at exact EYE LEVEL of the subject, 50mm standard lens. Perfectly neutral, straight-on perspective. No looking up, no looking down. The horizon line is at the subject's eye height. Natural, grounded, realistic framing. Standard cinematic eye-level composition.",
    hiddenNegativePrompt:
      "no tilted camera, no low angle, no high angle, no perspective shift, no scene change",
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
      "CAMERA ANGLE: camera rotated 90 degrees to the SIDE of the subject. Pure SIDE PROFILE view — we see the subject from their left or right side. Nose pointing left or right, not toward camera. Clean lateral silhouette composition. Same scene but viewed from a perpendicular side angle.",
    hiddenNegativePrompt:
      "no frontal view, no standard angle, no face distortion, no body warp, no background change",
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
      "CAMERA ANGLE: camera positioned at 45 DEGREES to the subject, three-quarter view. Classic cinematic diagonal framing — the subject is turned slightly, showing about 3/4 of the face. One ear barely visible, both eyes visible. Natural, flattering angle used in portrait photography and film.",
    hiddenNegativePrompt:
      "no straight frontal, no pure profile, no identity collapse, no awkward crop",
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
