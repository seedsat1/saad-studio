import prismadb from "@/lib/prismadb";
import { deleteObject, objectKeyFor } from "@/lib/storage/runtime";

export const STORAGE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours minimum grace period

export type MediaOwnershipClass =
  | "CANONICAL_OUTPUT"
  | "REFERENCE_INPUT"
  | "THUMBNAIL_POSTER"
  | "PAYMENT_PROOF"
  | "AD_CAMPAIGN_MEDIA"
  | "CMS_SITE_ASSET"
  | "USER_LIBRARY_ASSET"
  | "ACTIVE_IN_FLIGHT_JOB"
  | "TEMPORARY_STAGING"
  | "ORPHAN_CANDIDATE";

export type MediaAssetCandidate = {
  bucket: string;
  path: string;
  sizeBytes?: number;
  lastModified?: Date;
  ownershipClass: MediaOwnershipClass;
  isEligibleForDeletion: boolean;
  reason: string;
};

export type StorageLifecycleSummary = {
  scanned: number;
  protected: number;
  candidate: number;
  deleted: number;
  failed: number;
  bytesReclaimable: number;
  bytesDeleted: number;
  dryRun: boolean;
  items: MediaAssetCandidate[];
};

// UserPalette is deliberately absent: it stores colour values, not media, so it
// has no coverUrl/referenceUrls columns and including it made the whole UNION
// fail — which silently classified every character photo as an orphan.
const USER_LIBRARY_TABLES = [
  "UserCharacter",
  "UserElement",
  "UserLocation",
  "UserEffect",
  "UserCamera",
] as const;

const USER_LIBRARY_CACHE_MS = 60_000;
let userLibraryCache: { at: number; entries: Array<{ owner: string; media: string[] }> } | null = null;

/**
 * Every media path the subscriber's own libraries point at, loaded once and
 * held briefly. This is consulted per candidate file during a cleanup sweep,
 * and a query per candidate against a remote database is far too slow — a
 * fifty-file batch timed out. Freshly uploaded files are covered separately by
 * the 24-hour grace period, so a short cache cannot expose them.
 */
async function loadUserLibraryMedia() {
  if (userLibraryCache && Date.now() - userLibraryCache.at < USER_LIBRARY_CACHE_MS) {
    return userLibraryCache.entries;
  }
  // Table names come from the constant list above, never from input.
  const union = USER_LIBRARY_TABLES.map(
    (t) => `SELECT '${t}' AS "table", "id", "name", "coverUrl", "referenceUrls"::text AS "refs" FROM "${t}"`,
  ).join(" UNION ALL ");

  const rows = await prismadb
    .$queryRawUnsafe<Array<{ table: string; id: string; name: string; coverUrl: string | null; refs: string | null }>>(union)
    .catch(() => [] as Array<{ table: string; id: string; name: string; coverUrl: string | null; refs: string | null }>);

  const entries = rows.map((r) => ({
    owner: `${r.table}:${r.id} (${r.name})`,
    media: [r.coverUrl ?? "", r.refs ?? ""].filter(Boolean),
  }));
  userLibraryCache = { at: Date.now(), entries };
  return entries;
}

/** Returns the owning library row for a media path, or null. */
async function findUserLibraryOwner(cleanPath: string, searchPattern: string): Promise<string | null> {
  const segments = cleanPath.split("/").filter(Boolean);
  // "1.webp" alone matches almost any character; the last two segments
  // ("<characterId>/1.webp") identify one.
  const key = segments.length >= 2 ? segments.slice(-2).join("/") : searchPattern;
  if (!key) return null;
  const entries = await loadUserLibraryMedia();
  const hit = entries.find((e) => e.media.some((m) => m.includes(key)));
  return hit ? hit.owner : null;
}

/**
 * Checks across all database models to determine if a media path or URL is actively referenced.
 * Returns true if the object has any active owner in the database.
 */
