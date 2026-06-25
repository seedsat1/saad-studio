const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying snapshots for recent failed generations...");
  const snaps = await prisma.generationRequestSnapshot.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      generation: true
    }
  });

  snaps.forEach(s => {
    console.log(`==========================================`);
    console.log(`ID: ${s.id}`);
    console.log(`Created: ${s.createdAt}`);
    console.log(`Model Used (Generation): ${s.generation ? s.generation.modelUsed : 'N/A'}`);
    console.log(`Provider Model (Generation): ${s.generation ? s.generation.providerModel : 'N/A'}`);
    console.log(`Status (Generation): ${s.generation ? s.generation.status : 'N/A'}`);
    console.log(`Request Payload:`, JSON.stringify(s.requestPayload, null, 2));
    console.log(`Response Payload:`, JSON.stringify(s.responsePayload, null, 2));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
