const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Running safe, non-destructive SQL migrations for normalized Ads schema...");

  const queries = [
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "headline" TEXT`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "description" TEXT`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "mediaType" TEXT DEFAULT 'image'`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT DEFAULT 'Explore Now'`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "ctaTarget" TEXT DEFAULT '_self'`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "priority" INTEGER DEFAULT 10`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "audience" TEXT DEFAULT 'ALL'`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "animation" TEXT DEFAULT 'fade'`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "dismissible" BOOLEAN DEFAULT true`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "dismissalModel" TEXT DEFAULT 'session'`,
    `ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3)`,

    `CREATE TABLE IF NOT EXISTS "AdPlacement" (
      "id" TEXT NOT NULL,
      "campaignId" TEXT NOT NULL,
      "route" TEXT NOT NULL,
      "placementMode" TEXT NOT NULL DEFAULT 'FLOATING',
      "anchor" TEXT NOT NULL DEFAULT 'center',
      "desktopX" DOUBLE PRECISION NOT NULL DEFAULT 50,
      "desktopY" DOUBLE PRECISION NOT NULL DEFAULT 50,
      "desktopW" DOUBLE PRECISION NOT NULL DEFAULT 40,
      "desktopH" DOUBLE PRECISION,
      "tabletX" DOUBLE PRECISION,
      "tabletY" DOUBLE PRECISION,
      "tabletW" DOUBLE PRECISION,
      "tabletH" DOUBLE PRECISION,
      "mobileX" DOUBLE PRECISION,
      "mobileY" DOUBLE PRECISION,
      "mobileW" DOUBLE PRECISION,
      "mobileH" DOUBLE PRECISION,
      "slotId" TEXT,
      "zIndex" INTEGER NOT NULL DEFAULT 50,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "AdPlacement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "AdPlacement_campaignId_route_key" ON "AdPlacement"("campaignId", "route")`,
    `CREATE INDEX IF NOT EXISTS "AdPlacement_route_idx" ON "AdPlacement"("route")`,
    `CREATE INDEX IF NOT EXISTS "AdPlacement_campaignId_idx" ON "AdPlacement"("campaignId")`,

    `CREATE TABLE IF NOT EXISTS "AdEvent" (
      "id" TEXT NOT NULL,
      "campaignId" TEXT NOT NULL,
      "eventType" TEXT NOT NULL,
      "route" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "AdEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE INDEX IF NOT EXISTS "AdEvent_campaignId_eventType_idx" ON "AdEvent"("campaignId", "eventType")`,
    `CREATE INDEX IF NOT EXISTS "AdEvent_createdAt_idx" ON "AdEvent"("createdAt")`,
  ];

  for (const q of queries) {
    await prisma.$executeRawUnsafe(q);
  }

  console.log("Safe SQL migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
