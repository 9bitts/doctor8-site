import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";
import { AuditAction } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  auditAngelEvent,
  computeNextContactAt,
  enforceAngelRateLimit,
  getAngelPatientDetail,
  hasActiveAngelAssignment,
  notifyAngelEscalation,
  resolveAngelAccess,
  setAssignmentNextContactAt,
  validateAngelQueueEntry,
} from "@/lib/humanitarian/angel";

const followUpSchema = z.object({
  campaignSlug: z.string().optional(),
  patientUserId: z.string().min(1),
  queueEntryId: z.string().optional(),
  channel: z.enum(["WHATSAPP", "PHONE", "SMS", "OTHER"]),
  outcome: z.enum(["REACHED_OK", "NEEDS_HELP", "NO_ANSWER", "WRONG_NUMBER", "ESCALATED", "OTHER"]),
  notes: z.string().max(5000).optional(),
  needsFlags: z.array(z.string()).optional(),
  escalated: z.boolean().optional(),
  remindInDays: z.union([
    z.literal(3),
    z.literal(7),
    z.literal(15),
    z.literal(30),
  ]).optional(),
  remindAt: z.string().optional(),
  minutesSpent: z.number().int().min(1).max(480).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = await enforceAngelRateLimit(req, session.user.id, "follow-up");
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const campaignSlug = parsed.data.campaignSlug || VENEZUELA_CAMPAIGN_SLUG;
  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  if (!access.ok) {
    return NextResponse.json({ errorCode: access.reason, error: access.reason }, { status: 403 });
  }

  const assigned = await hasActiveAngelAssignment(
    session.user.id,
    parsed.data.patientUserId,
    access.campaignId,
  );
  if (!assigned) {
    return NextResponse.json(
      { errorCode: "FORBIDDEN", error: "No active assignment for this patient" },
      { status: 403 },
    );
  }

  const intake = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: {
        campaignId: access.campaignId,
        patientUserId: parsed.data.patientUserId,
      },
    },
    select: { angelContactConsentAt: true, computedPriority: true },
  });

  if (!intake?.angelContactConsentAt) {
    return NextResponse.json(
      { errorCode: "FORBIDDEN", error: "Patient did not consent to angel contact" },
      { status: 403 },
    );
  }

  if (parsed.data.queueEntryId) {
    const valid = await validateAngelQueueEntry(
      parsed.data.queueEntryId,
      access.campaignId,
      parsed.data.patientUserId,
    );
    if (!valid) {
      return NextResponse.json(
        { errorCode: "VALIDATION_ERROR", error: "Invalid queueEntryId for patient" },
        { status: 400 },
      );
    }
  }

  const escalated = parsed.data.escalated ?? parsed.data.outcome === "ESCALATED";

  const followUp = await db.humanitarianAngelFollowUp.create({
    data: {
      campaignId: access.campaignId,
      patientUserId: parsed.data.patientUserId,
      angelUserId: session.user.id,
      queueEntryId: parsed.data.queueEntryId || null,
      channel: parsed.data.channel,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes ? encrypt(parsed.data.notes) : null,
      needsFlags: parsed.data.needsFlags ?? [],
      escalated,
    },
  });

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.CREATE_RECORD,
    patientUserId: parsed.data.patientUserId,
    campaignId: access.campaignId,
    details: {
      event: "angel_follow_up",
      followUpId: followUp.id,
      outcome: parsed.data.outcome,
      escalated,
    },
  });

  const nextContactAt = computeNextContactAt({
    remindInDays: parsed.data.remindInDays,
    remindAt: parsed.data.remindAt,
  });
  if (nextContactAt) {
    await setAssignmentNextContactAt(
      access.campaignId,
      session.user.id,
      parsed.data.patientUserId,
      nextContactAt,
    );
  }

  if (escalated) {
    const detail = await getAngelPatientDetail(
      access.campaignId,
      parsed.data.patientUserId,
      session.user.id,
      "pt",
    );
    await notifyAngelEscalation({
      followUpId: followUp.id,
      patientUserId: parsed.data.patientUserId,
      patientName: detail?.patientName || "Paciente",
      priority: intake.computedPriority,
    });
  }

  if (parsed.data.minutesSpent) {
    const profile = await db.angelProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (profile) {
      const { creditFollowUpHours } = await import("@/lib/humanitarian/angel-impact");
      await creditFollowUpHours({
        profileId: profile.id,
        userId: session.user.id,
        minutes: parsed.data.minutesSpent,
        followUpId: followUp.id,
      });
    }
  }

  return NextResponse.json({
    followUp: {
      id: followUp.id,
      contactedAt: followUp.contactedAt.toISOString(),
    },
  });
}
