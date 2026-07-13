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
import {
  loadAngelPatientJourney,
  loadAngelPatientJourneySummaries,
  type AngelPatientFlow,
} from "@/lib/humanitarian/angel-patient-journey";
import { isProfilePaused } from "@/lib/humanitarian/angel-missions";
import { resolveAngelClaimLimit } from "@/lib/humanitarian/angel-profile";
import type { NextRequest } from "next/server";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const MAX_PATIENTS_PER_ANGEL = 10;
export const ANGEL_HIGH_RISK_STALE_DAYS = 5;
export const ANGEL_NO_FIRST_CONTACT_DAYS = 3;

export const ANGEL_REMIND_IN_DAYS = [3, 7, 15, 30] as const;
export type AngelRemindInDays = (typeof ANGEL_REMIND_IN_DAYS)[number];

const PRIORITY_SORT: Record<string, number> = { CRISIS: 0, URGENT: 1, ROUTINE: 2 };

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

  // Multi-track gate (back-compat): if an ESCUTA enrollment exists, it must be APPROVED.
  // If no enrollment row exists (legacy angels before Onda 1 backfill), allow access.
  const escuta = await db.angelTrackEnrollment.findUnique({
    where: { profileId_track: { profileId: user.angelProfile.id, track: "ESCUTA" } },
    select: { status: true },
  });
  if (escuta && escuta.status !== "APPROVED") {
    return { ok: false, reason: "NOT_ENROLLED" };
  }

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
  flow: AngelPatientFlow;
};

