const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying all Gemini/Veo generations...");
  try {
    const rows = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { contains: "gvo" } },
          { id: { contains: "gvo" } }
        ]
      },
      select: {
        id: true,
        status: true,
        mediaUrl: true,
        outputUrl: true,
        cost: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    console.log("Gemini/Veo generations found:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Prisma query error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
