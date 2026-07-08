const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
      take: 5
    });
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
