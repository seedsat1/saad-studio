import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const records = await prisma.providerUsageRecord.findMany({
      where: {
        generationId: {
          in: ["cmqtcppud00023el1bnhm630b", "cmqswevmi000213i83bapq0jz", "cmqsukoh0000213p1x18knhlj"]
        }
      }
    });
    console.log(`Found ${records.length} usage records.`);
    records.forEach((r) => {
      console.log(`- Record ID: ${r.id} | Gen ID: ${r.generationId}`);
      console.log(`  Provider: ${r.providerName} | Model: ${r.providerModel} | Status: ${r.status}`);
      console.log(`  Raw Payload: ${r.rawPayloadSafe ? r.rawPayloadSafe.slice(0, 500) : "N/A"}`);
      console.log("-----------------------------------------");
    });
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
