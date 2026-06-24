const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Reap model
  const reap = await prisma.generation.findFirst({
    where: { modelUsed: { startsWith: "reap" } },
    orderBy: { createdAt: "desc" },
    include: { providerUsageRecords: true }
  });
  console.log("=== Latest Reap in DB ===");
  console.log(JSON.stringify(reap, null, 2));

  // WaveSpeed model
  const ws = await prisma.generation.findFirst({
    where: {
      OR: [
        { modelUsed: { startsWith: "wavespeed" } },
        { modelUsed: { startsWith: "transition" } },
        { modelUsed: "elevenlabs/music" }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: { providerUsageRecords: true }
  });
  console.log("\n=== Latest WaveSpeed in DB ===");
  console.log(JSON.stringify(ws, null, 2));

  // OpenAI model (direct like gpt-4)
  const openai = await prisma.generation.findFirst({
    where: {
      OR: [
        { modelUsed: "gpt-4" },
        { modelUsed: { startsWith: "gpt-image" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: { providerUsageRecords: true }
  });
  console.log("\n=== Latest OpenAI (Direct) in DB ===");
  console.log(JSON.stringify(openai, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
