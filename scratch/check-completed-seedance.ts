import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Searching for completed Seedance generations...");
  const gens = await prisma.generation.findMany({
    where: {
      modelUsed: { startsWith: "bytedance/" },
      status: "completed"
    },
    take: 10,
    orderBy: { createdAt: "desc" }
  });

  console.log(`Found ${gens.length} completed Seedance generations.`);
  for (const gen of gens) {
    console.log(`\n🆔 ID: ${gen.id} | Model: ${gen.modelUsed} | Created: ${gen.createdAt}`);
    console.log(`📝 Prompt: ${gen.prompt}`);
    console.log(`🖼️ Input URL: ${gen.mediaUrl}`);
    console.log(`🎬 Output URL: ${gen.outputUrl}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
