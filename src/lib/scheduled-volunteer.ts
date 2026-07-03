/** P8b - scheduled voluntary care (JSON volunteerBlocks), distinct from Acura/humanitarian flows. */

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
