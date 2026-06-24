// src/lib/email.ts
// Email sending via Resend
// Used for: appointment confirmations, reminders, password reset, email verification

import {
  getAppUrl,
  normEmailLang,
  sendTransactionalEmail,
  emailShell,
  EMAIL_LOCALE,
  type EmailLang,
} from "./email-core";
import {
  EMAIL_VERIFICATION,
  EMAIL_PASSWORD_RESET,
  EMAIL_CHANGE,
  EMAIL_APPOINTMENT_CONFIRM,
  EMAIL_APPOINTMENT_REMINDER,
  EMAIL_PATIENT_INVITE,
  EMAIL_COLLEAGUE_INVITE,
} from "./email-i18n";

// ─── EMAIL VERIFICATION ──────────────────────────────────────────────────────
export async function sendEmailVerification({
  email,
  name,
  token,
  language,
}: {
  email: string;
  name: string;
  token: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_VERIFICATION[lang];
  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(name)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">
      ${c.expires}<br>
      ${c.ignore}
    </p>
    <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
      ${c.orCopy} <a href="${verifyUrl}" style="color:#0a4d6e;">${verifyUrl}</a>
    </p>`;

  const text = [
    c.hi(name).replace(/<[^>]+>/g, ""),
    c.body,
    `${c.cta}: ${verifyUrl}`,
    c.expires.replace(/<[^>]+>/g, ""),
    c.ignore,
  ].join("\n\n");

  await sendTransactionalEmail({
    to: email,
    subject: c.subject,
    html: emailShell(c.heading, body, lang),
    text,
    tag: "email-verification",
  });
}

// ─── APPOINTMENT CONFIRMATION ─────────────────────────────────────────────────
export async function sendAppointmentConfirmation({
  patientEmail,
  patientName,
  doctorName,
  specialty,
  scheduledAt,
  type,
  meetingUrl,
  appointmentId,
  language,
}: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  scheduledAt: Date;
  type: string;
  meetingUrl?: string;
  appointmentId: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_APPOINTMENT_CONFIRM[lang];
  const locale = EMAIL_LOCALE[lang];

  const dateStr = scheduledAt.toLocaleDateString(locale, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = scheduledAt.toLocaleTimeString(locale, {
    hour: "2-digit", minute: "2-digit",
  });
  const appUrl = getAppUrl();

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(patientName)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.intro}</p>
    <div style="background:#f0fdf9;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
      <table style="width:100%;font-size:14px;">
        <tr><td style="color:#6b7280;padding:6px 0;width:140px;">${c.doctor}</td><td style="color:#1a2a3a;font-weight:600;">Dr. ${doctorName}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 0;">${c.specialty}</td><td style="color:#1a2a3a;">${specialty}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 0;">${c.date}</td><td style="color:#1a2a3a;font-weight:600;">${dateStr}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 0;">${c.time}</td><td style="color:#1a2a3a;font-weight:600;">${timeStr}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 0;">${c.type}</td><td style="color:#1a2a3a;">${type === "TELECONSULT" ? c.teleconsult : c.inPerson}</td></tr>
      </table>
    </div>
    ${meetingUrl ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${meetingUrl}" style="background:#0a4d6e;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          ${c.join}
        </a>
      </div>
    ` : ""}
    <p style="color:#6b7280;font-size:13px;text-align:center;">
      ${c.reminderNote}<br>
      <a href="${appUrl}/patient/appointments/${appointmentId}" style="color:#0a4d6e;">${c.view}</a> &middot;
      <a href="${appUrl}/patient/appointments/${appointmentId}/cancel" style="color:#dc2626;">${c.cancel}</a>
    </p>`;

  await sendTransactionalEmail({
    to: patientEmail,
    subject: c.subject(dateStr),
    html: emailShell(c.heading, body, lang),
    tag: "appointment-confirmation",
  });
}

// ─── APPOINTMENT REMINDER ─────────────────────────────────────────────────────
export async function sendAppointmentReminder({
  patientEmail,
  patientName,
  doctorName,
  scheduledAt,
  meetingUrl,
  hoursUntil,
  language,
}: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  meetingUrl?: string;
  hoursUntil: number;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_APPOINTMENT_REMINDER[lang];
  const locale = EMAIL_LOCALE[lang];
  const timeStr = scheduledAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const body = `
    <h2 style="color:#0a4d6e;margin:0 0 16px;">${c.heading}</h2>
    <p style="color:#374151;">${c.hi(patientName)}</p>
    <p style="color:#6b7280;">${c.body(doctorName, hoursUntil, timeStr)}</p>
    ${meetingUrl ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${meetingUrl}" style="background:#00b87a;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">
          ${c.join}
        </a>
      </div>
    ` : ""}`;

  await sendTransactionalEmail({
    to: patientEmail,
    subject: c.subject(doctorName, hoursUntil),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:32px;">
          ${body}
        </div>
      </div>`,
    tag: "appointment-reminder",
  });
}

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────
export async function sendPasswordReset({
  email,
  name,
  token,
  language,
}: {
  email: string;
  name: string;
  token: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_PASSWORD_RESET[lang];
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  const body = `
    <h2 style="color:#1a2a3a;">${c.heading}</h2>
    <p style="color:#6b7280;">${c.hi(name)} ${c.body}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background:#0a4d6e;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;">${c.ignore}</p>
    <p style="color:#9ca3af;font-size:11px;">${c.linkLabel} ${resetUrl}</p>`;

  await sendTransactionalEmail({
    to: email,
    subject: c.subject,
    html: emailShell(c.heading, body, lang),
    tag: "password-reset",
  });
}

// ─── EMAIL CHANGE VERIFICATION ────────────────────────────────────────────────
export async function sendEmailChangeVerification({
  email,
  name,
  token,
  isOldEmail,
  language,
}: {
  email: string;
  name: string;
  token: string;
  isOldEmail: boolean;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_CHANGE[lang];
  const verifyUrl = `${getAppUrl()}/api/auth/confirm-email-change?token=${token}`;

  const heading = isOldEmail ? c.headingOld : c.headingNew;
  const bodyText = isOldEmail ? c.bodyOld : c.bodyNew(email);
  const cta = isOldEmail ? c.ctaOld : c.ctaNew;

  const body = `
    <h2 style="color:#1a2a3a;">${heading}</h2>
    <p style="color:#6b7280;">${c.hi(name)} ${bodyText}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="background:#0a4d6e;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">
        ${cta}
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;">${c.ignore}</p>`;

  await sendTransactionalEmail({
    to: email,
    subject: isOldEmail ? c.subjectOld : c.subjectNew,
    html: emailShell(heading, body, lang),
    tag: "email-change",
  });
}

// ─── PATIENT INVITE (record sharing) ──────────────────────────────────────
export async function sendPatientInvite({
  email,
  patientName,
  doctorName,
  language,
}: {
  email: string;
  patientName: string;
  doctorName: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_PATIENT_INVITE[lang];
  const signupUrl = `${getAppUrl()}/register?email=${encodeURIComponent(email)}`;

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
    to: email,
    subject: c.subject(doctorName),
    html: emailShell(c.heading, body, lang),
    tag: "patient-invite",
  });
}

export async function sendColleagueResourceInvite({
  email,
  recipientName,
  senderName,
  resourceTitle,
  resourceUrl,
  loginUrl,
  whatsappPhone,
  language,
}: {
  email: string;
  recipientName: string;
  senderName: string;
  resourceTitle: string;
  resourceUrl: string | null;
  loginUrl: boolean;
  whatsappPhone?: string | null;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_COLLEAGUE_INVITE[lang];
  const appUrl = getAppUrl();
  const actionUrl = loginUrl ? `${appUrl}/login` : `${appUrl}/register`;
  const actionLabel = loginUrl ? c.ctaLogin : c.ctaRegister;

  const resourceBlock = resourceUrl
    ? `<div style="background:#f0fdf9;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">${resourceTitle}</p>
        <a href="${resourceUrl}" style="color:#0a4d6e;font-size:13px;word-break:break-all;">${resourceUrl}</a>
       </div>`
    : `<div style="background:#f0fdf9;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#374151;font-size:14px;font-weight:600;">${resourceTitle}</p>
       </div>`;

  const whatsappBlock = whatsappPhone
    ? `<p style="color:#6b7280;font-size:13px;margin-top:16px;">
        ${c.whatsapp}
        <a href="https://wa.me/${whatsappPhone.replace(/\D/g, "")}" style="color:#25D366;font-weight:600;">${c.whatsappLink}</a>
       </p>`
    : "";

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(recipientName)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(senderName)}</p>
    ${resourceBlock}
    <div style="text-align:center;margin:28px 0;">
      <a href="${actionUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${actionLabel}
      </a>
    </div>
    ${whatsappBlock}
    <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
      ${c.accessAt} <a href="${actionUrl}" style="color:#0a4d6e;">${actionUrl}</a>
    </p>`;

  await sendTransactionalEmail({
    to: email,
    subject: c.subject(senderName),
    html: emailShell(c.heading, body, lang),
    tag: "colleague-invite",
  });
}
