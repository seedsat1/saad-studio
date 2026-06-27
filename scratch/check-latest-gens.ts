import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fetching latest 5 generations...");
  const gens = await prisma.generation.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prompt: true,
      mediaUrl: true,
      outputUrl: true,
      type: true,
      status: true,
      modelUsed: true,
      createdAt: true
    }
  });

  for (const gen of gens) {
    console.log(`\n🆔 ID: ${gen.id}`);
    console.log(`📅 Created: ${gen.createdAt}`);
    console.log(`🤖 Model: ${gen.modelUsed}`);
    console.log(`📝 Prompt: ${gen.prompt}`);
    console.log(`🖼️ Media URL (Input): ${gen.mediaUrl}`);
    console.log(`🎬 Output URL: ${gen.outputUrl}`);
    console.log(`⚙️ Status: ${gen.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
