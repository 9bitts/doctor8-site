import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { buildIntakeSummary } from "@/lib/humanitarian/intake-summary";
import { decryptIdentificationData } from "@/lib/humanitarian/intake-encryption";
import type { Lang } from "@/lib/i18n/translations";
import type { IdentificationData } from "@/lib/humanitarian/anamnese";
import type { AngelApprovalStatus } from "@prisma/client";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export type AngelAccessState =
  | { ok: false; reason: "NOT_ANGEL" | "NO_PROFILE" | "EMAIL_UNVERIFIED" | "PENDING" | "REJECTED" | "NOT_ENROLLED" }
  | { ok: true; profile: { id: string; firstName: string; lastName: string; approvalStatus: AngelApprovalStatus }; campaignId: string };

export async function resolveAngelAccess(userId: string, campaignSlug: string): Promise<AngelAccessState> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, emailVerified: true, angelProfile: true },
  });

  if (!user || user.role !== "ANGEL") return { ok: false, reason: "NOT_ANGEL" };
  if (!user.angelProfile) return { ok: false, reason: "NO_PROFILE" };
  if (!user.emailVerified) return { ok: false, reason: "EMAIL_UNVERIFIED" };
  if (user.angelProfile.approvalStatus === "PENDING") return { ok: false, reason: "PENDING" };
  if (user.angelProfile.approvalStatus === "REJECTED") return { ok: false, reason: "REJECTED" };

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, active: true },
  });
  if (!campaign?.active) return { ok: false, reason: "NOT_ENROLLED" };

  const enrollment = await db.humanitarianAngel.findUnique({
    where: {
      campaignId_userId: { campaignId: campaign.id, userId },
    },
  });
  if (!enrollment?.active) return { ok: false, reason: "NOT_ENROLLED" };

  return {
    ok: true,
    profile: {
      id: user.angelProfile.id,
      firstName: user.angelProfile.firstName,
      lastName: user.angelProfile.lastName,
      approvalStatus: user.angelProfile.approvalStatus,
    },
    campaignId: campaign.id,
  };
}

export async function listAngelFollowUpPatients(campaignId: string, lang: Lang) {
  const entries = await db.humanitarianQueueEntry.findMany({
    where: {
      campaignId,
      status: "DONE",
      intake: {
        angelContactConsentAt: { not: null },
      },
    },
    orderBy: [{ priority: "desc" }, { endedAt: "desc" }],
    include: {
      pool: { select: { slug: true, labelPt: true, labelEn: true, labelEs: true } },
      intake: true,
      patientUser: {
        select: {
          id: true,
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
      angelFollowUps: {
        orderBy: { contactedAt: "desc" },
        take: 1,
        select: { contactedAt: true, outcome: true },
      },
    },
  });

  const byPatient = new Map<string, typeof entries[0]>();
  for (const e of entries) {
    if (!byPatient.has(e.patientUserId)) byPatient.set(e.patientUserId, e);
  }

  return Array.from(byPatient.values()).map((entry) => {
    const pp = entry.patientUser.patientProfile;
    const idData = decryptIdentificationData(
      (entry.intake?.identificationData ?? null) as IdentificationData | null,
    ) ?? ({} as IdentificationData);
    const phone = idData.phone || "";
    const lastFollowUp = entry.angelFollowUps[0] ?? null;

    return {
      patientUserId: entry.patientUserId,
      patientName: pp
        ? `${safeDecrypt(pp.firstName)} ${safeDecrypt(pp.lastName)}`.trim()
        : idData.fullName || "Paciente",
      phone,
      priority: entry.priority,
      poolSlug: entry.pool.slug,
      poolLabel: lang === "pt" ? entry.pool.labelPt : lang === "en" ? entry.pool.labelEn : entry.pool.labelEs,
      consultEndedAt: entry.endedAt?.toISOString() ?? null,
      intakeSummary: entry.intake ? buildIntakeSummary(entry.intake, lang) : null,
      lastFollowUp: lastFollowUp
        ? { contactedAt: lastFollowUp.contactedAt.toISOString(), outcome: lastFollowUp.outcome }
        : null,
      queueEntryId: entry.id,
    };
  });
}

export async function getAngelPatientDetail(
  campaignId: string,
  patientUserId: string,
  lang: Lang,
) {
  const intake = await db.humanitarianIntake.findUnique({
    where: { campaignId_patientUserId: { campaignId, patientUserId } },
  });
  if (!intake?.angelContactConsentAt) return null;

  const entries = await db.humanitarianQueueEntry.findMany({
    where: { campaignId, patientUserId, status: "DONE" },
    orderBy: { endedAt: "desc" },
    include: {
      pool: { select: { slug: true, labelPt: true, labelEn: true, labelEs: true } },
    },
  });

  const followUps = await db.humanitarianAngelFollowUp.findMany({
    where: { campaignId, patientUserId },
    orderBy: { contactedAt: "desc" },
    include: {
      angelUser: {
        select: { angelProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  const patient = await db.user.findUnique({
    where: { id: patientUserId },
    select: { patientProfile: { select: { firstName: true, lastName: true } } },
  });

  const idData = decryptIdentificationData(
    (intake.identificationData ?? null) as IdentificationData | null,
  ) ?? ({} as IdentificationData);

  return {
    patientUserId,
    patientName: patient?.patientProfile
      ? `${safeDecrypt(patient.patientProfile.firstName)} ${safeDecrypt(patient.patientProfile.lastName)}`.trim()
      : idData.fullName || "Paciente",
    phone: idData.phone || "",
    intakeSummary: buildIntakeSummary(intake, lang),
    consultations: entries.map((e) => ({
      id: e.id,
      poolSlug: e.pool.slug,
      poolLabel: lang === "pt" ? e.pool.labelPt : lang === "en" ? e.pool.labelEn : e.pool.labelEs,
      priority: e.priority,
      endedAt: e.endedAt?.toISOString() ?? null,
      chiefComplaint: e.chiefComplaint,
    })),
    followUps: followUps.map((f) => ({
      id: f.id,
      channel: f.channel,
      outcome: f.outcome,
      notes: f.notes ? safeDecrypt(f.notes) : null,
      needsFlags: f.needsFlags,
      escalated: f.escalated,
      contactedAt: f.contactedAt.toISOString(),
      angelName: f.angelUser.angelProfile
        ? `${f.angelUser.angelProfile.firstName} ${f.angelUser.angelProfile.lastName}`.trim()
        : "Anjo",
    })),
  };
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
