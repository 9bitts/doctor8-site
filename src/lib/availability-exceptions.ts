// Date-specific blocks and scheduled volunteer hours stored in ProfessionalProfile.availability JSON.
// Paid weekly grid lives in AvailabilitySlot (table); volunteerBlocks[] mirrors that shape here.

import { timeToMins } from "@/lib/scheduling";
import { addCalendarDays, calendarDateInTimeZone, dayOfWeekForDateStr } from "@/lib/timezone";

export type DateAvailabilityBlock = {
  id: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  label?: string;
};

/** Weekly voluntary-care block (P8a) - free scheduled consultations, isolated from paid flow. */
export type VolunteerWeeklyBlock = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  slotGap?: number;
};

export type AvailabilityJson = {
  dateBlocks?: DateAvailabilityBlock[];
  volunteerBlocks?: VolunteerWeeklyBlock[];
};

function normalizeVolunteerBlock(b: VolunteerWeeklyBlock): VolunteerWeeklyBlock {
  return {
    id: b.id,
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
    slotDuration: b.slotDuration ?? 30,
    slotGap: b.slotGap ?? 0,
  };
}

export function parseAvailabilityJson(raw: unknown): AvailabilityJson {
  if (!raw || typeof raw !== "object") return { dateBlocks: [], volunteerBlocks: [] };
  const obj = raw as Record<string, unknown>;
  const blocks = Array.isArray(obj.dateBlocks) ? obj.dateBlocks : [];
  const volunteerRaw = Array.isArray(obj.volunteerBlocks) ? obj.volunteerBlocks : [];
  return {
    dateBlocks: blocks
      .filter((b): b is DateAvailabilityBlock => {
        if (!b || typeof b !== "object") return false;
        const block = b as DateAvailabilityBlock;
        return typeof block.id === "string" && typeof block.startDate === "string";
      })
      .map((b) => ({
        id: b.id,
        startDate: b.startDate,
        endDate: b.endDate || b.startDate,
        startTime: b.startTime || undefined,
        endTime: b.endTime || undefined,
        label: b.label || undefined,
      })),
    volunteerBlocks: volunteerRaw
      .filter((b): b is VolunteerWeeklyBlock => {
        if (!b || typeof b !== "object") return false;
        const block = b as VolunteerWeeklyBlock;
        return (
          typeof block.id === "string" &&
          typeof block.dayOfWeek === "number" &&
          typeof block.startTime === "string" &&
          typeof block.endTime === "string"
        );
      })
      .map(normalizeVolunteerBlock),
  };
}

export function mergeAvailabilityJson(
  existing: unknown,
  dateBlocks: DateAvailabilityBlock[],
): AvailabilityJson {
  const parsed = parseAvailabilityJson(existing);
  return { ...parsed, dateBlocks };
}

export function mergeVolunteerBlocksJson(
  existing: unknown,
  volunteerBlocks: VolunteerWeeklyBlock[],
): AvailabilityJson {
  const parsed = parseAvailabilityJson(existing);
  return {
    ...parsed,
    volunteerBlocks: volunteerBlocks.map(normalizeVolunteerBlock),
  };
}

function dateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

/** True when the entire calendar day is blocked (no startTime = full day). */
export function isFullDayBlocked(
  dateStr: string,
  blocks: DateAvailabilityBlock[],
): boolean {
  return blocks.some(
    (b) =>
      dateInRange(dateStr, b.startDate, b.endDate || b.startDate) &&
      !b.startTime &&
      !b.endTime,
  );
}

/** True when a generated slot start time falls inside a partial-day block. */
export function isSlotBlockedByDate(
  dateStr: string,
  slotStartTime: string,
  blocks: DateAvailabilityBlock[],
): boolean {
  if (isFullDayBlocked(dateStr, blocks)) return true;

  const slotMins = timeToMins(slotStartTime);
  for (const b of blocks) {
    if (!dateInRange(dateStr, b.startDate, b.endDate || b.startDate)) continue;
    if (!b.startTime || !b.endTime) continue;

    const blockStart = timeToMins(b.startTime);
    const blockEnd = timeToMins(b.endTime);
    if (slotMins >= blockStart && slotMins < blockEnd) return true;
  }
  return false;
}

export function enumerateDatesInBlock(block: DateAvailabilityBlock): string[] {
  const end = block.endDate || block.startDate;
  const dates: string[] = [];
  let current = block.startDate;
  while (current <= end) {
    dates.push(current);
    if (current === end) break;
    current = addCalendarDays(current, 1);
  }
  return dates;
}

/** True when an appointment start falls inside a scheduled volunteer weekly block. */
export function isAppointmentInVolunteerBlock(
  scheduledAt: Date,
  timeZone: string,
  volunteerBlocks: VolunteerWeeklyBlock[],
): boolean {
  if (volunteerBlocks.length === 0) return false;
  const dateStr = calendarDateInTimeZone(scheduledAt, timeZone);
  const dayOfWeek = dayOfWeekForDateStr(dateStr, timeZone);
  const localParts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(scheduledAt);
  const hour = Number(localParts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(localParts.find((p) => p.type === "minute")?.value ?? 0);
  const localMins = hour * 60 + minute;

  for (const block of volunteerBlocks) {
    if (block.dayOfWeek !== dayOfWeek) continue;
    const start = timeToMins(block.startTime);
    const end = timeToMins(block.endTime);
    if (localMins >= start && localMins < end) return true;
  }
  return false;
}

/** True when a scheduled instant was covered by old volunteer blocks but not by new ones. */
export function isRemovedFromVolunteerSchedule(
  scheduledAt: Date,
  timeZone: string,
  oldBlocks: VolunteerWeeklyBlock[],
  newBlocks: VolunteerWeeklyBlock[],
): boolean {
  return (
    isAppointmentInVolunteerBlock(scheduledAt, timeZone, oldBlocks) &&
    !isAppointmentInVolunteerBlock(scheduledAt, timeZone, newBlocks)
  );
}
