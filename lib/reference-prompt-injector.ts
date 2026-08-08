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
} from "./hook-studio-config";
import { getUserElement } from "./user-element-registry";

export interface PresetSelections {
  selectedStyleId?: string | null;
  selectedEffectId?: string | null;
  selectedCharacterId?: string | null;
  selectedCameraId?: string | null;
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

  if (sel.selectedStyleId) {
    const s = HOOK_STYLES.find((x) => x.id === sel.selectedStyleId);
    if (s?.systemPromptAddon) parts.push(`Style: ${s.systemPromptAddon}`);
  }

  if (sel.selectedEffectId) {
    const e = HOOK_EFFECTS.find((x) => x.id === sel.selectedEffectId);
    const addon = e?.systemPromptAddon || e?.promptDescription;
    if (addon) parts.push(`Effect (${e?.tag ?? ""}): ${addon}`);
  }

  if (sel.selectedCharacterId) {
    const ch = HOOK_CHARACTERS.find((x) => x.id === sel.selectedCharacterId);
    if (ch?.promptDescription) parts.push(`Character (${ch.tag}): ${ch.promptDescription}`);
  }

  if (sel.selectedCameraId) {
    const c = HOOK_CAMERAS.find((x) => x.id === sel.selectedCameraId);
    if (c?.promptDescription) parts.push(`Camera (${c.tag}): ${c.promptDescription}`);
  }

  if (sel.selectedSketchId) {
    const sk = HOOK_SKETCHES.find((x) => x.id === sel.selectedSketchId);
    if (sk?.promptDescription) parts.push(`Sketch (${sk.tag}): ${sk.promptDescription}`);
  }

  if (sel.selectedLocationId) {
    const l = HOOK_LOCATIONS.find((x) => x.id === sel.selectedLocationId);
    if (l?.promptDescription) parts.push(`Location (${l.tag}): ${l.promptDescription}`);
  }

  if (sel.selectedElementId) {
    const el = HOOK_ELEMENTS.find((x) => x.id === sel.selectedElementId);
    if (el?.promptDescription) {
      parts.push(`Element (${el.tag}): ${el.promptDescription}`);
    } else {
      const ue = getUserElement(sel.selectedElementId);
      if (ue && (ue.description || ue.name)) {
        const label = ue.name ? `@${ue.name.replace(/\s+/g, "").toLowerCase()}` : "custom";
        const body = ue.description || `preserve the exact appearance, colors, and proportions of "${ue.name}" as shown in the reference photos`;
        parts.push(`Element (${label}): ${body}. Keep this product/prop visually identical to the attached references.`);
      }
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
