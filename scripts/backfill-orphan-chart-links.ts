#!/usr/bin/env npx tsx
/**
 * Relink provider charts that have an email matching a PATIENT account
 * but still have linkedUserId = null (orphan after Google/OAuth signup gap).
 *
 *   npx tsx scripts/backfill-orphan-chart-links.ts --dry-run
 *   npx tsx scripts/backfill-orphan-chart-links.ts --apply
 */
import { db } from "../src/lib/db";
import { linkChartsToPatientUser } from "../src/lib/patient-chart-link";

const apply = process.argv.includes("--apply");
const dryRun = !apply;

async function main() {
  const orphanEmails = new Set<string>();

  const [patientOrphans, analysandOrphans, integrativeOrphans] = await Promise.all([
    db.patientRecord.findMany({
      where: { linkedUserId: null, email: { not: null } },
      select: { email: true },
    }),
    db.analysandRecord.findMany({
      where: { linkedUserId: null, email: { not: null } },
      select: { email: true },
    }),
    db.integrativeClientRecord.findMany({
      where: { linkedUserId: null, email: { not: null } },
      select: { email: true },
    }),
  ]);

  for (const row of [...patientOrphans, ...analysandOrphans, ...integrativeOrphans]) {
    if (row.email) orphanEmails.add(row.email.toLowerCase());
  }

  console.log(
    `[orphan-chart-links] ${dryRun ? "DRY-RUN" : "APPLY"} — ${orphanEmails.size} distinct orphan emails`,
  );

  let linkedUsers = 0;
  let skippedNoUser = 0;
  let errors = 0;

  for (const email of [...orphanEmails].sort()) {
    const user = await db.user.findFirst({
      where: { email, role: "PATIENT", deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      skippedNoUser += 1;
      console.log(`  skip (no PATIENT user): ${email}`);
      continue;
    }

    const [p, a, i] = await Promise.all([
      db.patientRecord.count({ where: { email, linkedUserId: null } }),
      db.analysandRecord.count({ where: { email, linkedUserId: null } }),
      db.integrativeClientRecord.count({ where: { email, linkedUserId: null } }),
    ]);
    const orphanCount = p + a + i;
    console.log(
      `  ${dryRun ? "would link" : "linking"} ${email} → user ${user.id} (${orphanCount} chart(s): patient=${p} analysand=${a} integrative=${i})`,
    );

    if (!dryRun) {
      try {
        await linkChartsToPatientUser(user.id, email);
        linkedUsers += 1;
      } catch (e) {
        errors += 1;
        console.error(`  ERROR linking ${email}:`, e);
      }
    } else {
      linkedUsers += 1;
    }
  }

  console.log(
    `[orphan-chart-links] done — users=${linkedUsers} noUser=${skippedNoUser} errors=${errors}`,
  );
  if (dryRun) {
    console.log("Re-run with --apply to write changes.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
