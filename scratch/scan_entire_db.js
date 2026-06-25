const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const searchKey = "r2.dev";

  try {
    console.log("=== SCANNING ENTIRE DATABASE FOR R2.DEV ===");
    
    // Get all model names from Prisma
    const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    
    for (const model of models) {
      try {
        const count = await prisma[model].count();
        if (count === 0) continue;

        const records = await prisma[model].findMany({});
        let matchCount = 0;
        const matchedIds = [];

        for (const record of records) {
          const str = JSON.stringify(record);
          if (str.includes(searchKey)) {
            matchCount++;
            matchedIds.push(record.id || record.pageName || JSON.stringify(record).substring(0, 100));
          }
        }

        if (matchCount > 0) {
          console.log(`📍 Model [${model}]: Found ${matchCount} matches. Identifiers:`, matchedIds);
        }
      } catch (e) {
        // Some properties of prisma client might not be models
      }
    }
    
    console.log("=== SCAN COMPLETED ===");
  } catch (error) {
    console.error("Scan failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
