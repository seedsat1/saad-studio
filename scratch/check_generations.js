const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const snaps = await prisma.generationRequestSnapshot.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      generation: true
    }
  });

  console.log(`Found ${snaps.length} snapshots:`);
  for (const snap of snaps) {
    const payload = snap.requestPayload;
    console.log(`- Gen ID: ${snap.generationId}`);
    console.log(`  Model: ${snap.model} | Type: ${snap.generationType}`);
    console.log(`  Prompt: ${snap.generation?.prompt?.slice(0, 60)}...`);
    console.log(`  Payload Keys: ${Object.keys(payload || {})}`);
    if (payload?.imageUrl || payload?.imageUrls || payload?.referenceImageUrls || payload?.reference_image_urls) {
      console.log(`  Reference Image detected!`);
      console.log(`    imageUrl: ${payload.imageUrl}`);
      console.log(`    imageUrls: ${payload.imageUrls}`);
      console.log(`    referenceImageUrls: ${payload.referenceImageUrls}`);
      console.log(`    reference_image_urls: ${payload.reference_image_urls}`);
    }
    console.log(`----------------------------------------`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
