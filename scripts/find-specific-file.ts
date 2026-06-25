import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const searchStr = "1780349239104-qd7s1axz-2.bin";

  try {
    console.log(`=== Searching database for filename: ${searchStr} ===`);

    const tables = [
      "user", "generation", "generationRequestSnapshot", "showcaseItem", 
      "studioImg", "studioImgStep", "cinemaProject", "cinemaShot", 
      "cinemaAsset", "cinemaJob", "transitionProject", "transitionJob", 
      "transitionOutput", "variationProject", "variationJob", "variationOutput", 
      "reapJob", "reapWebhookLog", "adminTransaction", "siteSetting"
    ];

    for (const table of tables) {
      const rows = await (prisma as any)[table].findMany({});
      rows.forEach((row: any) => {
        const str = JSON.stringify(row);
        if (str.includes(searchStr)) {
          console.log(`- Found in ${table} ID: ${row.id}`);
          console.log(`  Data: ${str}`);
        }
      });
    }

    console.log("=== End of search ===");
  } catch (error) {
    console.error("Search failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
