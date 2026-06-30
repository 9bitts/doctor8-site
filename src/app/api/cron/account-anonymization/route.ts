import { NextRequest, NextResponse } from "next/server";
import type { Prisma, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { logQStashJob } from "@/lib/integration-logs";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

const eligibleUserWhere = (now: Date): Prisma.UserWhereInput => ({
  deletedAt: { not: null },
  deletionScheduledAt: { lt: now },
  anonymizedAt: null,
});

async function anonymizeProfileInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  role: UserRole,
): Promise<void> {
  switch (role) {
    case "PATIENT": {
      const profile = await tx.patientProfile.findUnique({ where: { userId } });
      if (!profile) return;
      await tx.patientProfile.update({
        where: { userId },
        data: {
          firstName: encrypt("Usu?rio"),
          lastName: encrypt("Removido"),
          avatarUrl: null,
          phone: null,
          dateOfBirth: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          country: null,
          zipCode: null,
          cpf: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
        },
      });
      return;
    }
    case "PROFESSIONAL": {
      const profile = await tx.professionalProfile.findUnique({ where: { userId } });
      if (!profile) return;
      await tx.professionalProfile.update({
        where: { userId },
        data: {
          firstName: "Usu?rio",
          lastName: "Removido",
          avatarUrl: null,
          phone: null,
          clinicAddress: null,
          clinicCity: null,
          clinicState: null,
          clinicCountry: null,
          clinicZip: null,
          digitalSignCpf: null,
        },
      });
      return;
    }
    case "PSYCHOANALYST": {
      const profile = await tx.psychoanalystProfile.findUnique({ where: { userId } });
      if (!profile) return;
      await tx.psychoanalystProfile.update({
        where: { userId },
        data: {
          firstName: "Usu?rio",
          lastName: "Removido",
          avatarUrl: null,
          phone: null,
          clinicAddress: null,
          clinicCity: null,
          clinicState: null,
          clinicCountry: null,
          clinicZip: null,
        },
      });
      return;
    }
    case "INTEGRATIVE_THERAPIST": {
      const profile = await tx.integrativeTherapistProfile.findUnique({
        where: { userId },
      });
      if (!profile) return;
      await tx.integrativeTherapistProfile.update({
        where: { userId },
        data: {
          firstName: "Usu?rio",
          lastName: "Removido",
          avatarUrl: null,
          phone: null,
          clinicAddress: null,
          clinicCity: null,
          clinicState: null,
          clinicCountry: null,
          clinicZip: null,
        },
      });
      return;
    }
    case "ANGEL": {
      const profile = await tx.angelProfile.findUnique({ where: { userId } });
      if (!profile) return;
      await tx.angelProfile.update({
        where: { userId },
        data: {
          firstName: "Usu?rio",
          lastName: "Removido",
          phone: null,
        },
      });
      return;
    }
    default:
      return;
  }
}

async function anonymizeUser(userId: string, role: UserRole): Promise<void> {
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.invalid`,
        phone: null,
        anonymizedAt: now,
      },
    });
    await anonymizeProfileInTransaction(tx, userId, role);
  });
}

/** Anonymize users past the 30-day deletion grace period (LGPD Art. 16). */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const users = await db.user.findMany({
    where: eligibleUserWhere(now),
    select: { id: true, role: true },
  });

  let anonymized = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await anonymizeUser(user.id, user.role);
      await logQStashJob({
        jobType: "account_anonymization",
        status: "sent",
        detail: `anonymized user ${user.id} (role ${user.role})`,
      });
      anonymized += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await logQStashJob({
        jobType: "account_anonymization",
        status: "failed",
        detail: `user ${user.id}: ${message}`,
      });
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, anonymized, failed });
}
