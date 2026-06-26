const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
  
  const today = new Date("2026-06-26T00:00:00Z");
  
  const gens = await prisma.generation.findMany({
    where: {
      userId,
      createdAt: { gte: today }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`=== GENERATIONS CREATED TODAY (${gens.length}) ===`);
  console.log(JSON.stringify(gens.map(g => ({
    id: g.id,
    modelUsed: g.modelUsed,
    cost: g.cost,
    status: g.status,
    createdAt: g.createdAt
  })), null, 2));

  const txs = await prisma.adminTransaction.findMany({
    where: {
      userId,
      createdAt: { gte: today }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`=== TRANSACTIONS CREATED TODAY (${txs.length}) ===`);
  console.log(JSON.stringify(txs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
