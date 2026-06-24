// Parse pre-consultation data stored in Appointment.chiefComplaint (JSON).

import { decrypt } from "@/lib/encryption";

export type AppointmentIntake = {
  visitReason: string | null;
  healthPlanSlug: string | null;
  healthPlanLabel: string | null;
  serviceId: string | null;
  serviceName: string | null;
  policyAccepted: boolean;
};

function safeDecrypt(raw: string | null): string {
  if (!raw) return "";
  try {
    return decrypt(raw);
  } catch {
    return raw;
  }
}

export function parseAppointmentIntake(raw: string | null): AppointmentIntake | null {
  if (!raw) return null;
  const text = safeDecrypt(raw);
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (typeof data !== "object" || data === null) return null;
    return {
      visitReason: typeof data.visitReason === "string" ? data.visitReason : null,
      healthPlanSlug: typeof data.healthPlanSlug === "string" ? data.healthPlanSlug : null,
      healthPlanLabel: typeof data.healthPlanLabel === "string" ? data.healthPlanLabel : null,
      serviceId: typeof data.serviceId === "string" ? data.serviceId : null,
      serviceName: typeof data.serviceName === "string" ? data.serviceName : null,
      policyAccepted: Boolean(data.policyAccepted),
    };
  } catch {
    return null;
  }
}

export function buildAppointmentIntakePayload(opts: {
  visitReason?: string;
  healthPlanSlug: string;
  healthPlanLabel: string;
  serviceId?: string;
  serviceName?: string;
  policyAccepted: boolean;
}): string {
  return JSON.stringify({
    visitReason: opts.visitReason?.trim() || undefined,
    healthPlanSlug: opts.healthPlanSlug,
    healthPlanLabel: opts.healthPlanLabel,
    serviceId: opts.serviceId || undefined,
    serviceName: opts.serviceName?.trim() || undefined,
    policyAccepted: opts.policyAccepted,
    acceptedAt: new Date().toISOString(),
  });
}
