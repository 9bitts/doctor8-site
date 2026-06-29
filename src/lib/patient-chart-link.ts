// Auto-link provider charts to a new patient account by email (register / magic-link).

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient;

/** Links all unlinked charts (medical, psychoanalytic, integrative) to the patient user. */
export async function linkChartsToPatientOnSignup(
  tx: Tx,
  userId: string,
  email: string,
) {
  const normalizedEmail = email.toLowerCase();
  const where = { email: normalizedEmail, linkedUserId: null as string | null };

  await tx.patientRecord.updateMany({ where, data: { linkedUserId: userId } });
  await tx.analysandRecord.updateMany({ where, data: { linkedUserId: userId } });
  await tx.integrativeClientRecord.updateMany({ where, data: { linkedUserId: userId } });
}

/** Links charts and attaches documents (outside a transaction, e.g. magic-link for existing user). */
export async function linkChartsToPatientUser(userId: string, email: string) {
  await db.$transaction(async (tx) => {
    await linkChartsToPatientOnSignup(tx, userId, email);
  });
  await attachLinkedDocumentsToPatientProfile(userId);
}

export async function attachLinkedDocumentsToPatientProfile(userId: string) {
  const patientProfile = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!patientProfile) return;

  const [patientRecords, analysandRecords, integrativeRecords] = await Promise.all([
    db.patientRecord.findMany({
      where: { linkedUserId: userId },
      select: { id: true },
    }),
    db.analysandRecord.findMany({
      where: { linkedUserId: userId },
      select: { id: true },
    }),
    db.integrativeClientRecord.findMany({
      where: { linkedUserId: userId },
      select: { id: true },
    }),
  ]);

  const orConditions: Prisma.MedicalDocumentWhereInput[] = [];
  const patientRecordIds = patientRecords.map((r) => r.id);
  const analysandIds = analysandRecords.map((r) => r.id);
  const integrativeIds = integrativeRecords.map((r) => r.id);

  if (patientRecordIds.length > 0) {
    orConditions.push({ patientRecordId: { in: patientRecordIds } });
  }
  if (analysandIds.length > 0) {
    orConditions.push({ analysandRecordId: { in: analysandIds } });
  }
  if (integrativeIds.length > 0) {
    orConditions.push({ integrativeClientRecordId: { in: integrativeIds } });
  }
  if (orConditions.length === 0) return;

  await db.medicalDocument.updateMany({
    where: {
      OR: orConditions,
      patientId: null,
    },
    data: { patientId: patientProfile.id },
  });

  await markChartInvitesLinked(userId);
}

async function markChartInvitesLinked(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return;
  const inviteEmail = user.email.toLowerCase();

  await db.patientChartInvite.updateMany({
    where: {
      email: inviteEmail,
      status: "SENT",
      patientRecord: { linkedUserId: userId },
    },
    data: { status: "LINKED", linkedAt: new Date() },
  });
}
