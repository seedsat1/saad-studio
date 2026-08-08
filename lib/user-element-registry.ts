/**
 * Client-side registry for user-owned Reference Studio elements.
 *
 * `ReferenceStudioModal` writes entries here when it fetches or creates
 * elements; `reference-prompt-injector` reads from it so a user-selected
 * element contributes its name+description to the prompt suffix without
 * every page needing to thread the descriptor through props.
 */

export interface UserElementDescriptor {
  id: string;
  name: string;
  description: string;
}

const store = new Map<string, UserElementDescriptor>();

export function registerUserElement(entry: UserElementDescriptor): void {
  if (!entry?.id) return;
  store.set(entry.id, {
    id: entry.id,
    name: (entry.name || "").trim(),
    description: (entry.description || "").trim(),
  });
}

export function registerUserElements(entries: UserElementDescriptor[]): void {
  for (const e of entries) registerUserElement(e);
}

export function getUserElement(id: string | null | undefined): UserElementDescriptor | undefined {
  if (!id) return undefined;
  return store.get(id);
}

export function unregisterUserElement(id: string): void {
  store.delete(id);
}
