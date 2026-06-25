const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_hsM0NxlFWnv6@ep-flat-darkness-anmi2f3w.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
      }
    }
  });

  try {
    console.log("Querying PlatformConfig...");
    const configs = await prisma.platformConfig.findMany();
    console.log("PlatformConfig records:", JSON.stringify(configs, null, 2));

    console.log("\nQuerying SiteSetting...");
    const settings = await prisma.siteSetting.findMany();
    console.log("SiteSetting records:", JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("DB Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
