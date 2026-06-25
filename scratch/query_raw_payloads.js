const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Querying rawPayloadSafe for BytePlus usage records...");
  const records = await prisma.providerUsageRecord.findMany({
    where: {
      providerName: {
        contains: 'byteplus',
        mode: 'insensitive'
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  records.forEach(r => {
    console.log(`==========================================`);
    console.log(`ID: ${r.id}`);
    console.log(`Date: ${r.createdAt}`);
    console.log(`Model: ${r.providerModel}`);
    console.log(`Status: ${r.status}`);
    console.log(`Raw Payload:`, r.rawPayloadSafe);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
