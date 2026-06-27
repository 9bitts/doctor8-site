import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  anamnesePatchSchema,
  type IdentificationData,
  type BasicNeedsData,
  type SpecialtyData,
} from "@/lib/humanitarian/anamnese";
import {
  computeTriagePriority,
  humanitarianTriageSchema,
  isTriageValid,
  triageExpiresAt,
  type HumanitarianTriageData,
} from "@/lib/humanitarian/triage";
import type { HumanitarianIntakeStatus, HumanitarianPriority } from "@prisma/client";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export interface AnamneseDto {
  identification: IdentificationData | null;
  serviceTypes: string[];
  specialty: SpecialtyData | null;
  basicNeeds: BasicNeedsData | null;
  additionalNotes: string | null;
  consentAt: string | null;
}

export interface IntakePrefillDto {
  fullName: string;
  ageOrDob: string;
  sex: string;
  phone: string;
  email: string;
  state: string;
  municipality: string;
}

export interface IntakeStatusDto {
  id: string | null;
  status: HumanitarianIntakeStatus | null;
  triageValid: boolean;
  triageCompletedAt: string | null;
  triageExpiresAt: string | null;
  computedPriority: HumanitarianPriority | null;
  forceMedicalPool: boolean;
  triageFlags: string[];
  anamneseComplete: boolean;
  anamneseStarted: boolean;
  anamnese?: AnamneseDto;
  prefill?: IntakePrefillDto;
}

function mapAnamnese(intake: Record<string, unknown>): AnamneseDto {
  return {
    identification: (intake.identificationData as IdentificationData) ?? null,
    serviceTypes: (intake.serviceTypes as string[]) ?? [],
    specialty: (intake.specialtyData as SpecialtyData) ?? null,
    basicNeeds: (intake.basicNeedsData as BasicNeedsData) ?? null,
    additionalNotes: (intake.additionalNotes as string | null) ?? null,
    consentAt: intake.consentAt instanceof Date ? intake.consentAt.toISOString() : null,
  };
}

