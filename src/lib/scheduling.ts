// Shared helpers for availability slot generation and display.

import { zonedTimeToUtc } from "@/lib/timezone";

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface GeneratedSlot {
  startTime: string;
  endTime: string;
}

/** Builds consultation slots within a time block, respecting duration and gap between slots. */
export function generateSlotsInRange(
  startTime: string,
  endTime: string,
  consultationMins: number,
  gapMins = 0
): GeneratedSlot[] {
  const startMins = timeToMins(startTime);
  const endMins = timeToMins(endTime);
  if (consultationMins <= 0 || endMins <= startMins) return [];

  const slots: GeneratedSlot[] = [];
  let current = startMins;

  while (current + consultationMins <= endMins) {
    slots.push({
      startTime: minsToTime(current),
      endTime: minsToTime(current + consultationMins),
    });
    current += consultationMins + gapMins;
  }

  return slots;
}

export function countSlotsInRange(
  startTime: string,
  endTime: string,
  slotDuration: number,
  gapMins = 0
): number {
  return generateSlotsInRange(startTime, endTime, slotDuration, gapMins).length;
}

interface AvailabilityBlock {
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  slotGapMins?: number;
  volunteerOnly?: boolean;
}

export function generateTimeSlots(
  dateStr: string,
  timeZone: string,
  blocks: AvailabilityBlock[],
  bookedTimes: Set<string>,
  now: Date
): { time: string; datetime: string; available: boolean; volunteerOnly: boolean }[] {
  const slots: { time: string; datetime: string; available: boolean; volunteerOnly: boolean }[] = [];

  for (const block of blocks) {
    const gap = block.slotGapMins ?? 0;
    const generated = generateSlotsInRange(
      block.startTime,
      block.endTime,
      block.slotDurationMins,
      gap
    );

    for (const slot of generated) {
      const slotDate = zonedTimeToUtc(dateStr, slot.startTime, timeZone);

      const isPast = slotDate.getTime() < now.getTime() + 60 * 60 * 1000;
      const isBooked = bookedTimes.has(slotDate.toISOString());

      slots.push({
        time: slot.startTime,
        datetime: slotDate.toISOString(),
        available: !isPast && !isBooked,
        volunteerOnly: !!block.volunteerOnly,
      });
    }
  }

  return slots.sort((a, b) => a.datetime.localeCompare(b.datetime));
}
