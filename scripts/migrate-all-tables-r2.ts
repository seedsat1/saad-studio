import { PrismaClient } from "@prisma/client";

function replaceR2WithB2(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value; // Preserve Date objects

  if (typeof value === "string") {
    let result = value;
    result = result.replace(/https:\/\/pub-3e0355a14eda4ec78c6e81b217a9a399\.r2\.dev/g, "https://f003.backblazeb2.com/file/saadstudio-storage");
    result = result.replace(/https:\/\/media\.saadstudio\.app/g, "https://f003.backblazeb2.com/file/saadstudio-storage");
    result = result.replace(/pub-3e0355a14eda4ec78c6e81b217a9a399\.r2\.dev/g, "f003.backblazeb2.com/file/saadstudio-storage");
    result = result.replace(/media\.saadstudio\.app/g, "f003.backblazeb2.com/file/saadstudio-storage");
    return result;
  }

  if (Array.isArray(value)) {
    return value.map(item => replaceR2WithB2(item));
  }

  if (typeof value === "object") {
    const updated: any = {};
    for (const [key, val] of Object.entries(value)) {
      updated[key] = replaceR2WithB2(val);
    }
    return updated;
  }

  return value;
}

async function main() {
  const prisma = new PrismaClient();
  const isWrite = process.argv.includes("--write");

  console.log("=================================================");
  console.log(`📂 Comprehensive R2 -> B2 JSON Migration: ${isWrite ? "🔥 WRITE MODE" : "🔍 DRY-RUN MODE"}`);
  console.log("=================================================");

  const targetModels = [
    "providerUsageRecord",
    "adminTransaction",
    "pageLayout",
    "transitionProject",
    "transitionJob",
    "userCharacter"
  ];

  try {
    for (const model of targetModels) {
      console.log(`\nScanning model: ${model}...`);
      const records = await (prisma as any)[model].findMany({});
      let updateCount = 0;

      for (const record of records) {
        const originalStr = JSON.stringify(record);
        if (originalStr.includes("r2.dev") || originalStr.includes("media.saadstudio.app")) {
          const updatedRecord = replaceR2WithB2(record);
          const updatedStr = JSON.stringify(updatedRecord);

          if (originalStr !== updatedStr) {
            updateCount++;
            console.log(`   - Record ID: ${record.id || record.pageName || "unknown"} needs update.`);

            if (isWrite) {
              const { id, pageName, ...dataToUpdate } = updatedRecord;
              
              // Clean metadata fields to avoid Prisma typescript schema issues (e.g. updatedAt, createdAt etc)
              // We only update fields that actually changed compared to the original record
              const originalRecord = record;
              const changedFields: Record<string, any> = {};

              for (const [key, val] of Object.entries(dataToUpdate)) {
                if (key === "createdAt" || key === "updatedAt") continue;
                if (JSON.stringify(val) !== JSON.stringify((originalRecord as any)[key])) {
                  changedFields[key] = val;
                }
              }

              const whereClause = id ? { id } : { pageName };
              await (prisma as any)[model].update({
                where: whereClause,
                data: changedFields
              });
            }
          }
        }
      }

      console.log(`👉 Done scanning ${model}. Needs update: ${updateCount} records.`);
      if (isWrite && updateCount > 0) {
        console.log(`   ✅ Successfully updated ${updateCount} records in ${model}.`);
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
