import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { decryptIdentificationData } from "@/lib/humanitarian/intake-encryption";
import { buildAngelRiskSummary, type AngelRiskSummary } from "@/lib/humanitarian/angel-risk-summary";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import type { Lang } from "@/lib/i18n/translations";
import type { IdentificationData } from "@/lib/humanitarian/anamnese";
import type { AngelApprovalStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const MAX_PATIENTS_PER_ANGEL = 10;

const ANGEL_AUDIT_RESOURCE = "HumanitarianAngelPatient";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function firstNameOnly(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Paciente";
  return trimmed.split(/\s+/)[0] ?? trimmed;
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

export async function hasActiveAngelAssignment(
  angelUserId: string,
  patientUserId: string,
  campaignId: string,
): Promise<boolean> {
  const row = await db.humanitarianAngelAssignment.findFirst({
    where: {
      angelUserId,
      patientUserId,
      campaignId,
      active: true,
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function auditAngelEvent(params: {
  userId: string;
  action: AuditAction;
  patientUserId?: string;
  campaignId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    action: params.action,
    resource: ANGEL_AUDIT_RESOURCE,
    resourceId: params.patientUserId,
    details: {
      campaignId: params.campaignId,
      ...params.details,
    },
  });
}

export async function enforceAngelRateLimit(
  req: NextRequest,
  userId: string,
  action: string,
): Promise<NextResponse | null> {
  const ip = clientIp(req);
  const rate = await checkRateLimits([
    {
      namespace: `angel:${action}:user`,
      key: userId,
      ...RATE_LIMITS.angelAction,
    },
    {
      namespace: `angel:${action}:ip`,
      key: ip,
      ...RATE_LIMITS.angelActionIp,
    },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);
  return null;
}

type EligibleEntry = {
  patientUserId: string;
  fullName: string;
  phone: string;
  priority: string;
  poolSlug: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
  lastFollowUp: { contactedAt: string; outcome: string } | null;
  queueEntryId: string;
};

async function loadEligibleEntries(campaignId: string, lang: Lang): Promise<EligibleEntry[]> {
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
      intake: {
        select: {
          computedPriority: true,
          triageFlags: true,
          identificationData: true,
        },
      },
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

  const byPatient = new Map<string, (typeof entries)[0]>();
  for (const e of entries) {
    if (!byPatient.has(e.patientUserId)) byPatient.set(e.patientUserId, e);
  }

  return Array.from(byPatient.values()).map((entry) => {
    const pp = entry.patientUser.patientProfile;
    const idData =
      decryptIdentificationData(
        (entry.intake?.identificationData ?? null) as IdentificationData | null,
      ) ?? ({} as IdentificationData);
    const fullName = pp
      ? `${safeDecrypt(pp.firstName)} ${safeDecrypt(pp.lastName)}`.trim()
      : idData.fullName || "Paciente";
    const lastFollowUp = entry.angelFollowUps[0] ?? null;

    return {
      patientUserId: entry.patientUserId,
      fullName,
      phone: idData.phone || "",
      priority: entry.priority,
      poolSlug: entry.pool.slug,
      poolLabel:
        lang === "pt"
          ? entry.pool.labelPt
          : lang === "en"
            ? entry.pool.labelEn
            : entry.pool.labelEs,
      consultEndedAt: entry.endedAt?.toISOString() ?? null,
      riskSummary: buildAngelRiskSummary(entry.intake, lang, entry.priority),
      lastFollowUp: lastFollowUp
        ? { contactedAt: lastFollowUp.contactedAt.toISOString(), outcome: lastFollowUp.outcome }
        : null,
      queueEntryId: entry.id,
    };
  });
}

export type AngelMyPatientRow = {
  patientUserId: string;
  patientName: string;
  phone: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
  lastFollowUp: { contactedAt: string; outcome: string } | null;
  queueEntryId: string;
};

export type AngelAvailablePatientRow = {
  patientUserId: string;
  firstName: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
};

export async function listAngelDashboard(
  campaignId: string,
  angelUserId: string,
  lang: Lang,
): Promise<{
  myPatients: AngelMyPatientRow[];
  available: AngelAvailablePatientRow[];
  assignmentCount: number;
}> {
  const [eligible, activeAssignments] = await Promise.all([
    loadEligibleEntries(campaignId, lang),
    db.humanitarianAngelAssignment.findMany({
      where: { campaignId, active: true },
      select: { angelUserId: true, patientUserId: true },
    }),
  ]);

  const assignedPatient = new Map<string, string>();
  for (const a of activeAssignments) {
    assignedPatient.set(a.patientUserId, a.angelUserId);
  }

  const myPatientIds = new Set(
    activeAssignments.filter((a) => a.angelUserId === angelUserId).map((a) => a.patientUserId),
  );

  const myPatients: AngelMyPatientRow[] = [];
  const available: AngelAvailablePatientRow[] = [];

  for (const e of eligible) {
    if (myPatientIds.has(e.patientUserId)) {
      myPatients.push({
        patientUserId: e.patientUserId,
        patientName: e.fullName,
        phone: e.phone,
        priority: e.priority,
        poolLabel: e.poolLabel,
        consultEndedAt: e.consultEndedAt,
        riskSummary: e.riskSummary,
        lastFollowUp: e.lastFollowUp,
        queueEntryId: e.queueEntryId,
      });
    } else if (!assignedPatient.has(e.patientUserId)) {
      available.push({
        patientUserId: e.patientUserId,
        firstName: firstNameOnly(e.fullName),
        priority: e.priority,
        poolLabel: e.poolLabel,
        consultEndedAt: e.consultEndedAt,
        riskSummary: e.riskSummary,
      });
    }
  }

  return {
    myPatients,
    available,
    assignmentCount: myPatientIds.size,
  };
}

export async function claimAngelPatient(
  campaignId: string,
  angelUserId: string,
  patientUserId: string,
): Promise<
  | { ok: true; assignmentId: string }
  | { ok: false; code: "NOT_ELIGIBLE" | "LIMIT_REACHED" | "ALREADY_ASSIGNED" }
> {
  const intake = await db.humanitarianIntake.findUnique({
    where: { campaignId_patientUserId: { campaignId, patientUserId } },
    select: { angelContactConsentAt: true },
  });
  if (!intake?.angelContactConsentAt) {
    return { ok: false, code: "NOT_ELIGIBLE" };
  }

  const doneEntry = await db.humanitarianQueueEntry.findFirst({
    where: { campaignId, patientUserId, status: "DONE" },
    select: { id: true },
  });
  if (!doneEntry) {
    return { ok: false, code: "NOT_ELIGIBLE" };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const otherActive = await tx.humanitarianAngelAssignment.findFirst({
        where: {
          campaignId,
          patientUserId,
          active: true,
          NOT: { angelUserId },
        },
      });
      if (otherActive) {
        throw new Error("ALREADY_ASSIGNED");
      }

      const myCount = await tx.humanitarianAngelAssignment.count({
        where: { campaignId, angelUserId, active: true },
      });
      if (myCount >= MAX_PATIENTS_PER_ANGEL) {
        throw new Error("LIMIT_REACHED");
      }

      const existing = await tx.humanitarianAngelAssignment.findUnique({
        where: {
          angelUserId_patientUserId: { angelUserId, patientUserId },
        },
      });

      if (existing?.active) {
        throw new Error("ALREADY_ASSIGNED");
      }

      const now = new Date();
      if (existing) {
        const updated = await tx.humanitarianAngelAssignment.update({
          where: { id: existing.id },
          data: { active: true, claimedAt: now, releasedAt: null },
        });
        return updated.id;
      }

      const created = await tx.humanitarianAngelAssignment.create({
        data: {
          campaignId,
          angelUserId,
          patientUserId,
          active: true,
          claimedAt: now,
        },
      });
      return created.id;
    });

    return { ok: true, assignmentId: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "LIMIT_REACHED") return { ok: false, code: "LIMIT_REACHED" };
    if (msg === "ALREADY_ASSIGNED") return { ok: false, code: "ALREADY_ASSIGNED" };
    throw err;
  }
}

export async function releaseAngelPatient(
  campaignId: string,
  angelUserId: string,
  patientUserId: string,
): Promise<boolean> {
  const row = await db.humanitarianAngelAssignment.findFirst({
    where: {
      campaignId,
      angelUserId,
      patientUserId,
      active: true,
    },
  });
  if (!row) return false;

  await db.humanitarianAngelAssignment.update({
    where: { id: row.id },
    data: { active: false, releasedAt: new Date() },
  });
  return true;
}

export async function validateAngelQueueEntry(
  queueEntryId: string,
  campaignId: string,
  patientUserId: string,
): Promise<boolean> {
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: queueEntryId },
    select: { campaignId: true, patientUserId: true },
  });
  return Boolean(
    entry && entry.campaignId === campaignId && entry.patientUserId === patientUserId,
  );
}

export async function getAngelPatientDetail(
  campaignId: string,
  patientUserId: string,
  angelUserId: string,
  lang: Lang,
  options?: { isAdmin?: boolean },
) {
  const isAdmin = options?.isAdmin ?? false;

  if (!isAdmin) {
    const assigned = await hasActiveAngelAssignment(angelUserId, patientUserId, campaignId);
    if (!assigned) return null;
  }

  const intake = await db.humanitarianIntake.findUnique({
    where: { campaignId_patientUserId: { campaignId, patientUserId } },
    select: {
      angelContactConsentAt: true,
      computedPriority: true,
      triageFlags: true,
      identificationData: true,
    },
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

  const idData =
    decryptIdentificationData(
      (intake.identificationData ?? null) as IdentificationData | null,
    ) ?? ({} as IdentificationData);

  const latestEntry = entries[0];

  return {
    patientUserId,
    patientName: patient?.patientProfile
      ? `${safeDecrypt(patient.patientProfile.firstName)} ${safeDecrypt(patient.patientProfile.lastName)}`.trim()
      : idData.fullName || "Paciente",
    phone: idData.phone || "",
    riskSummary: buildAngelRiskSummary(intake, lang, latestEntry?.priority ?? null),
    consultations: entries.map((e) => ({
      id: e.id,
      poolSlug: e.pool.slug,
      poolLabel:
        lang === "pt" ? e.pool.labelPt : lang === "en" ? e.pool.labelEn : e.pool.labelEs,
      priority: e.priority,
      endedAt: e.endedAt?.toISOString() ?? null,
    })),
    followUps: followUps.map((f) => {
      const angelName = f.angelUser.angelProfile
        ? `${f.angelUser.angelProfile.firstName} ${f.angelUser.angelProfile.lastName}`.trim()
        : "Anjo";
      const isOwn = f.angelUserId === angelUserId;
      const base = {
        id: f.id,
        channel: f.channel,
        outcome: f.outcome,
        escalated: f.escalated,
        contactedAt: f.contactedAt.toISOString(),
        angelName,
      };
      if (isAdmin || isOwn) {
        return {
          ...base,
          notes: f.notes ? safeDecrypt(f.notes) : null,
          needsFlags: f.needsFlags,
        };
      }
      return base;
    }),
    queueEntryId: latestEntry?.id ?? null,
  };
}

export async function notifyAngelEscalation(params: {
  followUpId: string;
  patientUserId: string;
  patientName: string;
  priority: string | null;
}): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!admins.length) return;

  const copy = storedNotificationText(
    "notif.angel.escalation.title",
    "notif.angel.escalation.body",
    {
      name: params.patientName,
      priority: params.priority || "ROUTINE",
    },
  );

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        title: copy.title,
        body: copy.body,
        type: "system",
        data: {
          titleKey: "notif.angel.escalation.title",
          bodyKey: "notif.angel.escalation.body",
          name: params.patientName,
          priority: params.priority || "ROUTINE",
          url: "/admin/humanitarian",
          followUpId: params.followUpId,
          patientUserId: params.patientUserId,
        },
      }),
    ),
  );
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
