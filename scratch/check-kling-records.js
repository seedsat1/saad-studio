const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const gens = await prisma.generation.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      modelUsed: { contains: "kling" }
    },
    select: {
      id: true,
      modelUsed: true,
      cost: true,
      duration: true,
      quality: true,
      providerCredits: true,
      providerCostUsd: true
    },
    take: 10
  });

  console.log("Kling records in DB:", JSON.stringify(gens, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
