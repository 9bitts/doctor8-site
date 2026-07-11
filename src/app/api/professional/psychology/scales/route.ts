import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getScale, scoreScale, type ScaleId } from "@/lib/psychology-scales";
import { buildScalePayload } from "@/lib/psychology-templates";
import { parsePsychologyContent, psychologyRecordKindWhere, requirePsychologist, safeDecrypt } from "@/lib/psychology-api";
import { assessScaleRisk } from "@/lib/psychology-risk";
import { notifyPsychologyCriticalRisk } from "@/lib/psychology-critical-risk-notify";
import { invalidatePsychologyRiskAlertCache } from "@/lib/psychology-risk-alerts";

const createSchema = z.object({
  patientRecordId: z.string(),
  scaleId: z.enum(["PHQ9", "GAD7", "BAI", "BDI2", "DASS21"]),
  responses: z.array(z.number().int().min(0).max(3)),
});

export async function GET() {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId: professional.id,
      patientRecordId: { not: null },
      ...psychologyRecordKindWhere("SCALE"),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const applications = docs
    .map((d) => {
      const content = parsePsychologyContent(safeDecrypt(d.content));
      if (!content?.psychologyScale) return null;
      return {
        id: d.id,
        title: safeDecrypt(d.title),
        scaleId: content.scaleId as string,
        score: content.score as number,
        interpretation: content.interpretation as { levelPt: string; levelEn: string; levelEs: string },
        risk: content.risk as { level: string; messagePt: string } | null,
        createdAt: d.createdAt.toISOString(),
        patientRecordId: d.patientRecordId,
        patientName: d.patientRecord
          ? `${safeDecrypt(d.patientRecord.firstName)} ${safeDecrypt(d.patientRecord.lastName)}`.trim()
          : "—",
      };
    })
    .filter(Boolean);

  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const scale = getScale(d.scaleId as ScaleId);
  if (!scale) return NextResponse.json({ error: "Scale not available" }, { status: 400 });
  if (d.responses.length !== scale.questions.length)
    return NextResponse.json({ error: "Invalid responses count" }, { status: 400 });

  const record = await db.patientRecord.findUnique({ where: { id: d.patientRecordId } });
  if (!record || record.professionalId !== professional.id)
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const score = scoreScale(d.scaleId as ScaleId, d.responses);
  const interpretation = scale.interpret(score);
  const risk = assessScaleRisk(d.scaleId as ScaleId, d.responses, score);
  const payload = buildScalePayload(
    d.scaleId,
    d.responses,
    score,
    interpretation,
    risk.level !== "none" ? risk : null,
  );
  const title = `${scale.namePt} — score ${score}`;

  const doc = await db.medicalDocument.create({
    data: {
      patientRecordId: d.patientRecordId,
      professionalId: professional.id,
      type: "CLINICAL_NOTE",
      recordKind: "SCALE",
      title: encrypt(title),
      content: encrypt(JSON.stringify(payload)),
    },
  });

  if (risk.level === "critical") {
    notifyPsychologyCriticalRisk({
      professionalId: professional.id,
      patientRecordId: d.patientRecordId,
      scaleId: d.scaleId,
      documentId: doc.id,
      risk,
    }).catch((e) => console.error("[PSYCHOLOGY-CRITICAL-RISK]", e));
  }

  invalidatePsychologyRiskAlertCache(professional.id);

  return NextResponse.json({
    id: doc.id,
    title,
    scaleId: d.scaleId,
    score,
    interpretation,
    risk: risk.level !== "none" ? risk : null,
    createdAt: doc.createdAt.toISOString(),
  }, { status: 201 });
}
