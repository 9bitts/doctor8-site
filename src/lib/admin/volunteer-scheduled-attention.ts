import { db } from "@/lib/db";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";
import { SCHEDULED_VOLUNTEER_BOOKING_SOURCE } from "@/lib/scheduled-volunteer";
import { isVolunteerScheduledApprovalRequired } from "@/lib/volunteer-scheduled-approval";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

export type VolunteerScheduledAttentionItem = {
  appointmentId: string;
  patientProfileId: string;
  patientFirstName: string;
  scheduledAt: string;
  professionalName: string;
  reason: "approval_revoked" | "acura_volunteer_off";
};

export async function loadVolunteerScheduledAttentionItems(): Promise<
  VolunteerScheduledAttentionItem[]
> {
  const now = new Date();
  const approvalRequired = isVolunteerScheduledApprovalRequired();

  const appointments = await db.appointment.findMany({
    where: {
      bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now },
    },
    select: {
      id: true,
      scheduledAt: true,
      patientId: true,
      patient: { select: { firstName: true } },
      professional: {
        select: {
          firstName: true,
          lastName: true,
          acuraVolunteer: true,
          verified: true,
          volunteerScheduledApproved: true,
          availability: true,
        } as never,
      },
      psychoanalyst: { select: { firstName: true, lastName: true, acuraVolunteer: true } },
      integrativeTherapist: { select: { firstName: true, lastName: true, acuraVolunteer: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  const items: VolunteerScheduledAttentionItem[] = [];

  for (const apt of appointments) {
    let professionalName = "Profissional";
    let reason: VolunteerScheduledAttentionItem["reason"] | null = null;

    if (apt.professional) {
      const pro = apt.professional as {
        firstName: string;
        lastName: string;
        acuraVolunteer: boolean;
        volunteerScheduledApproved: boolean;
      };
      professionalName = `Dr. ${pro.firstName} ${pro.lastName}`;
      if (!pro.acuraVolunteer) reason = "acura_volunteer_off";
      else if (approvalRequired && !pro.volunteerScheduledApproved) {
        reason = "approval_revoked";
      }
    } else if (apt.psychoanalyst) {
      professionalName = `${safeDecrypt(apt.psychoanalyst.firstName)} ${safeDecrypt(apt.psychoanalyst.lastName)}`;
      if (!apt.psychoanalyst.acuraVolunteer) reason = "acura_volunteer_off";
    } else if (apt.integrativeTherapist) {
      professionalName = `${apt.integrativeTherapist.firstName} ${apt.integrativeTherapist.lastName}`;
      if (!apt.integrativeTherapist.acuraVolunteer) reason = "acura_volunteer_off";
    }

    if (!reason) continue;

    items.push({
      appointmentId: apt.id,
      patientProfileId: apt.patientId,
      patientFirstName: safeDecrypt(apt.patient.firstName).split(/\s+/)[0] || "Paciente",
      scheduledAt: apt.scheduledAt.toISOString(),
      professionalName,
      reason,
    });
  }

  return items;
}

export function professionalHasVolunteerBlocks(availability: unknown): boolean {
  return (parseAvailabilityJson(availability).volunteerBlocks ?? []).length > 0;
}
