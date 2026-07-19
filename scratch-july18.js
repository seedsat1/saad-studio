const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- Querying all generations created on or after 2026-07-18 ---");
  const gensJuly18 = await prisma.generation.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-18T00:00:00Z')
      }
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  console.log(`Found ${gensJuly18.length} generations on 2026-07-18/19:`);
  gensJuly18.forEach(g => {
    console.log(`[${g.createdAt.toISOString()}] User: ${g.user?.email || g.userId} | Model: ${g.modelUsed} | TaskId: ${g.providerRequestId} | Status: ${g.status} | Cost: ${g.cost} | Prompt: ${g.prompt?.substring(0, 50)}`);
  });

  console.log("\n--- Querying ProviderUsageRecords created on or after 2026-07-18 ---");
  const purJuly18 = await prisma.providerUsageRecord.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-18T00:00:00Z')
      }
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log(`Found ${purJuly18.length} ProviderUsageRecords on 2026-07-18/19:`);
  purJuly18.forEach(p => {
    console.log(`[${p.createdAt.toISOString()}] User: ${p.user?.email || p.userId} | Model: ${p.providerModel} | TaskId: ${p.providerRequestId} | Status: ${p.status} | RawPayload: ${p.rawPayloadSafe?.substring(0, 100)}`);
  });

  console.log("\n--- Querying GenerationRequestSnapshots created on or after 2026-07-18 ---");
  const snapJuly18 = await prisma.generationRequestSnapshot.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-07-18T00:00:00Z')
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${snapJuly18.length} GenerationRequestSnapshots on 2026-07-18/19:`);
  for (const s of snapJuly18) {
    const user = await prisma.user.findUnique({ where: { id: s.userId } });
    console.log(`[${s.createdAt.toISOString()}] User: ${user?.email || s.userId} | Model: ${s.model} | GenId: ${s.generationId} | Payload: ${JSON.stringify(s.requestPayload)?.substring(0, 100)}`);
  }

  // Also query count of total users and list all users in DB
  console.log("\n--- Listing all users in DB ---");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total users in DB: ${users.length}`);
  users.forEach(u => {
    console.log(`- User: ${u.email} | ID: ${u.id} | Role: ${u.role} | Credits: ${u.creditBalance}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
