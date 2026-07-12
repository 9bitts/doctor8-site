#!/usr/bin/env npx tsx
/**
 * Backfill provider charts from confirmed appointments missing a linked record.
 *
 *   npx tsx scripts/backfill-patient-records-from-appointments.ts
 *   npx tsx scripts/backfill-patient-records-from-appointments.ts --dry-run
 */
import { db } from "../src/lib/db";
import { ensurePatientRecord } from "../src/lib/ensure-patient-record";
import { ensureAnalysandRecord } from "../src/lib/ensure-analysand-record";
import { ensureIntegrativeClientRecord } from "../src/lib/ensure-integrative-client-record";

const dryRun = process.argv.includes("--dry-run");

type PairKey = string;
type Pair = {
  providerType: "health" | "psychoanalyst" | "integrative";
  providerId: string;
  userId: string;
};

async function ensureChart(pair: Pair): Promise<string | null> {
  if (pair.providerType === "health") {
    return ensurePatientRecord(pair.providerId, pair.userId);
  }
  if (pair.providerType === "psychoanalyst") {
    return ensureAnalysandRecord(pair.providerId, pair.userId);
  }
  return ensureIntegrativeClientRecord(pair.providerId, pair.userId);
}

async function hasChart(pair: Pair): Promise<boolean> {
  if (pair.providerType === "health") {
    return !!(await db.patientRecord.findFirst({
      where: { professionalId: pair.providerId, linkedUserId: pair.userId },
      select: { id: true },
    }));
  }
  if (pair.providerType === "psychoanalyst") {
    return !!(await db.analysandRecord.findFirst({
      where: { psychoanalystId: pair.providerId, linkedUserId: pair.userId },
      select: { id: true },
    }));
  }
  return !!(await db.integrativeClientRecord.findFirst({
    where: { integrativeTherapistId: pair.providerId, linkedUserId: pair.userId },
    select: { id: true },
  }));
}

async function main() {
  const appointments = await db.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      OR: [
        { professionalId: { not: null } },
        { psychoanalystId: { not: null } },
        { integrativeTherapistId: { not: null } },
      ],
    },
    select: {
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
      patient: { select: { userId: true } },
    },
  });

  const pairs = new Map<PairKey, Pair>();
  for (const appt of appointments) {
    const userId = appt.patient.userId;
    if (appt.professionalId) {
      const key = `health:${appt.professionalId}:${userId}`;
      if (!pairs.has(key)) {
        pairs.set(key, { providerType: "health", providerId: appt.professionalId, userId });
      }
    }
    if (appt.psychoanalystId) {
      const key = `psychoanalyst:${appt.psychoanalystId}:${userId}`;
      if (!pairs.has(key)) {
        pairs.set(key, { providerType: "psychoanalyst", providerId: appt.psychoanalystId, userId });
      }
    }
    if (appt.integrativeTherapistId) {
      const key = `integrative:${appt.integrativeTherapistId}:${userId}`;
      if (!pairs.has(key)) {
        pairs.set(key, {
          providerType: "integrative",
          providerId: appt.integrativeTherapistId,
          userId,
        });
      }
    }
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const pair of pairs.values()) {
    if (await hasChart(pair)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `[dry-run] would create ${pair.providerType} chart pro=${pair.providerId} user=${pair.userId}`,
      );
      created++;
      continue;
    }

    const chartId = await ensureChart(pair);
    if (chartId) {
      console.log(
        `[created] ${pair.providerType} chartId=${chartId} pro=${pair.providerId} user=${pair.userId}`,
      );
      created++;
    } else {
      console.warn(
        `[failed] no profile/name ${pair.providerType} pro=${pair.providerId} user=${pair.userId}`,
      );
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
