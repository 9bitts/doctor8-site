// Shared availability slot generation for authenticated and public APIs.

import { db } from "@/lib/db";
import { generateTimeSlots, localDateKey } from "@/lib/scheduling";
import type { ProviderType } from "@/lib/providers";

export type DaySlots = {
  date: string;
  label: string;
  slots: { time: string; datetime: string; available: boolean }[];
};

export async function getProviderAvailableDays(
  providerId: string,
  providerType: ProviderType,
  locale: string,
  daysAhead = 14
): Promise<DaySlots[]> {
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  if (providerType === "psychoanalyst") {
    const psychoanalyst = await db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      include: {
        availabilitySlots: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
    if (!psychoanalyst || psychoanalyst.availabilitySlots.length === 0) return [];

    const bookedAppointments = await db.appointment.findMany({
      where: {
        psychoanalystId: providerId,
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: now, lte: twoWeeksLater },
      },
      select: { scheduledAt: true },
    });
    const bookedTimes = new Set(
      bookedAppointments.map((a) => a.scheduledAt.toISOString())
    );

    return buildDaysFromBlocks(
      psychoanalyst.availabilitySlots,
      bookedTimes,
      now,
      daysAhead,
      locale
    );
  }

  const professional = await db.professionalProfile.findUnique({
    where: { id: providerId },
    include: {
      availabilitySlots: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });
  if (!professional || professional.availabilitySlots.length === 0) return [];

  const bookedAppointments = await db.appointment.findMany({
    where: {
      professionalId: providerId,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: twoWeeksLater },
    },
    select: { scheduledAt: true },
  });
  const bookedTimes = new Set(
    bookedAppointments.map((a) => a.scheduledAt.toISOString())
  );

  return buildDaysFromBlocks(
    professional.availabilitySlots,
    bookedTimes,
    now,
    daysAhead,
    locale
  );
}

function buildDaysFromBlocks(
  blocks: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
  }[],
  bookedTimes: Set<string>,
  now: Date,
  daysAhead: number,
  locale: string
): DaySlots[] {
  const days: DaySlots[] = [];

  for (let i = 0; i < daysAhead; i++) {
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
        label: date.toLocaleDateString(locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        slots,
      });
    }
  }

  return days;
}

export function buildSlotPreviewFromDays(days: DaySlots[], maxDays = 4): DaySlots[] {
  return days.slice(0, maxDays).map((day) => ({
    ...day,
    slots: day.slots.filter((s) => s.available).slice(0, 4),
  }));
}

export function firstAvailableSlot(days: DaySlots[]): string | null {
  for (const day of days) {
    const slot = day.slots.find((s) => s.available);
    if (slot) return slot.datetime;
  }
  return null;
}

/** Compact slot preview for search result cards (next N days). */
export async function getProviderSlotPreview(
  providerId: string,
  providerType: ProviderType,
  locale: string,
  maxDays = 4
): Promise<DaySlots[]> {
  const days = await getProviderAvailableDays(providerId, providerType, locale, 14);
  return buildSlotPreviewFromDays(days, maxDays);
}
