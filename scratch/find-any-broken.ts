import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Scanning database for 'legacy-broken'...");
  const models = [
    "userApiLimit",
    "userSubscription",
    "user",
    "generation",
    "providerUsageRecord",
    "generationRequestSnapshot",
    "adminTransaction",
    "siteSetting",
    "pageContent",
    "pageLayout",
    "adCampaign",
    "showcaseItem",
    "cinemaProject",
    "cinemaShot",
    "cinemaCharacter",
    "cinemaLocation",
    "cinemaAsset",
    "cinemaJob",
    "transitionProject",
    "transitionJob",
    "transitionOutput",
    "variationProject",
    "variationJob",
    "variationOutput",
    "pricingConstitution",
    "platformConfig",
    "timelineProject",
    "userCharacter",
    "panelAuthSession",
    "studioImg",
    "studioImgStep",
    "studioImgCategory",
    "studioImgModel",
    "reapJob",
    "reapWebhookLog"
  ];

  for (const model of models) {
    try {
      const records = await (prisma as any)[model].findMany();
      for (const record of records) {
        const str = JSON.stringify(record);
        if (str.includes("legacy-broken")) {
          console.log(`🎯 Match found in model: ${model}, ID: ${record.id || 'N/A'}`);
          console.log(`Content:`, record);
        }
      }
    } catch (e) {
      console.error(`Error scanning model ${model}:`, e);
    }
  }
  console.log("🏁 Scan complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
