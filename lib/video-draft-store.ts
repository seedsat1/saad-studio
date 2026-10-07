/**
 * Persistence for the video composer so a reload does not throw away work.
 *
 * Two stores, because the data splits cleanly in two:
 *  - Scalars (prompt, model, duration, resolution, ...) go to localStorage.
 *  - Attachments go to IndexedDB, which stores File and Blob objects natively.
 *    localStorage only holds strings, and base64-ing a reference video would
 *    blow past its quota.
 *
 * Everything here is best-effort: storage can be unavailable (private windows,
 * blocked site data, quota exhaustion), so every call resolves rather than
 * throwing and the composer keeps working without persistence.
 */

export type VideoDraftInputMode = "references" | "frames";

export interface VideoDraftScalars {
  modelId: string | null;
  prompt: string;
  negativePrompt: string;
  duration: number | null;
  aspectRatio: string | null;
  size: string | null;
  resolution: string | null;
  sound: boolean;
  inputMode: VideoDraftInputMode;
  linkedStartFrameUrl: string | null;
  linkedEndFrameUrl: string | null;
  referenceVideoDurations: number[];
  savedAt: number;
}

export interface VideoDraftFiles {
  referenceImages: File[];
  startFrame: File | null;
  endFrame: File | null;
}

export interface VideoDraft {
  scalars: VideoDraftScalars;
  files: VideoDraftFiles;
}

const SCALAR_KEY_PREFIX = "saad_video_draft:";
const DB_NAME = "saad_video_draft";
const DB_VERSION = 1;
const STORE_NAME = "attachments";
/** Drafts older than this are treated as abandoned and dropped on read. */
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Guard against a single oversized attachment set filling the user's quota. */
const MAX_TOTAL_ATTACHMENT_BYTES = 200 * 1024 * 1024;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Drafts are per profile: the app lets one person switch between profiles, and
 * a draft written under one must not resurface under another.
 */
function activeProfileId(): string {
  if (!isBrowser()) return "default";
  try {
    return window.localStorage.getItem("saad_active_profile_id") || "default";
  } catch {
    return "default";
  }
}

function scalarKey(): string {
  return `${SCALAR_KEY_PREFIX}${activeProfileId()}`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | null> {
  return openDatabase().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        let settled = false;
        const finish = (value: T | null) => {
          if (settled) return;
          settled = true;
          try {
            db.close();
          } catch {
            /* closing a database that already errored is not actionable */
          }
          resolve(value);
        };
        let tx: IDBTransaction;
        try {
          tx = db.transaction(STORE_NAME, mode);
        } catch {
          finish(null);
          return;
        }
        tx.onabort = () => finish(null);
        tx.onerror = () => finish(null);
        let request: IDBRequest<T> | null = null;
        try {
          request = work(tx.objectStore(STORE_NAME));
        } catch {
          finish(null);
          return;
        }
        if (!request) {
          tx.oncomplete = () => finish(null);
          return;
        }
        request.onsuccess = () => finish(request!.result);
        request.onerror = () => finish(null);
      }),
  );
}

function totalBytes(files: VideoDraftFiles): number {
  const all = [...files.referenceImages, files.startFrame, files.endFrame];
  return all.reduce((sum, file) => sum + (file ? file.size : 0), 0);
}

function isEmptyDraft(scalars: VideoDraftScalars, files: VideoDraftFiles): boolean {
  return (
    !scalars.prompt.trim() &&
    !scalars.negativePrompt.trim() &&
    !scalars.linkedStartFrameUrl &&
    !scalars.linkedEndFrameUrl &&
    files.referenceImages.length === 0 &&
    !files.startFrame &&
    !files.endFrame
  );
}

/**
 * Writes the draft. An empty composer clears the draft instead of saving a
 * blank one, so a fresh page does not restore a ghost of a cleared session.
 */
export async function saveVideoDraft(scalars: VideoDraftScalars, files: VideoDraftFiles): Promise<void> {
  if (!isBrowser()) return;

  if (isEmptyDraft(scalars, files)) {
    await clearVideoDraft();
    return;
  }

  try {
    window.localStorage.setItem(scalarKey(), JSON.stringify(scalars));
  } catch {
    /* quota or blocked storage: the attachments below may still persist */
  }

  // Oversized attachment sets are skipped rather than failing the whole save,
  // so the prompt and settings still survive a reload.
  if (totalBytes(files) > MAX_TOTAL_ATTACHMENT_BYTES) {
    await runTransaction("readwrite", (store) => store.delete(activeProfileId()) as IDBRequest<unknown> as IDBRequest<null>);
    return;
  }

  await runTransaction("readwrite", (store) =>
    store.put(
      {
        referenceImages: files.referenceImages,
        startFrame: files.startFrame,
        endFrame: files.endFrame,
      },
      activeProfileId(),
    ) as IDBRequest<unknown> as IDBRequest<null>,
  );
}

/** Reads the draft, or null when there is nothing usable to restore. */
export async function loadVideoDraft(): Promise<VideoDraft | null> {
  if (!isBrowser()) return null;

  let scalars: VideoDraftScalars | null = null;
  try {
    const raw = window.localStorage.getItem(scalarKey());
    if (raw) scalars = JSON.parse(raw) as VideoDraftScalars;
  } catch {
    scalars = null;
  }

  if (!scalars || typeof scalars !== "object") return null;

  const savedAt = Number(scalars.savedAt);
  if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_DRAFT_AGE_MS) {
    await clearVideoDraft();
    return null;
  }

  const stored = (await runTransaction<unknown>("readonly", (store) =>
    store.get(activeProfileId()) as IDBRequest<unknown>,
  )) as Partial<VideoDraftFiles> | null;

  // A File that survived a reload still reports its name and size; anything
  // else in the record is treated as corrupt and dropped.
  const isFile = (value: unknown): value is File =>
    typeof File !== "undefined" && value instanceof File;

  const files: VideoDraftFiles = {
    referenceImages: Array.isArray(stored?.referenceImages) ? stored!.referenceImages.filter(isFile) : [],
    startFrame: isFile(stored?.startFrame) ? stored!.startFrame! : null,
    endFrame: isFile(stored?.endFrame) ? stored!.endFrame! : null,
  };

  return {
    scalars: {
      modelId: scalars.modelId ?? null,
      prompt: typeof scalars.prompt === "string" ? scalars.prompt : "",
      negativePrompt: typeof scalars.negativePrompt === "string" ? scalars.negativePrompt : "",
      duration: typeof scalars.duration === "number" ? scalars.duration : null,
      aspectRatio: scalars.aspectRatio ?? null,
      size: scalars.size ?? null,
      resolution: scalars.resolution ?? null,
      sound: scalars.sound === true,
      inputMode: scalars.inputMode === "frames" ? "frames" : "references",
      linkedStartFrameUrl: scalars.linkedStartFrameUrl ?? null,
      linkedEndFrameUrl: scalars.linkedEndFrameUrl ?? null,
      referenceVideoDurations: Array.isArray(scalars.referenceVideoDurations)
        ? scalars.referenceVideoDurations.filter((value) => typeof value === "number" && Number.isFinite(value))
        : [],
      savedAt,
    },
    files,
  };
}

/** Removes the draft for the active profile from both stores. */
export async function clearVideoDraft(): Promise<void> {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(scalarKey());
  } catch {
    /* nothing further to do if localStorage refuses */
  }
  await runTransaction("readwrite", (store) => store.delete(activeProfileId()) as IDBRequest<unknown> as IDBRequest<null>);
}
