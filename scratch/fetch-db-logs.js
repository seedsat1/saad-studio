const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Fetching Recent KIE/Kling Generations ===");
  const kieGens = await prisma.generation.findMany({
    where: {
      providerName: {
        in: ["KIE.ai", "kie.ai", "KIE"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      providerUsageRecords: true
    }
  });
  console.log(JSON.stringify(kieGens, null, 2));

  console.log("\n=== Fetching Recent BytePlus/Ark Generations ===");
  const bpGens = await prisma.generation.findMany({
    where: {
      providerName: {
        in: ["BytePlus", "byteplus", "ARK"]
      }
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      providerUsageRecords: true
    }
  });
  console.log(JSON.stringify(bpGens, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
