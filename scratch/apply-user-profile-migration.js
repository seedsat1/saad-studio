const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying UserProfile migration to Neon DB...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserProfile" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "avatarPhoto" TEXT,
      "avatarPreset" INTEGER NOT NULL DEFAULT 1,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('✓ Table UserProfile created / verified.');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserProfile_userId_fkey'
      ) THEN
        ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('✓ Foreign key UserProfile_userId_fkey verified.');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserProfile_userId_idx" ON "UserProfile"("userId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserProfile_userId_isDefault_idx" ON "UserProfile"("userId", "isDefault");`);
  console.log('✓ Indexes on UserProfile created.');

  await prisma.$executeRawUnsafe(`ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "profileId" TEXT;`);
  console.log('✓ Column profileId added to Generation.');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Generation_profileId_fkey'
      ) THEN
        ALTER TABLE "Generation" ADD CONSTRAINT "Generation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('✓ Foreign key Generation_profileId_fkey verified.');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Generation_userId_profileId_idx" ON "Generation"("userId", "profileId");`);
  console.log('✓ Index Generation_userId_profileId_idx created.');

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
