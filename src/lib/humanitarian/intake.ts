import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  decryptHumanitarianIntakeFields,
  decryptIdentificationData,
  encryptHumanitarianIntakePatch,
  encryptTriageData,
} from "@/lib/humanitarian/intake-encryption";
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
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { resolvePatientHumanitarianPhone } from "@/lib/humanitarian/phone";
import { decryptTriageData } from "@/lib/humanitarian/intake-encryption";
import {
  buildAnamneseHintsFromTriage,
  type AnamneseHintsFromTriage,
} from "@/lib/humanitarian/triage-anamnese-prefill";

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
  tcleAccepted: boolean;
  phoneReady: boolean;
  anamnese?: AnamneseDto;
  prefill?: IntakePrefillDto;
  anamneseHints?: AnamneseHintsFromTriage;
}

function mapAnamnese(intake: Record<string, unknown>): AnamneseDto {
  const decrypted = decryptHumanitarianIntakeFields({
    identificationData: intake.identificationData,
    specialtyData: intake.specialtyData,
    additionalNotes:
      typeof intake.additionalNotes === "string" ? intake.additionalNotes : null,
  });
  return {
    identification: decrypted.identificationData ?? null,
    serviceTypes: (intake.serviceTypes as string[]) ?? [],
    specialty: decrypted.specialtyData ?? null,
    basicNeeds: (intake.basicNeedsData as BasicNeedsData) ?? null,
    additionalNotes: decrypted.additionalNotes ?? null,
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
      tcleAccepted: false,
      phoneReady: false,
    };
  }

  const valid = isTriageValid(intake.triageCompletedAt);
  const anamneseComplete = intake.status === "COMPLETE";
  const tcleAccepted = await hasTelemedicineTcle(patientUserId);
  const phoneReady = !!(await resolvePatientHumanitarianPhone(patientUserId));

  let anamneseBlock: Pick<IntakeStatusDto, "anamnese" | "prefill" | "anamneseHints"> = {};
  if (opts?.includeAnamnese) {
    const anamnese = mapAnamnese(intake as unknown as Record<string, unknown>);
    let anamneseHints: AnamneseHintsFromTriage | undefined;
    if (valid && intake.triageData) {
      try {
        const triage = decryptTriageData(
          intake.triageData as Parameters<typeof decryptTriageData>[0],
        );
        if (triage) {
          anamneseHints = buildAnamneseHintsFromTriage(triage, intake.forceMedicalPool);
        }
      } catch {
        /* ignore corrupt triage blob */
      }
    }
    anamneseBlock = {
      anamnese,
      prefill: await getIntakePrefill(patientUserId),
      ...(anamneseHints ? { anamneseHints } : {}),
    };
  }

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
    tcleAccepted,
    phoneReady,
    ...anamneseBlock,
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
      tcleAccepted: false,
      phoneReady: false,
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
  const encryptedTriage = encryptTriageData(parsed);
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
      triageData: encryptedTriage,
      triageCompletedAt: now,
      computedPriority: result.priority,
      triageFlags: result.flags,
      forceMedicalPool: result.forceMedicalPool,
      status: "TRIAGE_ONLY",
    },
    update: {
      triageData: encryptedTriage,
      triageCompletedAt: now,
      computedPriority: result.priority,
      triageFlags: result.flags,
      forceMedicalPool: result.forceMedicalPool,
      ...(preserveStatus ? {} : { status: "TRIAGE_ONLY" }),
    },
  });

  afterTriageSaved(params.campaignId, params.patientUserId, result.priority, result.flags).catch(
    () => {},
  );

  return {
    intake,
    priority: result.priority,
    forceMedicalPool: result.forceMedicalPool,
    flags: result.flags,
    triageExpiresAt: triageExpiresAt(now),
  };
}