export async function isMediaObjectReferencedInDatabase(mediaPathOrUrl: string): Promise<{
  referenced: boolean;
  ownershipClass: MediaOwnershipClass;
  ownerDetail?: string;
}> {
  if (!mediaPathOrUrl) {
    return { referenced: false, ownershipClass: "ORPHAN_CANDIDATE" };
  }

  const cleanPath = mediaPathOrUrl.trim();
  const searchPattern = cleanPath.split("/").pop() || cleanPath;

  // 1. Generation Outputs & Media
  if (prismadb.generation?.findFirst) {
    const generation = await prismadb.generation.findFirst({
      where: {
        OR: [
          { mediaUrl: { contains: searchPattern } },
          { outputUrl: { contains: searchPattern } },
          { posterUrl: { contains: searchPattern } },
        ],
      },
      select: { id: true, mediaUrl: true, status: true },
    }).catch(() => null);

    if (generation) {
      if (generation.mediaUrl && generation.mediaUrl.startsWith("task:")) {
        return {
          referenced: true,
          ownershipClass: "ACTIVE_IN_FLIGHT_JOB",
          ownerDetail: `Generation:${generation.id} (status: ${generation.status})`,
        };
      }
      return {
        referenced: true,
        ownershipClass: "CANONICAL_OUTPUT",
        ownerDetail: `Generation:${generation.id}`,
      };
    }
  }

  // 2. Generation Request Snapshots (Reference images, first frame, last frame, face anchors)
  if (prismadb.generationRequestSnapshot?.findFirst && searchPattern.length > 5) {
    const snapshot = await prismadb.generationRequestSnapshot.findFirst({
      where: {
        OR: [
          { generationId: { contains: searchPattern } },
          { id: { contains: searchPattern } },
        ],
      },
      select: { id: true, generationId: true },
    }).catch(() => null);

    if (snapshot) {
      return {
        referenced: true,
        ownershipClass: "REFERENCE_INPUT",
        ownerDetail: `GenerationSnapshot:${snapshot.id} (Gen: ${snapshot.generationId})`,
      };
    }
  }

  // 3. Payment Receipts & Transfer Proofs in AdminTransaction
  if (prismadb.adminTransaction?.findFirst) {
    const txProof = await prismadb.adminTransaction.findFirst({
      where: {
        plan: { contains: searchPattern },
      },
      select: { id: true, paymentStatus: true },
    }).catch(() => null);

    if (txProof) {
      return {
        referenced: true,
        ownershipClass: "PAYMENT_PROOF",
        ownerDetail: `AdminTransaction:${txProof.id} (${txProof.paymentStatus})`,
      };
    }
  }

  // 4. Ad Campaign Media
  if (prismadb.adCampaign?.findFirst) {
    const adMedia = await prismadb.adCampaign.findFirst({
      where: {
        mediaUrl: { contains: searchPattern },
      },
      select: { id: true, title: true },
    }).catch(() => null);

    if (adMedia) {
      return {
        referenced: true,
        ownershipClass: "AD_CAMPAIGN_MEDIA",
        ownerDetail: `AdCampaign:${adMedia.id} (${adMedia.title})`,
      };
    }
  }

  // 5. Reference libraries the subscriber built and owns. Without this, a
  //    character's uploaded photos read as orphans: nothing in Generation
  //    points at them, because they are inputs the subscriber keeps, not
  //    outputs of any one job. Deleting them breaks the character forever.
  {
    const owner = await findUserLibraryOwner(cleanPath, searchPattern);
    if (owner) {
      return {
        referenced: true,
        ownershipClass: "USER_LIBRARY_ASSET",
        ownerDetail: owner,
      };
    }
  }

  // 6. CMS, Site Settings
  if (prismadb.siteSetting?.findFirst) {
    const siteSetting = await prismadb.siteSetting.findFirst({
      where: { logoUrl: { contains: searchPattern } },
      select: { id: true },
    }).catch(() => null);

    if (siteSetting) {
      return {
        referenced: true,
        ownershipClass: "CMS_SITE_ASSET",
        ownerDetail: "SiteSetting:Logo",
      };
    }
  }

  return {
    referenced: false,
    ownershipClass: "ORPHAN_CANDIDATE",
  };
}

