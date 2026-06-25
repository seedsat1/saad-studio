import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const latestGens = await prisma.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    console.log("=== Latest 15 Generations in Database ===");
    latestGens.forEach((g) => {
      console.log(`- [${g.createdAt.toISOString()}] ID: ${g.id}`);
      console.log(`  AssetType: ${g.assetType} | Model: ${g.modelUsed} | Status: ${g.status}`);
      console.log(`  Prompt:    ${g.prompt ? g.prompt.slice(0, 100) : "N/A"}`);
      console.log(`  MediaUrl:  ${g.mediaUrl}`);
      console.log(`  OutputUrl: ${g.outputUrl}`);
      console.log("-----------------------------------------");
    });
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
