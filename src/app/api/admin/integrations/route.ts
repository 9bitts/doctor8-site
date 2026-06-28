import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getIntegrationStatuses } from "@/lib/integration-status";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcomingAppointments7d, reminders24hSent, reminders1hSent, rateioUnderReview] = await Promise.all([
    db.appointment.count({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: now, lte: in7d },
      },
    }),
    db.appointment.count({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: now },
        reminder24hSent: true,
      },
    }),
    db.appointment.count({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: now },
        reminder1hSent: true,
      },
    }),
    db.consultationValidation.count({ where: { underReview: true } }),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    integrations: getIntegrationStatuses(),
    qstashStats: {
      upcomingAppointments7d,
      reminders24hSent,
      reminders1hSent,
      rateioUnderReview,
    },
  });
}