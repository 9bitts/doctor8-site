import { sendTransactionalEmail, emailShell, getAppUrl } from "@/lib/email-core";
import { buildIntakeSummary } from "@/lib/humanitarian/intake-summary";
import type { HumanitarianIntake } from "@prisma/client";

function coordinationRecipients(): string[] {
  const raw =
    process.env.HUMANITARIAN_COORDINATION_EMAIL ||
    process.env.SOS_VENEZUELA_COORDINATION_EMAIL ||
    "";
  return raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function summaryHtml(
  patientLabel: string,
  campaignName: string,
  intake: Pick<
    HumanitarianIntake,
    | "id"
    | "triageData"
    | "computedPriority"
    | "triageFlags"
    | "forceMedicalPool"
    | "status"
    | "identificationData"
    | "serviceTypes"
    | "specialtyData"
    | "basicNeedsData"
    | "additionalNotes"
    | "consentAt"
  >,
): string {
  const summary = buildIntakeSummary(intake, "es");
  const appUrl = getAppUrl();
  const sections = summary.sections
    .map(
      (s) => `
      <h3 style="font-size:14px;color:#0f172a;margin:16px 0 8px;">${s.title}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${s.items
          .map(
            (i) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;width:40%;vertical-align:top;">${i.label || "?"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${i.value}</td>
          </tr>`,
          )
          .join("")}
      </table>`,
    )
    .join("");

  return emailShell(
    "SOS Venezuela ? Ficha completa",
    `
      <p style="color:#334155;font-size:15px;line-height:1.6;">
        Nueva ficha de anamnesis completada en <strong>${campaignName}</strong>.
      </p>
      <p style="color:#334155;font-size:14px;"><strong>Paciente:</strong> ${patientLabel}</p>
      <p style="color:#334155;font-size:14px;"><strong>Prioridad:</strong> ${summary.priority || "?"}</p>
      ${sections}
      <p style="margin-top:24px;">
        <a href="${appUrl}/admin/humanitarian" style="display:inline-block;background:#00b87a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Ver en Doctor8 Admin
        </a>
      </p>
    `,
    "es",
  );
}

export async function notifyCoordinationIntakeComplete(params: {
  patientLabel: string;
  campaignName: string;
  intake: HumanitarianIntake;
}): Promise<boolean> {
  const recipients = coordinationRecipients();
  if (!recipients.length || !process.env.RESEND_API_KEY) return false;

  try {
    await Promise.all(
      recipients.map((to) =>
        sendTransactionalEmail({
          to,
          subject: `[SOS Venezuela] Ficha completa ? ${params.patientLabel} (${params.intake.computedPriority || "ROUTINE"})`,
          html: summaryHtml(params.patientLabel, params.campaignName, params.intake),
          tag: "humanitarian-intake",
        }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function notifyCoordinationUrgentTriage(params: {
  patientLabel: string;
  campaignName: string;
  priority: string;
  flags: string[];
}): Promise<boolean> {
  const recipients = coordinationRecipients();
  if (!recipients.length || !process.env.RESEND_API_KEY) return false;
  if (params.priority !== "CRISIS" && params.priority !== "URGENT") return false;

  try {
    await Promise.all(
      recipients.map((to) =>
        sendTransactionalEmail({
          to,
          subject: `[SOS Venezuela] Triaje ${params.priority} ? ${params.patientLabel}`,
          html: emailShell(
            `Triaje ${params.priority}`,
            `
          <p style="color:#334155;font-size:15px;">
            Paciente <strong>${params.patientLabel}</strong> complet? triaje con prioridad
            <strong>${params.priority}</strong> en ${params.campaignName}.
          </p>
          ${params.flags.length ? `<p style="color:#64748b;font-size:13px;">Flags: ${params.flags.join(", ")}</p>` : ""}
          <p style="margin-top:20px;">
            <a href="${getAppUrl()}/admin/humanitarian" style="color:#00b87a;font-weight:bold;">Abrir panel admin</a>
          </p>
        `,
            "es",
          ),
          tag: "humanitarian-triage",
        }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
