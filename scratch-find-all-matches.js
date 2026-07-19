const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== 1. Searching Generation table for model keywords ===");
  const gens = await prisma.generation.findMany({
    where: {
      OR: [
        { modelUsed: { contains: 'seedance' } },
        { modelUsed: { contains: 'kling' } },
        { modelUsed: { contains: 'hailuo' } },
        { modelUsed: { contains: 'wxn' } },
        { modelUsed: { contains: 'wan' } },
        { cost: { in: [410, 270, 240, 90] } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log(`Found ${gens.length} generations matching criteria:`);
  gens.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User: ${g.user?.email} | Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Cost: ${g.cost} | Status: ${g.status}`);
  });

  console.log("\n=== 2. Searching ProviderUsageRecord table for model keywords ===");
  const pur = await prisma.providerUsageRecord.findMany({
    where: {
      OR: [
        { providerModel: { contains: 'seedance' } },
        { providerModel: { contains: 'kling' } },
        { providerModel: { contains: 'hailuo' } },
        { providerModel: { contains: 'wxn' } },
        { providerModel: { contains: 'wan' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log(`Found ${pur.length} ProviderUsageRecords matching criteria:`);
  pur.forEach(p => {
    console.log(`[${p.createdAt.toISOString()}] User: ${p.user?.email} | Model: ${p.providerModel} | TaskId: ${p.providerRequestId} | Status: ${p.status}`);
  });

  console.log("\n=== 3. Searching GenerationRequestSnapshot table for model keywords ===");
  const snaps = await prisma.generationRequestSnapshot.findMany({
    where: {
      OR: [
        { model: { contains: 'seedance' } },
        { model: { contains: 'kling' } },
        { model: { contains: 'hailuo' } },
        { model: { contains: 'wxn' } },
        { model: { contains: 'wan' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${snaps.length} GenerationRequestSnapshots matching criteria:`);
  for (const s of snaps) {
    const user = await prisma.user.findUnique({ where: { id: s.userId } });
    console.log(`[${s.createdAt.toISOString()}] User: ${user?.email} | Model: ${s.model} | GenId: ${s.generationId}`);
  }

  console.log("\n=== 4. Checking recent credit deductions / user balance changes ===");
  // Check users who recently lost credits or have credit balances that match deductions of 410, 270, 240, 90
  const recentGensAll = await prisma.generation.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log("\nTop 30 most recent generations of any model:");
  recentGensAll.slice(0, 30).forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User: ${g.user?.email} | Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Cost: ${g.cost} | Status: ${g.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
