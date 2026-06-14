// src/lib/email-prescription.ts
// Email sent to a patient (who already has an account) when they receive a new
// prescription. Kept in its own file so we don't touch the existing email.ts.
//
// IMPORTANT (HIPAA/LGPD): this email does NOT contain the prescription itself or
// any clinical data — only a notice that a new prescription is available and a
// link to sign in. The patient sees the content only after logging in.

import { Resend } from "resend";

let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  }
  return resendInstance;
}

const FROM = process.env.EMAIL_FROM || "Doctor8 <noreply@doctor8.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";

type Lang = "en" | "pt" | "es";

function normLang(v: string | null | undefined): Lang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

const COPY: Record<Lang, {
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
  const link = `${APP_URL}/patient/documents`;

  await getResend().emails.send({
    from: FROM,
    to: patientEmail,
    subject: c.subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
          <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
            <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">Doctor<span style="color:#a7f3d0;">8</span></h1>
            <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">${c.heading}</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#1a2a3a;font-size:16px;">${c.hi(patientName)}</p>
            <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(doctorName)}</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${link}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                ${c.cta}
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;">${c.footnote}</p>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
          Doctor8 &middot; HIPAA &amp; GDPR Compliant &middot;
          <a href="${APP_URL}/privacy" style="color:#9ca3af;">${c.privacy}</a>
        </p>
      </div>
    `,
  });
}
