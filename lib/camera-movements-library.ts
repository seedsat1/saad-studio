// Camera Movements Library — categorised subset of HOOK_CAMERAS for the /explore section.
// Only the 46 motion-based movements are exposed here (the older 18 photographic style presets
// stay in HOOK_CAMERAS but are excluded from this library).
//
// To add or remove a movement: edit CAMERA_MOVEMENT_CATEGORIES below. The card content
// (name, description, thumbnail) is pulled from HOOK_CAMERAS at runtime, so a change there
// propagates automatically.

import { HOOK_CAMERAS, type HookCameraPreset } from "@/lib/hook-studio-config";

export type CameraMovementCategoryId =
  | "pan-tilt"
  | "zoom-lens"
  | "dolly-track"
  | "physical"
  | "human"
  | "drone-crane"
  | "specials";

export type CameraMovementCategory = {
  id: CameraMovementCategoryId;
  nameAr: string;
  nameEn: string;
};

// Order matches aicameramovements.com tab bar (Dolly/Track first — highest count of shots).
export const CAMERA_MOVEMENT_CATEGORIES: CameraMovementCategory[] = [
  { id: "dolly-track",  nameAr: "دولّي / تتبع",       nameEn: "Dolly / Track" },
  { id: "zoom-lens",    nameAr: "زوم / عدسات",        nameEn: "Zoom / Lens" },
  { id: "drone-crane",  nameAr: "درون / رافعات",      nameEn: "Drone / Crane" },
  { id: "pan-tilt",     nameAr: "بان / تيلت",         nameEn: "Pan / Tilt" },
  { id: "physical",     nameAr: "حركات فيزيائية",     nameEn: "Physical Moves" },
  { id: "human",        nameAr: "كاميرا بشرية",       nameEn: "Human Camera" },
  { id: "specials",     nameAr: "لقطات خاصة",         nameEn: "Specials" },
];

const CATEGORY_BY_ID: Record<string, CameraMovementCategoryId> = {
  // Pan / Tilt (7)
  "static-shot": "pan-tilt",
  "pan-right": "pan-tilt",
  "pan-left": "pan-tilt",
  "whip-pan-right": "pan-tilt",
  "whip-pan-left": "pan-tilt",
  "tilt-up": "pan-tilt",
  "tilt-down": "pan-tilt",
  // Zoom / Lens (6)
  "slow-zoom-in": "zoom-lens",
  "slow-zoom-out": "zoom-lens",
  "fast-zoom-in": "zoom-lens",
  "fast-zoom-out": "zoom-lens",
  "crash-zoom-in": "zoom-lens",
  "crash-zoom-out": "zoom-lens",
  // Dolly / Track (9)
  "dolly-in": "dolly-track",
  "dolly-out": "dolly-track",
  "tracking-shot": "dolly-track",
  "follow-shot": "dolly-track",
  "reverse-tracking": "dolly-track",
  "side-tracking": "dolly-track",
  "low-tracking": "dolly-track",
  "vehicle-tracking": "dolly-track",
  "chase-shot": "dolly-track",
  // Physical Moves (11)
  "truck-right": "physical",
  "truck-left": "physical",
  "pedestal-up": "physical",
  "pedestal-down": "physical",
  "slider-right": "physical",
  "slider-left": "physical",
  "push-past": "physical",
  "arc-right": "physical",
  "arc-left": "physical",
  "orbit-cw": "physical",
  "orbit-ccw": "physical",
  // Human Camera (2)
  "handheld-shot": "human",
  "snorricam": "human",
  // Drone / Crane (5)
  "crane-up": "drone-crane",
  "crane-down": "drone-crane",
  "drone-push-in": "drone-crane",
  "drone-pull-back": "drone-crane",
  "helicopter-shot": "drone-crane",
  // Specials (6)
  "fpv-shot": "specials",
  "tilt-shift-motion": "specials",
  "infinite-zoom": "specials",
  "earth-zoom-out": "specials",
  "time-lapse": "specials",
  "pass-through": "specials",
  // Signature techniques (5 — from extended source)
  "dolly-zoom": "specials",
  "rack-focus": "specials",
  "pan-360": "pan-tilt",
  "barrel-roll": "physical",
  "speed-ramp": "dolly-track",
};

export type CameraMovementEntry = HookCameraPreset & {
  category: CameraMovementCategoryId;
};

/** All 46 motion-based camera movements, in the same order as HOOK_CAMERAS. */
export function getCameraMovements(): CameraMovementEntry[] {
  const entries: CameraMovementEntry[] = [];
  for (const preset of HOOK_CAMERAS) {
    const category = CATEGORY_BY_ID[preset.id];
    if (category) entries.push({ ...preset, category });
  }
  return entries;
}

export function getCategoryCount(id: CameraMovementCategoryId | "all"): number {
  if (id === "all") return Object.keys(CATEGORY_BY_ID).length;
  return Object.values(CATEGORY_BY_ID).filter((c) => c === id).length;
}
