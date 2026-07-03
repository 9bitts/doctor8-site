#!/usr/bin/env npx ts-node
/**
 * Pré-verificação antes de db push: detecta duplicatas que violariam
 * @@unique([type, appointmentId]) e @@unique([type, jitQueueId]).
 *
 * Uso: npx ts-node scripts/check-ledger-duplicates.ts
 * Exit 0 = limpo; exit 1 = duplicatas encontradas (limpar manualmente).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type DupGroup = {
  kind: "appointmentId" | "jitQueueId";
  type: string;
  refId: string;
  count: number;
};

async function findDuplicateGroups(): Promise<DupGroup[]> {
  const out: DupGroup[] = [];

  const apptGroups = await db.ledgerEntry.groupBy({
    by: ["type", "appointmentId"],
    where: { appointmentId: { not: null } },
    _count: { _all: true },
    having: {
      appointmentId: { _count: { gt: 1 } },
    },
  });

  for (const g of apptGroups) {
    if (!g.appointmentId) continue;
    out.push({
      kind: "appointmentId",
      type: g.type,
      refId: g.appointmentId,
      count: g._count._all,
    });
  }

  const jitGroups = await db.ledgerEntry.groupBy({
    by: ["type", "jitQueueId"],
    where: { jitQueueId: { not: null } },
    _count: { _all: true },
    having: {
      jitQueueId: { _count: { gt: 1 } },
    },
  });

  for (const g of jitGroups) {
    if (!g.jitQueueId) continue;
    out.push({
      kind: "jitQueueId",
      type: g.type,
      refId: g.jitQueueId,
      count: g._count._all,
    });
  }

  return out;
}

async function printGroup(group: DupGroup): Promise<void> {
  const where =
    group.kind === "appointmentId"
      ? { type: group.type as never, appointmentId: group.refId }
      : { type: group.type as never, jitQueueId: group.refId };

  const entries = await db.ledgerEntry.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      amountCents: true,
      hash: true,
      competenceMonth: true,
      currency: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.error(
    `\n[DUPLICATE] type=${group.type} ${group.kind}=${group.refId} count=${group.count}`,
  );
  for (const e of entries) {
    console.error(
      `  id=${e.id} createdAt=${e.createdAt.toISOString()} amountCents=${e.amountCents} hash=${e.hash} month=${e.competenceMonth} currency=${e.currency}`,
    );
  }
}

async function main(): Promise<void> {
  console.log("Checking LedgerEntry for (type, appointmentId) and (type, jitQueueId) duplicates…");

  const groups = await findDuplicateGroups();

  if (groups.length === 0) {
    console.log("OK — no duplicate groups found. Safe to apply @@unique constraints.");
    process.exitCode = 0;
    return;
  }

  console.error(`FAIL — ${groups.length} duplicate group(s) found. Resolve before db push.`);
  for (const g of groups) {
    await printGroup(g);
  }
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
