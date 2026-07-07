import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COPSOQ_LITE_QUESTIONS } from "@/lib/nr1-copsoq-lite";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const campaign = await db.employerSurveyCampaign.findFirst({
    where: { publicToken: token, status: "ACTIVE" },
    include: {
      employerCompany: { select: { nomeFantasia: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Survey not available" }, { status: 404 });
  }

  return NextResponse.json({
    title: campaign.title,
    companyName: campaign.employerCompany.nomeFantasia,
    instrument: campaign.instrument,
    questions: COPSOQ_LITE_QUESTIONS,
    options: [
      { value: 1, label: "Nunca / Discordo totalmente" },
      { value: 2, label: "Raramente / Discordo" },
      { value: 3, label: "Às vezes / Neutro" },
      { value: 4, label: "Frequentemente / Concordo" },
      { value: 5, label: "Sempre / Concordo totalmente" },
    ],
    privacyNotice:
      "Suas respostas são anônimas e agregadas. Este questionário avalia condições de trabalho, não diagnóstico individual.",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = body?.token as string | undefined;
  const answers = body?.answers as Record<string, number> | undefined;
  const department = body?.department as string | undefined;

  if (!token || !answers || typeof answers !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const campaign = await db.employerSurveyCampaign.findFirst({
    where: { publicToken: token, status: "ACTIVE" },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Survey not available" }, { status: 404 });
  }

  await db.employerSurveyResponse.create({
    data: {
      campaignId: campaign.id,
      department: department?.trim() || null,
      answersJson: answers,
    },
  });

  return NextResponse.json({ success: true });
}
