const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Querying last 20 Seedance generations...");
  const generations = await prisma.generation.findMany({
    where: {
      modelUsed: {
        contains: "seedance",
        mode: "insensitive"
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20,
    include: {
      user: true
    }
  });

  if (generations.length === 0) {
    console.log("No Seedance generations found.");
    return;
  }

  console.log(JSON.stringify(generations, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
