// src/app/api/professionals/[id]/slots/route.ts
// Returns available time slots for a professional in the next 14 days

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, format, setHours, setMinutes, isAfter, parseISO } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const professional = await db.professionalProfile.findUnique({
    where: { id: params.id },
    include: {
      availabilitySlots: { where: { isActive: true } },
    },
  });

  if (!professional) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get existing appointments for next 14 days
  const now = new Date();
  const twoWeeksLater = addDays(now, 14);

  const existingAppointments = await db.appointment.findMany({
    where: {
      professionalId: params.id,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: twoWeeksLater },
    },
    select: { scheduledAt: true, durationMins: true },
  });

  const bookedTimes = new Set(
    existingAppointments.map((a) => format(new Date(a.scheduledAt), "yyyy-MM-dd HH:mm"))
  );

  // Generate slots for the next 14 days
  const days: {
    date: string;
    dayOfWeek: number;
    label: string;
    slots: { time: string; datetime: string; available: boolean }[];
  }[] = [];

  for (let i = 1; i <= 14; i++) {
    const date = addDays(now, i);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, "yyyy-MM-dd");
    const dateLabel = format(date, "EEE, MMM d");

    const availability = professional.availabilitySlots.find(
      (s) => s.dayOfWeek === dayOfWeek
    );

    if (!availability) {
      days.push({ date: dateStr, dayOfWeek, label: dateLabel, slots: [] });
      continue;
    }

    const [startH, startM] = availability.startTime.split(":").map(Number);
    const [endH, endM] = availability.endTime.split(":").map(Number);
    const duration = availability.slotDurationMins;

    const slots: { time: string; datetime: string; available: boolean }[] = [];
    let current = setMinutes(setHours(date, startH), startM);
    const end = setMinutes(setHours(date, endH), endM);

    while (isAfter(end, current)) {
      const timeKey = format(current, "yyyy-MM-dd HH:mm");
      const timeLabel = format(current, "h:mm a");
      const isAvailable = !bookedTimes.has(timeKey) && isAfter(current, now);

      slots.push({
        time: timeLabel,
        datetime: current.toISOString(),
        available: isAvailable,
      });

      current = new Date(current.getTime() + duration * 60 * 1000);
    }

    days.push({ date: dateStr, dayOfWeek, label: dateLabel, slots });
  }

  return NextResponse.json({
    professionalId: params.id,
    slotDurationMins: professional.availabilitySlots[0]?.slotDurationMins || 30,
    days,
  });
}
