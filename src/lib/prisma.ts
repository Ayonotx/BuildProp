import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In standalone/packaged mode, the DATABASE_URL env var is set by electron/main.js
// pointing to the correct db location. Prisma reads DATABASE_URL from env automatically.
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
