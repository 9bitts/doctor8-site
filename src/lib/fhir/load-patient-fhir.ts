import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { parseExamContent } from "@/lib/sign-helpers";
import {
  buildPatientFhirBundle,
  type PatientFhirInput,
} from "@/lib/fhir/patient-bundle";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

export async function loadPatientFhirInput(
  patientId: string,
  userId: string,
): Promise<PatientFhirInput | null> {
  const patient = await db.patientProfile.findUnique({
    where: { id: patientId },
    include: {
      medications: {
        where: { active: true, flow: "CLINICAL" },
        orderBy: { createdAt: "asc" },
      },
      appointments: {
        orderBy: { scheduledAt: "desc" },
        take: 50,
        include: {
          professional: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!patient || patient.userId !== userId) return null;

  const linkedRecords = await db.patientRecord.findMany({
    where: { linkedUserId: userId },
    select: { id: true },
  });
  const recordIds = linkedRecords.map((r) => r.id);

  const examDocs = await db.medicalDocument.findMany({
    where: {
      type: "EXAM_REQUEST",
      OR: [
        { patientId: patient.id },
        ...(recordIds.length ? [{ patientRecordId: { in: recordIds } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const prescriptionRows = await db.prescription.findMany({
    where: { document: { patientId: patient.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    patientId: patient.id,
    userId,
    firstName: decrypt(patient.firstName),
    lastName: decrypt(patient.lastName),
    dateOfBirth: patient.dateOfBirth ? decrypt(patient.dateOfBirth) : null,
    sex: patient.sex,
    bloodType: patient.bloodType,
    allergies: patient.allergies ? decrypt(patient.allergies) : null,
    chronicConditions: patient.chronicConditions ? decrypt(patient.chronicConditions) : null,
    medications: patient.medications.map((m) => ({
      id: m.id,
      name: decrypt(m.name),
      dosage: m.dosage ? decrypt(m.dosage) : null,
      frequency: m.frequency ? decrypt(m.frequency) : null,
      prescribedBy: m.prescribedBy,
    })),
    encounters: patient.appointments.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      type: a.type,
      professionalName: a.professional
        ? `${a.professional.firstName} ${a.professional.lastName}`.trim()
        : null,
    })),
    examRequests: examDocs.map((d) => {
      const parsed = parseExamContent(d.content ? safeDecrypt(d.content) : "");
      return {
        id: d.id,
        title: safeDecrypt(d.title),
        createdAt: d.createdAt.toISOString(),
        items: parsed.items,
      };
    }),
    prescriptions: prescriptionRows.map((p) => {
      const meds = Array.isArray(p.medications)
        ? (p.medications as { name?: string; dosage?: string; frequency?: string }[])
        : [];
      return {
        id: p.id,
        createdAt: p.createdAt.toISOString(),
        validUntil: p.validUntil?.toISOString() ?? null,
        medications: meds.map((m) => ({
          name: m.name || "",
          dosage: m.dosage,
          frequency: m.frequency,
        })),
      };
    }),
  };
}

export async function buildFhirBundleForPatient(patientId: string, userId: string) {
  const input = await loadPatientFhirInput(patientId, userId);
  if (!input) return null;
  return buildPatientFhirBundle(input);
}

export async function buildFhirPatientResource(patientId: string, userId: string) {
  const bundle = await buildFhirBundleForPatient(patientId, userId);
  if (!bundle) return null;
  const entries = bundle.entry as { resource?: { resourceType?: string } }[] | undefined;
  const patient = entries?.find((e) => e.resource?.resourceType === "Patient")?.resource;
  return patient ?? null;
}
