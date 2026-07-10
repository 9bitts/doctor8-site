// src/lib/email-prescription.ts
// Email sent to a patient (who already has an account) when they receive a new
// prescription. Kept in its own file so we don't touch the existing email.ts.
//
// IMPORTANT (HIPAA/LGPD): this email does NOT contain the prescription itself or
// any clinical data — only a notice that a new prescription is available and a
// link to sign in. The patient sees the content only after logging in.

import {
  getAppUrl,
  normEmailLang,
  sendTransactionalEmail,
  emailShell,
  type EmailLang,
} from "./email-core";

function normLang(v: string | null | undefined): EmailLang {
  return normEmailLang(v);
}

const COPY: Record<EmailLang, {
  subject: string;
  heading: string;
  hi: (n: string) => string;
  body: (d: string) => string;
  cta: string;
  footnote: string;
  privacy: string;
}> = {
  en: {
    subject: "You have a new prescription on Doctor8",
    heading: "New prescription available",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: (d) => `Dr. ${d} has issued a new digital prescription for you. Sign in to your Doctor8 account to view and download it.`,
    cta: "View my prescription",
    footnote: "For your privacy, the prescription details are not included in this email. You can access them securely in your account.",
    privacy: "Privacy Policy",
  },
  pt: {
    subject: "Você tem uma nova receita no Doctor8",
    heading: "Nova receita disponível",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    body: (d) => `O Dr. ${d} emitiu uma nova receita digital para você. Acesse sua conta no Doctor8 para visualizar e baixar.`,
    cta: "Ver minha receita",
    footnote: "Para sua privacidade, os detalhes da receita não são incluídos neste email. Você pode acessá-los com segurança na sua conta.",
    privacy: "Política de Privacidade",
  },
  es: {
    subject: "Tienes una nueva receta en Doctor8",
    heading: "Nueva receta disponible",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: (d) => `El Dr. ${d} ha emitido una nueva receta digital para ti. Inicia sesión en tu cuenta de Doctor8 para verla y descargarla.`,
    cta: "Ver mi receta",
    footnote: "Por tu privacidad, los detalles de la receta no se incluyen en este email. Puedes acceder a ellos de forma segura en tu cuenta.",
    privacy: "Política de Privacidad",
  },
};

export async function sendPrescriptionNotification({
  patientEmail,
  patientName,
  doctorName,
  language,
}: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  language?: string;
}) {
  const lang = normLang(language);
  const c = COPY[lang];
  const link = `${getAppUrl()}/patient/prescriptions`;

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(patientName)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(doctorName)}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${link}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">${c.footnote}</p>`;

  await sendTransactionalEmail({
    to: patientEmail,
    subject: c.subject,
    html: emailShell(c.heading, body, lang),
    tag: "prescription-notification",
  });
}

export async function sendPrescriptionInvite(opts: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  language?: string;
}) {
  const { sendPatientInvite } = await import("@/lib/email");
  return sendPatientInvite({
    email: opts.patientEmail,
    patientName: opts.patientName,
    doctorName: opts.doctorName,
    language: opts.language,
  });
}
