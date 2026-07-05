const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  try {
    const generations = await prisma.generation.findMany({
      where: {
        assetType: "AUDIO"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });
    console.log("Latest generations:", JSON.stringify(generations, null, 2));
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
