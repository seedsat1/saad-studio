/**
 * Shared helper: turn Reference Studio preset selections into a prompt suffix.
 *
 * The Reference Studio's Style / Effects / Camera / Sketch tabs are prompt-only
 * modifiers - their thumbnails are just visual index cards, not references.
 * When the user selects one, its `systemPromptAddon` / `promptDescription`
 * must be appended to the generation prompt so the model actually applies it.
 *
 * This helper centralises that logic so every page (image, video, hook-studio,
 * cinema-flow) speaks the same language to the models.
 */

import {
  HOOK_STYLES,
  HOOK_ELEMENTS,
  HOOK_LOCATIONS,
  HOOK_CAMERAS,
  HOOK_EFFECTS,
  HOOK_CHARACTERS,
  HOOK_SKETCHES,
  HOOK_SHOT_TYPES,
  HOOK_FILM_STOCKS,
  HOOK_MOVIE_LOOKS,
  HOOK_LIGHTING,
  HOOK_MOTION_BLURS,
  HOOK_GRAINS,
  HOOK_HALATIONS,
} from "./hook-studio-config";
import { getUserAsset, type UserAssetKind } from "./user-asset-registry";

export interface PresetSelections {
  selectedStyleId?: string | null;
  selectedEffectId?: string | null;
  selectedCharacterId?: string | null;
  selectedCameraId?: string | null;
  /** Shot framing / angle preset from the Shot Type tab. */
  selectedShotTypeId?: string | null;
  /** Film emulsion preset from the Film Stock tab. */
  selectedFilmStockId?: string | null;
  /** Colour-grade preset from the Movie Look tab. */
  selectedMovieLookId?: string | null;
  /** Lighting pattern preset from the Lighting tab. */
  selectedLightingId?: string | null;
  /** Motion-blur treatment preset from the Motion Blur tab. */
  selectedMotionBlurId?: string | null;
  /** Grain texture preset from the Grain tab. */
  selectedGrainId?: string | null;
  /** Highlight-glow preset from the Halation tab. */
  selectedHalationId?: string | null;
  selectedSketchId?: string | null;
  /** Semantic hint for a built-in preset location (not the user's own uploaded one). */
  selectedLocationId?: string | null;
  /** Semantic hint for a built-in preset element (not the user's own uploaded one). */
  selectedElementId?: string | null;
  /** User-created color palette (from UserPalette). Injected as an explicit color-grade instruction. */
  selectedPalette?: { name: string; colors: string[] } | null;
}

/**
 * Build a compact prompt suffix from the selected presets.
 * Returns "" when nothing is selected.
 *
 * Example output:
 *   "[Style: Photorealistic style, ... . Effect: #vibrant - Rich highly saturated colors ...]"
 */
