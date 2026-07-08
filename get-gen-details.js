const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const row = await prisma.generation.findFirst({
      where: {
        createdAt: {
          gte: new Date('2026-07-05T23:00:00Z'),
          lte: new Date('2026-07-05T23:59:59Z')
        }
      }
    });
    console.log(JSON.stringify(row, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
