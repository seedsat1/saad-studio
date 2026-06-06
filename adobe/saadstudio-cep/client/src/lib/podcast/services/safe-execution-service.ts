import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import type { PodcastAdapterResult } from "../types/premiere";

export function draftSequenceName(originalName: string | null | undefined): string {
  const base = originalName?.trim() || "Untitled Sequence";
  return `${base} - Saad Auto Edit Draft`;
}

export async function createSafeEditCopy(input: {
  activeSequence: boolean;
  originalSequenceName?: string | null;
  hasDecisionPlan: boolean;
  confirmedSafeCopyMode: boolean;
}): Promise<PodcastAdapterResult> {
  if (!input.activeSequence) {
    return { ok: false, reason: "No active sequence. Safe copy mode cannot start." };
  }
  if (!input.hasDecisionPlan) {
    return { ok: false, reason: "Camera Decision Plan is empty. Safe copy mode requires a plan." };
  }
  if (!input.confirmedSafeCopyMode) {
    return { ok: false, reason: "Safe copy mode must be confirmed before duplication." };
  }
  return premierePodcastAdapter.duplicateSequence({
    newName: draftSequenceName(input.originalSequenceName),
  });
}
