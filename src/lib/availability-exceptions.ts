// Date-specific availability blocks stored in ProfessionalProfile.availability JSON.

import { timeToMins } from "@/lib/scheduling";
import { addCalendarDays } from "@/lib/timezone";

export type DateAvailabilityBlock = {
  id: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  label?: string;
};

export type AvailabilityJson = {
  dateBlocks?: DateAvailabilityBlock[];
};

export function parseAvailabilityJson(raw: unknown): AvailabilityJson {
  if (!raw || typeof raw !== "object") return { dateBlocks: [] };
  const obj = raw as Record<string, unknown>;
  const blocks = Array.isArray(obj.dateBlocks) ? obj.dateBlocks : [];
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
  };
}

export function mergeAvailabilityJson(
  existing: unknown,
  dateBlocks: DateAvailabilityBlock[],
): AvailabilityJson {
  const parsed = parseAvailabilityJson(existing);
  return { ...parsed, dateBlocks };
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
