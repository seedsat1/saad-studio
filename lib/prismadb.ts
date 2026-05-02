import { PrismaClient } from "@prisma/client/edge"

declare global {
  var prisma: PrismaClient | undefined
}

// Neon PostgreSQL — pooled connection via DATABASE_URL (serverless-safe)
// DIRECT_URL is used only by `prisma migrate` and `prisma db push`
const prismadb =
  globalThis.prisma ||
  new PrismaClient()

if (process.env.NODE_ENV !== "production") globalThis.prisma = prismadb

export default prismadb;
