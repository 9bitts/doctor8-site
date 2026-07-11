import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { answerChartQuestion, buildChartContext } from "@/lib/ai-chart-chat";
import { createAuditLog } from "@/lib/audit";
import { requirePsychologist, safeDecrypt } from "@/lib/psychology-api";
import { isPsychologyChartChatEnabled } from "@/lib/psychology-feature-flags";
import { getPsychologyPlanTier } from "@/lib/psychology-plan-limits";
import type { Lang } from "@/lib/i18n/translations";
import { AuditAction } from "@prisma/client";

const schema = z.object({
  patientRecordId: z.string(),
  question: z.string().min(3).max(2000),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function POST(req: NextRequest) {
  if (!isPsychologyChartChatEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const tier = await getPsychologyPlanTier(professional.userId, professional.specialty);
  if (tier === "free") {
    return NextResponse.json({ error: "PSYCHOLOGY_PLAN_REQUIRED" }, { status: 402 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const record = await db.patientRecord.findUnique({
    where: { id: parsed.data.patientRecordId },
  });
  if (!record || record.professionalId !== professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const docs = await db.medicalDocument.findMany({
    where: { patientRecordId: record.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { title: true, content: true, createdAt: true, type: true },
  });

  const chartContext = buildChartContext(docs);
  const patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim();
  const lang = (parsed.data.lang ?? "pt") as Lang;

  try {
    const answer = await answerChartQuestion({
      lang,
      patientName,
      chartContext,
      question: parsed.data.question,
    });

    await createAuditLog({
      userId: professional.userId,
      action: AuditAction.VIEW_RECORD,
      resource: "PatientRecord",
      resourceId: parsed.data.patientRecordId,
      details: { aiChartChat: true },
    });

    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI_ERROR";
    if (msg === "AI_NOT_CONFIGURED") return NextResponse.json({ error: msg }, { status: 503 });
    if (msg === "NO_CHART_DATA") return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
  }
}
