const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_hsM0NxlFWnv6@ep-flat-darkness-anmi2f3w.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
      }
    }
  });

  try {
    console.log("Connecting to live Neon database...");
    
    // Get latest generations
    const latestGenerations = await prisma.generation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        assetType: true,
        modelUsed: true,
        mediaUrl: true,
        outputUrl: true,
        createdAt: true,
      }
    });

    console.log("\n=== Latest 10 Generations in DB ===");
    for (const gen of latestGenerations) {
      console.log(`- [${gen.createdAt.toISOString()}] ID: ${gen.id}`);
      console.log(`  Type: ${gen.assetType} | Model: ${gen.modelUsed}`);
      console.log(`  Media URL:  ${gen.mediaUrl}`);
      console.log(`  Output URL: ${gen.outputUrl}`);
    }
  } catch (error) {
    console.error("DB Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
