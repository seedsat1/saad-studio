/**
 * TRANSITION PRESETS — INTERNAL ENGINE
 *
 * This file is SERVER-ONLY.
 * Hidden prompt templates must never be sent to the client.
 * Client receives only: id, name, category, previewVideoUrl, supportedInputs,
 * durationRange, costMultiplier, engineType, motionProfile, description.
 */

export type SupportedInputType = "image-image" | "video-video" | "image-video" | "video-image";

export type TransitionCategory =
  | "transformation"
  | "fx_material"
  | "camera_motion"
  | "object_reveal"
  | "stylized_special";

export interface TransitionPreset {
  id: string;
  name: string;
  category: TransitionCategory;
  previewVideoUrl: string;
  previewGradient: string;
  supportedInputs: SupportedInputType[];
  durationRange: [number, number];
  costMultiplier: number;
  engineType: string;
  motionProfile: string;
  blendStrategy: string;
  description: string;
  // Hidden — never sent to client
  hiddenSystemPromptTemplate: string;
  hiddenNegativePromptTemplate: string;
}

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {
    id: "raven_transition",
    name: "Raven Transition",
    category: "stylized_special",
    previewVideoUrl: "/video rt/raven_transition.mp4",
    previewGradient: "from-slate-950 via-slate-800 to-zinc-900",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.4,
    engineType: "cinematic_symbolic_fx",
    motionProfile: "dark flock sweep and reveal",
    blendStrategy: "occlusion swarm transition",
    description: "Dark raven swarm dramatically sweeps across the frame, revealing the next scene.",
    hiddenSystemPromptTemplate:
      "Create a cinematic transition from Input A to Input B using a controlled dark raven-like swarm motion. The transition should feel elegant, mysterious, and visually premium. Start by introducing black feathered motion and flock-like sweeping energy from the edge or center of the frame, gradually covering the first scene and revealing the second scene underneath. Maintain subject coherence, preserve key framing, and ensure the motion reads like a real transition rather than random particle noise. Keep the transition smooth, dramatic, and filmic.",
    hiddenNegativePromptTemplate:
      "no horror gore, no random bird anatomy closeups, no chaotic flashing, no broken faces, no duplicated subjects, no flicker, no low quality particles, no abrupt hard cuts",
  },
  {
    id: "morph",
    name: "Morph",
    category: "transformation",
    previewVideoUrl: "",
    previewGradient: "from-cyan-950 via-cyan-800 to-blue-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 8],
    costMultiplier: 1.2,
    engineType: "ai_morph_transition",
    motionProfile: "identity-preserving smooth morph",
    blendStrategy: "feature interpolation morph",
    description: "Fluid identity-preserving morph that smoothly transforms frame A into frame B.",
    hiddenSystemPromptTemplate:
      "Create a seamless cinematic morph transition from Input A to Input B. Preserve facial and structural continuity as much as possible while smoothly transforming the first subject or scene into the second. The transformation must be fluid, temporally stable, elegant, and realistic, without sudden jumps. If human subjects are present, keep anatomy and identity coherence controlled during the morph.",
    hiddenNegativePromptTemplate:
      "no face warping, no broken anatomy, no extra limbs, no abrupt cuts, no melting artifacts unless intended, no flicker, no random morph glitches, no low detail skin distortion",
  },
  {
    id: "air_bending",
    name: "Air Bending",
    category: "stylized_special",
    previewVideoUrl: "",
    previewGradient: "from-sky-950 via-blue-800 to-slate-900",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 7],
    costMultiplier: 1.2,
    engineType: "elemental_motion_transition",
    motionProfile: "wind arc sweep",
    blendStrategy: "airflow distortion reveal",
    description: "Graceful air currents and wind arcs sweep the frame from scene A into scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic transition where controlled air currents and elegant wind-bending motion carry the frame from Input A to Input B. Use soft but powerful directional airflow, subtle atmospheric distortion, and stylized movement arcs to sweep away the first scene and reveal the second. The effect must remain graceful, readable, and premium.",
    hiddenNegativePromptTemplate:
      "no tornado chaos, no debris overload, no random destruction, no excessive blur, no flicker, no unreadable frame distortion, no scene collapse",
  },
  {
    id: "shadow_smoke",
    name: "Shadow Smoke",
    category: "fx_material",
    previewVideoUrl: "",
    previewGradient: "from-zinc-950 via-zinc-800 to-slate-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.3,
    engineType: "smoke_occlusion_transition",
    motionProfile: "dark smoke engulf and reveal",
    blendStrategy: "shadow smoke mask blend",
    description: "Dark volumetric smoke engulfs the first scene and dissolves to reveal the second.",
    hiddenSystemPromptTemplate:
      "Generate a cinematic shadow-smoke transition from Input A to Input B. Dark volumetric smoke should grow across the frame, softly engulf the first scene, then thin out to reveal the second scene. The motion must feel atmospheric, controlled, luxurious, and readable. Keep subject continuity and preserve framing where possible.",
    hiddenNegativePromptTemplate:
      "no fire unless selected, no dirty low-res smoke, no hard edge masking, no chaotic fog overload, no flicker, no random scene tearing",
  },
  {
    id: "water_bending",
    name: "Water Bending",
    category: "fx_material",
    previewVideoUrl: "",
    previewGradient: "from-blue-950 via-cyan-800 to-teal-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 7],
    costMultiplier: 1.2,
    engineType: "fluid_transition",
    motionProfile: "liquid arc flow",
    blendStrategy: "water distortion reveal",
    description: "Elegant fluid arcs and rippling water flow wash scene A into scene B.",
    hiddenSystemPromptTemplate:
      "Create a premium cinematic water-based transition between Input A and Input B. Use elegant flowing water motion, fluid arcs, ripples, and transparent liquid distortion to wash the first frame into the second. The effect should be graceful, directional, and highly readable, not chaotic.",
    hiddenNegativePromptTemplate:
      "no flood chaos, no muddy water, no noisy splashes covering everything, no low quality fluid artifacts, no random camera shake, no flicker",
  },
  {
    id: "firelava",
    name: "Firelava",
    category: "fx_material",
    previewVideoUrl: "",
    previewGradient: "from-orange-950 via-red-800 to-yellow-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.4,
    engineType: "lava_fire_transition",
    motionProfile: "molten sweep reveal",
    blendStrategy: "lava crust burn-through",
    description: "Molten lava and fire energy burn through the first frame to expose the second.",
    hiddenSystemPromptTemplate:
      "Create a cinematic fire-lava transition between Input A and Input B. Use molten glowing liquid fire movement, heat edges, ember glow, and controlled burn-through energy to transform the first scene into the second. The transition should feel intense but premium, cinematic, and visually controlled.",
    hiddenNegativePromptTemplate:
      "no explosion chaos, no horror gore, no full-frame destruction, no random debris overload, no unstable flames, no low quality lava texture",
  },
  {
    id: "flying_cam_transition",
    name: "Flying Cam Transition",
    category: "camera_motion",
    previewVideoUrl: "",
    previewGradient: "from-indigo-950 via-violet-800 to-slate-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 6],
    costMultiplier: 1.1,
    engineType: "virtual_camera_transition",
    motionProfile: "fast camera pass-through",
    blendStrategy: "camera motion continuity",
    description: "Dynamic virtual camera flies through scene A and lands naturally into scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic flying-camera transition from Input A to Input B. Simulate a dynamic but controlled camera move that passes through, around, or across the first scene and lands naturally into the second scene. The transition must feel like one continuous camera action with strong perspective continuity and premium motion design.",
    hiddenNegativePromptTemplate:
      "no random teleporting, no shaky handheld chaos, no geometry collapse, no impossible perspective glitches, no stutter, no flicker",
  },
  {
    id: "melt_transition",
    name: "Melt Transition",
    category: "transformation",
    previewVideoUrl: "",
    previewGradient: "from-amber-950 via-orange-800 to-yellow-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 9],
    costMultiplier: 1.3,
    engineType: "viscous_deformation_transition",
    motionProfile: "controlled liquified melt",
    blendStrategy: "viscous dissolve morph",
    description: "Scene A elegantly liquifies and melts into the structure of scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic melt transition where Input A slowly deforms and liquifies into Input B in a visually elegant and controlled way. The effect should feel stylized, premium, and fluid, not disgusting or chaotic. Maintain readability throughout the transformation.",
    hiddenNegativePromptTemplate:
      "no body horror, no gore, no gross slime excess, no broken face topology, no flicker, no random collapse, no muddy texture",
  },
  {
    id: "splash_transition",
    name: "Splash Transition",
    category: "fx_material",
    previewVideoUrl: "",
    previewGradient: "from-teal-950 via-cyan-700 to-blue-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 6],
    costMultiplier: 1.2,
    engineType: "impact_fluid_transition",
    motionProfile: "directional splash hit",
    blendStrategy: "liquid impact wipe",
    description: "A sharp burst of liquid splashes across the frame, revealing scene B from scene A.",
    hiddenSystemPromptTemplate:
      "Generate a cinematic splash transition where a sharp, elegant burst of liquid motion splashes across the frame and reveals Input B from Input A. The effect should feel energetic, stylish, and clean, with readable flow and high-end motion direction.",
    hiddenNegativePromptTemplate:
      "no messy flood, no chaotic liquid everywhere, no low-res droplets, no random scene loss, no unreadable splash wall",
  },
  {
    id: "flame_transition",
    name: "Flame Transition",
    category: "fx_material",
    previewVideoUrl: "",
    previewGradient: "from-red-950 via-orange-700 to-amber-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 7],
    costMultiplier: 1.3,
    engineType: "flame_wipe_transition",
    motionProfile: "flame lick wipe",
    blendStrategy: "burn edge reveal",
    description: "Controlled flame tongues lick across the frame, burning away scene A to reveal B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic flame transition between Input A and Input B using controlled flame tongues, warm glow, and directional burn-edge motion. The effect should feel dramatic and premium, not destructive or uncontrolled.",
    hiddenNegativePromptTemplate:
      "no explosion, no wildfire chaos, no scene destruction, no smoke overload unless needed, no flicker, no low detail flames",
  },
  {
    id: "smoke_transition",
    name: "Smoke Transition",
    category: "fx_material",
    previewVideoUrl: "",
    previewGradient: "from-gray-950 via-slate-700 to-zinc-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.2,
    engineType: "soft_smoke_transition",
    motionProfile: "soft smoke drift cover",
    blendStrategy: "volumetric smoke dissolve",
    description: "Soft volumetric smoke drifts across the frame, covering A and dissolving to reveal B.",
    hiddenSystemPromptTemplate:
      "Create a smooth cinematic smoke transition between Input A and Input B. Use soft volumetric smoke movement to drift over the frame, cover the first scene, and reveal the second in a controlled, elegant, filmic way.",
    hiddenNegativePromptTemplate:
      "no muddy fog overload, no total frame blackout, no dirty artifacts, no chaotic smoke turbulence, no flicker",
  },
  {
    id: "logo_transform",
    name: "Logo Transform",
    category: "transformation",
    previewVideoUrl: "",
    previewGradient: "from-violet-950 via-purple-800 to-indigo-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 7],
    costMultiplier: 1.3,
    engineType: "graphic_to_scene_transform",
    motionProfile: "symbol reshape transition",
    blendStrategy: "logo form remap",
    description: "Graphic shapes and logo-like geometry from A elegantly reshape to form scene B.",
    hiddenSystemPromptTemplate:
      "Create a premium transform transition where shapes, symbols, or logo-like geometry from Input A elegantly transform into the subject or composition of Input B. The motion should feel intentional, sharp, brand-ready, and cinematic.",
    hiddenNegativePromptTemplate:
      "no cheap motion graphics look, no flat powerpoint feel, no broken geometry, no random text corruption, no flicker",
  },
  {
    id: "hand_transition",
    name: "Hand Transition",
    category: "object_reveal",
    previewVideoUrl: "",
    previewGradient: "from-rose-950 via-pink-800 to-slate-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 6],
    costMultiplier: 1.1,
    engineType: "foreground_occlusion_transition",
    motionProfile: "hand wipe reveal",
    blendStrategy: "foreground hand pass occlusion",
    description: "A natural hand motion enters the frame, occludes scene A, and reveals scene B.",
    hiddenSystemPromptTemplate:
      "Generate a cinematic hand-based transition where a hand or hand-like foreground motion enters naturally into the frame, occludes the first scene, and reveals the second scene with a smooth, realistic, premium wipe effect. Keep the hand movement readable and purposeful.",
    hiddenNegativePromptTemplate:
      "no extra fingers, no broken anatomy, no creepy hand deformation, no jerky movement, no abrupt hard cut, no flicker",
  },
  {
    id: "column_wipe",
    name: "Column Wipe",
    category: "object_reveal",
    previewVideoUrl: "",
    previewGradient: "from-slate-950 via-zinc-700 to-gray-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 6],
    costMultiplier: 1.0,
    engineType: "structural_wipe_transition",
    motionProfile: "vertical structural pass",
    blendStrategy: "column occlusion wipe",
    description: "An architectural column sweeps across the frame, wiping from scene A to scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic structural wipe transition using a column-like vertical foreground element that passes across the frame and naturally transitions from Input A to Input B. The wipe should feel architectural, clean, and elegant.",
    hiddenNegativePromptTemplate:
      "no broken perspective, no object jitter, no unstable wipe edges, no fake cut feeling, no flicker",
  },
  {
    id: "hole_transition",
    name: "Hole Transition",
    category: "object_reveal",
    previewVideoUrl: "",
    previewGradient: "from-black via-zinc-900 to-slate-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 7],
    costMultiplier: 1.2,
    engineType: "portal_reveal_transition",
    motionProfile: "opening portal reveal",
    blendStrategy: "expanding hole mask",
    description: "A portal-like opening expands within scene A, revealing scene B inside.",
    hiddenSystemPromptTemplate:
      "Generate a cinematic hole or opening transition where a controlled opening, tear, or portal-like gap reveals Input B from inside Input A. The effect must remain premium, smooth, and visually coherent, not chaotic or cheap.",
    hiddenNegativePromptTemplate:
      "no horror gore, no ugly tearing, no broken texture edges, no random destruction, no unstable portal flicker",
  },
  {
    id: "display_transition",
    name: "Display Transition",
    category: "object_reveal",
    previewVideoUrl: "",
    previewGradient: "from-blue-950 via-indigo-800 to-violet-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 7],
    costMultiplier: 1.1,
    engineType: "screen_display_transition",
    motionProfile: "screen takeover reveal",
    blendStrategy: "display surface remap",
    description: "A digital display surface bridges the transition between scene A and scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic display-based transition where a digital screen, panel, or display-like surface becomes the visual bridge from Input A to Input B. The effect should feel modern, premium, and highly readable, with clean surface transformation.",
    hiddenNegativePromptTemplate:
      "no cheap glitch spam, no unreadable UI mess, no broken perspective, no flicker overload, no random text garbage",
  },
  {
    id: "jump_transition",
    name: "Jump Transition",
    category: "camera_motion",
    previewVideoUrl: "",
    previewGradient: "from-emerald-950 via-green-800 to-teal-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [2, 5],
    costMultiplier: 1.0,
    engineType: "impact_cut_flow_transition",
    motionProfile: "energetic jump cut blend",
    blendStrategy: "momentum continuity match cut",
    description: "Energy and momentum snap from scene A into scene B while feeling deliberate.",
    hiddenSystemPromptTemplate:
      "Create a cinematic jump-style transition that uses momentum and movement continuity to snap from Input A into Input B while still feeling smooth and intentional. The effect should feel modern, energetic, and stylish without becoming chaotic.",
    hiddenNegativePromptTemplate:
      "no ugly hard cut, no jitter spam, no random shake, no temporal tearing, no bad motion blur",
  },
  {
    id: "seamless_transition",
    name: "Seamless Transition",
    category: "camera_motion",
    previewVideoUrl: "",
    previewGradient: "from-teal-950 via-emerald-700 to-cyan-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.2,
    engineType: "continuity_transition",
    motionProfile: "invisible scene continuity",
    blendStrategy: "match motion seamless blend",
    description: "Scene A flows invisibly into scene B — one continuous shot feel.",
    hiddenSystemPromptTemplate:
      "Create a seamless cinematic transition from Input A to Input B that feels like one continuous shot. Hide the transition inside motion, framing continuity, or environmental blending so the result appears smooth, natural, and highly polished.",
    hiddenNegativePromptTemplate:
      "no visible hard boundary, no obvious cut, no flicker, no stutter, no motion mismatch, no perspective break",
  },
  {
    id: "trucksition",
    name: "Trucksition",
    category: "stylized_special",
    previewVideoUrl: "",
    previewGradient: "from-stone-950 via-neutral-700 to-zinc-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [3, 6],
    costMultiplier: 1.1,
    engineType: "vehicle_pass_transition",
    motionProfile: "large vehicle wipe",
    blendStrategy: "vehicle occlusion transition",
    description: "A large vehicle foreground passes like a wipe blade from scene A to scene B.",
    hiddenSystemPromptTemplate:
      "Generate a cinematic transition where a truck or large vehicle-like foreground pass becomes the wipe layer between Input A and Input B. The effect should feel bold, kinetic, and visually clear, with strong foreground occlusion and smooth reveal timing.",
    hiddenNegativePromptTemplate:
      "no traffic chaos, no broken vehicle geometry, no random crashes, no flicker, no perspective glitches",
  },
  {
    id: "gorilla_transfer",
    name: "Gorilla Transfer",
    category: "transformation",
    previewVideoUrl: "",
    previewGradient: "from-green-950 via-emerald-900 to-slate-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.4,
    engineType: "subject_power_transform",
    motionProfile: "powerful creature-form transformation",
    blendStrategy: "subject dominance morph",
    description: "A primal, powerful transformation energy morphs scene A dominantly into scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic transformation transition with a strong primal creature-like energy, where Input A powerfully transitions into Input B through bold physical transformation cues. Keep the result premium, stylized, and controlled rather than chaotic or comedic.",
    hiddenNegativePromptTemplate:
      "no horror gore, no broken anatomy, no cartoon silliness unless intended, no random beast glitches, no flicker",
  },
  {
    id: "intermission",
    name: "Intermission",
    category: "stylized_special",
    previewVideoUrl: "",
    previewGradient: "from-purple-950 via-violet-900 to-indigo-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 10],
    costMultiplier: 1.2,
    engineType: "theatrical_break_transition",
    motionProfile: "dramatic pause and reveal",
    blendStrategy: "cinematic pause bridge",
    description: "An editorial chapter-break style pause bridges scene A and scene B.",
    hiddenSystemPromptTemplate:
      "Create a cinematic intermission-style transition between Input A and Input B with a brief stylized pause, elegant separation, and strong dramatic reveal. The transition should feel intentional, editorial, and premium, like a high-end cinematic chapter break.",
    hiddenNegativePromptTemplate:
      "no cheesy title card feel, no cheap slideshow transition, no static freeze abuse, no flicker, no awkward silence effect in visuals",
  },
  {
    id: "stranger_transition",
    name: "Stranger Transition",
    category: "stylized_special",
    previewVideoUrl: "",
    previewGradient: "from-fuchsia-950 via-purple-900 to-slate-950",
    supportedInputs: ["image-image", "video-video", "image-video", "video-image"],
    durationRange: [4, 8],
    costMultiplier: 1.5,
    engineType: "mysterious_energy_transition",
    motionProfile: "unnatural but elegant dimensional shift",
    blendStrategy: "mysterious veil crossover",
    description: "A mysterious dimensional shift carries scene A through an otherworldly veil into B.",
    hiddenSystemPromptTemplate:
      "Generate a cinematic mysterious transition from Input A to Input B with a strange dimensional feel, subtle distortion, eerie elegance, and premium atmospheric energy. The effect should feel otherworldly but controlled, stylish, and readable.",
    hiddenNegativePromptTemplate:
      "no horror gore, no extreme glitch spam, no ugly distortion overload, no cheap jump scare style, no flicker chaos",
  },
];