export function buildPresetPromptSuffix(sel: PresetSelections): string {
  const parts: string[] = [];

  const pushUserAssetFallback = (
    kind: UserAssetKind,
    id: string,
    prefix: "Element" | "Location" | "Effect" | "Camera",
    defaultBody: (name: string) => string,
    tail: string,
  ) => {
    const ua = getUserAsset(kind, id);
    if (!ua || (!ua.description && !ua.name)) return;
    const label = ua.name ? `@${ua.name.replace(/\s+/g, "").toLowerCase()}` : "custom";
    const body = ua.description || defaultBody(ua.name);
    parts.push(`${prefix} (${label}): ${body}. ${tail}`);
  };

  if (sel.selectedStyleId) {
    const s = HOOK_STYLES.find((x) => x.id === sel.selectedStyleId);
    if (s?.systemPromptAddon) parts.push(`Style: ${s.systemPromptAddon}`);
  }

  if (sel.selectedEffectId) {
    const e = HOOK_EFFECTS.find((x) => x.id === sel.selectedEffectId);
    const addon = e?.systemPromptAddon || e?.promptDescription;
    if (addon) {
      parts.push(`Effect (${e?.tag ?? ""}): ${addon}`);
    } else {
      pushUserAssetFallback(
        "effect",
        sel.selectedEffectId,
        "Effect",
        (name) => `apply the "${name}" look — match the color grade, lighting quality, and overall mood shown in the reference photos`,
        "Reproduce the same aesthetic tone, contrast, and finish as the attached references without altering subject or composition.",
      );
    }
  }

  if (sel.selectedCharacterId) {
    const ch = HOOK_CHARACTERS.find((x) => x.id === sel.selectedCharacterId);
    if (ch?.promptDescription) parts.push(`Character (${ch.tag}): ${ch.promptDescription}`);
  }

  if (sel.selectedShotTypeId) {
    const st = HOOK_SHOT_TYPES.find((x) => x.id === sel.selectedShotTypeId);
    if (st?.promptDescription) parts.push(`Shot type (${st.tag}): ${st.promptDescription}`);
  }

  if (sel.selectedCameraId) {
    const c = HOOK_CAMERAS.find((x) => x.id === sel.selectedCameraId);
    if (c?.promptDescription) {
      parts.push(`Camera (${c.tag}): ${c.promptDescription}`);
    } else {
      pushUserAssetFallback(
        "camera",
        sel.selectedCameraId,
        "Camera",
        (name) => `frame the shot as "${name}" — match the camera angle, focal length, distance, and composition shown in the reference photos`,
        "Replicate the same shot type, perspective, and framing as the attached references while keeping subject and scene from the base prompt.",
      );
    }
  }

  if (sel.selectedLightingId) {
    const lg = HOOK_LIGHTING.find((x) => x.id === sel.selectedLightingId);
    if (lg?.promptDescription) parts.push(`Lighting (${lg.tag}): ${lg.promptDescription}`);
  }

  if (sel.selectedMotionBlurId) {
    const mb = HOOK_MOTION_BLURS.find((x) => x.id === sel.selectedMotionBlurId);
    if (mb?.promptDescription) parts.push(`Motion blur (${mb.tag}): ${mb.promptDescription}`);
  }

  if (sel.selectedFilmStockId) {
    const fst = HOOK_FILM_STOCKS.find((x) => x.id === sel.selectedFilmStockId);
    if (fst?.promptDescription) parts.push(`Film stock (${fst.tag}): ${fst.promptDescription}`);
  }

  if (sel.selectedHalationId) {
    const hl = HOOK_HALATIONS.find((x) => x.id === sel.selectedHalationId);
    if (hl?.promptDescription) parts.push(`Halation (${hl.tag}): ${hl.promptDescription}`);
  }

  if (sel.selectedGrainId) {
    const gr = HOOK_GRAINS.find((x) => x.id === sel.selectedGrainId);
    if (gr?.promptDescription) parts.push(`Grain (${gr.tag}): ${gr.promptDescription}`);
  }

  if (sel.selectedMovieLookId) {
    const ml = HOOK_MOVIE_LOOKS.find((x) => x.id === sel.selectedMovieLookId);
    if (ml?.promptDescription) parts.push(`Movie look (${ml.tag}): ${ml.promptDescription}`);
  }

  if (sel.selectedSketchId) {
    const sk = HOOK_SKETCHES.find((x) => x.id === sel.selectedSketchId);
    if (sk?.promptDescription) parts.push(`Sketch (${sk.tag}): ${sk.promptDescription}`);
  }

  if (sel.selectedLocationId) {
    const l = HOOK_LOCATIONS.find((x) => x.id === sel.selectedLocationId);
    if (l?.promptDescription) {
      parts.push(`Location (${l.tag}): ${l.promptDescription}`);
    } else {
      pushUserAssetFallback(
        "location",
        sel.selectedLocationId,
        "Location",
        (name) => `set the scene at "${name}" as shown in the reference photos`,
        "Match the environment, lighting, textures, and spatial layout of the attached references.",
      );
    }
  }

  if (sel.selectedElementId) {
    const el = HOOK_ELEMENTS.find((x) => x.id === sel.selectedElementId);
    if (el?.promptDescription) {
      parts.push(`Element (${el.tag}): ${el.promptDescription}`);
    } else {
      pushUserAssetFallback(
        "element",
        sel.selectedElementId,
        "Element",
        (name) => `preserve the exact appearance, colors, and proportions of "${name}" as shown in the reference photos`,
        "Keep this product/prop visually identical to the attached references.",
      );
    }
  }

  if (sel.selectedPalette && Array.isArray(sel.selectedPalette.colors) && sel.selectedPalette.colors.length >= 2) {
    const hex = sel.selectedPalette.colors.join(", ");
    parts.push(`Color Palette "${sel.selectedPalette.name}" - apply this color grade using only these hex tones: ${hex}`);
  }

  return parts.length > 0 ? ` [${parts.join(" . ")}]` : "";
}

/**
 * Convenience: append the suffix to an existing prompt with a single space.
 * If suffix is empty, returns the prompt unchanged.
 */
export function withPresetsAppended(prompt: string, sel: PresetSelections): string {
  const suffix = buildPresetPromptSuffix(sel);
  if (!suffix) return prompt;
  return `${prompt.trim()}${suffix}`;
}
