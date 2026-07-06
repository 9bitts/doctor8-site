import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string): string {
  try { return decrypt(v); } catch { return v; }
}

type MedItem = {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  route?: string;
};

export async function listChartPrescriptionsForMedCheck(chartId: string) {
  const [medicalRx, nursingRx, checks] = await Promise.all([
    db.prescription.findMany({
      where: { document: { patientRecordId: chartId } },
      include: {
        document: { select: { id: true, title: true } },
        professional: { select: { firstName: true, lastName: true, specialty: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.nursingMedicationPrescription.findMany({
      where: { patientRecordId: chartId, status: { in: ["ACTIVE", "DRAFT"] } },
      include: {
        professional: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.nursingMedCheck.findMany({
      where: { patientRecordId: chartId },
      orderBy: { checkedAt: "desc" },
      take: 50,
      include: {
        nurse: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const checkedMedical = new Set(
    checks.filter((c) => c.medicalPrescriptionId).map((c) => c.medicalPrescriptionId!),
  );
  const checkedNursing = new Set(
    checks.filter((c) => c.nursingMedPrescriptionId).map((c) => c.nursingMedPrescriptionId!),
  );

  const medical = medicalRx.flatMap((rx) => {
    const meds = (rx.medications as MedItem[]) || [];
    return meds.map((m, idx) => ({
      sourceType: "MEDICAL_PRESCRIPTION" as const,
      prescriptionId: rx.id,
      itemIndex: idx,
      medicationName: m.name || "—",
      snapshot: m,
      prescriber: rx.professional
        ? `${rx.professional.firstName} ${rx.professional.lastName}`.trim()
        : null,
      specialty: rx.professional?.specialty ?? null,
      createdAt: rx.createdAt.toISOString(),
      validUntil: rx.validUntil?.toISOString() ?? null,
      alreadyChecked: checkedMedical.has(rx.id),
    }));
  });

  const nursing = nursingRx.flatMap((rx) => {
    const meds = (rx.medications as MedItem[]) || [];
    return meds.map((m, idx) => ({
      sourceType: "NURSING_MEDICATION_PRESCRIPTION" as const,
      prescriptionId: rx.id,
      itemIndex: idx,
      medicationName: m.name || "—",
      snapshot: m,
      prescriber: `${rx.professional.firstName} ${rx.professional.lastName}`.trim(),
      cofenCategory: rx.cofenCategory,
      createdAt: rx.createdAt.toISOString(),
      validUntil: rx.validUntil?.toISOString() ?? null,
      alreadyChecked: checkedNursing.has(rx.id),
      status: rx.status,
    }));
  });

  return {
    medical,
    nursing,
    checks: checks.map((c) => ({
      id: c.id,
      sourceType: c.sourceType,
      medicalPrescriptionId: c.medicalPrescriptionId,
      nursingMedPrescriptionId: c.nursingMedPrescriptionId,
      medicationName: c.medicationName,
      medicationSnapshot: c.medicationSnapshot,
      sixRights: c.sixRights,
      result: c.result,
      divergenceReason: c.divergenceReason,
      notes: c.notes,
      checkedAt: c.checkedAt.toISOString(),
      nurseName: `${c.nurse.firstName} ${c.nurse.lastName}`.trim(),
    })),
  };
}

export async function getNursingMedRxPdfData(prescriptionId: string, nurseUserId: string) {
  const rx = await db.nursingMedicationPrescription.findUnique({
    where: { id: prescriptionId },
    include: {
      professional: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          specialty: true,
          licenseNumber: true,
          licenseState: true,
        },
      },
      patientRecord: {
        select: {
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          cpf: true,
          addressLine1: true,
          city: true,
          state: true,
        },
      },
    },
  });
  if (!rx || rx.professional.userId !== nurseUserId) return null;

  return {
    id: rx.id,
    medications: rx.medications as MedItem[],
    instructions: rx.instructions,
    validUntil: rx.validUntil,
    cofenCategory: rx.cofenCategory,
    licenseSnapshot: rx.licenseSnapshot,
    createdAt: rx.createdAt,
    professional: {
      name: `${rx.professional.firstName} ${rx.professional.lastName}`.trim(),
      specialty: rx.professional.specialty,
      license: rx.licenseSnapshot || `COREN ${rx.professional.licenseNumber}${rx.professional.licenseState ? `/${rx.professional.licenseState}` : ""}`,
    },
    patient: {
      name: `${safeDecrypt(rx.patientRecord.firstName)} ${safeDecrypt(rx.patientRecord.lastName)}`.trim(),
      cpf: rx.patientRecord.cpf ? safeDecrypt(rx.patientRecord.cpf) : "",
    },
  };
}