/** Returns ONLY client-safe preset fields (no hidden prompts). */
export function getClientSafePresets() {
  return TRANSITION_PRESETS.map(
    ({
      hiddenSystemPromptTemplate: _sys,
      hiddenNegativePromptTemplate: _neg,
      blendStrategy: _blend,
      ...safe
    }) => safe
  );
}

export type ClientSafePreset = ReturnType<typeof getClientSafePresets>[number];

/** Get full preset including hidden templates by id (server use only). */
export function getPresetById(id: string): TransitionPreset | undefined {
  return TRANSITION_PRESETS.find((p) => p.id === id);
}

/** Base credits per transition second */
const BASE_CREDITS_PER_SECOND = 4;

/** Calculate credits for a given preset and duration */
export function calcTransitionCredits(presetId: string, duration: number): number {
  const preset = TRANSITION_PRESETS.find((p) => p.id === presetId);
  const multiplier = preset?.costMultiplier ?? 1.0;
  return Math.ceil(BASE_CREDITS_PER_SECOND * duration * multiplier);
}

/** Assembles the final prompt for the backend using user controls (for server use only). */
export function assembleHiddenPrompt(
  preset: TransitionPreset,
  controls: {
    intensity: number;
    smoothness: number;
    cinematicStrength: number;
    preserveFraming: boolean;
    subjectFocus: boolean;
    resolution: string;
    fps: number;
    enhance: boolean;
  }
): { prompt: string; negativePrompt: string } {
  const intensityLabel = controls.intensity > 70 ? "high intensity" : controls.intensity > 40 ? "moderate intensity" : "subtle intensity";
  const smoothnessLabel = controls.smoothness > 70 ? "ultra-smooth" : controls.smoothness > 40 ? "smooth" : "sharp";
  const cinematicLine = controls.cinematicStrength > 70 ? "maximum cinematic quality, filmic grading" : controls.cinematicStrength > 40 ? "cinematic quality" : "natural quality";

  const framingLine = controls.preserveFraming ? "preserve original subject framing" : "allow dynamic reframing";
  const focusLine = controls.subjectFocus ? "maintain clear subject focus throughout" : "allow background emphasis";
  const enhanceLine = controls.enhance ? "apply quality enhancement pass" : "";
  const resolutionLine = `output resolution ${controls.resolution}`;

  const prompt = [
    preset.hiddenSystemPromptTemplate,
    `Transition style modifiers: ${intensityLabel}, ${smoothnessLabel} motion, ${cinematicLine}.`,
    `${framingLine}. ${focusLine}.`,
    resolutionLine,
    enhanceLine,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    prompt,
    negativePrompt: preset.hiddenNegativePromptTemplate,
  };
}
