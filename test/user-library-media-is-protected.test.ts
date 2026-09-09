import { describe, it, expect } from "vitest";
import { isMediaObjectReferencedInDatabase } from "@/lib/storage/storage-lifecycle";

/**
 * A character's uploaded photos are inputs the subscriber keeps, not the output
 * of any one job, so nothing in Generation points at them. Before this, the
 * lifecycle classifier called them orphans — the one class it is willing to
 * delete. A subscriber's character must never be collectable.
 */
describe("user library media is never an orphan", () => {
  it("protects a stored character reference", async () => {
    const r = await isMediaObjectReferencedInDatabase(
      "images/user_3CMgl0E1u3OcgATvBIZR3rByAXo/characters/cmpgsis660001tbn7598vdfxf/1.webp",
    );
    expect(r.referenced).toBe(true);
    expect(r.ownershipClass).not.toBe("ORPHAN_CANDIDATE");
  }, 30000);

  it("still calls a genuinely unowned file an orphan", async () => {
    const r = await isMediaObjectReferencedInDatabase(
      "images/nobody/there-is-no-such-file-zzz9999.png",
    );
    expect(r.referenced).toBe(false);
    expect(r.ownershipClass).toBe("ORPHAN_CANDIDATE");
  }, 30000);
});
