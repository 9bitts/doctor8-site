import { db } from "@/lib/db";
import { formatLicense, getProfessionInfo } from "@/lib/profession-label";

export async function getPharmacyPrescriptionPdfData(prescriptionId: string, userId: string) {
  const rx = await db.pharmacyPrescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patientRecord: { select: { firstName: true, lastName: true, professionalId: true } },
      professional: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          licenseNumber: true,
          licenseState: true,
          specialty: true,
        },
      },
    },
  });
  if (!rx) return null;

  const isOwner = rx.professional.userId === userId;
  if (!isOwner) {
    const linked = await db.patientRecord.findFirst({
      where: { id: rx.patientRecordId, linkedUserId: userId },
    });
    if (!linked) return null;
  }

  const info = getProfessionInfo(rx.professional.specialty);
  return {
    id: rx.id,
    patient: { name: `${rx.patientRecord.firstName} ${rx.patientRecord.lastName}` },
    professional: {
      name: `${rx.professional.firstName} ${rx.professional.lastName}`,
      license: formatLicense(
        rx.professional.licenseNumber,
        rx.professional.licenseState,
        info.councilKey,
      ),
    },
    medications: rx.medications as Array<Record<string, string>>,
    instructions: rx.instructions,
    validUntil: rx.validUntil,
    createdAt: rx.createdAt,
  };
}
