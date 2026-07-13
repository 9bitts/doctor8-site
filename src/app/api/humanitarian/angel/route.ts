import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  auditAngelEvent,
  listAngelDashboard,
  listAngelPendencies,
  MAX_PATIENTS_PER_ANGEL,
  resolveAngelAccess,
} from "@/lib/humanitarian/angel";
import { hasCompletedTrackTraining } from "@/lib/humanitarian/angel-training";
import {
  resolveAngelOnboardingStep,
  type AngelOnboardingStep,
} from "@/lib/humanitarian/angel-onboarding";
import { resolveAngelClaimLimit } from "@/lib/humanitarian/angel-profile";

function volunteerLang(req: NextRequest): Lang {
  const raw = new URL(req.url).searchParams.get("lang");
  if (raw === "pt" || raw === "en" || raw === "es") return raw;
  return "pt";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const lang = volunteerLang(req);

  const profile = await db.angelProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      approvalStatus: true,
      rejectionReason: true,
      screeningStatus: true,
      weeklyCapacity: true,
      trackEnrollments: {
        select: { track: true, status: true },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ errorCode: "NOT_FOUND", error: "Profile not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailVerified: true,
      _count: { select: { providerLicenseDocuments: true } },
    },
  });

  const training = await hasCompletedTrackTraining({
    userId: session.user.id,
    track: "ESCUTA",
  });
  const trainingComplete = training.ok;
  const pendingCourseIds = training.ok ? [] : training.requiredCourseIds;

  const maxPatients = resolveAngelClaimLimit(profile.weeklyCapacity, MAX_PATIENTS_PER_ANGEL);

  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  const dashboardActive = access.ok;

  const onboardingStep: AngelOnboardingStep = resolveAngelOnboardingStep({
    approvalStatus: profile.approvalStatus,
    emailVerified: !!user?.emailVerified,
    screeningStatus: profile.screeningStatus,
    trackEnrollments: profile.trackEnrollments,
    trainingComplete,
    dashboardActive,
  });

  const onboardingPayload = {
    onboardingStep,
    screeningStatus: profile.screeningStatus,
    trackEnrollments: profile.trackEnrollments,
    licenseDocCount: user?._count.providerLicenseDocuments ?? 0,
    trainingComplete,
    pendingCourseIds,
  };
  if (!access.ok) {
    return NextResponse.json({
      status: access.reason,
      profile,
      emailVerified: !!user?.emailVerified,
      ...onboardingPayload,
      myPatients: [],
      available: [],
      pendencies: [],
      pendencyCount: 0,
      assignmentCount: 0,
      maxPatients,
    });
  }

  const dashboard = await listAngelDashboard(access.campaignId, session.user.id, lang);
  const pendencies = await listAngelPendencies(access.campaignId, session.user.id, lang);

  await auditAngelEvent({
    userId: session.user.id,
    action: AuditAction.VIEW_RECORD,
    campaignId: access.campaignId,
    details: { event: "angel_dashboard_list" },
  });

  return NextResponse.json({
    status: "ACTIVE",
    profile,
    emailVerified: true,
    ...onboardingPayload,
    myPatients: dashboard.myPatients,
    available: dashboard.available,
    pendencies,
    pendencyCount: pendencies.length,
    assignmentCount: dashboard.assignmentCount,
    maxPatients,
  });
}
