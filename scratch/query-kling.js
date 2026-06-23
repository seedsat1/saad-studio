const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const generations = await prisma.generation.findMany({
    where: {
      modelUsed: {
        contains: "kling",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  console.log("Kling Generations found:", generations.length);
  for (const gen of generations) {
    console.log("-----------------------------------------");
    console.log(`ID: ${gen.id}`);
    console.log(`User ID: ${gen.userId}`);
    console.log(`Model: ${gen.modelUsed}`);
    console.log(`Prompt: ${gen.prompt}`);
    console.log(`Media URL: ${gen.mediaUrl}`);
    console.log(`Output URL: ${gen.outputUrl}`);
    console.log(`Cost (user credits): ${gen.cost}`);
    console.log(`Duration: ${gen.duration}`);
    console.log(`Resolution: ${gen.resolution}`);
    console.log(`Provider Name: ${gen.providerName}`);
    console.log(`Provider Credits: ${gen.providerCredits}`);
    console.log(`Provider Cost USD: ${gen.providerCostUsd}`);
    console.log(`Provider Cost Source: ${gen.providerCostSource}`);
    console.log(`Provider Request ID: ${gen.providerRequestId}`);
    console.log(`Created At: ${gen.createdAt}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
