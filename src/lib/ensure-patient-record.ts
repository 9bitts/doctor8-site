// Ensures a PatientRecord exists for a professional + registered patient user.

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { buildPatientRecordSearchText } from "@/lib/patient-record-search";
import { syncChartDocuments } from "@/lib/patient-chart-documents";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function ensurePatientRecord(
  professionalId: string,
  patientUserId: string,
): Promise<string | null> {
  const existing = await db.patientRecord.findFirst({
    where: { professionalId, linkedUserId: patientUserId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, email: true },
  });
  if (existing) {
    await syncChartDocuments({
      chartId: existing.id,
      professionalId,
      linkedUserId: patientUserId,
      chartEmail: existing.email,
    });
    return existing.id;
  }

  const profile = await db.patientProfile.findUnique({
    where: { userId: patientUserId },
    include: { user: { select: { email: true } } },
  });
  if (!profile) return null;

  const firstName = safeDecrypt(profile.firstName);
  const lastName = safeDecrypt(profile.lastName);
  if (!firstName && !lastName) return null;

  const email = profile.user.email?.toLowerCase() ?? null;

  const record = await db.patientRecord.create({
    data: {
      professionalId,
      linkedUserId: patientUserId,
      firstName: encrypt(firstName || "Paciente"),
      lastName: encrypt(lastName || ""),
      email,
      searchText: buildPatientRecordSearchText(firstName || "Paciente", lastName || "", email),
      phone: profile.phone ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
      sex: profile.sex ?? null,
      cpf: profile.cpf ?? null,
      addressLine1: profile.addressLine1 ?? null,
      city: profile.city ?? null,
      state: profile.state ?? null,
      country: profile.country ?? "BR",
      zipCode: profile.zipCode ?? null,
    },
  });

  await syncChartDocuments({
    chartId: record.id,
    professionalId,
    linkedUserId: patientUserId,
    chartEmail: email,
  });

  return record.id;
}
