import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";
import { AuditAction, Prisma } from "@prisma/client";
import { hasKnownProfessionalRelationship } from "@/lib/patient-professional-link";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { canEditChart, resolveChartAccess } from "@/lib/chart-access";
import { assertCannabisPrescriptionAllowed } from "@/lib/cannabis-prescription-gate";
import { medicationListHasCannabis } from "@/lib/integrative-medicine/integrative-prescription-utils";
import { cannabisTcleAuditLine } from "@/lib/cannabis-medicinal-tcle";
import { splitPrescriptionMedications } from "@/lib/prescription-split";
import type { ClassifiedMedicationItem } from "@/lib/prescription-item-classifier";
import {
  type PrescriptionFormKind,
  validDaysForPrescriptionFormKind,
  requiresSncrNumber,
  prescriptionFormKindLabel,
} from "@/lib/prescription-form-kind";
import { reserveSncrReceiptNumber } from "@/lib/sncr/number-pool";
import { getSncrAccessToken } from "@/lib/sncr/client";
import { sncrEnabled, controlledPrescriptionsAvailable } from "@/lib/sncr/config";

export type CreatePrescriptionInput = {
  professionalId: string;
  professionalUserId: string;
  patientRecordId?: string;
  patientUserId?: string;
  appointmentId?: string;
  medications: ClassifiedMedicationItem[];
  instructions?: string;
  validDays?: number;
  cannabisTcleAccepted?: boolean;
  issuedViaTelemedicine?: boolean;
  lang?: "pt" | "en" | "es";
};

export type CreatedPrescriptionSummary = {
  id: string;
  documentId: string;
  formKind: PrescriptionFormKind;
  label: string;
  medications: ClassifiedMedicationItem[];
  sncrReceiptNumber: string | null;
  validUntil: Date;
};

export type CreatePrescriptionBatchResult =
  | {
      ok: true;
      packageId: string | null;
      prescriptions: CreatedPrescriptionSummary[];
      isMixed: boolean;
      needsSncrAuth: boolean;
    }
  | {
      ok: false;
      error: string;
      needsSncrAuth?: boolean;
      needsSncrPlatform?: boolean;
    };

async function resolvePatientTargets(input: CreatePrescriptionInput) {
  let documentPatientId: string | null = null;
  let documentPatientRecordId: string | null = null;
  let documentOwnerProfessionalId = input.professionalId;

  if (input.patientRecordId) {
    const access = await resolveChartAccess(input.professionalId, input.patientRecordId);
    if (!canEditChart(access)) {
      throw new Error("Patient chart not found");
    }
    const record = await db.patientRecord.findUnique({ where: { id: input.patientRecordId } });
    if (!record) throw new Error("Patient chart not found");
    documentPatientRecordId = record.id;
    documentOwnerProfessionalId = record.professionalId;
    if (record.linkedUserId) {
      const profile = await db.patientProfile.findUnique({ where: { userId: record.linkedUserId } });
      if (profile) documentPatientId = profile.id;
    }
  } else if (input.patientUserId) {
    const patientUser = await db.user.findUnique({
      where: { id: input.patientUserId },
      select: { role: true, deletedAt: true },
    });
    if (!patientUser || patientUser.role !== "PATIENT" || patientUser.deletedAt) {
      throw new Error("Patient not found");
    }
    const patient = await db.patientProfile.findUnique({ where: { userId: input.patientUserId } });
    if (!patient) throw new Error("Patient not found");
    documentPatientId = patient.id;
    const ensuredRecordId = await ensurePatientRecord(input.professionalId, input.patientUserId);
    if (ensuredRecordId) documentPatientRecordId = ensuredRecordId;
  } else {
    throw new Error("patientRecordId or patientUserId is required");
  }

  return { documentPatientId, documentPatientRecordId, documentOwnerProfessionalId };
}

