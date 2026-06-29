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
  EMAIL_ORG_STAFF_INVITE,
  orgRoleLabel,
  EMAIL_SLOT_ALERT,
  EMAIL_REVIEW_REQUEST,
  EMAIL_MAGIC_LINK,
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

// ─── MAGIC LINK (passwordless booking login) ─────────────────────────────────
export async function sendMagicLinkLogin({
  email,
  name,
  token,
  callbackUrl,
  language,
}: {
  email: string;
  name: string;
  token: string;
  callbackUrl: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_MAGIC_LINK[lang];
  const loginUrl = `${getAppUrl()}/auth/magic?token=${encodeURIComponent(token)}&callback=${encodeURIComponent(callbackUrl)}`;

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(name)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${loginUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">
      ${c.expires}<br>
      ${c.ignore}
    </p>
    <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
      ${c.orCopy} <a href="${loginUrl}" style="color:#0a4d6e;">${loginUrl}</a>
    </p>`;

  const text = [
    c.hi(name).replace(/<[^>]+>/g, ""),
    c.body,
    `${c.cta}: ${loginUrl}`,
    c.expires.replace(/<[^>]+>/g, ""),
    c.ignore,
  ].join("\n\n");

  await sendTransactionalEmail({
    to: email,
    subject: c.subject,
    html: emailShell(c.heading, body, lang),
    text,
    tag: "magic-link",
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
  const calendarUrl = `${appUrl}/api/appointments/${appointmentId}/calendar`;

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
    <div style="text-align:center;margin:24px 0;">
      <a href="${calendarUrl}" style="background:#f0fdf9;color:#0a4d6e;border:2px solid #0a4d6e;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
        ${c.addToCalendar}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">
      ${c.reminderNote}<br>
      <a href="${appUrl}/patient/appointments?id=${appointmentId}" style="color:#0a4d6e;">${c.view}</a> &middot;
      <a href="${appUrl}/patient/appointments?id=${appointmentId}" style="color:#dc2626;">${c.cancel}</a>
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
  whatsappUrl,
}: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  meetingUrl?: string;
  hoursUntil: number;
  language?: string;
  whatsappUrl?: string;
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
    ` : ""}
    ${whatsappUrl ? `
      <div style="text-align:center;margin:16px 0;">
        <a href="${whatsappUrl}" style="background:#25D366;color:white;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
          WhatsApp
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
    <p style="color:#4a6070;font-size:15px;line-height:1.6;">${c.hi(name)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">${c.ignore}</p>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;word-break:break-all;">
      ${c.linkLabel}<br>
      <a href="${resetUrl}" style="color:#0a4d6e;">${resetUrl}</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;line-height:1.5;margin-top:20px;">${c.spamHint}</p>`;

  const text = [
    c.hi(name),
    c.body,
    `${c.cta}: ${resetUrl}`,
    c.ignore,
    c.spamHint,
  ].join("\n\n");

  await sendTransactionalEmail({
    to: email,
    subject: c.subject,
    html: emailShell(c.heading, body, lang),
    text,
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

export async function sendSlotAvailableAlert({
  email,
  providerName,
  timeLabel,
  bookUrl,
  language,
}: {
  email: string;
  providerName: string;
  timeLabel: string;
  bookUrl: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_SLOT_ALERT[lang];

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(providerName, timeLabel)}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${bookUrl}" style="background:#216a86;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;">${c.footnote}</p>`;

  await sendTransactionalEmail({
    to: email,
    subject: c.subject(providerName),
    html: emailShell(c.heading, body, lang),
    text: [
      c.hi,
      c.body(providerName, timeLabel).replace(/<[^>]+>/g, ""),
      `${c.cta}: ${bookUrl}`,
      c.footnote,
    ].join("\n\n"),
    tag: "slot-alert",
  });
}

export async function sendReviewRequest({
  email,
  patientName,
  providerName,
  reviewUrl,
  language,
}: {
  email: string;
  patientName: string;
  providerName: string;
  reviewUrl: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_REVIEW_REQUEST[lang];

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi(patientName)}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(providerName)}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${reviewUrl}" style="background:#216a86;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;">${c.footnote}</p>`;

  await sendTransactionalEmail({
    to: email,
    subject: c.subject(providerName),
    html: emailShell(c.heading, body, lang),
    text: [
      c.hi(patientName).replace(/<[^>]+>/g, ""),
      c.body(providerName).replace(/<[^>]+>/g, ""),
      `${c.cta}: ${reviewUrl}`,
      c.footnote,
    ].join("\n\n"),
    tag: "review-request",
  });
}

export async function sendOrganizationStaffInvite({
  email,
  organizationName,
  role,
  token,
  language,
}: {
  email: string;
  organizationName: string;
  role: string;
  token: string;
  language?: string;
}) {
  const lang = normEmailLang(language);
  const c = EMAIL_ORG_STAFF_INVITE[lang];
  const roleLabel = orgRoleLabel(role, lang);
  const acceptUrl = `${getAppUrl()}/register/organization/staff?token=${encodeURIComponent(token)}`;

  const body = `
    <p style="color:#1a2a3a;font-size:16px;">${c.hi}</p>
    <p style="color:#4a6070;font-size:14px;line-height:1.6;">${c.body(organizationName, roleLabel)}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${acceptUrl}" style="background:#4f46e5;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        ${c.cta}
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;">${c.expires}</p>
    <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
      ${c.orCopy} <a href="${acceptUrl}" style="color:#4f46e5;">${acceptUrl}</a>
    </p>`;

  await sendTransactionalEmail({
    to: email,
    subject: c.subject(organizationName),
    html: emailShell(c.heading, body, lang),
    text: [
      c.hi,
      c.body(organizationName, roleLabel).replace(/<[^>]+>/g, ""),
      `${c.cta}: ${acceptUrl}`,
      c.expires.replace(/<[^>]+>/g, ""),
    ].join("\n\n"),
    tag: "org-staff-invite",
  });
}
