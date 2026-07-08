const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying recent 50 generations...");
  try {
    const rows = await prisma.generation.findMany({
      select: {
        id: true,
        status: true,
        mediaUrl: true,
        outputUrl: true,
        cost: true,
        createdAt: true,
        modelUsed: true,
        prompt: true,
        providerModel: true,
        providerName: true,
        userId: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
    console.log("Generations found:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Prisma query error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
