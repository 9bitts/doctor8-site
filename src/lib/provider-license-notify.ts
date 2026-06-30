import { db } from "@/lib/db";
import { sendTransactionalEmail, emailShell, getAppUrl } from "@/lib/email-core";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import type { ProviderRole } from "@/lib/provider-license-docs";

function verificationNotifyRecipients(): string[] {
  const raw =
    process.env.PROVIDER_VERIFICATION_NOTIFY_EMAIL ||
    process.env.HUMANITARIAN_COORDINATION_EMAIL ||
    "";
  return raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

async function providerDisplayName(userId: string, role: ProviderRole): Promise<string> {
  if (role === "PROFESSIONAL") {
    const p = await db.professionalProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    if (p) return `${p.firstName} ${p.lastName}`.trim();
  }
  if (role === "PSYCHOANALYST") {
    const p = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    if (p) {
      return `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim();
    }
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    const p = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    if (p) return `${p.firstName} ${p.lastName}`.trim();
  }
  if (role === "ANGEL") {
    const p = await db.angelProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    if (p) return `${p.firstName} ${p.lastName}`.trim();
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email || userId;
}

const ROLE_LABEL: Record<ProviderRole, string> = {
  PROFESSIONAL: "Profissional de sa\u00fade",
  PSYCHOANALYST: "Psicanalista",
  INTEGRATIVE_THERAPIST: "Terapeuta integrativo",
  ANGEL: "Anjo volunt\u00e1rio",
};

/** Fire-and-forget: alerts ops when a provider uploads registration documents. */
export async function notifyAdminLicenseDocumentUploaded(opts: {
  userId: string;
  role: ProviderRole;
  fileName: string;
  label: string | null;
  totalDocs: number;
}): Promise<void> {
  const recipients = verificationNotifyRecipients();
  if (!recipients.length || !process.env.RESEND_API_KEY) return;

  const name = await providerDisplayName(opts.userId, opts.role);
  const appUrl = getAppUrl();
  const adminLink = `${appUrl}/admin/doctors`;

  const html = emailShell(
    "Documento de registro enviado",
    `
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        <strong>${name}</strong> (${ROLE_LABEL[opts.role]}) enviou um documento de registro profissional.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Arquivo</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${opts.fileName}</td>
        </tr>
        ${
          opts.label
            ? `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Descri\u00e7\u00e3o</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${opts.label}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Total enviado</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${opts.totalDocs} arquivo(s)</td>
        </tr>
      </table>
      <p style="margin:20px 0;">
        <a href="${adminLink}" style="display:inline-block;background:#0d9488;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">
          Revisar no admin
        </a>
      </p>
    `,
    "pt",
  );

  await sendTransactionalEmail({
    to: recipients.join(","),
    subject: `Doctor8 \u2014 documento de registro: ${name}`,
    html,
    tag: "provider-license-doc",
  });
}