export type AngelAvailablePatientRow = {
  patientUserId: string;
  firstName: string;
  priority: string;
  poolLabel: string;
  consultEndedAt: string | null;
  riskSummary: AngelRiskSummary;
  flow: AngelPatientFlow;
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

  const allPatientIds = eligible.map((e) => e.patientUserId);
  const flowSummaries = await loadAngelPatientJourneySummaries(campaignId, allPatientIds);

  const defaultFlow: AngelPatientFlow = {
    currentStep: "care",
    intakeStatus: null,
    triageComplete: false,
    tcleComplete: false,
    anamneseComplete: false,
    activeQueueStatus: null,
    hasCompletedConsult: false,
    consultationCount: 0,
    hasReferral: false,
    hasUpcomingAppointment: false,
    nextAppointmentAt: null,
  };

  const myPatients: AngelMyPatientRow[] = [];
  const available: AngelAvailablePatientRow[] = [];

  for (const e of eligible) {
    const flow = flowSummaries.get(e.patientUserId) ?? defaultFlow;
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
        flow,
      });
    } else if (!assignedPatient.has(e.patientUserId)) {
      available.push({
        patientUserId: e.patientUserId,
        firstName: firstNameOnly(e.fullName),
        priority: e.priority,
        poolLabel: e.poolLabel,
        consultEndedAt: e.consultEndedAt,
        riskSummary: e.riskSummary,
        flow,
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
  | { ok: false; code: "NOT_ELIGIBLE" | "LIMIT_REACHED" | "ALREADY_ASSIGNED" | "PAUSED" }
> {
  const angelProfile = await db.angelProfile.findUnique({
    where: { userId: angelUserId },
    select: { availabilityStatus: true, pausedUntil: true, weeklyCapacity: true },
  });
  if (angelProfile && isProfilePaused(angelProfile.availabilityStatus, angelProfile.pausedUntil)) {
    return { ok: false, code: "PAUSED" };
  }

  const claimLimit = resolveAngelClaimLimit(angelProfile?.weeklyCapacity, MAX_PATIENTS_PER_ANGEL);
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
      if (myCount >= claimLimit) {
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
          data: { active: true, claimedAt: now, releasedAt: null, nextContactAt: null },
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
    data: { active: false, releasedAt: new Date(), nextContactAt: null },
  });
  return true;
}

export function computeNextContactAt(opts: {
  remindInDays?: AngelRemindInDays;
  remindAt?: string;
}): Date | null {
  if (opts.remindAt) {
    const d = new Date(opts.remindAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (opts.remindInDays) {
    const d = new Date();
    d.setDate(d.getDate() + opts.remindInDays);
    return d;
  }
  return null;
}

export async function setAssignmentNextContactAt(
  campaignId: string,
  angelUserId: string,
  patientUserId: string,
  nextContactAt: Date | null,
): Promise<void> {
  await db.humanitarianAngelAssignment.updateMany({
    where: { campaignId, angelUserId, patientUserId, active: true },
    data: { nextContactAt },
  });
}

export type AngelPendencyKind = "OVERDUE_REMINDER" | "NO_FIRST_CONTACT" | "HIGH_RISK_STALE";

export type AngelPendencyRow = {
  kind: AngelPendencyKind;
  patientUserId: string;
  patientName: string;
  priority: string;
  poolLabel: string;
  dueAt: string | null;
  riskSummary: AngelRiskSummary;
  queueEntryId: string;
};

function sortPendencies(rows: AngelPendencyRow[]): AngelPendencyRow[] {
  return [...rows].sort((a, b) => {
    const pa = PRIORITY_SORT[a.priority] ?? 9;
    const pb = PRIORITY_SORT[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
    const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
    return da - db;
  });
}

export async function listAngelPendencies(
  campaignId: string,
  angelUserId: string,
  lang: Lang,
): Promise<AngelPendencyRow[]> {
  const now = Date.now();
  const noContactMs = ANGEL_NO_FIRST_CONTACT_DAYS * 24 * 60 * 60 * 1000;
  const staleMs = ANGEL_HIGH_RISK_STALE_DAYS * 24 * 60 * 60 * 1000;

  const [assignments, eligible] = await Promise.all([
    db.humanitarianAngelAssignment.findMany({
      where: { campaignId, angelUserId, active: true },
      select: {
        patientUserId: true,
        claimedAt: true,
        nextContactAt: true,
      },
    }),
    loadEligibleEntries(campaignId, lang),
  ]);

  if (!assignments.length) return [];

  const eligibleByPatient = new Map(eligible.map((e) => [e.patientUserId, e]));
  const patientIds = assignments.map((a) => a.patientUserId);

  const followUps = await db.humanitarianAngelFollowUp.findMany({
    where: {
      campaignId,
      angelUserId,
      patientUserId: { in: patientIds },
    },
    orderBy: { contactedAt: "desc" },
    select: { patientUserId: true, contactedAt: true },
  });

  const lastFollowUpByPatient = new Map<string, Date>();
  for (const f of followUps) {
    if (!lastFollowUpByPatient.has(f.patientUserId)) {
      lastFollowUpByPatient.set(f.patientUserId, f.contactedAt);
    }
  }

  const rows: AngelPendencyRow[] = [];

  for (const a of assignments) {
    const entry = eligibleByPatient.get(a.patientUserId);
    if (!entry) continue;

    const base = {
      patientUserId: a.patientUserId,
      patientName: entry.fullName,
      priority: entry.priority,
      poolLabel: entry.poolLabel,
      riskSummary: entry.riskSummary,
      queueEntryId: entry.queueEntryId,
    };

    if (a.nextContactAt && a.nextContactAt.getTime() <= now) {
      rows.push({
        kind: "OVERDUE_REMINDER",
        ...base,
        dueAt: a.nextContactAt.toISOString(),
      });
    }

    const lastFu = lastFollowUpByPatient.get(a.patientUserId);
    if (!lastFu && now - a.claimedAt.getTime() > noContactMs) {
      rows.push({
        kind: "NO_FIRST_CONTACT",
        ...base,
        dueAt: a.claimedAt.toISOString(),
      });
    }

    const highRisk = entry.priority === "CRISIS" || entry.priority === "URGENT";
    if (highRisk) {
      const staleRef = lastFu ?? a.claimedAt;
      if (now - staleRef.getTime() > staleMs) {
        rows.push({
          kind: "HIGH_RISK_STALE",
          ...base,
          dueAt: staleRef.toISOString(),
        });
      }
    }
  }

  return sortPendencies(rows);
}

export async function revokeAngelContactConsent(
  patientUserId: string,
  campaignSlug: string,
): Promise<{ ok: true; campaignId: string } | { ok: false; code: "NOT_FOUND" }> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) return { ok: false, code: "NOT_FOUND" };

  const intake = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: { campaignId: campaign.id, patientUserId },
    },
    select: { id: true, angelContactConsentAt: true },
  });
  if (!intake?.angelContactConsentAt) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.humanitarianIntake.update({
      where: { id: intake.id },
      data: { angelContactConsentAt: null },
    });
    await tx.humanitarianAngelAssignment.updateMany({
      where: { campaignId: campaign.id, patientUserId, active: true },
      data: { active: false, releasedAt: now, nextContactAt: null },
    });
  });

  return { ok: true, campaignId: campaign.id };
}

export type AdminAngelStatsRow = {
  userId: string;
  firstName: string;
  lastName: string;
  approvalStatus: string;
  enrollmentActive: boolean;
  activeAssignments: number;
  maxPatients: number;
  followUpsLast30Days: number;
  openEscalations: number;
  lastFollowUpAt: string | null;
};

export type AdminUncoveredPatientRow = {
  patientUserId: string;
  firstName: string;
  priority: string | null;
  poolLabel: string;
  consultEndedAt: string | null;
};

export type AdminAssignmentRow = {
  assignmentId: string;
  angelUserId: string;
  angelName: string;
  patientUserId: string;
  patientFirstName: string;
};

