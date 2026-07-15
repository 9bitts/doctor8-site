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
import {
  ageFromIsoDate,
  getPatientPsychologyTerm,
  isAdolescentAge,
  isMinorAge,
  parseTermIdFromContent,
  renderPatientTermDocument,
  termRequiresGuardian,
  termsVisibleForAge,
  validateTermFields,
  type PatientPsychologyTermId,
} from "@/lib/patient-psychology-terms";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

const postSchema = z.object({
  termId: z.enum([
    "TDIC_CONSENT",
    "TDIC_CONTRACT",
    "MINOR_PSYCHOTHERAPY_AUTH",
    "MINOR_GENERAL_AUTH",
    "ADOLESCENT_ASSENT",
  ]),
  professionalId: z.string().min(1),
  shareAuthorized: z.literal(true),
  fields: z.record(z.string()).default({}),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      cpf: true,
      city: true,
      state: true,
    },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const dob = safeDecrypt(patient.dateOfBirth);
  const age = ageFromIsoDate(dob);
  const visible = termsVisibleForAge(age);

  const ownDocs = await db.medicalDocument.findMany({
    where: { patientId: patientProfileId, professionalId: null },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      sharedRecords: {
        where: { sharedByUserId: userId },
        select: {
          sharedWithProfessionalId: true,
          createdAt: true,
          sharedWithProfessional: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestByTerm = new Map<
    PatientPsychologyTermId,
    {
      documentId: string;
      sharedAt: string | null;
      professionalId: string | null;
      professionalName: string | null;
    }
  >();

  for (const doc of ownDocs) {
    const termId = parseTermIdFromContent(safeDecrypt(doc.content));
    if (!termId || latestByTerm.has(termId)) continue;
    const share = doc.sharedRecords[0];
    const pro = share?.sharedWithProfessional;
    latestByTerm.set(termId, {
      documentId: doc.id,
      sharedAt: share?.createdAt?.toISOString() ?? doc.createdAt.toISOString(),
      professionalId: share?.sharedWithProfessionalId ?? null,
      professionalName: pro ? `${pro.firstName} ${pro.lastName}`.trim() : null,
    });
  }

  return NextResponse.json({
    profile: {
      fullName: `${safeDecrypt(patient.firstName)} ${safeDecrypt(patient.lastName)}`.trim(),
      dateOfBirth: dob || null,
      age,
      isMinor: age !== null && age < 18,
      phone: safeDecrypt(patient.phone) || null,
      cpf: safeDecrypt(patient.cpf) || null,
      cityState: [patient.city, patient.state].filter(Boolean).join(" / ") || null,
    },
    terms: visible.map((t) => ({
      id: t.id,
      audience: t.audience,
      titlePt: t.titlePt,
      titleEn: t.titleEn,
      titleEs: t.titleEs,
      summaryPt: t.summaryPt,
      summaryEn: t.summaryEn,
      summaryEs: t.summaryEs,
      requiresGuardian: termRequiresGuardian(t, age),
      fields: t.fields,
      status: latestByTerm.get(t.id)
        ? {
            sent: true,
            documentId: latestByTerm.get(t.id)!.documentId,
            sharedAt: latestByTerm.get(t.id)!.sharedAt,
            professionalId: latestByTerm.get(t.id)!.professionalId,
            professionalName: latestByTerm.get(t.id)!.professionalName,
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

  const { termId, professionalId, fields, lang } = parsed.data;
  const term = getPatientPsychologyTerm(termId);
  if (!term) return NextResponse.json({ error: "Unknown term" }, { status: 400 });

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const dob = safeDecrypt(patient.dateOfBirth) || fields.patientDob || fields.adolescentDob || "";
  const age = ageFromIsoDate(dob);

  if (term.audience === "minor" && !isMinorAge(age)) {
    return NextResponse.json({ error: "Este termo é apenas para menores de 18 anos." }, { status: 403 });
  }
  if (term.audience === "adolescent" && !isAdolescentAge(age)) {
    return NextResponse.json({ error: "Este termo é apenas para adolescentes de 12 a 17 anos." }, { status: 403 });
  }

  const missing = validateTermFields(term, fields, age);
  if (missing) {
    return NextResponse.json({ error: `Campo obrigatório: ${missing}` }, { status: 400 });
  }

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
      { error: "Você só pode enviar termos a um profissional com consulta confirmada ou recentes." },
      { status: 403 },
    );
  }

  const professionalName = `${professional.firstName} ${professional.lastName}`.trim();
  const signedAtIso = new Date().toISOString();
  const content = renderPatientTermDocument({
    term,
    values: fields,
    age,
    professionalName,
    signedAtIso,
    shareAuthorized: true,
    lang: lang ?? "pt",
  });

  const title =
    lang === "en" ? term.titleEn : lang === "es" ? term.titleEs : term.titlePt;

  const doc = await db.medicalDocument.create({
    data: {
      patientId: patientProfileId,
      type: "OTHER",
      title: encrypt(title),
      content: encrypt(content),
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
  const docLink = chartId
    ? `${patientChartPathForSpecialty(professional.specialty, chartId)}?recordId=${doc.id}`
    : `${professionalSharedPathForSpecialty(professional.specialty)}?documentId=${doc.id}`;

  const already = await db.sharedRecord.findFirst({
    where: {
      documentId: doc.id,
      sharedWithProfessionalId: professional.id,
      sharedByUserId: userId,
    },
    select: { id: true },
  });

  if (!already) {
    await db.sharedRecord.create({
      data: {
        documentId: doc.id,
        patientId: patientProfileId,
        sharedWithUserId: professional.userId,
        sharedByUserId: userId,
        sharedWithProfessionalId: professional.id,
      },
    });
  }

  await db.message.create({
    data: {
      senderId: userId,
      receiverId: professional.userId,
      content: encrypt(`📎 Termo de psicologia assinado: ${title}\n${docLink}`),
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
      kind: "patient_psychology_term",
      termId,
      titleKey: "notif.docShared.title",
      bodyKey: "notif.docShared.body",
      bodyParams: { name: patientName, title },
    },
  });

  let autoAttached = false;
  if (chartId) {
    const attachResult = await attachSharedDocumentToChart({
      documentId: doc.id,
      chartId,
      professionalId: professional.id,
    });
    if (attachResult && !attachResult.alreadyAttached) {
      autoAttached = true;
      const chartLink = `${getAppUrl()}${patientChartPathForSpecialty(professional.specialty, chartId)}?recordId=${attachResult.recordId}`;
      await db.message.create({
        data: {
          senderId: userId,
          receiverId: professional.userId,
          content: encrypt(`✅ Termo adicionado à ficha: ${title}\n${chartLink}`),
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    termId,
    autoAttached,
    professionalName,
  }, { status: 201 });
}
