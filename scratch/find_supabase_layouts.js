const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const layouts = await prisma.pageLayout.findMany({
      where: {
        layoutBlocks: {
          path: [],
          array_contains: 'supabase.co' // Note: array_contains is for array fields, but layoutBlocks is JSON. We can filter in memory.
        }
      }
    });
    
    // Let's fetch all layouts and check in memory
    const allLayouts = await prisma.pageLayout.findMany();
    console.log("Checking all layouts in memory for 'supabase.co'...");
    for (const layout of allLayouts) {
      const str = JSON.stringify(layout.layoutBlocks);
      if (str.includes("supabase.co")) {
        console.log(`- PageName: ${layout.pageName}`);
        
        // Find URLs matching supabase.co in this layout
        const urls = str.match(/https:\/\/[^\s"']+/g) || [];
        const supabaseUrls = urls.filter(u => u.includes("supabase.co"));
        console.log("  Supabase URLs:", supabaseUrls);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
