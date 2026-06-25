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
    console.log("Checking Neon database for B2 records...");
    const b2Generations = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { contains: 'backblazeb2' } },
          { outputUrl: { contains: 'backblazeb2' } }
        ]
      },
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

    console.log(`\n=== Found ${b2Generations.length} B2 Generations in DB ===`);
    for (const gen of b2Generations) {
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
