const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const snapshots = await prisma.generationRequestSnapshot.findMany({
      where: {
        userId: "user_3CMgl0E1u3OcgATvBIZR3rByAXo"
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 8
    });
    console.log("=== REQUEST SNAPSHOTS ===");
    for (const snap of snapshots) {
      console.log(`Generation ID: ${snap.generationId}`);
      console.log(`Model: ${snap.model}`);
      console.log(`Created: ${snap.createdAt}`);
      console.log(`Payload:`, JSON.stringify(snap.requestPayload, null, 2));
      console.log("-----------------------------------------");
    }
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
