import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { patientDoctorEligibleAppointmentWhere } from "@/lib/patient-doctor-eligibility";
import { getAppUrl } from "@/lib/email-core";
import {
  attachSharedDocumentToChart,
  findChartForPatient,
} from "@/lib/shared-document-attach";
import { patientChartPathForSpecialty, professionalSharedPathForSpecialty } from "@/lib/patient-chart-path";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { getScale, scoreScale, PSYCHOLOGY_SCALES, type ScaleId } from "@/lib/psychology-scales";
import { buildScalePayload } from "@/lib/psychology-templates";
import { assessScaleRisk } from "@/lib/psychology-risk";
import { notifyPsychologyCriticalRisk } from "@/lib/psychology-critical-risk-notify";
import { invalidatePsychologyRiskAlertCache } from "@/lib/psychology-risk-alerts";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function parsePatientScale(content: string | null): {
  scaleId: ScaleId;
  score: number;
  interpretation: { levelPt: string; levelEn: string; levelEs: string };
} | null {
  if (!content) return null;
  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    if (!raw.psychologyScale || !raw.patientSelfReport) return null;
    const scaleId = raw.scaleId as ScaleId;
    if (!getScale(scaleId)) return null;
    return {
      scaleId,
      score: Number(raw.score) || 0,
      interpretation: (raw.interpretation as { levelPt: string; levelEn: string; levelEs: string }) || {
        levelPt: "—",
        levelEn: "—",
        levelEs: "—",
      },
    };
  } catch {
    return null;
  }
}