export async function getAdminAngelsOverview(
  campaignSlug: string,
  lang: Lang,
): Promise<{
  angels: AdminAngelStatsRow[];
  uncoveredPatients: AdminUncoveredPatientRow[];
  assignments: AdminAssignmentRow[];
} | null> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) return null;

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const profiles = await db.angelProfile.findMany({
    where: { approvalStatus: "APPROVED" },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      approvalStatus: true,
      user: {
        select: {
          humanitarianAngels: {
            where: { campaignId: campaign.id },
            select: { active: true },
          },
        },
      },
    },
  });

  const angels: AdminAngelStatsRow[] = [];
  for (const p of profiles) {
    const [activeAssignments, followUpsLast30Days, openEscalations, lastFollowUp] =
      await Promise.all([
        db.humanitarianAngelAssignment.count({
          where: { campaignId: campaign.id, angelUserId: p.userId, active: true },
        }),
        db.humanitarianAngelFollowUp.count({
          where: {
            campaignId: campaign.id,
            angelUserId: p.userId,
            contactedAt: { gte: since30 },
          },
        }),
        db.humanitarianAngelFollowUp.count({
          where: {
            campaignId: campaign.id,
            angelUserId: p.userId,
            escalated: true,
            escalationResolvedAt: null,
          },
        }),
        db.humanitarianAngelFollowUp.findFirst({
          where: { campaignId: campaign.id, angelUserId: p.userId },
          orderBy: { contactedAt: "desc" },
          select: { contactedAt: true },
        }),
      ]);

    angels.push({
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      approvalStatus: p.approvalStatus,
      enrollmentActive: p.user.humanitarianAngels.some((e) => e.active),
      activeAssignments,
      maxPatients: MAX_PATIENTS_PER_ANGEL,
      followUpsLast30Days,
      openEscalations,
      lastFollowUpAt: lastFollowUp?.contactedAt.toISOString() ?? null,
    });
  }

  const eligible = await loadEligibleEntries(campaign.id, lang);
  const activeAssignments = await db.humanitarianAngelAssignment.findMany({
    where: { campaignId: campaign.id, active: true },
    select: { patientUserId: true },
  });
  const covered = new Set(activeAssignments.map((a) => a.patientUserId));

  const uncoveredPatients: AdminUncoveredPatientRow[] = eligible
    .filter((e) => !covered.has(e.patientUserId))
    .map((e) => ({
      patientUserId: e.patientUserId,
      firstName: firstNameOnly(e.fullName),
      priority: e.riskSummary.priority,
      poolLabel: e.poolLabel,
      consultEndedAt: e.consultEndedAt,
    }));

  const assignmentRows = await db.humanitarianAngelAssignment.findMany({
    where: { campaignId: campaign.id, active: true },
    include: {
      angelUser: {
        select: { angelProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  const assignments: AdminAssignmentRow[] = [];
  for (const row of assignmentRows) {
    const eligibleAll = eligible.find((e) => e.patientUserId === row.patientUserId);
    const patientName = eligibleAll?.fullName ?? "Paciente";
    const angelName = row.angelUser.angelProfile
      ? `${row.angelUser.angelProfile.firstName} ${row.angelUser.angelProfile.lastName}`.trim()
      : "Anjo";
    assignments.push({
      assignmentId: row.id,
      angelUserId: row.angelUserId,
      angelName,
      patientUserId: row.patientUserId,
      patientFirstName: firstNameOnly(patientName),
    });
  }

  return { angels, uncoveredPatients, assignments };
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

  const [journey, followUps, patient] = await Promise.all([
    loadAngelPatientJourney(campaignId, patientUserId, lang),
    db.humanitarianAngelFollowUp.findMany({
      where: { campaignId, patientUserId },
      orderBy: { contactedAt: "desc" },
      include: {
        angelUser: {
          select: { angelProfile: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    db.user.findUnique({
      where: { id: patientUserId },
      select: { patientProfile: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const idData =
    decryptIdentificationData(
      (intake.identificationData ?? null) as IdentificationData | null,
    ) ?? ({} as IdentificationData);

  const latestDone = journey.consultations.find((c) => c.status === "DONE");

  return {
    patientUserId,
    patientName: patient?.patientProfile
      ? `${safeDecrypt(patient.patientProfile.firstName)} ${safeDecrypt(patient.patientProfile.lastName)}`.trim()
      : idData.fullName || "Paciente",
    phone: idData.phone || "",
    riskSummary: buildAngelRiskSummary(intake, lang, latestDone?.priority ?? null),
    flow: journey.flow,
    consultations: journey.consultations,
    referrals: journey.referrals,
    appointments: journey.appointments,
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
    queueEntryId: latestDone?.id ?? journey.consultations[0]?.id ?? null,
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
