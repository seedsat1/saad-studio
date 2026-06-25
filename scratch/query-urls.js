const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const generations = await prisma.generation.findMany({
    where: {
      OR: [
        { mediaUrl: { contains: '.bin' } },
        { outputUrl: { contains: '.bin' } }
      ]
    },
    select: { id: true, mediaUrl: true, outputUrl: true, assetType: true }
  });
  console.log(`Found ${generations.length} .bin rows. Auditing...`);
  
  for (const g of generations) {
    const key = g.mediaUrl || g.outputUrl;
    const publicUrl = `https://f003.backblazeb2.com/file/saadstudio-storage/${key}`;
    try {
      const res = await fetch(publicUrl, { method: "HEAD" });
      const len = res.headers.get("content-length") || "unknown";
      const type = res.headers.get("content-type") || "unknown";
      console.log(`ID: ${g.id} | Key: ${key} | Type: ${g.assetType} | HEAD: ${res.status} | Size: ${len} | Content-Type: ${type}`);
    } catch (e) {
      console.log(`ID: ${g.id} | Key: ${key} | Type: ${g.assetType} | FETCH FAILED: ${e.message}`);
    }
  }
  
  await prisma.$disconnect();
}

main();