async function patientLabelForUser(patientUserId: string): Promise<string> {
  const profile = await db.patientProfile.findUnique({
    where: { userId: patientUserId },
    select: { firstName: true, lastName: true },
  });
  if (!profile) return "Paciente";
  return `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim() || "Paciente";
}

async function afterTriageSaved(
  campaignId: string,
  patientUserId: string,
  priority: HumanitarianPriority,
  flags: string[],
) {
  if (priority !== "CRISIS" && priority !== "URGENT") return;
  const [campaign, label] = await Promise.all([
    db.humanitarianCampaign.findUnique({ where: { id: campaignId }, select: { name: true } }),
    patientLabelForUser(patientUserId),
  ]);
  if (!campaign) return;
  const { notifyCoordinationUrgentTriage } = await import("@/lib/humanitarian/coordination-email");
  await notifyCoordinationUrgentTriage({
    patientLabel: label,
    campaignName: campaign.name,
    priority,
    flags,
  });
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
      if (
        parsed.data.phoneDdi &&
        parsed.data.phoneDdd &&
        parsed.data.phoneNumber
      ) {
        try {
          const { savePatientHumanitarianPhone } = await import("@/lib/humanitarian/phone");
          await savePatientHumanitarianPhone(
            params.patientUserId,
            {
              ddi: parsed.data.phoneDdi,
              ddd: parsed.data.phoneDdd,
              number: parsed.data.phoneNumber,
            },
            params.campaignId,
          );
        } catch {
          /* invalid phone parts — intake still saved */
        }
      }
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
        ...(parsed.data.shareWithAngelVolunteer
          ? {
              angelContactConsentAt: now,
              angelContactConsentVersion: "1.0",
            }
          : {}),
      };
      break;
  }

  const intake = await db.humanitarianIntake.update({
    where: { id: existing.id },
    data: encryptHumanitarianIntakePatch(updateData),
  });

  if (parsed.section === "consent" && intake.status === "COMPLETE") {
    const [campaign, label] = await Promise.all([
      db.humanitarianCampaign.findUnique({
        where: { id: params.campaignId },
        select: { name: true },
      }),
      patientLabelForUser(params.patientUserId),
    ]);
    if (campaign) {
      const { notifyCoordinationIntakeComplete } = await import(
        "@/lib/humanitarian/coordination-email"
      );
      notifyCoordinationIntakeComplete({
        patientLabel: label,
        campaignName: campaign.name,
        intake,
      }).catch(() => {});
    }
  } else if (existing.status === "TRIAGE_ONLY" && intake.status === "PARTIAL") {
    const [campaign, label] = await Promise.all([
      db.humanitarianCampaign.findUnique({
        where: { id: params.campaignId },
        select: { name: true },
      }),
      patientLabelForUser(params.patientUserId),
    ]);
    if (campaign) {
      const { notifyCoordinationIntakePartial } = await import(
        "@/lib/humanitarian/coordination-email"
      );
      notifyCoordinationIntakePartial({
        patientLabel: label,
        campaignName: campaign.name,
        intake,
        section: parsed.section,
      }).catch(() => {});
    }
  }

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
  telemedicineTcleAt: string | null;
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

    const phi = decryptHumanitarianIntakeFields({
      triageData: i.triageData,
      identificationData: (i as { identificationData?: unknown }).identificationData ?? null,
      specialtyData: (i as { specialtyData?: unknown }).specialtyData ?? null,
      additionalNotes: (i as { additionalNotes?: string | null }).additionalNotes ?? null,
    });

    return {
      id: i.id,
      patientUserId: i.patientUserId,
      patientLabel: label,
      status: i.status,
      computedPriority: i.computedPriority,
      triageFlags: i.triageFlags,
      forceMedicalPool: i.forceMedicalPool,
      triageCompletedAt: i.triageCompletedAt?.toISOString() ?? null,
      consentAt: i.consentAt?.toISOString() ?? null,
      telemedicineTcleAt: i.telemedicineTcleAt?.toISOString() ?? null,
      serviceTypes: (i.serviceTypes as string[]) ?? [],
      triageData: phi.triageData ?? null,
      identificationData: phi.identificationData ?? null,
      specialtyData: phi.specialtyData ?? null,
      basicNeedsData: (i as { basicNeedsData?: unknown }).basicNeedsData ?? null,
      additionalNotes: phi.additionalNotes ?? null,
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
