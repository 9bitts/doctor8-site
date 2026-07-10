// src/lib/db.ts
// Prisma client singleton — reused across requests in dev

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Railway Postgres: set DATABASE_URL with ?connection_limit=5&pool_timeout=20
    // or use PgBouncer / Prisma Accelerate for multi-instance deploys.
  });

globalForPrisma.prisma = db;
