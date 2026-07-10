import {
  PatientAcquisitionChannel,
  PartnerIntakeEventType,
  PartnerIntakeStatus,
  UserRole,
  type PartnerIntake,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

const ACURA_STATUS_FROM_API: Record<string, PartnerIntakeStatus> = {
  nova: PartnerIntakeStatus.NOVA,
  NOVA: PartnerIntakeStatus.NOVA,
  em_triagem: PartnerIntakeStatus.EM_TRIAGEM,
  EM_TRIAGEM: PartnerIntakeStatus.EM_TRIAGEM,
  orientado_doctor8: PartnerIntakeStatus.ORIENTADO_DOCTOR8,
  ORIENTADO_DOCTOR8: PartnerIntakeStatus.ORIENTADO_DOCTOR8,
  na_fila: PartnerIntakeStatus.NA_FILA,
  NA_FILA: PartnerIntakeStatus.NA_FILA,
  em_consulta: PartnerIntakeStatus.EM_CONSULTA,
  EM_CONSULTA: PartnerIntakeStatus.EM_CONSULTA,
  concluido: PartnerIntakeStatus.CONCLUIDO,
  CONCLUIDO: PartnerIntakeStatus.CONCLUIDO,
  cancelado: PartnerIntakeStatus.CANCELADO,
  CANCELADO: PartnerIntakeStatus.CANCELADO,
};

const EVENT_TYPE_FROM_API: Record<string, PartnerIntakeEventType> = {
  FORM_SUBMITTED: PartnerIntakeEventType.FORM_SUBMITTED,
  STATUS_CHANGED: PartnerIntakeEventType.STATUS_CHANGED,
  CLICKED_DOCTOR8_REGISTER: PartnerIntakeEventType.CLICKED_DOCTOR8_REGISTER,
  CLICKED_DOCTOR8_LOGIN: PartnerIntakeEventType.CLICKED_DOCTOR8_LOGIN,
  CLICKED_WHATSAPP_HELP: PartnerIntakeEventType.CLICKED_WHATSAPP_HELP,
  DOCTOR8_EMAIL_VERIFIED: PartnerIntakeEventType.DOCTOR8_EMAIL_VERIFIED,
  VOLUNTEER_ASSIGNED: PartnerIntakeEventType.VOLUNTEER_ASSIGNED,
  NOTES_UPDATED: PartnerIntakeEventType.NOTES_UPDATED,
};

const phoneSchema = z.object({
  ddi: z.string().optional(),
  ddd: z.string().optional(),
  telefone: z.string().optional(),
  display: z.string().optional(),
  whatsapp: z.boolean().optional(),
});

const eventSchema = z.object({
  externalId: z.string().max(128).optional(),
  type: z.string().min(1).max(64),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()).optional(),
});

export const acuraIntakeUpsertSchema = z.object({
  protocolo: z.string().min(8).max(64),
  submittedAt: z.string().datetime(),
  requester: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(320),
    phone: phoneSchema,
  }),
  patient: z.object({
    name: z.string().min(1).max(200),
    age: z.number().int().min(0).max(130).nullable().optional(),
    relationship: z.string().min(1).max(100),
    location: z.string().min(1).max(300),
  }),
  clinical: z.object({
    careType: z.string().min(1).max(200),
    priority: z.string().min(1).max(64),
    symptoms: z.string().min(1).max(8000),
    notes: z.string().max(8000).optional().default(""),
  }),
  acuraStatus: z.string().min(1).max(64),
  triageNotes: z.string().max(4000).optional().default(""),
  assignedVolunteerLabel: z.string().max(200).nullable().optional(),
  referralSource: z.string().max(500).nullable().optional(),
  clicks: z
    .object({
      doctor8RegisterAt: z.string().datetime().nullable().optional(),
      doctor8LoginAt: z.string().datetime().nullable().optional(),
      whatsappHelpAt: z.string().datetime().nullable().optional(),
    })
    .optional(),
  doctor8: z
    .object({
      registeredFlag: z.boolean().optional(),
      emailCheckedAt: z.string().datetime().nullable().optional(),
      emailStatus: z.string().max(64).nullable().optional(),
    })
    .optional(),
  lgpd: z
    .object({
      accepted: z.boolean().optional(),
      version: z.string().max(32).nullable().optional(),
      at: z.string().datetime().nullable().optional(),
    })
    .optional(),
  events: z.array(eventSchema).optional(),
});