export async function createPrescriptionBatch(
  input: CreatePrescriptionInput,
): Promise<CreatePrescriptionBatchResult> {
  const lang = input.lang || "pt";

  const professional = await db.professionalProfile.findUnique({
    where: { id: input.professionalId },
  });
  if (!professional) return { ok: false, error: "Professional not found" };

  const cannabisGate = assertCannabisPrescriptionAllowed(professional.specialty, input.medications);
  if (!cannabisGate.ok) return { ok: false, error: cannabisGate.message };

  if (medicationListHasCannabis(input.medications) && !input.cannabisTcleAccepted) {
    return { ok: false, error: "Cannabis medicinal TCLE acceptance is required before prescribing." };
  }

  const split = splitPrescriptionMedications(input.medications, lang);
  if (!split.ok) return { ok: false, error: split.error };

  const needsControlled = split.groups.some((g) => requiresSncrNumber(g.formKind));
  if (needsControlled && !controlledPrescriptionsAvailable()) {
    return {
      ok: false,
      error:
        "Receitas Lista B/C estão temporariamente indisponíveis. A integração SNCR com a Anvisa ainda aguarda liberação. Remova medicamentos controlados ou emita apenas receita comum.",
      needsSncrPlatform: true,
    };
  }
  if (needsControlled && sncrEnabled()) {
    const token = await getSncrAccessToken(input.professionalId);
    if (!token) {
      return { ok: false, error: "Autenticação Gov.br/SNCR necessária para receitas controladas.", needsSncrAuth: true };
    }
  }

  const resolvedInstructions = (() => {
    const base = input.instructions?.trim() || "";
    if (!medicationListHasCannabis(input.medications) || !input.cannabisTcleAccepted) return base;
    const auditLine = cannabisTcleAuditLine();
    return base ? `${base}\n\n${auditLine}` : auditLine;
  })();

  let documentPatientId: string | null;
  let documentPatientRecordId: string | null;
  let documentOwnerProfessionalId: string;
  try {
    ({ documentPatientId, documentPatientRecordId, documentOwnerProfessionalId } =
      await resolvePatientTargets(input));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Patient not found" };
  }

  if (input.appointmentId && documentPatientId) {
    const appt = await db.appointment.findFirst({
      where: {
        id: input.appointmentId,
        professionalId: input.professionalId,
        patientId: documentPatientId,
      },
      select: { id: true },
    });
    if (!appt) return { ok: false, error: "Appointment does not belong to this professional and patient" };
  }

  const packageRow =
    split.isMixed
      ? await db.prescriptionPackage.create({
          data: { professionalId: input.professionalId },
        })
      : null;

  const created: CreatedPrescriptionSummary[] = [];

  for (const group of split.groups) {
    const validDays =
      group.formKind === "SIMPLE"
        ? input.validDays || validDaysForPrescriptionFormKind(group.formKind)
        : validDaysForPrescriptionFormKind(group.formKind);
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    let sncrReceiptNumber: string | null = null;
    let sncrReceiptType: string | null = null;
    let sncrIssuedAt: Date | null = null;

    if (requiresSncrNumber(group.formKind)) {
      try {
        const reserved = await reserveSncrReceiptNumber({
          professionalId: input.professionalId,
          formKind: group.formKind,
          licenseNumber: professional.licenseNumber,
          licenseState: professional.licenseState || "SP",
          specialty: professional.specialty,
        });
        sncrReceiptNumber = reserved.number;
        sncrReceiptType = reserved.receiptType;
        sncrIssuedAt = new Date();
      } catch (e) {
        if (packageRow) {
          await db.prescriptionPackage.delete({ where: { id: packageRow.id } }).catch(() => {});
        }
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Falha ao reservar numeração SNCR",
          needsSncrAuth: true,
        };
      }
    }

    const titleLabel = prescriptionFormKindLabel(group.formKind, lang);
    const document = await db.medicalDocument.create({
      data: {
        patientId: documentPatientId,
        patientRecordId: documentPatientRecordId,
        professionalId: documentOwnerProfessionalId,
        appointmentId: input.appointmentId || null,
        type: "PRESCRIPTION",
        title: encrypt(`${titleLabel} — ${new Date().toLocaleDateString("pt-BR")}`),
      },
    });

    const prescription = await db.prescription.create({
      data: {
        documentId: document.id,
        professionalId: input.professionalId,
        medications: group.medications as Prisma.InputJsonValue,
        instructions: resolvedInstructions ? encrypt(resolvedInstructions) : null,
        validUntil,
        prescriptionFormKind: group.formKind,
        prescriptionPackageId: packageRow?.id || null,
        sncrReceiptNumber,
        sncrReceiptType,
        sncrIssuedAt,
        issuedViaTelemedicine: input.issuedViaTelemedicine ?? false,
      },
    });

    await audit.createRecord(input.professionalUserId, "Prescription", prescription.id);

    created.push({
      id: prescription.id,
      documentId: document.id,
      formKind: group.formKind,
      label: titleLabel,
      medications: group.medications,
      sncrReceiptNumber,
      validUntil,
    });
  }

  if (input.patientUserId && !input.patientRecordId && documentPatientId) {
    const known = await hasKnownProfessionalRelationship({
      patientUserId: input.patientUserId,
      patientProfileId: documentPatientId,
      professionalUserId: input.professionalUserId,
    });
    if (!known) {
      await createAuditLog({
        userId: input.professionalUserId,
        action: AuditAction.CREATE_RECORD,
        resource: "PrescriptionEmitWithoutLink",
        resourceId: created[0]?.id || packageRow?.id || "",
        details: { patientUserId: input.patientUserId, packageId: packageRow?.id },
      });
      const drName = `Dr. ${professional.firstName} ${professional.lastName}`.trim();
      await createNotification({
        userId: input.patientUserId,
        title: "New prescription",
        body: `${drName} sent you a prescription. Review it and accept a connection if you know this provider.`,
        type: "system",
        data: {
          url: "/patient/prescriptions",
          prescriptionId: created[0]?.id,
          packageId: packageRow?.id,
          professionalUserId: input.professionalUserId,
          canReport: true,
        },
      });
    }
  }

  return {
    ok: true,
    packageId: packageRow?.id || null,
    prescriptions: created,
    isMixed: split.isMixed,
    needsSncrAuth: false,
  };
}
