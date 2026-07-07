// Shared availability slot generation for authenticated and public APIs.

import { db } from "@/lib/db";
import { generateTimeSlots } from "@/lib/scheduling";
import type { ProviderType } from "@/lib/providers";

export type SlotProviderType = ProviderType | "integrative";
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
  type VolunteerWeeklyBlock,
} from "@/lib/availability-exceptions";
import {
  slotOverlapsExternalBlock,
  type ExternalBusyBlock,
} from "@/lib/google-calendar-sync";

export type { DaySlots, BookableSlot } from "@/lib/appointment-slots";

export type ProviderSlotMode = "paid" | "volunteer";

export type ProviderSlotOptions = {
  /** paid (default): table AvailabilitySlot only. volunteer: JSON volunteerBlocks only. */
  slotMode?: ProviderSlotMode;
};

export async function getProviderAvailableDays(
  providerId: string,
  providerType: SlotProviderType,
  locale: string,
  daysAhead = 14,
  healthPlanSlug?: string | null,
  options: ProviderSlotOptions = {},
): Promise<DaySlots[]> {
  const slotMode = options.slotMode ?? "paid";
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

    const weeklyBlocks: WeeklySlotBlock[] =
      slotMode === "volunteer"
        ? psychoanalyst.availabilitySlots
            .filter((s) => s.volunteerOnly)
            .map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              slotDurationMins: s.slotDurationMins,
              slotGapMins: s.slotGapMins,
              volunteerOnly: false,
              isVolunteer: true,
            }))
        : psychoanalyst.availabilitySlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDurationMins: s.slotDurationMins,
            slotGapMins: s.slotGapMins,
            volunteerOnly: s.volunteerOnly,
            isVolunteer: false,
          }));

    if (slotMode === "volunteer" && weeklyBlocks.length === 0) return [];

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
        weeklyBlocks,
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

  if (providerType === "integrative") {
    const therapist = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        availabilitySlots: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
    const parsedAvailability = parseAvailabilityJson(
      (therapist as { availability?: unknown } | null)?.availability,
    );
    const dateBlocks = parsedAvailability.dateBlocks ?? [];
    const volunteerBlocks = parsedAvailability.volunteerBlocks ?? [];

    const weeklyBlocks =
      slotMode === "volunteer"
        ? volunteerBlocksToSlotBlocks(volunteerBlocks)
        : (therapist?.availabilitySlots ?? []).map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDurationMins: s.slotDurationMins,
            slotGapMins: s.slotGapMins,
            volunteerOnly: false,
            isVolunteer: false,
          }));

    if (!therapist || weeklyBlocks.length === 0) return [];

    const timeZone =
      (therapist.user as { timezone?: string } | null)?.timezone || DEFAULT_TIME_ZONE;

    const bookedAppointments = await db.appointment.findMany({
      where: {
        integrativeTherapistId: providerId,
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledAt: { gte: now, lte: twoWeeksLater },
      },
      select: { scheduledAt: true },
    });
    const bookedTimes = new Set(
      bookedAppointments.map((a) => a.scheduledAt.toISOString()),
    );

    return buildDaysFromBlocks(
      weeklyBlocks,
      bookedTimes,
      now,
      daysAhead,
      locale,
      timeZone,
      dateBlocks,
    );
  }

  const professional = await db.professionalProfile.findUnique({
    where: { id: providerId },
    include: {
      availabilitySlots: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      googleCalendar: { select: { externalBusyBlocks: true } },
    },
  });
  const parsedAvailability = parseAvailabilityJson(
    (professional as { availability?: unknown } | null)?.availability,
  );
  const dateBlocks = parsedAvailability.dateBlocks ?? [];
  const volunteerBlocks = parsedAvailability.volunteerBlocks ?? [];

  const weeklyBlocks =
    slotMode === "volunteer"
      ? buildScheduledVolunteerWeeklyBlocks(
          volunteerBlocks,
          professional?.availabilitySlots ?? [],
        )
      : (professional?.availabilitySlots ?? []).map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMins: s.slotDurationMins,
          slotGapMins: s.slotGapMins,
          volunteerOnly: s.volunteerOnly,
          isVolunteer: false,
        }));

  if (!professional || weeklyBlocks.length === 0) return [];

  const timeZone =
    (professional as { timezone?: string }).timezone || DEFAULT_TIME_ZONE;

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

  const externalBlocks = (professional.googleCalendar?.externalBusyBlocks as ExternalBusyBlock[] | null) ?? [];

  return filterByHealthPlan(
    buildDaysFromBlocks(
      weeklyBlocks,
      bookedTimes,
      now,
      daysAhead,
      locale,
      timeZone,
      dateBlocks,
      externalBlocks,
    ),
    providerId,
    providerType,
    healthPlanSlug,
    now
  );
}

type WeeklySlotBlock = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  slotGapMins: number;
  volunteerOnly: boolean;
  isVolunteer: boolean;
};

function volunteerBlocksToSlotBlocks(volunteerBlocks: VolunteerWeeklyBlock[]): WeeklySlotBlock[] {
  return volunteerBlocks.map((b) => ({
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
    slotDurationMins: b.slotDuration ?? 30,
    slotGapMins: b.slotGap ?? 0,
    volunteerOnly: false,
    isVolunteer: true,
  }));
}

/** JSON volunteerBlocks plus weekly slots flagged volunteerOnly in AvailabilitySlot. */
function buildScheduledVolunteerWeeklyBlocks(
  volunteerBlocks: VolunteerWeeklyBlock[],
  availabilitySlots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    slotGapMins: number;
    volunteerOnly: boolean;
  }[],
): WeeklySlotBlock[] {
  const fromJson = volunteerBlocksToSlotBlocks(volunteerBlocks);
  const fromFlagged = availabilitySlots
    .filter((s) => s.volunteerOnly)
    .map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDurationMins: s.slotDurationMins,
      slotGapMins: s.slotGapMins,
      volunteerOnly: false,
      isVolunteer: true,
    }));
  return [...fromJson, ...fromFlagged];
}

async function filterByHealthPlan(
  days: DaySlots[],
  providerId: string,
  providerType: SlotProviderType,
  healthPlanSlug: string | null | undefined,
  now: Date
): Promise<DaySlots[]> {
  if (!healthPlanSlug || healthPlanSlug === "particular") return days;
  if (providerType === "integrative") return days;
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
    isVolunteer?: boolean;
  }[],
  bookedTimes: Set<string>,
  now: Date,
  daysAhead: number,
  locale: string,
  timeZone: string,
  dateBlocks: DateAvailabilityBlock[] = [],
  externalBusyBlocks: ExternalBusyBlock[] = [],
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
    ).map((slot) => {
      if (!slot.available || externalBusyBlocks.length === 0) return slot;
      const duration = blocksForDay[0]?.slotDurationMins ?? 30;
      if (slotOverlapsExternalBlock(slot.datetime, duration, externalBusyBlocks)) {
        return { ...slot, available: false };
      }
      return slot;
    });
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
  providerType: SlotProviderType,
  locale: string,
  maxDays = 4
): Promise<DaySlots[]> {
  const days = await getProviderAvailableDays(providerId, providerType, locale, 14);
  return buildSlotPreviewFromDays(days, maxDays);
}
