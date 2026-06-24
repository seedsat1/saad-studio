const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const gens = await prisma.generation.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      id: true,
      modelUsed: true,
      duration: true,
      providerCostUsd: true,
      providerCostSource: true,
      providerName: true,
      cost: true
    }
  });

  const nullDuration = gens.filter(g => g.duration === null);
  const hasDuration = gens.filter(g => g.duration !== null);

  console.log(`Total generations: ${gens.length}`);
  console.log(`With duration: ${hasDuration.length}`);
  console.log(`With null duration: ${nullDuration.length}`);

  // Print sample null duration models
  const nullModels = {};
  nullDuration.forEach(g => {
    nullModels[g.modelUsed] = (nullModels[g.modelUsed] || 0) + 1;
  });
  console.log("Null duration models:", JSON.stringify(nullModels, null, 2));

  // Print sample has duration models
  const hasModels = {};
  hasDuration.forEach(g => {
    hasModels[g.modelUsed] = (hasModels[g.modelUsed] || 0) + 1;
  });
  console.log("Has duration models:", JSON.stringify(hasModels, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
