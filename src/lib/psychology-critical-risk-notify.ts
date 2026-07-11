import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { emailShell, getAppUrl, normEmailLang, sendTransactionalEmail } from "@/lib/email-core";
import type { ClinicalRiskAssessment } from "@/lib/psychology-risk";
import { safeDecrypt } from "@/lib/psychology-api";

const EMAIL_COPY = {
  pt: {
    subject: (name: string) => `Alerta crítico — ${name}`,
    heading: "Alerta crítico de risco clínico",
    intro: (name: string, scale: string) =>
      `A escala <strong>${scale}</strong> do paciente <strong>${name}</strong> indicou risco crítico (item de ideação suicida positivo).`,
    guidance:
      "Avalie o risco imediatamente, registre medidas de proteção e encaminhamento se necessário, conforme a Resolução CFP nº 09/2024.",
    cta: "Abrir prontuário",
  },
  en: {
    subject: (name: string) => `Critical alert — ${name}`,
    heading: "Critical clinical risk alert",
    intro: (name: string, scale: string) =>
      `Scale <strong>${scale}</strong> for patient <strong>${name}</strong> flagged critical risk (positive suicidal ideation item).`,
    guidance:
      "Assess risk immediately, document protective measures and referral if needed, per CFP Resolution 09/2024.",
    cta: "Open chart",
  },
  es: {
    subject: (name: string) => `Alerta crítica — ${name}`,
    heading: "Alerta crítica de riesgo clínico",
    intro: (name: string, scale: string) =>
      `La escala <strong>${scale}</strong> del paciente <strong>${name}</strong> indicó riesgo crítico (ítem de ideación suicida positivo).`,
    guidance:
      "Evalúe el riesgo de inmediato, registre medidas de protección y derivación si es necesario, según la Resolución CFP nº 09/2024.",
    cta: "Abrir historial",
  },
} as const;

function notificationCopy(
  lang: "pt" | "en" | "es",
  patientName: string,
  risk: ClinicalRiskAssessment,
): { title: string; body: string } {
  const msg =
    lang === "en" ? risk.messageEn : lang === "es" ? risk.messageEs : risk.messagePt;
  return {
    title:
      lang === "en"
        ? `Critical alert — ${patientName}`
        : lang === "es"
          ? `Alerta crítica — ${patientName}`
          : `Alerta crítico — ${patientName}`,
    body: msg,
  };
}

/** In-app notification + email when a scale yields critical risk (e.g. PHQ-9 item 9 ≥ 1). */
export async function notifyPsychologyCriticalRisk(opts: {
  professionalId: string;
  patientRecordId: string;
  scaleId: string;
  documentId: string;
  risk: ClinicalRiskAssessment;
}): Promise<void> {
  const [professional, record] = await Promise.all([
    db.professionalProfile.findUnique({
      where: { id: opts.professionalId },
      select: { userId: true, specialty: true },
    }),
    db.patientRecord.findUnique({
      where: { id: opts.patientRecordId },
      select: { firstName: true, lastName: true },
    }),
  ]);

  if (!professional) return;

  const patientName = record
    ? `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim() || "Paciente"
    : "Paciente";

  const chartPath = `/psychologist/patients/${opts.patientRecordId}`;
  const user = await db.user.findUnique({
    where: { id: professional.userId },
    select: { language: true, email: true },
  });
  const lang = normEmailLang(user?.language);
  const copy = notificationCopy(lang, patientName, opts.risk);

  await createNotification({
    userId: professional.userId,
    title: copy.title,
    body: copy.body,
    type: "system",
    data: {
      link: chartPath,
      kind: "psychology_critical_risk",
      patientRecordId: opts.patientRecordId,
      scaleId: opts.scaleId,
      documentId: opts.documentId,
      level: "critical",
    },
  });

  if (!user?.email || !process.env.RESEND_API_KEY) return;

  const email = EMAIL_COPY[lang];
  const appUrl = getAppUrl();
  const chartUrl = `${appUrl}${chartPath}`;

  try {
    const body = `
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        ${email.intro(patientName, opts.scaleId)}
      </p>
      <p style="color:#b45309;font-size:14px;line-height:1.6;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
        ${email.guidance}
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${chartUrl}" style="background:#7c3aed;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          ${email.cta}
        </a>
      </div>`;

    await sendTransactionalEmail({
      to: user.email,
      subject: email.subject(patientName),
      html: emailShell(email.heading, body, lang),
      tag: "psychology-critical-risk",
    });
  } catch (e) {
    console.error("[PSYCHOLOGY-CRITICAL-RISK EMAIL]", professional.userId, e);
  }
}