export const acuraIntakePatchSchema = z
  .object({
    acuraStatus: z.string().min(1).max(64).optional(),
    triageNotes: z.string().max(4000).optional(),
    assignedVolunteerLabel: z.string().max(200).nullable().optional(),
    clicks: acuraIntakeUpsertSchema.shape.clicks.optional(),
    doctor8: acuraIntakeUpsertSchema.shape.doctor8.optional(),
    events: z.array(eventSchema).optional(),
  })
  .refine(
    (v) =>
      v.acuraStatus != null ||
      v.triageNotes != null ||
      v.assignedVolunteerLabel !== undefined ||
      v.clicks != null ||
      v.doctor8 != null ||
      (v.events != null && v.events.length > 0),
    { message: "empty_patch" },
  );

export type AcuraIntakeUpsertInput = z.infer<typeof acuraIntakeUpsertSchema>;
export type AcuraIntakePatchInput = z.infer<typeof acuraIntakePatchSchema>;

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

function enc(v: string | number | null | undefined): string | null {
  if (v == null || v === "") return null;
  return encrypt(String(v));
}

function parseAcuraStatus(raw: string): PartnerIntakeStatus {
  const mapped = ACURA_STATUS_FROM_API[raw];
  if (!mapped) throw new Error("invalid_acura_status");
  return mapped;
}

function parseEventType(raw: string): PartnerIntakeEventType | null {
  return EVENT_TYPE_FROM_API[raw] ?? null;
}

function parseOptionalDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapIntakeData(input: AcuraIntakeUpsertInput) {
  return {
    partner: "acura" as const,
    campaign: "sos_venezuela" as const,
    protocolo: input.protocolo.trim(),
    email: input.requester.email.trim(),
    emailNormalized: normalizeEmail(input.requester.email),
    requesterName: input.requester.name.trim(),
    phoneJson: input.requester.phone as Prisma.InputJsonValue,
    patientNameEnc: enc(input.patient.name),
    ageEnc: enc(input.patient.age ?? ""),
    relationship: input.patient.relationship.trim(),
    location: input.patient.location.trim(),
    careTypeEnc: enc(input.clinical.careType),
    priorityEnc: enc(input.clinical.priority),
    symptomsEnc: enc(input.clinical.symptoms),
    notesEnc: enc(input.clinical.notes ?? ""),
    acuraStatus: parseAcuraStatus(input.acuraStatus),
    triageNotes: input.triageNotes ?? "",
    assignedVolunteerLabel: input.assignedVolunteerLabel ?? null,
    referralSource: input.referralSource ?? null,
    clickedDoctor8RegisterAt: parseOptionalDate(input.clicks?.doctor8RegisterAt),
    clickedDoctor8LoginAt: parseOptionalDate(input.clicks?.doctor8LoginAt),
    clickedWhatsappHelpAt: parseOptionalDate(input.clicks?.whatsappHelpAt),
    doctor8RegisteredFlag: input.doctor8?.registeredFlag ?? false,
    doctor8EmailCheckedAt: parseOptionalDate(input.doctor8?.emailCheckedAt),
    doctor8EmailStatus: input.doctor8?.emailStatus ?? null,
    lgpdPrivacyAccepted: input.lgpd?.accepted ?? false,
    lgpdPrivacyVersion: input.lgpd?.version ?? null,
    lgpdPrivacyAt: parseOptionalDate(input.lgpd?.at),
    submittedAt: new Date(input.submittedAt),
  };
}

