import type {
  EmployerCareReferralSource,
  EmployerCareReferralTarget,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  parsePcmsoScreening,
  type PcmsoScreeningResult,
} from "@/lib/employer-pcmso-screening";

export function isMentalCid(cid: string | null | undefined): boolean {
  if (!cid) return false;
  const normalized = cid.trim().toUpperCase().replace(/\./g, "");
  return /^F\d{2}/.test(normalized);
}

export async function createCareReferral(input: {
  employerCompanyId: string;
  workforceMemberId?: string | null;
  source: EmployerCareReferralSource;
  sourceRefId?: string | null;
  target: EmployerCareReferralTarget;
  reason: string;
  notes?: string | null;
}): Promise<{ id: string; created: boolean }> {
  // Avoid duplicate open referrals for same source+target+member
  const existing = await db.employerCareReferral.findFirst({
    where: {
      employerCompanyId: input.employerCompanyId,
      workforceMemberId: input.workforceMemberId ?? null,
      source: input.source,
      sourceRefId: input.sourceRefId ?? null,
      target: input.target,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const row = await db.employerCareReferral.create({
    data: {
      employerCompanyId: input.employerCompanyId,
      workforceMemberId: input.workforceMemberId ?? null,
      source: input.source,
      sourceRefId: input.sourceRefId ?? null,
      target: input.target,
      reason: input.reason,
      notes: input.notes ?? null,
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
}

/** Create EAP / physician referrals from PCMSO screening bands. */
export async function referralsFromScreening(input: {
  employerCompanyId: string;
  workforceMemberId: string;
  examId: string;
  screening: PcmsoScreeningResult | Prisma.JsonValue | null | undefined;
}): Promise<number> {
  const parsed =
    input.screening && typeof input.screening === "object" && "band" in (input.screening as object)
      ? (input.screening as PcmsoScreeningResult)
      : parsePcmsoScreening(input.screening);
  if (!parsed) return 0;

  let created = 0;
  const painHigh = (parsed.answers?.q19 ?? 0) >= 2;

  if (parsed.band === "MODERATE" || parsed.band === "HIGH") {
    const r = await createCareReferral({
      employerCompanyId: input.employerCompanyId,
      workforceMemberId: input.workforceMemberId,
      source: "SCREENING",
      sourceRefId: input.examId,
      target: "EAP",
      reason: `Triagem PCMSO ${parsed.bandLabel} (score ${parsed.totalScore}). ${parsed.suggestedConduct}`,
    });
    if (r.created) created += 1;
  }

  if (parsed.band === "HIGH") {
    const r = await createCareReferral({
      employerCompanyId: input.employerCompanyId,
      workforceMemberId: input.workforceMemberId,
      source: "SCREENING",
      sourceRefId: input.examId,
      target: "PHYSICIAN",
      reason: `Alto risco psicossocial na triagem PCMSO — avaliação clínica aprofundada recomendada.`,
    });
    if (r.created) created += 1;
  }

  if (painHigh) {
    const r = await createCareReferral({
      employerCompanyId: input.employerCompanyId,
      workforceMemberId: input.workforceMemberId,
      source: "PAIN_COMPLAINT",
      sourceRefId: input.examId,
      target: "ERGONOMIST",
      reason:
        "Queixa de sintomas físicos relacionados ao estresse/dor no questionário PCMSO — avaliar ergonomia / AET se necessário.",
    });
    if (r.created) created += 1;
  }

  return created;
}

export async function referralFromCidFCertificate(input: {
  employerCompanyId: string;
  workforceMemberId: string;
  certificateId: string;
  cidCode: string | null | undefined;
  workRelatedMental: boolean;
}): Promise<boolean> {
  if (!input.workRelatedMental && !isMentalCid(input.cidCode)) return false;
  const r = await createCareReferral({
    employerCompanyId: input.employerCompanyId,
    workforceMemberId: input.workforceMemberId,
    source: "CID_F",
    sourceRefId: input.certificateId,
    target: "EAP",
    reason: `Atestado com CID mental${input.cidCode ? ` (${input.cidCode})` : ""} relacionado ao trabalho — acionar AEP/psicólogo (EAP).`,
  });
  return r.created;
}

export async function referralFromAetFlag(input: {
  employerCompanyId: string;
  aepRecordId: string;
  reason?: string;
}): Promise<boolean> {
  const r = await createCareReferral({
    employerCompanyId: input.employerCompanyId,
    source: "AET_FLAG",
    sourceRefId: input.aepRecordId,
    target: "AET",
    reason:
      input.reason ??
      "Screening ergonômico recomenda AET aprofundada (complexidade ou exigência de fiscalização).",
  });
  return r.created;
}
