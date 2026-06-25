const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Checking all pageLayouts...");
    const layouts = await prisma.pageLayout.findMany({});
    
    console.log(`Found ${layouts.length} layouts.`);
    for (const layout of layouts) {
      console.log(`-----------------------------------`);
      console.log(`pageName: ${layout.pageName}`);
      console.log(`layoutBlocks:`, JSON.stringify(layout.layoutBlocks, null, 2).substring(0, 1000));
    }
  } catch (error) {
    console.error("Failed to fetch layouts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
