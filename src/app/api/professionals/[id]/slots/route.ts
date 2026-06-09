// src/app/api/professionals/[id]/slots/route.ts
// Returns available time slots for a professional for the next 14 days
// Excludes slots already booked (CONFIRMED or PENDING appointments)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const professional = await db.professionalProfile.findUnique({
    where: { id: params.id },
    include: {
      availabilitySlots: {
        where: { isActive: true },
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  if (professional.availabilitySlots.length === 0) {
    return NextResponse.json({ days: [] });
  }

  // Get existing appointments for the next 14 days to exclude booked slots
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const bookedAppointments = await db.appointment.findMany({
    where: {
      professionalId: params.id,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: twoWeeksLater },
    },
    select: { scheduledAt: true },
  });

  const bookedTimes = new Set(
    bookedAppointments.map((a) => a.scheduledAt.toISOString())
  );

  // Generate slots for next 14 days
  const days = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    const availabilityForDay = professional.availabilitySlots.find(
      (slot) => slot.dayOfWeek === dayOfWeek
    );

    if (!availabilityForDay) continue;

    const slots = [];
    const [startHour, startMin] = availabilityForDay.startTime.split(":").map(Number);
    const [endHour, endMin] = availabilityForDay.endTime.split(":").map(Number);
    const duration = availabilityForDay.slotDurationMins;

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const slotDate = new Date(date);
      slotDate.setHours(currentHour, currentMin, 0, 0);

      // Skip slots in the past (with 1h buffer)
      const isPast = slotDate.getTime() < now.getTime() + 60 * 60 * 1000;
      const isBooked = bookedTimes.has(slotDate.toISOString());

      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

      slots.push({
        time: timeStr,
        datetime: slotDate.toISOString(),
        available: !isPast && !isBooked,
      });

      // Advance by slot duration
      currentMin += duration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    if (slots.some((s) => s.available)) {
      days.push({
        date: date.toISOString().split("T")[0],
        label: `${DAY_NAMES[dayOfWeek]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
        slots,
      });
    }
  }

  return NextResponse.json({ days });
}
