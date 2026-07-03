#!/usr/bin/env npx ts-node
/**
 * Pré-verificação antes de db push: detecta appointments duplicados por
 * stripePaymentId que violariam @unique.
 *
 * Uso: npx ts-node scripts/check-payment-duplicates.ts
 * Exit 0 = limpo; exit 1 = duplicatas (limpar manualmente).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function findDuplicateGroups(): Promise<{ stripePaymentId: string; count: number }[]> {
  const groups = await db.appointment.groupBy({
    by: ["stripePaymentId"],
    where: { stripePaymentId: { not: null } },
    _count: { _all: true },
    having: {
      stripePaymentId: { _count: { gt: 1 } },
    },
  });

  return groups
    .filter((g): g is typeof g & { stripePaymentId: string } => g.stripePaymentId != null)
    .map((g) => ({ stripePaymentId: g.stripePaymentId, count: g._count._all }));
}

async function printGroup(stripePaymentId: string): Promise<void> {
  const appointments = await db.appointment.findMany({
    where: { stripePaymentId },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      patientId: true,
      priceAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.error(`\n[DUPLICATE] stripePaymentId=${stripePaymentId} count=${appointments.length}`);
  for (const a of appointments) {
    console.error(
      `  id=${a.id} status=${a.status} scheduledAt=${a.scheduledAt.toISOString()} patientId=${a.patientId} priceAmount=${a.priceAmount} createdAt=${a.createdAt.toISOString()}`,
    );
  }
}

async function main(): Promise<void> {
  console.log("Checking Appointment for duplicate stripePaymentId values…");

  const groups = await findDuplicateGroups();

  if (groups.length === 0) {
    console.log("OK — no duplicate stripePaymentId groups. Safe to apply @unique.");
    process.exitCode = 0;
    return;
  }

  console.error(`FAIL — ${groups.length} duplicate group(s) found. Resolve before db push.`);
  for (const g of groups) {
    await printGroup(g.stripePaymentId);
  }
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
