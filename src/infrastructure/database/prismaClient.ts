/**
 * Prisma Client Singleton
 *
 * Provides a single PrismaClient instance across the application.
 * In development, attaches to globalThis to prevent hot-reload from
 * exhausting database connections.
 *
 * LAYER: infrastructure — allowed to use process.env and third-party SDKs.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