export async function getIntakePrefill(patientUserId: string): Promise<IntakePrefillDto> {
  const [user, profile] = await Promise.all([
    db.user.findUnique({ where: { id: patientUserId }, select: { email: true } }),
    db.patientProfile.findUnique({
      where: { userId: patientUserId },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phone: true,
        sex: true,
        state: true,
        city: true,
      },
    }),
  ]);

  const fullName = profile
    ? `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim()
    : "";

  return {
    fullName,
    ageOrDob: profile?.dateOfBirth ? safeDecrypt(profile.dateOfBirth) : "",
    sex: profile?.sex || "",
    phone: profile?.phone ? safeDecrypt(profile.phone) : "",
    email: user?.email || "",
    state: profile?.state || "",
    municipality: profile?.city || "",
  };
}

export async function getPatientIntakeStatus(
  campaignId: string,
  patientUserId: string,
  opts?: { includeAnamnese?: boolean },
): Promise<IntakeStatusDto> {
  const intake = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: { campaignId, patientUserId },
    },
  });

  if (!intake) {
    return {
      id: null,
      status: null,
      triageValid: false,
      triageCompletedAt: null,
      triageExpiresAt: null,
      computedPriority: null,
      forceMedicalPool: false,
      triageFlags: [],
      anamneseComplete: false,
      anamneseStarted: false,
    };
  }

  const valid = isTriageValid(intake.triageCompletedAt);
  const anamneseComplete = intake.status === "COMPLETE";

  return {
    id: intake.id,
    status: intake.status,
    triageValid: valid,
    triageCompletedAt: intake.triageCompletedAt?.toISOString() ?? null,
    triageExpiresAt: intake.triageCompletedAt
      ? triageExpiresAt(intake.triageCompletedAt).toISOString()
      : null,
    computedPriority: valid ? intake.computedPriority : null,
    forceMedicalPool: valid ? intake.forceMedicalPool : false,
    triageFlags: valid ? intake.triageFlags : [],
    anamneseComplete,
    anamneseStarted: intake.status !== "TRIAGE_ONLY",
    ...(opts?.includeAnamnese
      ? {
          anamnese: mapAnamnese(intake as unknown as Record<string, unknown>),
          prefill: await getIntakePrefill(patientUserId),
        }
      : {}),
  };
}

export async function getPatientIntakeStatusBySlug(
  campaignSlug: string,
  patientUserId: string,
  opts?: { includeAnamnese?: boolean },
): Promise<IntakeStatusDto & { campaignId: string | null }> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) {
    return {
      campaignId: null,
      id: null,
      status: null,
      triageValid: false,
      triageCompletedAt: null,
      triageExpiresAt: null,
      computedPriority: null,
      forceMedicalPool: false,
      triageFlags: [],
      anamneseComplete: false,
      anamneseStarted: false,
    };
  }

  const status = await getPatientIntakeStatus(campaign.id, patientUserId, opts);
  return { ...status, campaignId: campaign.id };
}

export async function saveHumanitarianTriage(params: {
  campaignId: string;
  patientUserId: string;
  triage: HumanitarianTriageData;
}) {
  const parsed = humanitarianTriageSchema.parse(params.triage);
  const result = computeTriagePriority(parsed);
  const now = new Date();

  const existing = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: {
        campaignId: params.campaignId,
        patientUserId: params.patientUserId,
      },
    },
    select: { status: true },
  });

  const preserveStatus =
    existing?.status === "PARTIAL" || existing?.status === "COMPLETE";

  const intake = await db.humanitarianIntake.upsert({
    where: {
      campaignId_patientUserId: {
        campaignId: params.campaignId,
        patientUserId: params.patientUserId,
      },
    },
    create: {
      campaignId: params.campaignId,
      patientUserId: params.patientUserId,
      triageData: parsed,
      triageCompletedAt: now,
      computedPriority: result.priority,
      triageFlags: result.flags,
      forceMedicalPool: result.forceMedicalPool,
      status: "TRIAGE_ONLY",
    },
    update: {
      triageData: parsed,
      triageCompletedAt: now,
      computedPriority: result.priority,
      triageFlags: result.flags,
      forceMedicalPool: result.forceMedicalPool,
      ...(preserveStatus ? {} : { status: "TRIAGE_ONLY" }),
    },
  });

  return {
    intake,
    priority: result.priority,
    forceMedicalPool: result.forceMedicalPool,
    flags: result.flags,
    triageExpiresAt: triageExpiresAt(now),
  };
}

export async function saveAnamneseSection(params: {
  campaignId: string;
  patientUserId: string;
  section: "identification" | "services" | "specialty" | "basicNeeds" | "consent";
  data: unknown;
}) {
  const parsed = anamnesePatchSchema.parse({
    section: params.section,
    data: params.data,
  });

  const existing = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: {
        campaignId: params.campaignId,
        patientUserId: params.patientUserId,
      },
    },
  });

  if (!existing?.triageCompletedAt || !isTriageValid(existing.triageCompletedAt)) {
    throw new Error("TRIAGE_REQUIRED");
  }

  const now = new Date();
  let updateData: Record<string, unknown> = { updatedAt: now };

  switch (parsed.section) {
    case "identification":
      updateData = { ...updateData, identificationData: parsed.data, status: "PARTIAL" };
      break;
    case "services":
      updateData = {
        ...updateData,
        serviceTypes: parsed.data.serviceTypes,
        status: "PARTIAL",
      };
      break;
    case "specialty":
      updateData = { ...updateData, specialtyData: parsed.data, status: "PARTIAL" };
      break;
    case "basicNeeds":
      updateData = { ...updateData, basicNeedsData: parsed.data, status: "PARTIAL" };
      break;
    case "consent":
      updateData = {
        ...updateData,
        additionalNotes: parsed.data.additionalNotes || null,
        consentAt: now,
        status: "COMPLETE",
      };
      break;
  }

  const intake = await db.humanitarianIntake.update({
    where: { id: existing.id },
    data: updateData,
  });

  return {
    intake,
    anamnese: mapAnamnese(intake as unknown as Record<string, unknown>),
    anamneseComplete: intake.status === "COMPLETE",
  };
}

export async function requireValidIntake(
  campaignId: string,
  patientUserId: string,
) {
  const intake = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: { campaignId, patientUserId },
    },
  });

  if (!intake?.triageCompletedAt || !isTriageValid(intake.triageCompletedAt)) {
    return null;
  }

  return intake;
}

export interface AdminIntakeRow {
  id: string;
  patientUserId: string;
  patientLabel: string;
  status: HumanitarianIntakeStatus;
  computedPriority: HumanitarianPriority | null;
  triageFlags: string[];
  forceMedicalPool: boolean;
  triageCompletedAt: string | null;
  consentAt: string | null;
  serviceTypes: string[];
  triageData: unknown;
  identificationData: unknown;
  specialtyData: unknown;
  basicNeedsData: unknown;
  additionalNotes: string | null;
  updatedAt: string;
}

export async function listCampaignIntakes(campaignSlug: string): Promise<AdminIntakeRow[]> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) return [];

  const intakes = await db.humanitarianIntake.findMany({
    where: { campaignId: campaign.id },
    orderBy: { updatedAt: "desc" },
    include: {
      patientUser: {
        select: {
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const priorityRank: Record<string, number> = { CRISIS: 3, URGENT: 2, ROUTINE: 1 };

  return intakes
    .map((i) => {
    const p = i.patientUser.patientProfile;
    const label = p
      ? `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName).charAt(0)}.`.trim()
      : "Paciente";

    return {
      id: i.id,
      patientUserId: i.patientUserId,
      patientLabel: label,
      status: i.status,
      computedPriority: i.computedPriority,
      triageFlags: i.triageFlags,
      forceMedicalPool: i.forceMedicalPool,
      triageCompletedAt: i.triageCompletedAt?.toISOString() ?? null,
      consentAt: (i as { consentAt?: Date | null }).consentAt?.toISOString() ?? null,
      serviceTypes: (i.serviceTypes as string[]) ?? [],
      triageData: i.triageData,
      identificationData: (i as { identificationData?: unknown }).identificationData ?? null,
      specialtyData: (i as { specialtyData?: unknown }).specialtyData ?? null,
      basicNeedsData: (i as { basicNeedsData?: unknown }).basicNeedsData ?? null,
      additionalNotes: (i as { additionalNotes?: string | null }).additionalNotes ?? null,
      updatedAt: i.updatedAt.toISOString(),
    };
  })
    .sort((a, b) => {
      const pa = priorityRank[a.computedPriority || "ROUTINE"] || 0;
      const pb = priorityRank[b.computedPriority || "ROUTINE"] || 0;
      if (pb !== pa) return pb - pa;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}
