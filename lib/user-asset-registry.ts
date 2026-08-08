/**
 * Client-side registry for user-owned Reference Studio assets (elements,
 * locations, etc.).
 *
 * `ReferenceStudioModal` writes entries here when it fetches or creates
 * assets; `reference-prompt-injector` reads from it so a user-selected
 * asset contributes its name+description to the prompt suffix without
 * every page needing to thread the descriptor through props.
 */

export type UserAssetKind = "element" | "location" | "effect" | "camera";

export interface UserAssetDescriptor {
  id: string;
  name: string;
  description: string;
}

const stores: Record<UserAssetKind, Map<string, UserAssetDescriptor>> = {
  element: new Map(),
  location: new Map(),
  effect: new Map(),
  camera: new Map(),
};

function normalize(entry: UserAssetDescriptor): UserAssetDescriptor {
  return {
    id: entry.id,
    name: (entry.name || "").trim(),
    description: (entry.description || "").trim(),
  };
}

export function registerUserAsset(kind: UserAssetKind, entry: UserAssetDescriptor): void {
  if (!entry?.id) return;
  stores[kind].set(entry.id, normalize(entry));
}

export function registerUserAssets(kind: UserAssetKind, entries: UserAssetDescriptor[]): void {
  for (const e of entries) registerUserAsset(kind, e);
}

export function getUserAsset(kind: UserAssetKind, id: string | null | undefined): UserAssetDescriptor | undefined {
  if (!id) return undefined;
  return stores[kind].get(id);
}

export function unregisterUserAsset(kind: UserAssetKind, id: string): void {
  stores[kind].delete(id);
}
