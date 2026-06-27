import { db } from "@/lib/db";
import {
  computeTriagePriority,
  humanitarianTriageSchema,
  isTriageValid,
  triageExpiresAt,
  type HumanitarianTriageData,
} from "@/lib/humanitarian/triage";
import type { HumanitarianIntakeStatus, HumanitarianPriority } from "@prisma/client";

export interface IntakeStatusDto {
  id: string | null;
  status: HumanitarianIntakeStatus | null;
  triageValid: boolean;
  triageCompletedAt: string | null;
  triageExpiresAt: string | null;
  computedPriority: HumanitarianPriority | null;
  forceMedicalPool: boolean;
  triageFlags: string[];
}

export async function getPatientIntakeStatus(
  campaignId: string,
  patientUserId: string,
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
    };
  }

  const valid = isTriageValid(intake.triageCompletedAt);

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
  };
}

export async function getPatientIntakeStatusBySlug(
  campaignSlug: string,
  patientUserId: string,
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
    };
  }

  const status = await getPatientIntakeStatus(campaign.id, patientUserId);
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
      status: "TRIAGE_ONLY",
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