const postSchema = z.object({
  scaleId: z.enum(["PHQ9", "GAD7", "BAI", "BDI2", "DASS21"]),
  responses: z.array(z.number().int().min(0).max(3)),
  professionalId: z.string().min(1),
  shareAuthorized: z.literal(true),
});

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const ownDocs = await db.medicalDocument.findMany({
    where: {
      patientId: patientProfileId,
      professionalId: null,
      recordKind: "SCALE",
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sharedRecords: {
        where: { sharedByUserId: userId },
        select: {
          createdAt: true,
          sharedWithProfessionalId: true,
          sharedWithProfessional: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestByScale = new Map<
    ScaleId,
    {
      documentId: string;
      score: number;
      interpretation: { levelPt: string; levelEn: string; levelEs: string };
      sharedAt: string | null;
      professionalName: string | null;
    }
  >();

  for (const doc of ownDocs) {
    const parsed = parsePatientScale(safeDecrypt(doc.content));
    if (!parsed || latestByScale.has(parsed.scaleId)) continue;
    const share = doc.sharedRecords[0];
    const pro = share?.sharedWithProfessional;
    latestByScale.set(parsed.scaleId, {
      documentId: doc.id,
      score: parsed.score,
      interpretation: parsed.interpretation,
      sharedAt: share?.createdAt?.toISOString() ?? doc.createdAt.toISOString(),
      professionalName: pro ? `${pro.firstName} ${pro.lastName}`.trim() : null,
    });
  }

  return NextResponse.json({
    scales: PSYCHOLOGY_SCALES.map((s) => ({
      id: s.id,
      namePt: s.namePt,
      nameEn: s.nameEn,
      nameEs: s.nameEs,
      descriptionPt: s.descriptionPt,
      descriptionEn: s.descriptionEn,
      descriptionEs: s.descriptionEs,
      options: s.options,
      questions: s.questions,
      status: latestByScale.get(s.id)
        ? {
            sent: true,
            ...latestByScale.get(s.id)!,
          }
        : { sent: false },
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { scaleId, responses, professionalId } = parsed.data;
  const scale = getScale(scaleId);
  if (!scale) return NextResponse.json({ error: "Scale not available" }, { status: 400 });
  if (responses.length !== scale.questions.length) {
    return NextResponse.json({ error: "Número de respostas inválido" }, { status: 400 });
  }

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { id: true, userId: true, specialty: true, firstName: true, lastName: true },
  });
  if (!professional) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  const eligible = await db.appointment.findFirst({
    where: patientDoctorEligibleAppointmentWhere(patientProfileId, professional.id),
    select: { id: true },
  });
  if (!eligible) {
    return NextResponse.json(
      { error: "Você só pode enviar testes a um profissional com consulta confirmada ou recente." },
      { status: 403 },
    );
  }

  const score = scoreScale(scaleId, responses);
  const interpretation = scale.interpret(score);
  const risk = assessScaleRisk(scaleId, responses, score);
  const payload = {
    ...buildScalePayload(
      scaleId,
      responses,
      score,
      interpretation,
      risk.level !== "none" ? risk : null,
    ),
    patientSelfReport: true,
    shareAuthorized: true,
    completedAt: new Date().toISOString(),
  };

  const title = `${scale.namePt} — score ${score} (paciente)`;
  const doc = await db.medicalDocument.create({
    data: {
      patientId: patientProfileId,
      type: "CLINICAL_NOTE",
      recordKind: "SCALE",
      title: encrypt(title),
      content: encrypt(JSON.stringify(payload)),
    },
  });

  const patientUser = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  let chartId = await findChartForPatient(
    professional.id,
    userId,
    patientUser?.email ?? null,
  );
  if (!chartId) {
    chartId = await ensurePatientRecord(professional.id, userId);
  }

  const patientName =
    `${safeDecrypt(patient.firstName)} ${safeDecrypt(patient.lastName)}`.trim() || "Paciente";
  const professionalName = `${professional.firstName} ${professional.lastName}`.trim();
  const docLink = chartId
    ? `${patientChartPathForSpecialty(professional.specialty, chartId)}?recordId=${doc.id}`
    : `${professionalSharedPathForSpecialty(professional.specialty)}?documentId=${doc.id}`;

  await db.sharedRecord.create({
    data: {
      documentId: doc.id,
      patientId: patientProfileId,
      sharedWithUserId: professional.userId,
      sharedByUserId: userId,
      sharedWithProfessionalId: professional.id,
    },
  });

  await db.message.create({
    data: {
      senderId: userId,
      receiverId: professional.userId,
      content: encrypt(`📊 Teste psicológico preenchido: ${title}\n${docLink}`),
    },
  });

  const shareCopy = storedNotificationText("notif.docShared.title", "notif.docShared.body", {
    name: patientName,
    title,
  });
  await createNotification({
    userId: professional.userId,
    title: shareCopy.title,
    body: shareCopy.body,
    type: "shared_record",
    data: {
      fromUserId: userId,
      documentId: doc.id,
      link: docLink,
      kind: "patient_psychology_scale",
      scaleId,
      titleKey: "notif.docShared.title",
      bodyKey: "notif.docShared.body",
      bodyParams: { name: patientName, title },
    },
  });

  let autoAttached = false;
  let chartRecordId: string | null = null;
  if (chartId) {
    const attachResult = await attachSharedDocumentToChart({
      documentId: doc.id,
      chartId,
      professionalId: professional.id,
    });
    if (attachResult) {
      chartRecordId = attachResult.recordId;
      if (!attachResult.alreadyAttached) {
        autoAttached = true;
        const chartLink = `${getAppUrl()}${patientChartPathForSpecialty(professional.specialty, chartId)}?recordId=${attachResult.recordId}`;
        await db.message.create({
          data: {
            senderId: userId,
            receiverId: professional.userId,
            content: encrypt(`✅ Escala adicionada à ficha: ${title}\n${chartLink}`),
          },
        });
      }
    }

    if (risk.level === "critical") {
      notifyPsychologyCriticalRisk({
        professionalId: professional.id,
        patientRecordId: chartId,
        scaleId,
        documentId: chartRecordId || doc.id,
        risk,
      }).catch((e) => console.error("[PSYCHOLOGY-CRITICAL-RISK-PATIENT]", e));
      invalidatePsychologyRiskAlertCache(professional.id);
    }
  }

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    scaleId,
    score,
    interpretation,
    risk: risk.level !== "none" ? risk : null,
    autoAttached,
    professionalName,
  }, { status: 201 });
}