async function appendEvents(
  intakeId: string,
  events: AcuraIntakeUpsertInput["events"],
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (!events?.length) return;
  for (const ev of events) {
    const type = parseEventType(ev.type);
    if (!type) continue;
    if (ev.externalId) {
      const dup = await tx.partnerIntakeEvent.findUnique({
        where: {
          intakeId_externalId: { intakeId, externalId: ev.externalId },
        },
      });
      if (dup) continue;
    }
    await tx.partnerIntakeEvent.create({
      data: {
        intakeId,
        type,
        occurredAt: new Date(ev.occurredAt),
        payload: (ev.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        source: "acura",
        externalId: ev.externalId ?? null,
      },
    });
  }
}

export async function linkPartnerIntakesToPatient(
  userId: string,
  email: string,
): Promise<number> {
  const emailNormalized = normalizeEmail(email);
  const pending = await db.partnerIntake.findMany({
    where: { emailNormalized, patientUserId: null },
  });
  if (!pending.length) return 0;

  const now = new Date();
  await db.$transaction(async (tx) => {
    for (const intake of pending) {
      await tx.partnerIntake.update({
        where: { id: intake.id },
        data: { patientUserId: userId },
      });
      await tx.partnerIntakeEvent.create({
        data: {
          intakeId: intake.id,
          type: PartnerIntakeEventType.PATIENT_LINKED,
          occurredAt: now,
          payload: { userId },
          source: "doctor8",
          externalId: `linked-${userId}`,
        },
      });
    }

    const profile = await tx.patientProfile.findUnique({ where: { userId } });
    if (profile && profile.acquisitionChannel !== PatientAcquisitionChannel.ACURA_SOS_FORM) {
      await tx.patientProfile.update({
        where: { userId },
        data: {
          acquisitionChannel: PatientAcquisitionChannel.ACURA_SOS_FORM,
          acquisitionCampaign: profile.acquisitionCampaign ?? "sos_venezuela",
          acquisitionRecordedAt: profile.acquisitionRecordedAt ?? now,
        },
      });
    }
  });

  return pending.length;
}

export async function upsertAcuraPartnerIntake(input: AcuraIntakeUpsertInput) {
  const data = mapIntakeData(input);
  const emailNormalized = data.emailNormalized;

  const existingUser = await db.user.findFirst({
    where: { email: emailNormalized, role: UserRole.PATIENT, deletedAt: null },
    select: { id: true },
  });

  const intake = await db.$transaction(async (tx) => {
    const row = await tx.partnerIntake.upsert({
      where: { protocolo: data.protocolo },
      create: {
        ...data,
        patientUserId: existingUser?.id ?? null,
      },
      update: {
        email: data.email,
        emailNormalized: data.emailNormalized,
        requesterName: data.requesterName,
        phoneJson: data.phoneJson,
        patientNameEnc: data.patientNameEnc,
        ageEnc: data.ageEnc,
        relationship: data.relationship,
        location: data.location,
        careTypeEnc: data.careTypeEnc,
        priorityEnc: data.priorityEnc,
        symptomsEnc: data.symptomsEnc,
        notesEnc: data.notesEnc,
        acuraStatus: data.acuraStatus,
        triageNotes: data.triageNotes,
        assignedVolunteerLabel: data.assignedVolunteerLabel,
        referralSource: data.referralSource,
        clickedDoctor8RegisterAt: data.clickedDoctor8RegisterAt,
        clickedDoctor8LoginAt: data.clickedDoctor8LoginAt,
        clickedWhatsappHelpAt: data.clickedWhatsappHelpAt,
        doctor8RegisteredFlag: data.doctor8RegisteredFlag,
        doctor8EmailCheckedAt: data.doctor8EmailCheckedAt,
        doctor8EmailStatus: data.doctor8EmailStatus,
        lgpdPrivacyAccepted: data.lgpdPrivacyAccepted,
        lgpdPrivacyVersion: data.lgpdPrivacyVersion,
        lgpdPrivacyAt: data.lgpdPrivacyAt,
        submittedAt: data.submittedAt,
        ...(existingUser ? { patientUserId: existingUser.id } : {}),
      },
    });

    await appendEvents(row.id, input.events, tx);
    return row;
  });

  if (existingUser) {
    await linkPartnerIntakesToPatient(existingUser.id, emailNormalized);
  }

  const refreshed = await db.partnerIntake.findUnique({
    where: { protocolo: intake.protocolo },
    select: { patientUserId: true },
  });

  return {
    protocolo: intake.protocolo,
    patientLinked: Boolean(refreshed?.patientUserId),
    patientUserId: refreshed?.patientUserId ?? null,
  };
}

export async function patchAcuraPartnerIntake(
  protocolo: string,
  input: AcuraIntakePatchInput,
) {
  const existing = await db.partnerIntake.findUnique({ where: { protocolo } });
  if (!existing) throw new Error("not_found");

  await db.$transaction(async (tx) => {
    const update: Prisma.PartnerIntakeUpdateInput = {};
    if (input.acuraStatus != null) {
      update.acuraStatus = parseAcuraStatus(input.acuraStatus);
    }
    if (input.triageNotes != null) update.triageNotes = input.triageNotes;
    if (input.assignedVolunteerLabel !== undefined) {
      update.assignedVolunteerLabel = input.assignedVolunteerLabel;
    }
    if (input.clicks?.doctor8RegisterAt !== undefined) {
      update.clickedDoctor8RegisterAt = parseOptionalDate(input.clicks.doctor8RegisterAt);
    }
    if (input.clicks?.doctor8LoginAt !== undefined) {
      update.clickedDoctor8LoginAt = parseOptionalDate(input.clicks.doctor8LoginAt);
    }
    if (input.clicks?.whatsappHelpAt !== undefined) {
      update.clickedWhatsappHelpAt = parseOptionalDate(input.clicks.whatsappHelpAt);
    }
    if (input.doctor8?.registeredFlag != null) {
      update.doctor8RegisteredFlag = input.doctor8.registeredFlag;
    }
    if (input.doctor8?.emailCheckedAt !== undefined) {
      update.doctor8EmailCheckedAt = parseOptionalDate(input.doctor8.emailCheckedAt);
    }
    if (input.doctor8?.emailStatus !== undefined) {
      update.doctor8EmailStatus = input.doctor8.emailStatus;
    }

    await tx.partnerIntake.update({ where: { protocolo }, data: update });
    await appendEvents(existing.id, input.events, tx);
  });

  const row = await db.partnerIntake.findUnique({
    where: { protocolo },
    select: { patientUserId: true, emailNormalized: true },
  });

  if (row && !row.patientUserId) {
    const user = await db.user.findFirst({
      where: { email: row.emailNormalized, role: UserRole.PATIENT, deletedAt: null },
      select: { id: true },
    });
    if (user) await linkPartnerIntakesToPatient(user.id, row.emailNormalized);
  }

  const refreshed = await db.partnerIntake.findUnique({
    where: { protocolo },
    select: { patientUserId: true },
  });

  return {
    protocolo,
    patientLinked: Boolean(refreshed?.patientUserId),
    patientUserId: refreshed?.patientUserId ?? null,
  };
}

export type AcuraIntakeAdminDto = {
  protocolo: string;
  acuraStatus: PartnerIntakeStatus;
  submittedAt: string;
  requesterName: string;
  email: string;
  phoneDisplay: string | null;
  patientName: string;
  age: string | null;
  relationship: string;
  location: string;
  careType: string;
  priority: string;
  symptoms: string;
  notes: string;
  triageNotes: string | null;
  assignedVolunteerLabel: string | null;
  referralSource: string | null;
  clicks: {
    doctor8RegisterAt: string | null;
    doctor8LoginAt: string | null;
    whatsappHelpAt: string | null;
  };
  doctor8RegisteredFlag: boolean;
  doctor8EmailCheckedAt: string | null;
  doctor8EmailStatus: string | null;
};

export function partnerIntakeToAdminDto(intake: PartnerIntake): AcuraIntakeAdminDto {
  const phone = intake.phoneJson as { display?: string } | null;
  return {
    protocolo: intake.protocolo,
    acuraStatus: intake.acuraStatus,
    submittedAt: intake.submittedAt.toISOString(),
    requesterName: intake.requesterName,
    email: intake.email,
    phoneDisplay: phone?.display ?? null,
    patientName: safeDecrypt(intake.patientNameEnc),
    age: safeDecrypt(intake.ageEnc) || null,
    relationship: intake.relationship,
    location: intake.location,
    careType: safeDecrypt(intake.careTypeEnc),
    priority: safeDecrypt(intake.priorityEnc),
    symptoms: safeDecrypt(intake.symptomsEnc),
    notes: safeDecrypt(intake.notesEnc),
    triageNotes: intake.triageNotes,
    assignedVolunteerLabel: intake.assignedVolunteerLabel,
    referralSource: intake.referralSource,
    clicks: {
      doctor8RegisterAt: intake.clickedDoctor8RegisterAt?.toISOString() ?? null,
      doctor8LoginAt: intake.clickedDoctor8LoginAt?.toISOString() ?? null,
      whatsappHelpAt: intake.clickedWhatsappHelpAt?.toISOString() ?? null,
    },
    doctor8RegisteredFlag: intake.doctor8RegisteredFlag,
    doctor8EmailCheckedAt: intake.doctor8EmailCheckedAt?.toISOString() ?? null,
    doctor8EmailStatus: intake.doctor8EmailStatus,
  };
}

export async function getLatestPartnerIntakeForUser(patientUserId: string) {
  return db.partnerIntake.findFirst({
    where: { patientUserId },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getPartnerIntakeEvents(intakeId: string) {
  return db.partnerIntakeEvent.findMany({
    where: { intakeId },
    orderBy: { occurredAt: "desc" },
  });
}

export const ACURA_STATUS_LABELS: Record<PartnerIntakeStatus, string> = {
  NOVA: "Nova",
  EM_TRIAGEM: "Em triagem",
  ORIENTADO_DOCTOR8: "Orientado Doctor8",
  NA_FILA: "Na fila",
  EM_CONSULTA: "Em consulta",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function isAcuraTriageComplete(status: PartnerIntakeStatus): boolean {
  return (
    status === PartnerIntakeStatus.ORIENTADO_DOCTOR8 ||
    status === PartnerIntakeStatus.NA_FILA ||
    status === PartnerIntakeStatus.EM_CONSULTA ||
    status === PartnerIntakeStatus.CONCLUIDO
  );
}

export function partnerIntakeTimelineEvents(
  intake: PartnerIntake,
  events: { type: PartnerIntakeEventType; occurredAt: Date; payload: unknown }[],
) {
  const out: {
    id: string;
    type: string;
    at: string;
    title: string;
    detail: string | null;
  }[] = [];

  out.push({
    id: `acura-form-${intake.id}`,
    type: "acura_form_submitted",
    at: intake.submittedAt.toISOString(),
    title: "Solicitud SOS recebida (ACURA)",
    detail: intake.protocolo,
  });

  for (const ev of events) {
    if (ev.type === PartnerIntakeEventType.FORM_SUBMITTED) continue;
    if (ev.type === PartnerIntakeEventType.STATUS_CHANGED) {
      const p = ev.payload as { oldStatus?: string; newStatus?: string; note?: string } | null;
      out.push({
        id: `acura-status-${ev.occurredAt.toISOString()}`,
        type: "acura_status_changed",
        at: ev.occurredAt.toISOString(),
        title: `Triagem ACURA: ${p?.oldStatus ?? "?"} → ${p?.newStatus ?? "?"}`,
        detail: p?.note ?? null,
      });
      continue;
    }
    if (ev.type === PartnerIntakeEventType.CLICKED_DOCTOR8_REGISTER) {
      out.push({
        id: `acura-click-reg-${intake.id}`,
        type: "acura_clicked_doctor8_register",
        at: ev.occurredAt.toISOString(),
        title: "Clicou cadastro Doctor8 (ACURA)",
        detail: null,
      });
      continue;
    }
    if (ev.type === PartnerIntakeEventType.CLICKED_DOCTOR8_LOGIN) {
      out.push({
        id: `acura-click-login-${intake.id}`,
        type: "acura_clicked_doctor8_login",
        at: ev.occurredAt.toISOString(),
        title: "Clicou login Doctor8 (ACURA)",
        detail: null,
      });
      continue;
    }
    if (ev.type === PartnerIntakeEventType.CLICKED_WHATSAPP_HELP) {
      out.push({
        id: `acura-click-wa-${intake.id}`,
        type: "acura_clicked_whatsapp",
        at: ev.occurredAt.toISOString(),
        title: "Clicou WhatsApp ajuda (ACURA)",
        detail: null,
      });
      continue;
    }
    if (ev.type === PartnerIntakeEventType.DOCTOR8_EMAIL_VERIFIED) {
      out.push({
        id: `acura-d8-email-${intake.id}`,
        type: "acura_doctor8_email_verified",
        at: ev.occurredAt.toISOString(),
        title: "E-mail verificado no Doctor8 (ACURA)",
        detail: null,
      });
      continue;
    }
    if (ev.type === PartnerIntakeEventType.PATIENT_LINKED) {
      out.push({
        id: `acura-linked-${intake.id}`,
        type: "acura_patient_linked",
        at: ev.occurredAt.toISOString(),
        title: "Conta Doctor8 vinculada ao protocolo ACURA",
        detail: null,
      });
    }
  }

  return out;
}
