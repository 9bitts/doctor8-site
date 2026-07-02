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

const postSchema = z.object({
  campaignSlug: z.string(),
  triage: humanitarianTriageSchema,
});

const patchSchema = z.object({
  campaignSlug: z.string(),
  section: z.enum(["identification", "services", "specialty", "basicNeeds", "consent"]),
  data: z.unknown(),
});

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
