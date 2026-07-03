// Shared availability slot generation for authenticated and public APIs.

import { db } from "@/lib/db";
import { generateTimeSlots } from "@/lib/scheduling";
import type { ProviderType } from "@/lib/providers";
import {
  applyHealthPlanSlotFilter,
  getHealthPlanSchedulingRule,
} from "@/lib/health-plan-rules";
import type { DaySlots } from "@/lib/appointment-slots";
import {
  addCalendarDays,
  calendarDateInTimeZone,
  dayOfWeekForDateStr,
  DEFAULT_TIME_ZONE,
  zonedTimeToUtc,
} from "@/lib/timezone";
import {
  isFullDayBlocked,
  isSlotBlockedByDate,
  parseAvailabilityJson,
  type DateAvailabilityBlock,
} from "@/lib/availability-exceptions";

export type { DaySlots, BookableSlot } from "@/lib/appointment-slots";

export async function getProviderAvailableDays(
  providerId: string,
  providerType: ProviderType,
  locale: string,
  daysAhead = 14,
  healthPlanSlug?: string | null
): Promise<DaySlots[]> {
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  if (providerType === "psychoanalyst") {
    const psychoanalyst = await db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        availabilitySlots: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
    if (!psychoanalyst || psychoanalyst.availabilitySlots.length === 0) return [];

    const timeZone =
      (psychoanalyst.user as { timezone?: string } | null)?.timezone || DEFAULT_TIME_ZONE;

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

    return filterByHealthPlan(
      buildDaysFromBlocks(
        psychoanalyst.availabilitySlots,
        bookedTimes,
        now,
        daysAhead,
        locale,
        timeZone
      ),
      providerId,
      providerType,
      healthPlanSlug,
      now
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

  const timeZone =
    (professional as { timezone?: string }).timezone || DEFAULT_TIME_ZONE;
  const dateBlocks = parseAvailabilityJson(
    (professional as { availability?: unknown }).availability,
  ).dateBlocks ?? [];

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

  return filterByHealthPlan(
    buildDaysFromBlocks(
      professional.availabilitySlots,
      bookedTimes,
      now,
      daysAhead,
      locale,
      timeZone,
      dateBlocks,
    ),
    providerId,
    providerType,
    healthPlanSlug,
    now
  );
}

async function filterByHealthPlan(
  days: DaySlots[],
  providerId: string,
  providerType: ProviderType,
  healthPlanSlug: string | null | undefined,
  now: Date
): Promise<DaySlots[]> {
  if (!healthPlanSlug || healthPlanSlug === "particular") return days;
  const rule = await getHealthPlanSchedulingRule(providerId, providerType, healthPlanSlug);
  return applyHealthPlanSlotFilter(days, rule, now);
}

function buildDaysFromBlocks(
  blocks: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotGapMins?: number;
    volunteerOnly?: boolean;
  }[],
  bookedTimes: Set<string>,
  now: Date,
  daysAhead: number,
  locale: string,
  timeZone: string,
  dateBlocks: DateAvailabilityBlock[] = [],
): DaySlots[] {
  const days: DaySlots[] = [];
  const todayStr = calendarDateInTimeZone(now, timeZone);

  for (let i = 0; i < daysAhead; i++) {
    const dateStr = addCalendarDays(todayStr, i);
    if (isFullDayBlocked(dateStr, dateBlocks)) continue;

    const dayOfWeek = dayOfWeekForDateStr(dateStr, timeZone);
    const blocksForDay = blocks.filter((slot) => slot.dayOfWeek === dayOfWeek);
    if (blocksForDay.length === 0) continue;

    const slots = generateTimeSlots(
      dateStr,
      timeZone,
      blocksForDay,
      bookedTimes,
      now,
      (d, slotTime) => isSlotBlockedByDate(d, slotTime, dateBlocks),
    );
    if (slots.some((s) => s.available)) {
      const labelDate = zonedTimeToUtc(dateStr, "12:00", timeZone);
      days.push({
        date: dateStr,
        label: labelDate.toLocaleDateString(locale, {
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
