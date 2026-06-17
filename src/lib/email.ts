// src/lib/email.ts
// Email sending via Resend
// Used for: appointment confirmations, reminders, password reset, email verification

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

// ─── EMAIL VERIFICATION ──────────────────────────────────────────────────────
export async function sendEmailVerification({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Verify your Doctor8 email address",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
          <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
            <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">Doctor<span style="color:#a7f3d0;">8</span></h1>
            <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">Confirm your email address</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#1a2a3a;font-size:16px;">Hi <strong>${name}</strong>,</p>
            <p style="color:#4a6070;font-size:14px;line-height:1.6;">
              Welcome to Doctor8! Please verify your email address to complete your registration and access your account.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;">
              This link expires in <strong>24 hours</strong>.<br>
              If you didn't create a Doctor8 account, you can safely ignore this email.
            </p>
            <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
              Or copy this link: <a href="${verifyUrl}" style="color:#0a4d6e;">${verifyUrl}</a>
            </p>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
          Doctor8 &middot; HIPAA &amp; GDPR Compliant &middot;
          <a href="${APP_URL}/privacy" style="color:#9ca3af;">Privacy Policy</a>
        </p>
      </div>
    `,
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
}: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  scheduledAt: Date;
  type: string;
  meetingUrl?: string;
  appointmentId: string;
}) {
  const dateStr = scheduledAt.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = scheduledAt.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  await getResend().emails.send({
    from: FROM,
    to: patientEmail,
    subject: `✅ Appointment confirmed – ${dateStr}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
          <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
            <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">Doctor<span style="color:#a7f3d0;">8</span></h1>
            <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">Your appointment is confirmed</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#1a2a3a;font-size:16px;">Hi <strong>${patientName}</strong>,</p>
            <p style="color:#4a6070;font-size:14px;line-height:1.6;">Your appointment has been successfully booked. Here are the details:</p>
            <div style="background:#f0fdf9;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
              <table style="width:100%;font-size:14px;">
                <tr><td style="color:#6b7280;padding:6px 0;width:140px;">Doctor</td><td style="color:#1a2a3a;font-weight:600;">Dr. ${doctorName}</td></tr>
                <tr><td style="color:#6b7280;padding:6px 0;">Specialty</td><td style="color:#1a2a3a;">${specialty}</td></tr>
                <tr><td style="color:#6b7280;padding:6px 0;">Date</td><td style="color:#1a2a3a;font-weight:600;">${dateStr}</td></tr>
                <tr><td style="color:#6b7280;padding:6px 0;">Time</td><td style="color:#1a2a3a;font-weight:600;">${timeStr}</td></tr>
                <tr><td style="color:#6b7280;padding:6px 0;">Type</td><td style="color:#1a2a3a;">${type === "TELECONSULT" ? "🎥 Teleconsultation (online)" : "🏥 In-person"}</td></tr>
              </table>
            </div>
            ${meetingUrl ? `
              <div style="text-align:center;margin:24px 0;">
                <a href="${meetingUrl}" style="background:#0a4d6e;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
                  Join Consultation
                </a>
              </div>
            ` : ""}
            <p style="color:#6b7280;font-size:13px;text-align:center;">
              You will receive a reminder 24 hours and 1 hour before your appointment.<br>
              <a href="${APP_URL}/patient/appointments/${appointmentId}" style="color:#0a4d6e;">View appointment</a> &middot;
              <a href="${APP_URL}/patient/appointments/${appointmentId}/cancel" style="color:#dc2626;">Cancel</a>
            </p>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
          Doctor8 &middot; HIPAA &amp; GDPR Compliant &middot; <a href="${APP_URL}/privacy" style="color:#9ca3af;">Privacy Policy</a>
        </p>
      </div>
    `,
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
}: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  meetingUrl?: string;
  hoursUntil: number;
}) {
  const timeStr = scheduledAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  await getResend().emails.send({
    from: FROM,
    to: patientEmail,
    subject: `⏰ Reminder: Appointment with Dr. ${doctorName} in ${hoursUntil}h`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:32px;">
          <h2 style="color:#0a4d6e;margin:0 0 16px;">⏰ Upcoming appointment</h2>
          <p style="color:#374151;">Hi ${patientName},</p>
          <p style="color:#6b7280;">You have an appointment with <strong>Dr. ${doctorName}</strong> in <strong>${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}</strong> at <strong>${timeStr}</strong>.</p>
          ${meetingUrl ? `
            <div style="text-align:center;margin:24px 0;">
              <a href="${meetingUrl}" style="background:#00b87a;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">
                Join Now
              </a>
            </div>
          ` : ""}
        </div>
      </div>
    `,
  });
}

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────
export async function sendPasswordReset({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Doctor8 password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px 20px;">
        <h1 style="color:#0a4d6e;">Doctor<span style="color:#00b87a;">8</span></h1>
        <h2 style="color:#1a2a3a;">Reset your password</h2>
        <p style="color:#6b7280;">Hi ${name}, click the button below to reset your password. This link expires in 1 hour.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" style="background:#0a4d6e;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">
            Reset Password
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;">If you didn't request this, ignore this email. Your password won't change.</p>
        <p style="color:#9ca3af;font-size:11px;">Link: ${resetUrl}</p>
      </div>
    `,
  });
}

// ─── EMAIL CHANGE VERIFICATION ────────────────────────────────────────────────
export async function sendEmailChangeVerification({
  email,
  name,
  token,
  isOldEmail,
}: {
  email: string;
  name: string;
  token: string;
  isOldEmail: boolean;
}) {
  const verifyUrl = `${APP_URL}/api/auth/verify-email-change?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: isOldEmail ? "Confirm email address change" : "Verify your new email address",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px 20px;">
        <h1 style="color:#0a4d6e;">Doctor<span style="color:#00b87a;">8</span></h1>
        <h2>${isOldEmail ? "Confirm email change" : "Verify new email"}</h2>
        <p style="color:#6b7280;">Hi ${name}, ${isOldEmail
          ? "click below to confirm you want to change your email address."
          : "click below to verify your new email address."
        } This link expires in 24 hours.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#0a4d6e;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">
${isOldEmail ? "Confirm Change" : "Verify Email"}
          </a>
        </div>
      </div>
    `,
  });
}

// ─── PATIENT INVITE (record sharing) ──────────────────────────────────────
export async function sendPatientInvite({
  email,
  patientName,
  doctorName,
}: {
  email: string;
  patientName: string;
  doctorName: string;
}) {
  const signupUrl = `${APP_URL}/register?email=${encodeURIComponent(email)}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Dr. ${doctorName} shared health records with you on Doctor8`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
          <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
            <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">Doctor<span style="color:#a7f3d0;">8</span></h1>
            <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">You've been invited</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#1a2a3a;font-size:16px;">Hi <strong>${patientName}</strong>,</p>
            <p style="color:#4a6070;font-size:14px;line-height:1.6;">
              <strong>Dr. ${doctorName}</strong> would like to share your health records with you
              securely through Doctor8. To access them, create your free account using this email address.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${signupUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                Create my account
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;">
              Once you sign up, your doctor can share exams, results and other records with you safely.
            </p>
            <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
              Or copy this link: <a href="${signupUrl}" style="color:#0a4d6e;">${signupUrl}</a>
            </p>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
          Doctor8 &middot; HIPAA &amp; GDPR Compliant &middot;
          <a href="${APP_URL}/privacy" style="color:#9ca3af;">Privacy Policy</a>
        </p>
      </div>
    `,
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
}: {
  email: string;
  recipientName: string;
  senderName: string;
  resourceTitle: string;
  resourceUrl: string | null;
  loginUrl: boolean;   // true = has account (link to login), false = invite to register
  whatsappPhone?: string | null;
}) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const actionUrl = loginUrl
    ? `${APP_URL}/login`
    : `${APP_URL}/register`;
  const actionLabel = loginUrl ? "Ver na minha conta" : "Criar conta e ver recurso";
  const subjectLine = `${senderName} compartilhou um recurso com você no Doctor8`;

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
        Você também pode entrar em contato pelo WhatsApp:
        <a href="https://wa.me/${whatsappPhone.replace(/\D/g, "")}" style="color:#25D366;font-weight:600;">Abrir WhatsApp</a>
       </p>`
    : "";

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: subjectLine,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f8fafc;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
          <div style="background:linear-gradient(135deg,#0a4d6e,#00b87a);padding:32px;text-align:center;">
            <h1 style="color:white;font-size:28px;font-weight:900;margin:0;">Doctor<span style="color:#a7f3d0;">8</span></h1>
            <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">Recurso compartilhado por colega</p>
          </div>
          <div style="padding:32px;">
            <p style="color:#1a2a3a;font-size:16px;">Olá, <strong>${recipientName}</strong>!</p>
            <p style="color:#4a6070;font-size:14px;line-height:1.6;">
              <strong>${senderName}</strong> compartilhou um recurso com você pela plataforma Doctor8:
            </p>
            ${resourceBlock}
            <div style="text-align:center;margin:28px 0;">
              <a href="${actionUrl}" style="background:#00b87a;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                ${actionLabel}
              </a>
            </div>
            ${whatsappBlock}
            <p style="color:#9ca3af;font-size:11px;margin-top:24px;word-break:break-all;">
              Acesse em: <a href="${actionUrl}" style="color:#0a4d6e;">${actionUrl}</a>
            </p>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
          Doctor8 &middot; HIPAA &amp; GDPR Compliant &middot;
          <a href="${APP_URL}/privacy" style="color:#9ca3af;">Política de Privacidade</a>
        </p>
      </div>
    `,
  });
}

