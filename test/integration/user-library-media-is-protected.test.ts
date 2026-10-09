import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isMediaObjectReferencedInDatabase } from "@/lib/storage/storage-lifecycle";

import { disconnectTestPrisma, fixtureId, resetDatabase, testPrisma } from "./database";

/**
 * A character's uploaded photos are inputs the subscriber keeps, not the output
 * of any one job, so nothing in Generation points at them. Before the fix this
 * covers, the lifecycle classifier called them orphans — the one class it is
 * willing to delete. A subscriber's character must never be collectable.
 *
 * This used to assert against a hard-coded production object key, so it only
 * passed while that particular subscriber's row existed and it required a
 * connection to live customer data to prove anything. It now builds its own
 * character in the test database, which tests the behaviour rather than the
 * presence of one row, and makes the test independent of who is signed up.
 */
describe("user library media is never an orphan", () => {
  // Mirrors the real layout: images/<userId>/characters/<characterId>/<n>.webp
  const userId = fixtureId("user");
  const characterId = fixtureId("character");
  const coverPath = `images/${userId}/characters/${characterId}/1.webp`;
  const referencePath = `images/${userId}/characters/${characterId}/2.webp`;

  beforeAll(async () => {
    await resetDatabase();
    const prisma = testPrisma();

    await prisma.user.create({
      data: { id: userId, email: `${userId}@example.test`, name: "Fixture Owner" },
    });

    await prisma.userCharacter.create({
      data: {
        id: characterId,
        userId,
        name: "Fixture Character",
        coverUrl: coverPath,
        referenceUrls: [referencePath],
      },
    });
  });

  afterAll(async () => {
    await resetDatabase();
    await disconnectTestPrisma();
  });

  it("protects the character's cover image", async () => {
    const result = await isMediaObjectReferencedInDatabase(coverPath);

    expect(result.referenced).toBe(true);
    expect(result.ownershipClass).toBe("USER_LIBRARY_ASSET");
    expect(result.ownershipClass).not.toBe("ORPHAN_CANDIDATE");
    expect(result.ownerDetail).toContain("UserCharacter");
  });

  it("protects a reference image listed on the character", async () => {
    const result = await isMediaObjectReferencedInDatabase(referencePath);

    expect(result.referenced).toBe(true);
    expect(result.ownershipClass).toBe("USER_LIBRARY_ASSET");
  });

  it("still calls a genuinely unowned file an orphan", async () => {
    const result = await isMediaObjectReferencedInDatabase(
      `images/${fixtureId("nobody")}/there-is-no-such-file-zzz9999.png`,
    );

    expect(result.referenced).toBe(false);
    expect(result.ownershipClass).toBe("ORPHAN_CANDIDATE");
  });

  it("does not mistake a different character's file for this one", async () => {
    // The classifier matches on the last two path segments, so a file under
    // another character id must not resolve to this character's owner. Matching
    // on the filename alone would make "1.webp" match almost every character.
    const otherCharacterPath = `images/${userId}/characters/${fixtureId("character")}/1.webp`;

    const result = await isMediaObjectReferencedInDatabase(otherCharacterPath);

    expect(result.referenced).toBe(false);
    expect(result.ownershipClass).toBe("ORPHAN_CANDIDATE");
  });
});
