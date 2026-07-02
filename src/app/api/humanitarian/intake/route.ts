import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getPatientIntakeStatusBySlug,
  saveAnamneseSection,
  saveHumanitarianTriage,
} from "@/lib/humanitarian/intake";
import { humanitarianTriageSchema } from "@/lib/humanitarian/triage";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { z } from "zod";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const postSchema = z.object({
  campaignSlug: z.string(),
  triage: humanitarianTriageSchema,
});

const patchSchema = z.object({
  campaignSlug: z.string(),
  section: z.enum(["identification", "services", "specialty", "basicNeeds", "consent"]),
  data: z.unknown(),
});

async function enforceIntakeRateLimit(req: NextRequest, userId: string): Promise<NextResponse | null> {
  const ip = clientIp(req);
  const limits = [
    { namespace: "humanitarian:intake:ip", key: ip, ...RATE_LIMITS.humanitarianIntake },
    { namespace: "humanitarian:intake:user", key: userId, ...RATE_LIMITS.humanitarianIntake },
  ];
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (user?.phone) {
    limits.push({
      namespace: "humanitarian:intake:phone",
      key: user.phone.slice(0, 64),
      ...RATE_LIMITS.humanitarianIntake,
    });
  }
  const rate = await checkRateLimits(limits);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        errorCode: "RATE_LIMITED",
        error: "RATE_LIMITED",
        message: "Too many intake submissions. Please wait before trying again.",
        retryAfterSec: rate.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug");
  const full = new URL(req.url).searchParams.get("full") === "1";
  if (!campaignSlug) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: "campaignSlug required" },
      { status: 400 },
    );
  }

  const status = await getPatientIntakeStatusBySlug(
    campaignSlug,
    session.user.id,
    { includeAnamnese: full },
  );
  return NextResponse.json({ intake: status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Only patients can submit triage" }, { status: 403 });
  }

  const rateLimited = await enforceIntakeRateLimit(req, session.user.id);
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: parsed.data.campaignSlug },
    select: { id: true, active: true },
  });

  if (!campaign?.active) {
    return NextResponse.json(
      { errorCode: "CAMPAIGN_UNAVAILABLE", error: "Campaign not available" },
      { status: 404 },
    );
  }

  const saved = await saveHumanitarianTriage({
    campaignId: campaign.id,
    patientUserId: session.user.id,
    triage: parsed.data.triage,
  });

  return NextResponse.json({
    intake: {
      id: saved.intake.id,
      status: saved.intake.status,
      triageValid: true,
      triageCompletedAt: saved.intake.triageCompletedAt?.toISOString(),
      triageExpiresAt: saved.triageExpiresAt.toISOString(),
      computedPriority: saved.priority,
      forceMedicalPool: saved.forceMedicalPool,
      triageFlags: saved.flags,
      anamneseComplete: saved.intake.status === "COMPLETE",
      anamneseStarted: saved.intake.status !== "TRIAGE_ONLY",
      tcleAccepted: await hasTelemedicineTcle(session.user.id),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Only patients can update intake" }, { status: 403 });
  }

  const rateLimited = await enforceIntakeRateLimit(req, session.user.id);
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: parsed.data.campaignSlug },
    select: { id: true, active: true },
  });

  if (!campaign?.active) {
    return NextResponse.json(
      { errorCode: "CAMPAIGN_UNAVAILABLE", error: "Campaign not available" },
      { status: 404 },
    );
  }

  try {
    const saved = await saveAnamneseSection({
      campaignId: campaign.id,
      patientUserId: session.user.id,
      section: parsed.data.section,
      data: parsed.data.data,
    });

    return NextResponse.json({
      intake: {
        id: saved.intake.id,
        status: saved.intake.status,
        anamneseComplete: saved.anamneseComplete,
        anamnese: saved.anamnese,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "TRIAGE_REQUIRED") {
      return NextResponse.json(
        { errorCode: "TRIAGE_REQUIRED", error: "TRIAGE_REQUIRED" },
        { status: 403 },
      );
    }
    throw e;
  }
}
