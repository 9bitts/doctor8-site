import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  formatHumanitarianPhoneParts,
  parsePhoneToParts,
  resolvePatientHumanitarianPhone,
  savePatientHumanitarianPhone,
} from "@/lib/humanitarian/phone";

const schema = z.object({
  campaignSlug: z.string(),
  ddi: z.string().min(1).max(4),
  ddd: z.string().min(2).max(3),
  number: z.string().min(8).max(15),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug");
  if (!campaignSlug) {
    return NextResponse.json({ error: "campaignSlug required" }, { status: 400 });
  }

  const phoneReady = !!(await resolvePatientHumanitarianPhone(session.user.id));
  let parts = { ddi: "58", ddd: "", number: "" };

  const [profile, intake] = await Promise.all([
    resolvePatientHumanitarianPhone(session.user.id),
    db.humanitarianIntake.findFirst({
      where: {
        patientUserId: session.user.id,
        campaign: { slug: campaignSlug },
      },
      select: { identificationData: true },
    }),
  ]);

  const idData = intake?.identificationData as {
    phoneDdi?: string;
    phoneDdd?: string;
    phoneNumber?: string;
    phone?: string;
  } | null;

  if (idData?.phoneDdi && idData?.phoneDdd && idData?.phoneNumber) {
    parts = {
      ddi: idData.phoneDdi,
      ddd: idData.phoneDdd,
      number: idData.phoneNumber,
    };
  } else if (profile) {
    parts = parsePhoneToParts(profile);
  }

  return NextResponse.json({ phoneReady, parts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Only patients can save phone" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignSlug, ddi, ddd, number } = parsed.data;
  const e164 = formatHumanitarianPhoneParts(ddi, ddd, number);
  if (!e164) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, active: true },
  });
  if (!campaign?.active) {
    return NextResponse.json({ error: "Campaign not available" }, { status: 404 });
  }

  try {
    await savePatientHumanitarianPhone(
      session.user.id,
      { ddi, ddd, number },
      campaign.id,
    );
    return NextResponse.json({ success: true, phoneReady: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "INVALID_PHONE") {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not save phone" }, { status: 500 });
  }
}
