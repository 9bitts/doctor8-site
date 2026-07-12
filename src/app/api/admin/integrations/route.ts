import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getIntegrationStatuses } from "@/lib/integration-status";
import { probeWhatsAppGraph, getWhatsAppReadiness } from "@/lib/whatsapp";
import { countDailyRecordingsSince, countDailyRecordingsReadySince } from "@/lib/daily-recording-log";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7dPast = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const wa = getWhatsAppReadiness();

  const [
    upcomingAppointments7d,
    reminders24hSent,
    reminders3hSent,
    rateioUnderReview,
    qstashJobs24h,
    qstashFailed24h,
    whatsappDeliveries24h,
    recentQstashJobs,
    whatsappProbe,
    dailyRecordings7d,
    dailyRecordingsReady7d,
  ] = await Promise.all([
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
    db.qStashJobLog.count({ where: { createdAt: { gte: since24h } } }),
    db.qStashJobLog.count({ where: { createdAt: { gte: since24h }, status: "failed" } }),
    db.whatsAppDeliveryLog.count({ where: { createdAt: { gte: since24h } } }),
    db.qStashJobLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { jobType: true, status: true, detail: true, createdAt: true, appointmentId: true },
    }),
    wa.configured ? probeWhatsAppGraph() : Promise.resolve(null),
    countDailyRecordingsSince(since7dPast),
    countDailyRecordingsReadySince(since7dPast),
  ]);

  const integrations = getIntegrationStatuses().map((row) => {
    if (row.id === "whatsapp" && whatsappProbe) {
      const expired = /expired|session has expired/i.test(whatsappProbe.detail);
      const health =
        whatsappProbe.ok && wa.productionReady
          ? "ok"
          : expired
            ? "partial"
            : row.health;
      const expiredHint = expired
        ? " WHATSAPP_ACCESS_TOKEN expired — regenerate in Meta Developers and update Railway."
        : "";
      const metaIds = [
        wa.phoneNumberId ? `phone ID ${wa.phoneNumberId}` : null,
        wa.wabaId ? `WABA ${wa.wabaId}` : null,
        wa.graphVersion,
      ]
        .filter(Boolean)
        .join(" · ");
      const metaSuffix = metaIds ? ` (${metaIds})` : "";
      return {
        ...row,
        health,
        detail: whatsappProbe.ok
          ? `${wa.note}${metaSuffix} Live: ${whatsappProbe.detail}`
          : `${wa.note}${expiredHint} Graph probe: ${whatsappProbe.detail}`,
      };
    }
    return row;
  });

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    integrations,
    qstashStats: {
      upcomingAppointments7d,
      reminders24hSent,
      reminders3hSent,
      rateioUnderReview,
      qstashJobs24h,
      qstashFailed24h,
      whatsappDeliveries24h,
      recentQstashJobs,
      dailyRecordings7d,
      dailyRecordingsReady7d,
    },
  });
}