/**
 * Classifies an asset candidate for lifecycle management.
 */
export async function classifyStorageCandidate(item: {
  bucket: string;
  path: string;
  sizeBytes?: number;
  lastModified?: Date;
}): Promise<MediaAssetCandidate> {
  const ageMs = item.lastModified ? Date.now() - item.lastModified.getTime() : 0;
  const isWithinGracePeriod = ageMs < STORAGE_GRACE_PERIOD_MS;

  // Check database ownership
  const ref = await isMediaObjectReferencedInDatabase(item.path);

  if (ref.referenced) {
    return {
      bucket: item.bucket,
      path: item.path,
      sizeBytes: item.sizeBytes ?? 0,
      lastModified: item.lastModified,
      ownershipClass: ref.ownershipClass,
      isEligibleForDeletion: false,
      reason: `Protected by active database reference: ${ref.ownerDetail}`,
    };
  }

  if (isWithinGracePeriod) {
    return {
      bucket: item.bucket,
      path: item.path,
      sizeBytes: item.sizeBytes ?? 0,
      lastModified: item.lastModified,
      ownershipClass: "TEMPORARY_STAGING",
      isEligibleForDeletion: false,
      reason: `Unreferenced asset is within safe 24-hour grace period (${Math.round(ageMs / 3600000)}h old)`,
    };
  }

  return {
    bucket: item.bucket,
    path: item.path,
    sizeBytes: item.sizeBytes ?? 0,
    lastModified: item.lastModified,
    ownershipClass: "ORPHAN_CANDIDATE",
    isEligibleForDeletion: true,
    reason: "Unreferenced in database and past 24-hour grace period",
  };
}

/**
 * Bounded Lifecycle Execution Engine.
 * Supports Dry-Run (default) and Safe Deletion.
 */
export async function runStorageLifecycleCleanup(options: {
  candidates?: Array<{ bucket: string; path: string; sizeBytes?: number; lastModified?: Date }>;
  dryRun?: boolean;
  batchSize?: number;
}): Promise<StorageLifecycleSummary> {
  const dryRun = options.dryRun !== false;
  const batchLimit = Math.min(100, Math.max(1, options.batchSize ?? 50));
  const rawList = options.candidates ?? [];
  const targetBatch = rawList.slice(0, batchLimit);

  const results: MediaAssetCandidate[] = [];
  let protectedCount = 0;
  let candidateCount = 0;
  let deletedCount = 0;
  let failedCount = 0;
  let bytesReclaimable = 0;
  let bytesDeleted = 0;

  for (const item of targetBatch) {
    const classification = await classifyStorageCandidate(item);
    results.push(classification);

    if (!classification.isEligibleForDeletion) {
      protectedCount++;
    } else {
      candidateCount++;
      bytesReclaimable += classification.sizeBytes ?? 0;

      if (!dryRun) {
        try {
          // Re-verify immediately prior to deletion to guard against race conditions
          const secondCheck = await isMediaObjectReferencedInDatabase(item.path);
          if (secondCheck.referenced) {
            protectedCount++;
            candidateCount--;
            classification.isEligibleForDeletion = false;
            classification.reason = `Protected by just-created DB reference: ${secondCheck.ownerDetail}`;
            continue;
          }

          await deleteObject({ bucket: item.bucket, path: item.path });
          deletedCount++;
          bytesDeleted += classification.sizeBytes ?? 0;
        } catch (delErr) {
          console.error(`[storage-lifecycle] Failed to delete ${item.bucket}/${item.path}:`, delErr);
          failedCount++;
        }
      }
    }
  }

  return {
    scanned: targetBatch.length,
    protected: protectedCount,
    candidate: candidateCount,
    deleted: deletedCount,
    failed: failedCount,
    bytesReclaimable,
    bytesDeleted,
    dryRun,
    items: results,
  };
}
