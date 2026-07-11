#!/usr/bin/env node
/**
 * Pre-migration check for AGD-06 partial unique indexes.
 * Exits 1 if duplicate active slots exist (resolve before migrating).
 *
 *   node scripts/check-appointment-slot-duplicates.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const QUERIES = [
  {
    label: "professionalId",
    sql: `
      SELECT "professionalId" AS provider_id, "scheduledAt", COUNT(*)::int AS cnt
      FROM "Appointment"
      WHERE "professionalId" IS NOT NULL
        AND status IN ('CONFIRMED', 'PENDING')
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 20
    `,
  },
  {
    label: "psychoanalystId",
    sql: `
      SELECT "psychoanalystId" AS provider_id, "scheduledAt", COUNT(*)::int AS cnt
      FROM "Appointment"
      WHERE "psychoanalystId" IS NOT NULL
        AND status IN ('CONFIRMED', 'PENDING')
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 20
    `,
  },
  {
    label: "integrativeTherapistId",
    sql: `
      SELECT "integrativeTherapistId" AS provider_id, "scheduledAt", COUNT(*)::int AS cnt
      FROM "Appointment"
      WHERE "integrativeTherapistId" IS NOT NULL
        AND status IN ('CONFIRMED', 'PENDING')
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 20
    `,
  },
];

async function main() {
  let total = 0;
  for (const { label, sql } of QUERIES) {
    const rows = await prisma.$queryRawUnsafe(sql);
    const list = Array.isArray(rows) ? rows : [];
    if (list.length > 0) {
      console.error(`[DUPLICATES] ${label}: ${list.length} conflicting slot(s)`);
      for (const row of list) {
        console.error(JSON.stringify(row));
      }
      total += list.length;
    } else {
      console.log(`[OK] ${label}: no duplicate active slots`);
    }
  }
  if (total > 0) {
    console.error(
      `\nFound ${total} duplicate group(s). Cancel or reschedule extras before applying migration 20260712160000_appointment_active_slot_unique.`,
    );
    process.exit(1);
  }
  console.log("\nSafe to apply partial unique indexes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
