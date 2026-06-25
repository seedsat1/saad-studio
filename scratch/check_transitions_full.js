const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const layout = await prisma.pageLayout.findUnique({
      where: { pageName: "cms-transitions-media" }
    });
    console.log("Transitions LayoutBlocks:", JSON.stringify(layout?.layoutBlocks, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
