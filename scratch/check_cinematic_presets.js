const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Checking pageLayout for 'cms-cinematic-styles'...");
    const layout = await prisma.pageLayout.findUnique({
      where: { pageName: "cms-cinematic-styles" }
    });

    if (!layout) {
      console.log("No layout found for pageName 'cms-cinematic-styles'");
      return;
    }

    console.log("Layout pageName:", layout.pageName);
    console.log("LayoutBlocks:", JSON.stringify(layout.layoutBlocks, null, 2));

  } catch (error) {
    console.error("Failed to fetch layout:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
