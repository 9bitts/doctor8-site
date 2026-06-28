import { db } from "@/lib/db";
import { sendTransactionalEmail, emailShell, getAppUrl } from "@/lib/email-core";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import type { ProviderRole } from "@/lib/provider-license-docs";

async function providerContact(userId: string, role: ProviderRole): Promise<{
  email: string | null;
  name: string;
  settingsPath: string;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (role === "PROFESSIONAL") {
    const p = await db.professionalProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    return {
      email: user?.email ?? null,
      name: p ? `${p.firstName} ${p.lastName}`.trim() : user?.email || "Profissional",
      settingsPath: "/professional/settings",
    };
  }

  if (role === "PSYCHOANALYST") {
    const p = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    return {
      email: user?.email ?? null,
      name: p
        ? `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim()
        : user?.email || "Psicanalista",
      settingsPath: "/psychoanalyst/settings",
    };
  }

  const p = await db.integrativeTherapistProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  return {
    email: user?.email ?? null,
    name: p ? `${p.firstName} ${p.lastName}`.trim() : user?.email || "Terapeuta",
    settingsPath: "/integrative-therapist/settings",
  };
}

/** Notifies provider when admin approves verification (humanitarian + public listing). */
export async function notifyProviderVerifiedApproved(
  userId: string,
  role: ProviderRole,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { email, name, settingsPath } = await providerContact(userId, role);
  if (!email) return;

  const appUrl = getAppUrl();
  const dashboardUrl = `${appUrl}${settingsPath}`;

  const html = emailShell(
    "Perfil aprovado",
    `
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Ol\u00e1, <strong>${name}</strong>!
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Sua verifica\u00e7\u00e3o na Doctor8 foi <strong>aprovada</strong>. Voc\u00ea j\u00e1 pode:
      </p>
      <ul style="color:#334155;font-size:14px;line-height:1.8;padding-left:20px;">
        <li>Participar do atendimento humanit\u00e1rio (entre online na fila de volunt\u00e1rios)</li>
        <li>Aparecer na busca p\u00fablica de pacientes (se sua listagem estiver ativa)</li>
      </ul>
      <p style="margin:24px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#0d9488;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">
          Acessar meu perfil
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">
        D\u00favidas? Responda este e-mail ou escreva para support@doctor8.org
      </p>
    `,
    "pt",
  );

  await sendTransactionalEmail({
    to: email,
    subject: "Doctor8 \u2014 seu perfil foi aprovado",
    html,
    tag: "provider-verified",
  });
}
