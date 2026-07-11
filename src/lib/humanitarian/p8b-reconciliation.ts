import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { SCHEDULED_VOLUNTEER_BOOKING_SOURCE } from "@/lib/scheduled-volunteer";
import type { VolunteerProfile } from "@/lib/humanitarian/dispatcher";

/** AGD-20 — when a humanitarian JIT volunteer goes offline, alert admins about future P8b bookings. */
export async function notifyAdminsIfVolunteerHasFutureP8bAppointments(
  profile: VolunteerProfile,
): Promise<number> {
  const providerFilter =
    profile.professionalId
      ? { professionalId: profile.professionalId }
      : profile.psychoanalystId
        ? { psychoanalystId: profile.psychoanalystId }
        : profile.integrativeTherapistId
          ? { integrativeTherapistId: profile.integrativeTherapistId }
          : null;

  if (!providerFilter) return 0;

  const future = await db.appointment.findMany({
    where: {
      ...providerFilter,
      bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: new Date() },
    },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  if (future.length === 0) return 0;

  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return future.length;

  const count = future.length;
  const nextAt = future[0].scheduledAt.toISOString();
  const title = "Voluntário JIT offline — consultas P8b futuras";
  const body = `${profile.displayName} saiu da fila humanitária com ${count} consulta(s) voluntária(s) agendada(s). Próxima: ${nextAt}.`;

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        title,
        body,
        type: "system",
        data: {
          kind: "p8b_volunteer_offline",
          providerUserId: profile.userId,
          appointmentCount: count,
          nextScheduledAt: nextAt,
        },
      }).catch(() => {}),
    ),
  );

  return future.length;
}
