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

// ── Prescription invite (patient WITHOUT an account yet) ──────────────────────
// Sent when a doctor prescribes for a chart whose patient has no account.
// Invites them to create an account so the prescription becomes accessible.
// Language follows the doctor's panel language (passed in).

const INVITE: Record<EmailLang, {
  subject: (d: string) => string;
  heading: string;
  hi: (n: string) => string;
  body: (d: string) => string;
  cta: string;
  footnote: string;
  orCopy: string;
  privacy: string;
}> = {
  en: {
    subject: (d) => `Dr. ${d} sent you a prescription on Doctor8`,
    heading: "You have a prescription waiting",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: (d) => `Dr. ${d} has issued a digital prescription for you. Create your free Doctor8 account with this email to view and download it.`,
    cta: "Create my account",
    footnote: "Once you sign up and verify your email, your prescription will be waiting in your account.",
    orCopy: "Or copy this link:",
    privacy: "Privacy Policy",
  },
  pt: {
    subject: (d) => `Dr. ${d} enviou uma receita para você no Doctor8`,
    heading: "Você tem uma receita esperando",
    hi: (n) => `Olá <strong>${n}</strong>,`,
    body: (d) => `O Dr. ${d} emitiu uma receita digital para você. Crie sua conta gratuita no Doctor8 com este email para visualizar e baixar.`,
    cta: "Criar minha conta",
    footnote: "Assim que você se cadastrar e verificar seu email, sua receita estará esperando na sua conta.",
    orCopy: "Ou copie este link:",
    privacy: "Política de Privacidade",
  },
  es: {
    subject: (d) => `El Dr. ${d} te envió una receta en Doctor8`,
    heading: "Tienes una receta esperando",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: (d) => `El Dr. ${d} ha emitido una receta digital para ti. Crea tu cuenta gratuita en Doctor8 con este email para verla y descargarla.`,
    cta: "Crear mi cuenta",
    footnote: "Una vez que te registres y verifiques tu email, tu receta estará esperando en tu cuenta.",
    orCopy: "O copia este enlace:",
    privacy: "Política de Privacidad",
  },
};

export async function sendPrescriptionInvite({
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
  const c = INVITE[lang];
  const signupUrl = `${getAppUrl()}/register?email=${encodeURIComponent(patientEmail)}`;

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(patientName)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(doctorName)}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${signupUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">${c.footnote}</p>
    <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
      ${c.orCopy} <a href="${signupUrl}" style="color:#0a4d6e;">${signupUrl}</a>
    </p>`;

  await sendTransactionalEmail({
    to: patientEmail,
    subject: c.subject(doctorName),
    html: emailShell(c.heading, body, lang),
    tag: "prescription-invite",
  });
}
