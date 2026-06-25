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
    console.log("Monitoring database for new uploads (last 15 minutes)...");
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    const newGenerations = await prisma.generation.findMany({
      where: {
        createdAt: {
          gte: fifteenMinsAgo
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assetType: true,
        modelUsed: true,
        mediaUrl: true,
        outputUrl: true,
        createdAt: true,
      }
    });

    if (newGenerations.length === 0) {
      console.log("No new uploads or generations detected in the last 15 minutes.");
    } else {
      console.log(`\n=== Found ${newGenerations.length} new records ===`);
      for (const gen of newGenerations) {
        console.log(`- [${gen.createdAt.toISOString()}] ID: ${gen.id}`);
        console.log(`  Type: ${gen.assetType} | Model: ${gen.modelUsed}`);
        console.log(`  Media URL:  ${gen.mediaUrl}`);
        console.log(`  Output URL: ${gen.outputUrl}`);
      }
    }
  } catch (error) {
    console.error("DB Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
