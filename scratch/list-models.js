const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const models = await prisma.generation.groupBy({
    by: ['modelUsed'],
    _count: { id: true }
  });
  console.log("Unique models in DB:", JSON.stringify(models, null, 2));

  const providers = await prisma.generation.groupBy({
    by: ['providerName'],
    _count: { id: true }
  });
  console.log("Unique providerNames in DB:", JSON.stringify(providers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
