// Available slots for a health professional or psychoanalyst (next 14 days).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";
import { generateTimeSlots, localDateKey } from "@/lib/scheduling";
import type { ProviderType } from "@/lib/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const locale = localeOf(lang);
  const providerType = (req.nextUrl.searchParams.get("providerType") || "health") as ProviderType;

  if (providerType === "psychoanalyst") {
    const psychoanalyst = await db.psychoanalystProfile.findUnique({
      where: { id: params.id },
      include: {
        availabilitySlots: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
    if (!psychoanalyst) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }
    if (psychoanalyst.availabilitySlots.length === 0) {
      return NextResponse.json({ days: [] });
    }

    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const bookedAppointments = await db.appointment.findMany({
      where: {
        psychoanalystId: params.id,
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: now, lte: twoWeeksLater },
      },
      select: { scheduledAt: true },
    });
    const bookedTimes = new Set(bookedAppointments.map((a) => a.scheduledAt.toISOString()));
    const blocks = psychoanalyst.availabilitySlots;

    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dayOfWeek = date.getDay();
      const blocksForDay = blocks.filter((slot) => slot.dayOfWeek === dayOfWeek);
      if (blocksForDay.length === 0) continue;
      const slots = generateTimeSlots(date, blocksForDay, bookedTimes, now);
      if (slots.some((s) => s.available)) {
        days.push({
          date: localDateKey(date),
          label: date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }),
          slots,
        });
      }
    }
    return NextResponse.json({ days });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { id: params.id },
    include: {
      availabilitySlots: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  if (professional.availabilitySlots.length === 0) {
    return NextResponse.json({ days: [] });
  }

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

  const bookedTimes = new Set(bookedAppointments.map((a) => a.scheduledAt.toISOString()));
  const days = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    const blocksForDay = professional.availabilitySlots.filter(
      (slot) => slot.dayOfWeek === dayOfWeek
    );

    if (blocksForDay.length === 0) continue;

    const slots = generateTimeSlots(date, blocksForDay, bookedTimes, now);

    if (slots.some((s) => s.available)) {
      days.push({
        date: localDateKey(date),
        label: date.toLocaleDateString(locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        slots,
      });
    }
  }

  return NextResponse.json({ days });
}
