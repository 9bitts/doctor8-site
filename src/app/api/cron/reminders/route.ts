import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleAppointmentReminders } from "@/lib/qstash";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Cron fallback ? re-schedule QStash reminders for upcoming appointments (heals missed jobs). */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const appointments = await db.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: in7d },
    },
    select: { id: true, scheduledAt: true },
    take: 200,
  });

  let scheduled = 0;
  for (const appt of appointments) {
    await scheduleAppointmentReminders(appt.id, appt.scheduledAt);
    scheduled += 1;
  }

  return NextResponse.json({
    ok: true,
    rescheduled: scheduled,
    note: "QStash deduplicates via remindersEpoch on delivery; safe to run periodically.",
  });
}
