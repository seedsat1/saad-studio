const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetTaskIds = [
    "d145a34a5e7d7f325e3797c717807767",
    "4f05908df7a5c7d6320be4c6dca19ec1",
    "25ddddc07bfb6e19e06916c9fc721e2",
    "25ddddc07bfb6e19e06916c9fc721",
    "d081cc56f1e579247931459ca300fa18",
    "f69a604ef4484f8355a6458145c926b",
    "b407879bba544005171daef1d9275571"
  ];

  console.log("Searching by providerRequestId or taskId or id...");

  // 1. Search Generation
  const gens = await prisma.generation.findMany({
    where: {
      OR: [
        { providerRequestId: { in: targetTaskIds } },
        { id: { in: targetTaskIds } },
        ...targetTaskIds.map(t => ({ providerRequestId: { contains: t } })),
        ...targetTaskIds.map(t => ({ prompt: { contains: t } }))
      ]
    },
    include: { user: true }
  });

  console.log(`Found ${gens.length} matching generations:`);
  gens.forEach(g => {
    console.log(`- Gen ID: ${g.id}, Task ID: ${g.providerRequestId}, User Email: ${g.user?.email || g.userId}, Model: ${g.modelUsed}, Created: ${g.createdAt}`);
  });

  // 2. Search ProviderUsageRecord
  const pur = await prisma.providerUsageRecord.findMany({
    where: {
      OR: [
        { providerRequestId: { in: targetTaskIds } },
        ...targetTaskIds.map(t => ({ providerRequestId: { contains: t } }))
      ]
    },
    include: { user: true, generation: true }
  });
  console.log(`Found ${pur.length} matching ProviderUsageRecord:`);
  pur.forEach(r => {
    console.log(`- PUR ID: ${r.id}, Task ID: ${r.providerRequestId}, User Email: ${r.user?.email || r.userId}, Model: ${r.providerModel}, Created: ${r.createdAt}`);
  });

  // 3. Search CinemaJob
  const cinemaJobs = await prisma.cinemaJob.findMany({
    where: {
      OR: [
        { taskId: { in: targetTaskIds } },
        ...targetTaskIds.map(t => ({ taskId: { contains: t } }))
      ]
    }
  });
  console.log(`Found ${cinemaJobs.length} matching CinemaJobs:`);
  for (const c of cinemaJobs) {
    const u = await prisma.user.findUnique({ where: { id: c.userId } });
    console.log(`- CinemaJob ID: ${c.id}, Task ID: ${c.taskId}, User Email: ${u?.email || c.userId}, Model: ${c.modelRoute}, Created: ${c.createdAt}`);
  }

  // 4. Search TransitionJob
  const transitionJobs = await prisma.transitionJob.findMany({
    where: {
      OR: [
        { taskId: { in: targetTaskIds } },
        ...targetTaskIds.map(t => ({ taskId: { contains: t } }))
      ]
    }
  });
  console.log(`Found ${transitionJobs.length} matching TransitionJobs:`);
  for (const t of transitionJobs) {
    const u = await prisma.user.findUnique({ where: { id: t.userId } });
    console.log(`- TransitionJob ID: ${t.id}, Task ID: ${t.taskId}, User Email: ${u?.email || t.userId}, Created: ${t.createdAt}`);
  }

  // 5. Search VariationOutput
  const variationOutputs = await prisma.variationOutput.findMany({
    where: {
      OR: [
        { kieTaskId: { in: targetTaskIds } },
        ...targetTaskIds.map(t => ({ kieTaskId: { contains: t } }))
      ]
    }
  });
  console.log(`Found ${variationOutputs.length} matching VariationOutputs:`);
  for (const v of variationOutputs) {
    const u = await prisma.user.findUnique({ where: { id: v.userId } });
    console.log(`- VariationOutput ID: ${v.id}, Task ID: ${v.kieTaskId}, User Email: ${u?.email || v.userId}, Model: ${v.modelUsed}, Created: ${v.createdAt}`);
  }

  // 6. Search Generations around 2026-07-18 20:00 to 2026-07-19 02:00 or recent 50 generations to see models
  console.log("\nChecking recent generations from 2026-07-18 / July 18...");
  const recentGens = await prisma.generation.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log("Recent 30 generations in DB:");
  recentGens.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] Email: ${g.user?.email} | Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Status: ${g.status} | Cost: ${g.cost}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
