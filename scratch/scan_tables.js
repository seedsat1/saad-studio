const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tables = Object.keys(prisma).filter(key => !key.startsWith("_") && !key.startsWith("$"));
  
  for (const table of tables) {
    try {
      const records = await prisma[table].findMany();
      for (const rec of records) {
        const str = JSON.stringify(rec);
        if (str.includes("persisted-f28107f0-9bdc-41ec-b040-807c3b84081a")) {
          console.log(`FOUND in table: ${table}`);
          console.log(rec);
        }
        if (str.includes("1780349239102-aeztb5rp-0.vtt")) {
          console.log(`FOUND vtt in table: ${table}`);
          console.log(rec);
        }
      }
    } catch (e) {
      // ignore
    }
  }
  console.log("Scan completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
