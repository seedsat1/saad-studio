const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying generations from July 6 & 7...");
  try {
    const rows = await prisma.generation.findMany({
      where: {
        createdAt: {
          gte: new Date('2026-07-06T00:00:00Z')
        }
      },
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
      }
    });
    console.log("Found:", rows.length, "generations");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
