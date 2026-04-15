import { PrismaClient } from "@prisma/client"

declare global {
  var prisma: PrismaClient | undefined
}

const prismadb =
  globalThis.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        // Append pgbouncer=true&connection_limit=1 to DATABASE_URL in Vercel
        // for Supabase Transaction pooler (port 6543)
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== "production") globalThis.prisma = prismadb

export default prismadb;
