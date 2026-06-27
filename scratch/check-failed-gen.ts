import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const genId = "cmqvnty0v0002ed30n55d6bon";
  console.log(`Checking Generation ID: ${genId}`);
  
  const gen = await prisma.generation.findUnique({
    where: { id: genId },
    include: {
      generationRequestSnapshot: true
    }
  });
  
  if (!gen) {
    console.error("Generation not found!");
    return;
  }
  
  console.log("\n================ GENERATION RECORD ================");
  console.log("ID:", gen.id);
  console.log("Status:", gen.status);
  console.log("Prompt:", gen.prompt.slice(0, 100) + "...");
  console.log("Model Used:", gen.modelUsed);
  console.log("Provider Name:", gen.providerName);
  console.log("Provider Model:", gen.providerModel);
  console.log("================ REQUEST SNAPSHOT ================");
  if (gen.generationRequestSnapshot) {
    const payload = gen.generationRequestSnapshot.requestPayload as any;
    if (payload) {
      console.log("--- Input Media URLs in Request Payload ---");
      console.log("first_frame_url:", payload.first_frame_url);
      console.log("last_frame_url:", payload.last_frame_url);
      console.log("image_url:", payload.image_url);
      console.log("image:", payload.image);
      console.log("reference_image_urls:", payload.reference_image_urls);
    }
  } else {
    console.log("No request snapshot found!");
  }
  console.log("====================================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
