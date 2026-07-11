#!/usr/bin/env npx tsx
/**
 * Backfill PatientRecord from confirmed health appointments missing a chart.
 *
 *   npx tsx scripts/backfill-patient-records-from-appointments.ts
 *   npx tsx scripts/backfill-patient-records-from-appointments.ts --dry-run
 */
import { db } from "../src/lib/db";
import { ensurePatientRecord } from "../src/lib/ensure-patient-record";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const appointments = await db.appointment.findMany({
    where: {
      professionalId: { not: null },
      status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
    },
    select: {
      professionalId: true,
      patient: { select: { userId: true } },
    },
  });

  const pairs = new Map<string, { professionalId: string; userId: string }>();
  for (const appt of appointments) {
    if (!appt.professionalId) continue;
    const userId = appt.patient.userId;
    const key = `${appt.professionalId}:${userId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { professionalId: appt.professionalId, userId });
    }
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { professionalId, userId } of pairs.values()) {
    const existing = await db.patientRecord.findFirst({
      where: { professionalId, linkedUserId: userId },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] would create PatientRecord pro=${professionalId} user=${userId}`);
      created++;
      continue;
    }

    const chartId = await ensurePatientRecord(professionalId, userId);
    if (chartId) {
      console.log(`[created] chartId=${chartId} pro=${professionalId} user=${userId}`);
      created++;
    } else {
      console.warn(`[failed] no profile/name pro=${professionalId} user=${userId}`);
      failed++;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        pairs: pairs.size,
        created,
        skipped,
        failed,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
