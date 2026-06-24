const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== auditing DATABASE STATS ===");

  // Count cost sources in Generation
  const genCostSources = await prisma.generation.groupBy({
    by: ['providerCostSource'],
    _count: {
      id: true
    }
  });
  console.log("Generation cost sources count:", genCostSources);

  // Count cost sources in ProviderUsageRecord
  const purCostSources = await prisma.providerUsageRecord.groupBy({
    by: ['providerCostSource'],
    _count: {
      id: true
    }
  });
  console.log("ProviderUsageRecord cost sources count:", purCostSources);

  // Fetch the exact BytePlus record in the screenshot:
  // id: cmqr700yb0001zrrhwxb2i4sh (or similar) or taskId: cgt-1782252248156123456
  console.log("\n=== BytePlus generation and usage records ===");
  const bpGen = await prisma.generation.findFirst({
    where: {
      providerRequestId: "cgt-1782252248156123456"
    },
    include: {
      providerUsageRecords: true
    }
  });
  console.log("BytePlus Generation:", JSON.stringify(bpGen, null, 2));

  // Fetch the exact KIE record in the screenshot:
  // taskId: 3286ea1b360fd7fef5d637caf6bd0676
  console.log("\n=== KIE generation and usage records ===");
  const kieGen = await prisma.generation.findFirst({
    where: {
      providerRequestId: "3286ea1b360fd7fef5d637caf6bd0676"
    },
    include: {
      providerUsageRecords: true
    }
  });
  console.log("KIE Generation:", JSON.stringify(kieGen, null, 2));

  // Count generations where providerTokens is UNKNOWN or null but profit/margin is visible
  // Let's count generations that have cost, have providerCostUsd, but providerTokens is null
  const nullTokensWithCost = await prisma.generation.count({
    where: {
      providerCostUsd: { not: null },
      providerTokens: null,
      providerName: "BytePlus"
    }
  });
  console.log("\nBytePlus records with cost but null tokens:", nullTokensWithCost);

  // Let's count total completed, processing, queued for BytePlus and KIE
  const bpStatusCounts = await prisma.generation.groupBy({
    by: ['status'],
    where: { providerName: 'BytePlus' },
    _count: { id: true }
  });
  console.log("BytePlus status counts:", bpStatusCounts);

  const kieStatusCounts = await prisma.generation.groupBy({
    by: ['status'],
    where: { providerName: 'KIE.ai' },
    _count: { id: true }
  });
  console.log("KIE status counts:", kieStatusCounts);

  // Let's check some old generations
  const oldGens = await prisma.generation.findMany({
    where: {
      providerName: null
    },
    take: 5
  });
  console.log("Generations with null providerName:", oldGens.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
