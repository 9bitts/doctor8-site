// Notify patient when a professional links their chart to an existing account.

import { db } from "@/lib/db";
import {
  getAppUrl,
  normEmailLang,
  sendTransactionalEmail,
  emailShell,
  type EmailLang,
} from "@/lib/email-core";
import { createNotification } from "@/lib/notifications";
import { safeDecrypt } from "@/lib/sign-helpers";

const COPY: Record<
  EmailLang,
  {
    subject: (doctor: string) => string;
    heading: string;
    hi: (name: string) => string;
    body: (doctor: string) => string;
    cta: string;
    footnote: string;
  }
> = {
  en: {
    subject: (d) => `Dr. ${d} linked your health chart on Doctor8`,
    heading: "Your chart is now linked",
    hi: (n) => `Hi <strong>${n}</strong>,`,
    body: (d) =>
      `Dr. ${d} linked your medical chart to your Doctor8 account. You can view shared documents and manage your care in one place.`,
    cta: "View my professionals",
    footnote:
      "If you do not recognize this professional, contact support@doctor8.org immediately.",
  },
  pt: {
    subject: (d) => `Dr. ${d} vinculou sua ficha no Doctor8`,
    heading: "Sua ficha foi vinculada",
    hi: (n) => `Ol? <strong>${n}</strong>,`,
    body: (d) =>
      `O Dr. ${d} vinculou sua ficha m?dica ? sua conta Doctor8. Voc? pode ver documentos compartilhados e acompanhar seu cuidado em um s? lugar.`,
    cta: "Ver meus profissionais",
    footnote:
      "Se voc? n?o reconhece este profissional, entre em contato com support@doctor8.org imediatamente.",
  },
  es: {
    subject: (d) => `El Dr. ${d} vincul? su ficha en Doctor8`,
    heading: "Su ficha fue vinculada",
    hi: (n) => `Hola <strong>${n}</strong>,`,
    body: (d) =>
      `El Dr. ${d} vincul? su ficha m?dica a su cuenta Doctor8. Puede ver documentos compartidos y gestionar su atenci?n en un solo lugar.`,
    cta: "Ver mis profesionales",
    footnote:
      "Si no reconoce a este profesional, contacte support@doctor8.org de inmediato.",
  },
};

export async function notifyPatientChartLinked(opts: {
  patientUserId: string;
  patientEmail: string;
  patientName: string;
  doctorName: string;
  language?: string | null;
}): Promise<void> {
  const lang = normEmailLang(opts.language ?? undefined);
  const c = COPY[lang];
  const providersUrl = `${getAppUrl()}/patient/providers`;

  const title =
    lang === "pt"
      ? "Ficha vinculada"
      : lang === "es"
        ? "Ficha vinculada"
        : "Chart linked";
  const body =
    lang === "pt"
      ? `${opts.doctorName} vinculou sua ficha ? sua conta.`
      : lang === "es"
        ? `${opts.doctorName} vincul? su ficha a su cuenta.`
        : `${opts.doctorName} linked your chart to your account.`;

  await createNotification({
    userId: opts.patientUserId,
    title,
    body,
    type: "system",
    data: { url: "/patient/providers" },
  });

  if (!process.env.RESEND_API_KEY) return;

  const htmlBody = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(opts.patientName)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(opts.doctorName)}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${providersUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">${c.footnote}</p>`;

  await sendTransactionalEmail({
    to: opts.patientEmail,
    subject: c.subject(opts.doctorName.replace(/^Dr\.\s*/i, "")),
    html: emailShell(c.heading, htmlBody, lang),
    tag: "chart-linked",
  });
}

/** Resolves patient display name from profile for notifications. */
export async function patientDisplayName(userId: string): Promise<string> {
  const profile = await db.patientProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  if (!profile) return "Paciente";
  const first = safeDecrypt(profile.firstName);
  const last = safeDecrypt(profile.lastName);
  return `${first} ${last}`.trim() || "Paciente";
}
