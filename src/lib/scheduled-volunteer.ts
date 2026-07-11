/** P8b - scheduled voluntary care (JSON volunteerBlocks), distinct from Acura/humanitarian flows. */

import type { SlotProviderType } from "@/lib/volunteer-slot-booking";

export const SCHEDULED_VOLUNTEER_BOOKING_SOURCE = "volunteer_scheduled";

export const MAX_FUTURE_SCHEDULED_VOLUNTEER_APPOINTMENTS = 2;

export type ScheduledVolunteerAppointmentFields = {
  bookingSource?: string | null;
  priceAmount?: number;
};

export function isScheduledVolunteerAppointment(
  apt: ScheduledVolunteerAppointmentFields,
): boolean {
  return apt.bookingSource === SCHEDULED_VOLUNTEER_BOOKING_SOURCE;
}

export function resolveVolunteerScheduledProvider(appointment: {
  bookingSource: string | null;
  professionalId: string | null;
  psychoanalystId: string | null;
  integrativeTherapistId: string | null;
}): { id: string; type: SlotProviderType } | null {
  if (appointment.bookingSource !== SCHEDULED_VOLUNTEER_BOOKING_SOURCE) return null;
  if (appointment.professionalId) {
    return { id: appointment.professionalId, type: "health" };
  }
  if (appointment.psychoanalystId) {
    return { id: appointment.psychoanalystId, type: "psychoanalyst" };
  }
  if (appointment.integrativeTherapistId) {
    return { id: appointment.integrativeTherapistId, type: "integrative" };
  }
  return null;
}
