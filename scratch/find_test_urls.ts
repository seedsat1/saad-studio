import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Searching for test media in database across multiple tables...");
  
  // Find images from Generation
  const imageGen = await prisma.generation.findMany({
    where: {
      assetType: "image",
      OR: [
        { mediaUrl: { startsWith: "http" } },
        { outputUrl: { startsWith: "http" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  // Find images from StudioImg
  const studioImgs = await prisma.studioImg.findMany({
    take: 10
  });

  // Find videos from Generation
  const videoGen = await prisma.generation.findMany({
    where: {
      assetType: "video",
      OR: [
        { mediaUrl: { startsWith: "http" } },
        { outputUrl: { startsWith: "http" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  // Find videos from TransitionOutput
  const transOutputs = await prisma.transitionOutput.findMany({
    where: {
      url: { startsWith: "http" }
    },
    take: 10
  });

  console.log("\n--- IMAGE GENERATION RECORD URLS ---");
  imageGen.forEach((img, i) => {
    console.log(`${i + 1}. [${img.createdAt.toISOString()}] ${img.mediaUrl || img.outputUrl}`);
  });

  console.log("\n--- STUDIO IMAGE RECORD URLS ---");
  studioImgs.forEach((img, i) => {
    // Let's print any image paths we find in it (might need to check columns, let's just log JSON)
    console.log(`${i + 1}.`, JSON.stringify(img));
  });

  console.log("\n--- VIDEO GENERATION RECORD URLS ---");
  videoGen.forEach((vid, i) => {
    console.log(`${i + 1}. [${vid.createdAt.toISOString()}] ${vid.mediaUrl || vid.outputUrl}`);
  });

  console.log("\n--- TRANSITION OUTPUT URLS ---");
  transOutputs.forEach((vid, i) => {
    console.log(`${i + 1}. [${vid.createdAt.toISOString()}] ${vid.url}`);
  });
}

main()
  .catch(err => {
    console.error("Error running script:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
