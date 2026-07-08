import { db } from "@/lib/db";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import {
  getWorkforceMembershipForUser,
  resolveWorkforceSessionQuota,
  workforceSessionsRemaining,
} from "@/lib/employer-workforce";

export const EAP_BOOKING_SOURCE = "eap_corporate";

export type EapBookingContext = {
  workforceMemberId: string;
  employerCompanyId: string;
  companyName: string;
  sessionsRemaining: number;
  linkedPsychologistIds: string[];
};

export async function resolveEapBookingContext(userId: string, email: string): Promise<EapBookingContext | null> {
  const membership = await getWorkforceMembershipForUser(userId, email);
  if (!membership) return null;

  const [eap, linked] = await Promise.all([
    db.employerEapBenefit.findUnique({ where: { employerCompanyId: membership.employerCompanyId } }),
    db.employerLinkedPsychologist.findMany({
      where: { employerCompanyId: membership.employerCompanyId, status: "ACTIVE" },
      select: { professionalId: true },
    }),
  ]);

  if (!eap?.enabled) return null;

  const quota = resolveWorkforceSessionQuota(membership.sessionsQuota, eap.sessionsPerEmployee);
  const remaining = workforceSessionsRemaining(quota, membership.sessionsUsed);
  if (remaining <= 0) return null;

  return {
    workforceMemberId: membership.id,
    employerCompanyId: membership.employerCompanyId,
    companyName: membership.employerCompany.nomeFantasia,
    sessionsRemaining: remaining,
    linkedPsychologistIds: linked.map((l) => l.professionalId),
  };
}

export async function assertEapPsychologistBooking(
  professionalId: string,
  employerCompanyId: string,
  linkedIds: string[],
): Promise<{ ok: true } | { ok: false; code: string }> {
  const pro = await db.professionalProfile.findUnique({
    where: { id: professionalId, verified: true },
    select: { specialty: true },
  });
  if (!pro) return { ok: false, code: "provider_not_found" };
  if (!isPsychologistSpecialty(pro.specialty)) {
    return { ok: false, code: "not_psychologist" };
  }
  if (linkedIds.length > 0 && !linkedIds.includes(professionalId)) {
    return { ok: false, code: "not_in_eap_network" };
  }
  return { ok: true };
}

export async function restoreEapSessionQuota(appointmentId: string) {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { employerWorkforceMemberId: true, bookingSource: true, status: true },
  });
  if (!appt?.employerWorkforceMemberId || appt.bookingSource !== EAP_BOOKING_SOURCE) return;

  await db.employerWorkforceMember.update({
    where: { id: appt.employerWorkforceMemberId },
    data: { sessionsUsed: { decrement: 1 } },
  });
}
